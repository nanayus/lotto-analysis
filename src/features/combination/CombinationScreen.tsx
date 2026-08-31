import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';

import lottoHistoryJson from '@/data/generated/lotto_history.json';
import type { AnalysisFilters, AnalysisPeriod, LottoHistoryDraw } from '@/domain/analytics/types';
import { analyzeCombination } from '@/domain/combination/analyzeCombination';
import type { CombinationAnalysis, PrizeRank } from '@/domain/combination/types';
import { type ThemeColors, useThemedStyles } from '@/theme';

import { CombinationResult } from './components/CombinationResult';
import { CombinationDetail } from './components/CombinationDetail';
import { GeneratedAnalysisTransition, type GeneratedAnalysisPhase } from './components/GeneratedAnalysisTransition';
import { NumberSelector } from './components/NumberSelector';
import { useCombinationDraft } from './CombinationDraftContext';
import { fillCombinationRandomly } from './randomFill';
import { CombinationComparison } from './components/CombinationComparison';
import { useNumberLibrary } from '@/features/library/NumberLibraryContext';
import { useAuth } from '@/features/auth/AuthContext';
import { AnalysisAccessModal } from '@/features/monetization/AnalysisAccessModal';
import { useMonetization } from '@/features/monetization/MonetizationContext';
import { isAnalysisAuthorized } from '@/features/monetization/types';
import {
  buildCombinationReturnDestination,
  type CombinationReturnTarget,
} from './combinationNavigation';

const lottoHistory = lottoHistoryJson as LottoHistoryDraw[];
const firstRound = Math.min(...lottoHistory.map((draw) => draw.round));
const latestRound = Math.max(...lottoHistory.map((draw) => draw.round));
const DATA_VERSION = `lotto-${latestRound}`;

const DEFAULT_FILTERS: AnalysisFilters = {
  includeBonus: false,
  period: { kind: 'preset', label: '전체' },
};

const RESULT_ENTERING = FadeInDown
  .duration(210)
  .withInitialValues({ opacity: 0, transform: [{ translateY: 10 }] });

type AnalysisState = AnalysisFilters & {
  snapshot: CombinationAnalysis;
};

type ScreenMode =
  | { kind: 'select' }
  | { kind: 'result' }
  | { kind: 'history' }
  | { kind: 'prizeRank'; rank: PrizeRank }
  | { kind: 'compareSelect' }
  | { kind: 'comparison' };

function latestParam(value?: string | string[]) {
  return Array.isArray(value) ? value.at(-1) : value;
}

function shouldPreserveOrigin(target?: CombinationReturnTarget) {
  return target === 'combination-generator'
    || target === 'explore'
    || target === 'my-numbers'
    || target === 'random-draw'
    || target === 'statistics';
}

