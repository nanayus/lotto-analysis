import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';

import lottoHistoryJson from '@/data/generated/lotto_history.json';
import { trackEvent } from '@/features/analytics/analyticsClient';
import { combinationAnalyticsParams } from '@/features/analytics/events';
import type { AnalysisFilters, AnalysisPeriod, LottoHistoryDraw } from '@/domain/analytics/types';
import { analyzeCombination } from '@/domain/combination/analyzeCombination';
import type { CombinationAnalysis, PrizeRank } from '@/domain/combination/types';
import { generateCombination } from '@/domain/generator/combinationGenerator';
import { describeGeneratorConditions } from '@/domain/generator/describeGeneratorConditions';
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
import { useMonetization } from '@/features/monetization/MonetizationContext';
import { isAnalysisAuthorized } from '@/features/monetization/types';
import {
  buildCombinationReturnDestination,
  COMBINATION_ANALYSIS_ROUTE,
  type CombinationReturnTarget,
} from './combinationNavigation';

const lottoHistory = lottoHistoryJson as LottoHistoryDraw[];
const firstRound = Math.min(...lottoHistory.map((draw) => draw.round));
const latestRound = Math.max(...lottoHistory.map((draw) => draw.round));
const DATA_VERSION = `lotto-${latestRound}`;
const GENERATED_ANALYSIS_MIN_TRANSITION_MS = 650;

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

function savedCombinationId(value?: string) {
  return value?.startsWith('library-') ? value.slice('library-'.length) : undefined;
}

function shouldPreserveOrigin(target?: CombinationReturnTarget) {
  return target === 'combination-generator'
    || target === 'explore'
    || target === 'my-numbers'
    || target === 'random-draw'
    || target === 'statistics';
}

async function waitForGeneratedTransition(startedAt: number) {
  const remaining = GENERATED_ANALYSIS_MIN_TRANSITION_MS - (Date.now() - startedAt);
  if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
}

function analysisSourceFor(token?: string) {
  if (!token) return 'manual_selection';
  if (token.startsWith('random-draw-')) return 'random_draw';
  if (token.startsWith('generator')) return 'condition_generator';
  if (token.startsWith('library-')) return 'my_numbers';
  return 'linked_analysis';
}

