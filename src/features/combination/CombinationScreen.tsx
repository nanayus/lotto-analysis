import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { trackEvent } from '@/features/analytics/analyticsClient';
import { combinationAnalyticsParams } from '@/features/analytics/events';
import { activeGeneratorConditionKeys } from '@/features/analytics/generatorConditionAnalytics';
import type { AnalysisFilters, AnalysisPeriod } from '@/domain/analytics/types';
import { analyzeCombination } from '@/domain/combination/analyzeCombination';
import { describeCombinationHeadline } from '@/domain/combination/describeCombinationHeadline';
import type { CombinationAnalysis } from '@/domain/combination/types';
import { generateCombination } from '@/domain/generator/combinationGenerator';
import { describeGeneratorConditions } from '@/domain/generator/describeGeneratorConditions';
import { type ThemeColors, useAppTheme, useThemedStyles } from '@/theme';

import { CombinationResult } from './components/CombinationResult';
import type {
  CombinationResultAction,
  CombinationResultSectionKey,
} from './resultAnalytics';
import type { CombinationDetailMode } from './components/CombinationDetail';
import { CombinationDetailSheet } from './components/CombinationDetailSheet';
import { GeneratedAnalysisTransition, type GeneratedAnalysisPhase } from './components/GeneratedAnalysisTransition';
import { NumberSelector } from './components/NumberSelector';
import { useCombinationDraft } from './CombinationDraftContext';
import { fillCombinationRandomly } from './randomFill';
import { CombinationComparison } from './components/CombinationComparison';
import { useNumberLibrary } from '@/features/library/NumberLibraryContext';
import { useAuth } from '@/features/auth/AuthContext';
import { authUid } from '@/features/auth/types';
import { useMonetization } from '@/features/monetization/MonetizationContext';
import { useLottoData } from '@/features/lotto-data/LottoDataContext';
import { isAnalysisAuthorized } from '@/features/monetization/types';
import {
  buildCombinationReturnDestination,
  COMBINATION_ANALYSIS_ROUTE,
  type CombinationReturnTarget,
} from './combinationNavigation';

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
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { history: lottoHistory } = useLottoData();
  const firstRound = Math.min(...lottoHistory.map((draw) => draw.round));
  const latestRound = Math.max(...lottoHistory.map((draw) => draw.round));
  const dataVersion = `lotto-${latestRound}`;
  const {
    analyze,
    accessMethod,
    returnCount,
    returnSession,
    returnTo,
    returnToken,
    selectionMode,
  } = useLocalSearchParams<{
    analyze?: string | string[];
    accessMethod?: string | string[];
    returnCount?: string | string[];
    returnSession?: string | string[];
    returnTo?: string | string[];
    returnToken?: string | string[];
    selectionMode?: string | string[];
  }>();
  const analyzeToken = latestParam(analyze);
  const hasInterstitialAccess = latestParam(accessMethod) === 'interstitial';
  const analysisSource = analysisSourceFor(analyzeToken);
  const isManualSelection = latestParam(returnTo) === 'statistics'
    || latestParam(selectionMode) === 'manual';
  const {
    clear,
    metadata: draftMetadata,
    selectedNumbers,
    setNumbers,
    toggleNumber,
  } = useCombinationDraft();
  const {
    addCombination,
    combinations,
    toggleFavorite,
  } = useNumberLibrary();
  const { consumePendingIntent, openLogin, state: authState } = useAuth();
  const activeUid = authUid(authState);
  const {
    authorizeAnalysis,
    openPaywall,
    proPlanEnabled = true,
    productAccess,
    refresh: refreshMonetization,
    showResultAd,
    state: monetizationState,
  } = useMonetization();
  const [excludedNumbers, setExcludedNumbers] = useState<number[]>([]);
  const activeExcludedNumbers = excludedNumbers.filter(
    (number) => !selectedNumbers.includes(number),
  );
  const [mode, setMode] = useState<ScreenMode>({ kind: 'select' });
  const [detailMode, setDetailMode] = useState<CombinationDetailMode | null>(null);
  const [analysisState, setAnalysisState] = useState<AnalysisState | null>(null);
  const [comparisonA, setComparisonA] = useState<CombinationAnalysis | null>(null);
  const [comparisonB, setComparisonB] = useState<CombinationAnalysis | null>(null);
  const [accessMessage, setAccessMessage] = useState<string | null>(null);
  const [isAuthorizing, setAuthorizing] = useState(false);
  const [analysisLibraryId, setAnalysisLibraryId] = useState<string | null>(null);
  const [regenerationPhase, setRegenerationPhase] = useState<'error' | 'loading' | null>(null);
  const [regenerationError, setRegenerationError] = useState<string | null>(null);
  const analysisStateRef = useRef<AnalysisState | null>(null);
  const handledAnalyzeTokenRef = useRef<string | null>(null);
  const regenerationTokenRef = useRef(0);
  const analysisAccessMethodRef = useRef<'ad_unavailable' | 'interstitial_ad' | 'open_access' | 'pro' | 'unknown'>('unknown');
  const viewedResultSectionsRef = useRef(new Set<CombinationResultSectionKey>());

  const handleToggleNumber = useCallback((number: number) => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    if (selectedNumbers.includes(number)) {
      toggleNumber(number);
      if (isManualSelection) return;
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
  }, [activeExcludedNumbers, isManualSelection, selectedNumbers, toggleNumber]);

  const executeAnalysis = useCallback(() => {
    if (selectedNumbers.length !== 6) return;
    const filters = mode.kind === 'compareSelect' && analysisState
      ? { includeBonus: analysisState.includeBonus, period: analysisState.period }
      : DEFAULT_FILTERS;
    const snapshot = analyzeCombination(lottoHistory, selectedNumbers, filters);
    const nextState = { ...filters, snapshot };
    viewedResultSectionsRef.current.clear();
    analysisStateRef.current = nextState;
    setAnalysisState(nextState);
    trackEvent('analysis_result_viewed', combinationAnalyticsParams(selectedNumbers, {
      access_method: analysisAccessMethodRef.current,
      account_tier: productAccess.tier,
      bonus_included: filters.includeBonus,
      headline_metric: describeCombinationHeadline(snapshot).metric,
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
      setAnalysisLibraryId(savedCombination?.id ?? null);
      setMode({ kind: 'result' });
    }
  }, [
    analysisSource,
    analysisState,
    analyzeToken,
    combinations,
    comparisonA,
    lottoHistory,
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
    setAccessMessage(null);
    try {
      if (hasInterstitialAccess) {
        analysisAccessMethodRef.current = 'interstitial_ad';
        executeAnalysis();
        return;
      }
      const authorization = await authorizeAnalysis(selectedNumbers, dataVersion);
      if (analyzeToken) await waitForGeneratedTransition(transitionStartedAt);
      if (!isAnalysisAuthorized(authorization.decision)) {
        const eventParams = combinationAnalyticsParams(selectedNumbers, {
          account_tier: productAccess.tier,
          source: analysisSource,
        });
        trackEvent('interstitial_ad_started', eventParams);
        try {
          const shown = await showResultAd();
          trackEvent(shown ? 'interstitial_ad_completed' : 'interstitial_ad_failed', {
            ...eventParams,
            ...(!shown ? { reason: 'not_completed' } : {}),
          });
          analysisAccessMethodRef.current = shown ? 'interstitial_ad' : 'ad_unavailable';
        } catch {
          trackEvent('interstitial_ad_failed', { ...eventParams, reason: 'playback_error' });
          analysisAccessMethodRef.current = 'ad_unavailable';
        }
        executeAnalysis();
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
    dataVersion,
    executeAnalysis,
    hasInterstitialAccess,
    isAuthorizing,
    proPlanEnabled,
    productAccess.tier,
    selectedNumbers,
    showResultAd,
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
  }, [analyzeToken, authState.status, authorizeAndExecute, consumePendingIntent, selectedNumbers]);

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
  }, [comparisonA, comparisonB, lottoHistory, mode.kind, selectedNumbers]);

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
    viewedResultSectionsRef.current.clear();
    analysisStateRef.current = null;
    setAnalysisState(null);
    setAnalysisLibraryId(null);
    setDetailMode(null);
    clear();
    setExcludedNumbers([]);
    setComparisonA(null); setComparisonB(null);
    setMode({ kind: 'select' });
    if (returnTarget === 'combination-generator') {
      leaveCombination();
      return;
    }
    router.replace({
      pathname: COMBINATION_ANALYSIS_ROUTE,
      params: {
        ...(returnTarget ? { returnTo: returnTarget } : {}),
        selectionMode: 'manual',
      },
    });
  }, [clear, leaveCombination, returnTarget]);

  const requestedAnalysisHasNumbers = Boolean(analyzeToken && selectedNumbers.length === 6);
  const manualEntryPhase: GeneratedAnalysisPhase | null = authState.status === 'loading'
    ? 'loading'
    : authState.status === 'authenticated' && monetizationState.status === 'loading'
      ? 'loading'
      : monetizationState.status === 'error'
        ? 'error'
        : null;
  const analysisTransitionPhase: GeneratedAnalysisPhase | null = requestedAnalysisHasNumbers
    ? (accessMessage ? 'error' : 'loading')
    : accessMessage
      ? 'error'
      : manualEntryPhase ?? (analyzeToken ? 'invalid' : null);
  const transitionErrorMessage = accessMessage
    ?? (monetizationState.status === 'error' ? monetizationState.error : null);

  const restartInvalidAnalysis = useCallback(() => {
    clear();
    setExcludedNumbers([]);
    router.replace({
      pathname: COMBINATION_ANALYSIS_ROUTE,
      params: {
        ...(returnTarget ? { returnTo: returnTarget } : {}),
        selectionMode: 'manual',
      },
    });
  }, [clear, returnTarget]);

  const continueGeneratedAnalysis = useCallback(() => {
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
    refreshMonetization,
    restartInvalidAnalysis,
  ]);

  const savedAnalysisCombination = analysisLibraryId
    ? combinations.find((item) => item.id === analysisLibraryId)
    : undefined;
  const activeGeneratorConditions = savedAnalysisCombination?.generatorConditions
    ?? draftMetadata?.generatorConditions;
  const cancelRegeneration = useCallback(() => {
    regenerationTokenRef.current += 1;
    setRegenerationPhase(null);
    setRegenerationError(null);
  }, []);
  const regenerateWithSameConditions = useCallback(async () => {
    const generatorConditions = activeGeneratorConditions;
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
      if (productAccess.requiresAdForResults) {
        const adEventParams = combinationAnalyticsParams(
          selectedNumbers,
          { account_tier: productAccess.tier, source: 'same_condition_regeneration' },
        );
        trackEvent('interstitial_ad_started', adEventParams);
        try {
          const shown = await showResultAd();
          trackEvent(shown ? 'interstitial_ad_completed' : 'interstitial_ad_failed', {
            ...adEventParams,
            ...(!shown ? { reason: 'not_completed' } : {}),
          });
        } catch {
          trackEvent('interstitial_ad_failed', { ...adEventParams, reason: 'playback_error' });
        }
      }
      const outcome = await generateCombination(generatorConditions, {
        history: lottoHistory,
        isCancelled: () => regenerationTokenRef.current !== token,
      });
      await waitForGeneratedTransition(startedAt);
      if (regenerationTokenRef.current !== token) return;

      const generationConditions = describeGeneratorConditions(generatorConditions);
      const currentFilters = analysisStateRef.current
        ? {
          includeBonus: analysisStateRef.current.includeBonus,
          period: analysisStateRef.current.period,
        }
        : DEFAULT_FILTERS;
      const snapshot = analyzeCombination(lottoHistory, outcome.numbers, currentFilters);
      const nextState = { ...currentFilters, snapshot };
      viewedResultSectionsRef.current.clear();
      const conditionKeys = activeGeneratorConditionKeys(generatorConditions);
      conditionKeys.forEach((conditionKey) => {
        trackEvent('generator_condition_used', {
          condition_count: conditionKeys.length,
          condition_key: conditionKey,
          source: 'same_condition_regeneration',
        });
      });
      trackEvent('combination_generated', combinationAnalyticsParams(outcome.numbers, {
        condition_count: conditionKeys.length,
        generation_mode: outcome.mode,
        source: 'same_condition_regeneration',
      }));
      trackEvent('analysis_result_viewed', combinationAnalyticsParams(outcome.numbers, {
        access_method: 'pro',
        account_tier: productAccess.tier,
        bonus_included: currentFilters.includeBonus,
        headline_metric: describeCombinationHeadline(snapshot).metric,
        period: analyticsPeriod(currentFilters.period),
        source: 'same_condition_regeneration',
      }));
      setNumbers(outcome.numbers, {
        generationConditions,
        generatorConditions,
        source: 'ai',
      });
      analysisStateRef.current = nextState;
      setAnalysisState(nextState);
      setAnalysisLibraryId(null);
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
    activeGeneratorConditions,
    lottoHistory,
    openPaywall,
    productAccess.canRegenerateWithSameConditions,
    productAccess.requiresAdForResults,
    productAccess.tier,
    regenerationPhase,
    selectedNumbers,
    setNumbers,
    showResultAd,
  ]);
  const toggleFavoriteState = useCallback(() => {
    if (analysisLibraryId) {
      toggleFavorite(analysisLibraryId);
    } else {
      const source = draftMetadata?.source
        ?? (analysisSource === 'condition_generator'
          ? 'ai'
          : analysisSource === 'random_draw' ? 'random' : 'manual');
      const savedId = addCombination(selectedNumbers, source, {
        ...(draftMetadata?.generationConditions
          ? { generationConditions: draftMetadata.generationConditions }
          : {}),
        ...(draftMetadata?.generatorConditions
          ? { generatorConditions: draftMetadata.generatorConditions }
          : {}),
        favorite: true,
      });
      if (!savedId) return;
      setAnalysisLibraryId(savedId);
    }
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
  }, [
    addCombination,
    analysisLibraryId,
    analysisSource,
    draftMetadata,
    selectedNumbers,
    toggleFavorite,
  ]);

  const resultAnalyticsParams = useCallback(() => {
    const current = analysisStateRef.current;
    if (!current) return null;
    return combinationAnalyticsParams(current.snapshot.numbers, {
      access_method: analysisAccessMethodRef.current,
      account_tier: productAccess.tier,
      bonus_included: current.includeBonus,
      headline_metric: describeCombinationHeadline(current.snapshot).metric,
      period: analyticsPeriod(current.period),
      source: analysisSource,
    });
  }, [analysisSource, productAccess.tier]);

  const trackResultSectionViewed = useCallback((sectionKey: CombinationResultSectionKey) => {
    if (viewedResultSectionsRef.current.has(sectionKey)) return;
    const params = resultAnalyticsParams();
    if (!params) return;
    viewedResultSectionsRef.current.add(sectionKey);
    trackEvent('analysis_section_viewed', {
      ...params,
      section_key: sectionKey,
    });
  }, [resultAnalyticsParams]);

  const trackResultInteraction = useCallback((
    sectionKey: CombinationResultSectionKey,
    action: CombinationResultAction,
    itemKey?: string,
  ) => {
    const params = resultAnalyticsParams();
    if (!params) return;
    trackEvent('analysis_result_interaction', {
      ...params,
      action,
      item_key: itemKey,
      section_key: sectionKey,
    });
  }, [resultAnalyticsParams]);

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
            phase={regenerationPhase}
            titleOverride={regenerationPhase === 'loading'
              ? '같은 조건으로 다시 뽑는 중'
              : '다시 뽑지 못했어요'}
          />
        ) : mode.kind === 'select' || mode.kind === 'compareSelect' ? (
          <>{mode.kind === 'compareSelect' && comparisonA ? <View style={styles.compareBasis}><Text style={styles.compareLabel}>비교 기준 A</Text><Text style={styles.compareNumbers}>{comparisonA.numbers.join(' · ')}</Text></View> : null}
          {mode.kind === 'select' && analysisTransitionPhase ? (
            <GeneratedAnalysisTransition
              errorMessage={transitionErrorMessage}
              numbers={selectedNumbers}
              onBack={leaveCombination}
              onContinue={continueGeneratedAnalysis}
              phase={analysisTransitionPhase}
            />
          ) : (
            <NumberSelector
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
              onRandomFill={isManualSelection
                ? undefined
                : () => setNumbers(fillCombinationRandomly(selectedNumbers, activeExcludedNumbers))}
              onToggleNumber={handleToggleNumber}
              selectedNumbers={selectedNumbers}
            />
          )}
          </>
        ) : mode.kind === 'comparison' && comparisonA && comparisonB && analysisState ? (
          <CombinationComparison a={comparisonA} b={comparisonB} bonusIncluded={analysisState.includeBonus} firstRound={firstRound} latestRound={latestRound} onBack={() => setMode({kind:'result'})} onBonusChange={changeBonus} onPeriodChange={changePeriod} period={analysisState.period}/>
        ) : analysisState && mode.kind === 'result' ? (
            <Animated.View entering={RESULT_ENTERING} style={styles.animatedScreen}>
              <CombinationResult
                analysis={analysisState.snapshot}
                bonusIncluded={analysisState.includeBonus}
                canRegenerate={Boolean(activeGeneratorConditions)}
                canUseAiExplanation={productAccess.canUseAiExplanation && Boolean(activeUid)}
                favorite={savedAnalysisCombination?.favorite}
                firstRound={firstRound}
                isPro={productAccess.canRegenerateWithSameConditions}
                latestRound={latestRound}
                onBack={leaveCombination}
                onBonusChange={changeBonus}
                onOpenHistory={() => setDetailMode({ kind: 'history' })}
                onOpenPrizeRank={(rank) => setDetailMode({ kind: 'prizeRank', rank })}
                onOpenPro={() => {
                  if (!proPlanEnabled && !activeUid) {
                    openLogin('ai-combination-explanation');
                    return;
                  }
                  openPaywall('ai-combination-explanation');
                }}
                onPeriodChange={changePeriod}
                onRegenerate={() => void regenerateWithSameConditions()}
                onResultInteraction={trackResultInteraction}
                onSectionViewed={trackResultSectionViewed}
                onStartOver={startOver}
                onToggleFavorite={toggleFavoriteState}
                period={analysisState.period}
                requiresAiLogin={!proPlanEnabled && !activeUid}
                showAiExplanation={proPlanEnabled}
              />
            </Animated.View>
        ) : (
          <View accessibilityLabel="화면 준비 중" style={styles.transitionFallback}>
            <ActivityIndicator color={colors.accentPrimary} size="small" />
          </View>
        )}
        {analysisState && detailMode ? (
          <CombinationDetailSheet
            analysis={analysisState.snapshot}
            mode={detailMode}
            onClose={() => setDetailMode(null)}
          />
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
  transitionFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compareBasis:{marginHorizontal:20,marginTop:16,padding:14,borderWidth:1,borderColor:colors.divider,borderRadius:12,backgroundColor:colors.surface},compareLabel:{color:colors.textSecondary,fontSize:12,marginBottom:6},compareNumbers:{color:colors.textPrimary,fontSize:14},
});