export function CombinationScreen() {
  const styles = useThemedStyles(createStyles);
  const {
    analyze,
    returnCount,
    returnSession,
    returnTo,
    returnToken,
  } = useLocalSearchParams<{
    analyze?: string | string[];
    returnCount?: string | string[];
    returnSession?: string | string[];
    returnTo?: string | string[];
    returnToken?: string | string[];
  }>();
  const { clear, selectedNumbers, setNumbers, toggleNumber } = useCombinationDraft();
  const { addCombination } = useNumberLibrary();
  const { consumePendingIntent, openLogin, state: authState } = useAuth();
  const {
    authorizeAnalysis,
    openPaywall,
    state: monetizationState,
  } = useMonetization();
  const [excludedNumbers, setExcludedNumbers] = useState<number[]>([]);
  const activeExcludedNumbers = excludedNumbers.filter(
    (number) => !selectedNumbers.includes(number),
  );
  const [mode, setMode] = useState<ScreenMode>({ kind: 'select' });
  const [analysisState, setAnalysisState] = useState<AnalysisState | null>(null);
  const [comparisonA, setComparisonA] = useState<CombinationAnalysis | null>(null);
  const [comparisonB, setComparisonB] = useState<CombinationAnalysis | null>(null);
  const [accessGateVisible, setAccessGateVisible] = useState(false);
  const [analysisAccessRequired, setAnalysisAccessRequired] = useState(false);
  const [accessMessage, setAccessMessage] = useState<string | null>(null);
  const [isAuthorizing, setAuthorizing] = useState(false);
  const analysisStateRef = useRef<AnalysisState | null>(null);
  const handledAnalyzeTokenRef = useRef<string | null>(null);

  const handleToggleNumber = useCallback((number: number) => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    if (selectedNumbers.includes(number)) {
      toggleNumber(number);
      setExcludedNumbers((current) => current.includes(number)
        ? current
        : [...current, number].sort((left, right) => left - right));
      return;
    }
    if (activeExcludedNumbers.includes(number)) {
      setExcludedNumbers((current) => current.filter((item) => item !== number));
      return;
    }
    toggleNumber(number);
  }, [activeExcludedNumbers, selectedNumbers, toggleNumber]);

  const executeAnalysis = useCallback(() => {
    if (selectedNumbers.length !== 6) return;
    const filters = mode.kind === 'compareSelect' && analysisState
      ? { includeBonus: analysisState.includeBonus, period: analysisState.period }
      : DEFAULT_FILTERS;
    const snapshot = analyzeCombination(lottoHistory, selectedNumbers, filters);
    const nextState = { ...filters, snapshot };
    analysisStateRef.current = nextState;
    setAnalysisState(nextState);
    if (mode.kind === 'compareSelect' && comparisonA) {
      setComparisonB(snapshot); setMode({ kind: 'comparison' });
    } else {
      addCombination(selectedNumbers, 'random');
      setMode({ kind: 'result' });
    }
  }, [addCombination, analysisState, comparisonA, mode.kind, selectedNumbers]);

  const authorizeAndExecute = useCallback(async () => {
    if (selectedNumbers.length !== 6 || isAuthorizing) return;
    setAuthorizing(true);
    setAnalysisAccessRequired(false);
    setAccessMessage(null);
    try {
      const authorization = await authorizeAnalysis(selectedNumbers, DATA_VERSION);
      if (!isAnalysisAuthorized(authorization.decision)) {
        setAnalysisAccessRequired(true);
        setAccessGateVisible(true);
        return;
      }
      executeAnalysis();
    } catch (error) {
      setAccessMessage((error as Error).message || '분석 이용 정보를 확인하지 못했어요.');
    } finally {
      setAuthorizing(false);
    }
  }, [authorizeAnalysis, executeAnalysis, isAuthorizing, selectedNumbers]);

  const startAnalysis = useCallback(() => {
    if (authState.status === 'authenticated') {
      void authorizeAndExecute();
      return;
    }
    if (authState.status === 'guest') {
      openLogin('combination-analysis');
    }
  }, [authState.status, authorizeAndExecute, openLogin]);

  const analyzeToken = latestParam(analyze);
  const returnTarget = latestParam(returnTo) as CombinationReturnTarget | undefined;
  const returnGameCount = latestParam(returnCount);
  const returnSessionToken = latestParam(returnSession);
  const returnDrawToken = latestParam(returnToken);

  const leaveCombination = useCallback(() => {
    if (shouldPreserveOrigin(returnTarget) && router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(buildCombinationReturnDestination({
      gameCount: returnGameCount,
      sessionToken: returnSessionToken,
      target: returnTarget,
      token: returnDrawToken,
    }));
  }, [returnDrawToken, returnGameCount, returnSessionToken, returnTarget]);

  useEffect(() => {
    if (
      !analyzeToken
      || handledAnalyzeTokenRef.current === analyzeToken
      || selectedNumbers.length !== 6
      || authState.status === 'loading'
    ) return;

    if (authState.status === 'guest') {
      openLogin('combination-analysis');
      return;
    }

    consumePendingIntent('combination-analysis');

    handledAnalyzeTokenRef.current = analyzeToken;
    queueMicrotask(() => void authorizeAndExecute());
  }, [analyzeToken, authState.status, authorizeAndExecute, consumePendingIntent, openLogin, selectedNumbers]);

  useEffect(() => {
    if (
      authState.status !== 'authenticated'
      || selectedNumbers.length !== 6
      || !consumePendingIntent('combination-analysis')
    ) return;
    if (analyzeToken) return;
    queueMicrotask(() => void authorizeAndExecute());
  }, [analyzeToken, authState.status, authorizeAndExecute, consumePendingIntent, selectedNumbers.length]);

  const commitFilters = useCallback((filters: AnalysisFilters) => {
    if (selectedNumbers.length !== 6) return;
    const nextState = {
      ...filters,
      snapshot: analyzeCombination(lottoHistory, selectedNumbers, filters),
    };
    analysisStateRef.current = nextState;
    setAnalysisState(nextState);
    if (mode.kind === 'comparison' && comparisonA && comparisonB) {
      setComparisonA(analyzeCombination(lottoHistory, comparisonA.numbers, filters));
      setComparisonB(analyzeCombination(lottoHistory, comparisonB.numbers, filters));
    }
  }, [comparisonA, comparisonB, mode.kind, selectedNumbers]);

  const changePeriod = useCallback((period: AnalysisPeriod) => {
    if (period.kind === 'custom' && !(monetizationState.status === 'ready' && monetizationState.access.isPro)) {
      openPaywall('custom-period');
      return;
    }
    const current = analysisStateRef.current;
    if (!current) return;
    commitFilters({ includeBonus: current.includeBonus, period });
  }, [commitFilters, monetizationState, openPaywall]);

  const changeBonus = useCallback((includeBonus: boolean) => {
    const current = analysisStateRef.current;
    if (!current) return;
    commitFilters({ includeBonus, period: current.period });
  }, [commitFilters]);

  const startOver = useCallback(() => {
    analysisStateRef.current = null;
    setAnalysisState(null);
    clear();
    setExcludedNumbers([]);
    setComparisonA(null); setComparisonB(null);
    router.replace('/(tabs)/draw');
  }, [clear]);

  const startComparison = useCallback(() => {
    if (!(monetizationState.status === 'ready' && monetizationState.access.isPro)) {
      openPaywall('combination-comparison');
      return;
    }
    if (!analysisState) return;
    setComparisonA(analysisState.snapshot);
    setComparisonB(null);
    clear();
    setExcludedNumbers([]);
    setMode({ kind: 'compareSelect' });
  }, [analysisState, clear, monetizationState, openPaywall]);

  const analysisAvailabilityLabel = monetizationState.status === 'ready'
    ? monetizationState.access.isPro
      ? 'Pro · 무제한'
      : monetizationState.access.weeklyFreeAvailable
        ? '이번 주 무료 1회'
        : monetizationState.access.bonusAnalysisCredits > 0
          ? `분석권 ${monetizationState.access.bonusAnalysisCredits}회`
          : '사용 가능한 분석 없음'
    : authState.status === 'guest'
      ? '로그인 후 웰컴 3회'
      : monetizationState.status === 'loading' ? '이용 정보 확인 중' : undefined;
  const generatedAnalysisPhase: GeneratedAnalysisPhase = accessMessage
    ? 'error'
    : analysisAccessRequired
      ? 'access'
      : authState.status === 'guest'
        ? 'login'
        : 'loading';

  const continueGeneratedAnalysis = useCallback(() => {
    if (generatedAnalysisPhase === 'login') {
      openLogin('combination-analysis');
      return;
    }
    if (generatedAnalysisPhase === 'access') {
      setAccessGateVisible(true);
      return;
    }
    void authorizeAndExecute();
  }, [authorizeAndExecute, generatedAnalysisPhase, openLogin]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'right', 'bottom', 'left']}>
      <View style={styles.container}>
        {mode.kind === 'select' || mode.kind === 'compareSelect' ? (
          <>{mode.kind === 'compareSelect' && comparisonA ? <View style={styles.compareBasis}><Text style={styles.compareLabel}>비교 기준 A</Text><Text style={styles.compareNumbers}>{comparisonA.numbers.map((n)=>String(n).padStart(2,'0')).join(' · ')}</Text></View> : null}
          {mode.kind === 'select' && analyzeToken ? (
            <GeneratedAnalysisTransition
              errorMessage={accessMessage}
              numbers={selectedNumbers}
              onBack={leaveCombination}
              onContinue={continueGeneratedAnalysis}
              phase={generatedAnalysisPhase}
            />
          ) : (
            <NumberSelector
              analysisAvailabilityLabel={analysisAvailabilityLabel}
              analysisMessage={accessMessage}
              onAnalyze={startAnalysis}
              onBack={mode.kind === 'compareSelect' && comparisonA
                ? () => {
                  setNumbers(comparisonA.numbers);
                  setComparisonB(null);
                  setMode({ kind: 'result' });
                }
                : leaveCombination}
              excludedNumbers={activeExcludedNumbers}
              isAnalyzing={isAuthorizing}
              onRandomFill={() => setNumbers(fillCombinationRandomly(selectedNumbers, activeExcludedNumbers))}
              onToggleNumber={handleToggleNumber}
              selectedNumbers={selectedNumbers}
            />
          )}
          </>
        ) : mode.kind === 'comparison' && comparisonA && comparisonB && analysisState ? (
          <CombinationComparison a={comparisonA} b={comparisonB} bonusIncluded={analysisState.includeBonus} firstRound={firstRound} latestRound={latestRound} onBack={() => setMode({kind:'result'})} onBonusChange={changeBonus} onPeriodChange={changePeriod} period={analysisState.period}/>
        ) : analysisState ? (
          mode.kind === 'result' ? (
            <Animated.View entering={RESULT_ENTERING} style={styles.animatedScreen}>
              <CombinationResult
                analysis={analysisState.snapshot}
                bonusIncluded={analysisState.includeBonus}
                firstRound={firstRound}
                latestRound={latestRound}
                onBack={leaveCombination}
                onBonusChange={changeBonus}
                onOpenHistory={() => setMode({ kind: 'history' })}
                onOpenPrizeRank={(rank) => setMode({ kind: 'prizeRank', rank })}
                onPeriodChange={changePeriod}
                onStartOver={startOver}
                onCompare={startComparison}
                period={analysisState.period}
              />
            </Animated.View>
          ) : mode.kind === 'history' || mode.kind === 'prizeRank' ? (
            <CombinationDetail
              analysis={analysisState.snapshot}
              mode={mode}
              onBack={() => setMode({ kind: 'result' })}
            />
          ) : null
        ) : null}
        <AnalysisAccessModal
          onClose={() => setAccessGateVisible(false)}
          onOpenPro={() => openPaywall('analysis-limit')}
          visible={accessGateVisible}
        />
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 500,
    backgroundColor: colors.background,
  },
  animatedScreen: {
    flex: 1,
  },
  compareBasis:{marginHorizontal:20,marginTop:16,padding:14,borderWidth:1,borderColor:colors.divider,borderRadius:12,backgroundColor:colors.surface},compareLabel:{color:colors.textSecondary,fontSize:12,marginBottom:6},compareNumbers:{color:colors.textPrimary,fontSize:14},
});