function analyticsPeriod(period: AnalysisPeriod) {
  return period.kind === 'preset' ? period.label : 'custom';
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
  const analyzeToken = latestParam(analyze);
  const analysisSource = analysisSourceFor(analyzeToken);
  const { clear, selectedNumbers, setNumbers, toggleNumber } = useCombinationDraft();
  const {
    addCombination,
    combinations,
    toggleFavorite,
    togglePurchased,
  } = useNumberLibrary();
  const { consumePendingIntent, openLogin, state: authState } = useAuth();
  const {
    authorizeAnalysis,
    openPaywall,
    proPlanEnabled = true,
    productAccess,
    refresh: refreshMonetization,
    rewardedAdsAvailable,
    showRewardedAd,
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
  const [analysisAccessRequired, setAnalysisAccessRequired] = useState(false);
  const [analysisLoginRequired, setAnalysisLoginRequired] = useState(false);
  const [accessMessage, setAccessMessage] = useState<string | null>(null);
  const [rewardedAdMessage, setRewardedAdMessage] = useState<string | null>(null);
  const [isAuthorizing, setAuthorizing] = useState(false);
  const [isWatchingRewardedAd, setWatchingRewardedAd] = useState(false);
  const [analysisLibraryId, setAnalysisLibraryId] = useState<string | null>(null);
  const [regenerationPhase, setRegenerationPhase] = useState<'error' | 'loading' | null>(null);
  const [regenerationError, setRegenerationError] = useState<string | null>(null);
  const analysisStateRef = useRef<AnalysisState | null>(null);
  const handledAnalyzeTokenRef = useRef<string | null>(null);
  const regenerationTokenRef = useRef(0);
  const analysisAccessMethodRef = useRef<'open_access' | 'pro' | 'reward_ad' | 'unknown'>('unknown');
  const trackedGateKeyRef = useRef<string | null>(null);

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
    trackEvent('analysis_result_viewed', combinationAnalyticsParams(selectedNumbers, {
      access_method: analysisAccessMethodRef.current,
      account_tier: productAccess.tier,
      bonus_included: filters.includeBonus,
      period: analyticsPeriod(filters.period),
      source: analysisSource,
    }));
    if (mode.kind === 'compareSelect' && comparisonA) {
      setComparisonB(snapshot); setMode({ kind: 'comparison' });
    } else {
      const numberKey = selectedNumbers.join('-');
      const requestedSavedId = savedCombinationId(analyzeToken);
      const savedCombination = combinations.find((item) => item.id === requestedSavedId)
        ?? combinations.find((item) => item.numbers.join('-') === numberKey);
      setAnalysisLibraryId(
        savedCombination?.id ?? addCombination(selectedNumbers, 'random') ?? null,
      );
      setMode({ kind: 'result' });
    }
  }, [
    addCombination,
    analysisSource,
    analysisState,
    analyzeToken,
    combinations,
    comparisonA,
    mode.kind,
    productAccess.tier,
    selectedNumbers,
  ]);

  const authorizeAndExecute = useCallback(async () => {
    if (selectedNumbers.length !== 6 || isAuthorizing) return;
    trackEvent('analysis_requested', combinationAnalyticsParams(selectedNumbers, {
      account_tier: productAccess.tier,
      source: analysisSource,
    }));
    const transitionStartedAt = Date.now();
    setAuthorizing(true);
    setAnalysisAccessRequired(false);
    setAnalysisLoginRequired(false);
    setAccessMessage(null);
    setRewardedAdMessage(null);
    try {
      const authorization = await authorizeAnalysis(selectedNumbers, DATA_VERSION);
      if (analyzeToken) await waitForGeneratedTransition(transitionStartedAt);
      if (!isAnalysisAuthorized(authorization.decision)) {
        setAnalysisAccessRequired(true);
        return;
      }
      analysisAccessMethodRef.current = proPlanEnabled ? 'pro' : 'open_access';
      executeAnalysis();
    } catch (error) {
      setAccessMessage((error as Error).message || '분석 이용 정보를 확인하지 못했어요.');
    } finally {
      setAuthorizing(false);
    }
  }, [
    analysisSource,
    analyzeToken,
    authorizeAnalysis,
    executeAnalysis,
    isAuthorizing,
    proPlanEnabled,
    productAccess.tier,
    selectedNumbers,
  ]);

  const startAnalysis = useCallback(() => {
    if (authState.status !== 'loading') {
      void authorizeAndExecute();
    }
  }, [authState.status, authorizeAndExecute]);

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

    if (authState.status === 'authenticated') consumePendingIntent('combination-analysis');

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

  useEffect(() => {
    if (authState.status !== 'guest' || !analysisStateRef.current) return;
    analysisStateRef.current = null;
    setAnalysisState(null);
    setAnalysisLibraryId(null);
    setComparisonA(null);
    setComparisonB(null);
    setAnalysisAccessRequired(Boolean(analyzeToken && selectedNumbers.length === 6));
    setMode({ kind: 'select' });
  }, [analyzeToken, authState.status, selectedNumbers.length]);

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
    if (period.kind === 'custom' && !productAccess.canUseCustomPeriod) {
      openPaywall('custom-period');
      return;
    }
    const current = analysisStateRef.current;
    if (!current) return;
    commitFilters({ includeBonus: current.includeBonus, period });
  }, [commitFilters, openPaywall, productAccess.canUseCustomPeriod]);

  const changeBonus = useCallback((includeBonus: boolean) => {
    const current = analysisStateRef.current;
    if (!current) return;
    commitFilters({ includeBonus, period: current.period });
  }, [commitFilters]);

  const startOver = useCallback(() => {
    analysisStateRef.current = null;
    setAnalysisState(null);
    setAnalysisLibraryId(null);
    clear();
    setExcludedNumbers([]);
    setComparisonA(null); setComparisonB(null);
    router.replace('/(tabs)/draw');
  }, [clear]);

  const analysisAvailabilityLabel = proPlanEnabled
    ? productAccess.tier === 'pro'
      ? 'Pro · 광고 없이 결과 보기'
      : '게스트 · 광고 후 결과 공개'
    : '광고 없이 결과 보기';
  const requestedAnalysisHasNumbers = Boolean(analyzeToken && selectedNumbers.length === 6);
  const authorizationPhase: GeneratedAnalysisPhase = accessMessage
    ? 'error'
    : analysisLoginRequired
      ? 'login'
    : analysisAccessRequired
      ? 'access'
      : 'loading';
  const manualEntryPhase: GeneratedAnalysisPhase | null = authState.status === 'loading'
    ? 'loading'
    : authState.status === 'authenticated' && monetizationState.status === 'loading'
      ? 'loading'
      : monetizationState.status === 'error'
        ? 'error'
        : null;
  const analysisTransitionPhase: GeneratedAnalysisPhase | null = requestedAnalysisHasNumbers
    ? authorizationPhase
    : accessMessage
      ? 'error'
      : analysisAccessRequired
        ? 'access'
        : analysisLoginRequired
          ? 'login'
        : manualEntryPhase ?? (analyzeToken ? 'invalid' : null);
  const transitionErrorMessage = rewardedAdMessage
    ?? accessMessage
    ?? (monetizationState.status === 'error' ? monetizationState.error : null);

  useEffect(() => {
    if (analysisTransitionPhase !== 'access' || selectedNumbers.length !== 6) return;
    const gateKey = `${analyzeToken ?? 'manual'}:${selectedNumbers.join('-')}`;
    if (trackedGateKeyRef.current === gateKey) return;
    trackedGateKeyRef.current = gateKey;
    trackEvent('analysis_gate_viewed', combinationAnalyticsParams(selectedNumbers, {
      account_tier: productAccess.tier,
      source: analysisSource,
    }));
  }, [
    analysisSource,
    analysisTransitionPhase,
    analyzeToken,
    productAccess.tier,
    selectedNumbers,
  ]);

  const restartInvalidAnalysis = useCallback(() => {
    clear();
    setExcludedNumbers([]);
    router.replace({
      pathname: COMBINATION_ANALYSIS_ROUTE,
      params: returnTarget ? { returnTo: returnTarget } : undefined,
    });
  }, [clear, returnTarget]);

  const continueGeneratedAnalysis = useCallback(() => {
    if (analysisTransitionPhase === 'login') {
      openLogin('combination-analysis');
      return;
    }
    if (analysisTransitionPhase === 'invalid') {
      restartInvalidAnalysis();
      return;
    }
    if (analysisTransitionPhase === 'error' && !accessMessage) {
      void refreshMonetization();
      return;
    }
    void authorizeAndExecute();
  }, [
    accessMessage,
    analysisTransitionPhase,
    authorizeAndExecute,
    openLogin,
    refreshMonetization,
    restartInvalidAnalysis,
  ]);

  const watchRewardedAd = useCallback(async () => {
    if (isWatchingRewardedAd) return;
    const eventParams = combinationAnalyticsParams(selectedNumbers, {
      account_tier: productAccess.tier,
      source: analysisSource,
    });
    trackEvent('reward_ad_started', eventParams);
    setWatchingRewardedAd(true);
    setRewardedAdMessage(null);
    try {
      const completed = await showRewardedAd();
      if (!completed) {
        trackEvent('reward_ad_failed', { ...eventParams, reason: 'not_completed' });
        setRewardedAdMessage('광고를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
        return;
      }
      trackEvent('reward_ad_completed', eventParams);
      analysisAccessMethodRef.current = 'reward_ad';
      executeAnalysis();
      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      trackEvent('reward_ad_failed', { ...eventParams, reason: 'playback_error' });
      setRewardedAdMessage('광고 재생을 완료하지 못했어요. 다시 시도해 주세요.');
    } finally {
      setWatchingRewardedAd(false);
    }
  }, [
    analysisSource,
    executeAnalysis,
    isWatchingRewardedAd,
    productAccess.tier,
    selectedNumbers,
    showRewardedAd,
  ]);

  const savedAnalysisCombination = analysisLibraryId
    ? combinations.find((item) => item.id === analysisLibraryId)
    : undefined;
  const cancelRegeneration = useCallback(() => {
    regenerationTokenRef.current += 1;
    setRegenerationPhase(null);
    setRegenerationError(null);
  }, []);
  const regenerateWithSameConditions = useCallback(async () => {
    const generatorConditions = savedAnalysisCombination?.generatorConditions;
    if (!generatorConditions) return;
    if (!productAccess.canRegenerateWithSameConditions) {
      openPaywall('same-condition-regeneration');
      return;
    }
    if (regenerationPhase === 'loading') return;

    regenerationTokenRef.current += 1;
    const token = regenerationTokenRef.current;
    const startedAt = Date.now();
    setRegenerationError(null);
    setRegenerationPhase('loading');
    try {
      const outcome = await generateCombination(generatorConditions, {
        history: lottoHistory,
        isCancelled: () => regenerationTokenRef.current !== token,
      });
      await waitForGeneratedTransition(startedAt);
      if (regenerationTokenRef.current !== token) return;

      const generationConditions = describeGeneratorConditions(generatorConditions);
      const savedId = addCombination(outcome.numbers, 'ai', {
        generationConditions,
        generatorConditions,
      });
      const currentFilters = analysisStateRef.current
        ? {
          includeBonus: analysisStateRef.current.includeBonus,
          period: analysisStateRef.current.period,
        }
        : DEFAULT_FILTERS;
      const snapshot = analyzeCombination(lottoHistory, outcome.numbers, currentFilters);
      const nextState = { ...currentFilters, snapshot };
      setNumbers(outcome.numbers);
      analysisStateRef.current = nextState;
      setAnalysisState(nextState);
      setAnalysisLibraryId(savedId ?? null);
      setMode({ kind: 'result' });
      setRegenerationPhase(null);
      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      if (
        regenerationTokenRef.current !== token
        || (error as Error).message === 'GENERATION_CANCELLED'
      ) return;
      await waitForGeneratedTransition(startedAt);
      if (regenerationTokenRef.current !== token) return;
      setRegenerationError((error as Error).message || '다시 뽑지 못했어요.');
      setRegenerationPhase('error');
      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  }, [
    addCombination,
    openPaywall,
    productAccess.canRegenerateWithSameConditions,
    regenerationPhase,
    savedAnalysisCombination?.generatorConditions,
    setNumbers,
  ]);
  const toggleLibraryState = useCallback((kind: 'favorite' | 'purchased') => {
    if (!analysisLibraryId) return;
    if (kind === 'favorite') toggleFavorite(analysisLibraryId);
    else togglePurchased(analysisLibraryId);
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
  }, [analysisLibraryId, toggleFavorite, togglePurchased]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'right', 'bottom', 'left']}>
      <View style={styles.container}>
        {regenerationPhase ? (
          <GeneratedAnalysisTransition
            descriptionOverride={regenerationPhase === 'loading'
              ? '선택한 조건 안에서 새 조합을 만들고 있어요.'
              : '조건을 확인하고 다시 시도해 주세요.'}
            errorMessage={regenerationError}
            numbers={analysisState?.snapshot.numbers ?? selectedNumbers}
            onBack={cancelRegeneration}
            onContinue={() => void regenerateWithSameConditions()}
            onLater={cancelRegeneration}
            onOpenPro={() => openPaywall('same-condition-regeneration')}
            onWatchAd={() => undefined}
            phase={regenerationPhase}
            rewardedAdAvailable={false}
            rewardedAdLoading={false}
            titleOverride={regenerationPhase === 'loading'
              ? '같은 조건으로 다시 뽑는 중'
              : '다시 뽑지 못했어요'}
          />
        ) : mode.kind === 'select' || mode.kind === 'compareSelect' ? (
          <>{mode.kind === 'compareSelect' && comparisonA ? <View style={styles.compareBasis}><Text style={styles.compareLabel}>비교 기준 A</Text><Text style={styles.compareNumbers}>{comparisonA.numbers.map((n)=>String(n).padStart(2,'0')).join(' · ')}</Text></View> : null}
          {mode.kind === 'select' && analysisTransitionPhase ? (
            <GeneratedAnalysisTransition
              errorMessage={transitionErrorMessage}
              numbers={selectedNumbers}
              onBack={leaveCombination}
              onContinue={continueGeneratedAnalysis}
              onLater={leaveCombination}
              onOpenPro={() => openPaywall('analysis-limit')}
              onWatchAd={() => void watchRewardedAd()}
              phase={analysisTransitionPhase}
              rewardedAdAvailable={rewardedAdsAvailable}
              rewardedAdLoading={isWatchingRewardedAd}
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
                canRegenerate={Boolean(savedAnalysisCombination?.generatorConditions)}
                canUseAiExplanation={productAccess.canUseAiExplanation && authState.status === 'authenticated'}
                favorite={savedAnalysisCombination?.favorite}
                firstRound={firstRound}
                isPro={productAccess.canRegenerateWithSameConditions}
                latestRound={latestRound}
                onBack={leaveCombination}
                onBonusChange={changeBonus}
                onOpenHistory={() => setMode({ kind: 'history' })}
                onOpenPrizeRank={(rank) => setMode({ kind: 'prizeRank', rank })}
                onOpenPro={() => {
                  if (!proPlanEnabled && authState.status !== 'authenticated') {
                    openLogin('ai-combination-explanation');
                    return;
                  }
                  openPaywall('ai-combination-explanation');
                }}
                onPeriodChange={changePeriod}
                onRegenerate={() => void regenerateWithSameConditions()}
                onStartOver={startOver}
                onToggleFavorite={() => toggleLibraryState('favorite')}
                onTogglePurchased={() => toggleLibraryState('purchased')}
                period={analysisState.period}
                requiresAiLogin={!proPlanEnabled && authState.status !== 'authenticated'}
                showAiExplanation={proPlanEnabled}
                purchased={savedAnalysisCombination?.purchased}
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
