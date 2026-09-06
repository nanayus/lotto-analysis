import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  Extrapolation,
  FadeIn,
  FadeOut,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { buildAnalyticsSnapshot } from '@/domain/analytics/buildAnalyticsSnapshot';
import { getNumberAppearanceHistory } from '@/domain/analytics/numberHistory';
import { COMBINATION_ANALYSIS_ROUTE } from '@/features/combination/combinationNavigation';
import { useLottoData } from '@/features/lotto-data/LottoDataContext';
import { useCombinationDraft } from '@/features/combination/CombinationDraftContext';
import { SubScreenHeader } from '@/components/ui/AppTopBar';
import {
  ANALYSIS_STICKY_SUMMARY_MIN_HEIGHT,
  ANALYSIS_STICKY_SUMMARY_VERTICAL_PADDING,
} from '@/components/ui/analysisLayout';
import { AllNumberComparison } from './components/AllNumberComparison';
import type {
  AnalysisFilters,
  AnalyticsSnapshot,
} from '@/domain/analytics/types';
import { type ThemeColors, spacing, typography, useThemedStyles } from '@/theme';

import {
  AnalysisControls,
  type AnalysisPeriod,
} from './components/AnalysisControls';
import { FrequencyMetrics } from './components/FrequencyMetrics';
import { CombinationFloatingControl } from './components/CombinationFloatingControl';
import { NumberHistoryDetail } from './components/NumberHistoryDetail';
import { NumberScrubber } from './components/NumberScrubber';
import { PairSection } from './components/PairSection';
import { RecentTimeline } from './components/RecentTimeline';
import { TrioSection } from './components/TrioSection';
import type { InteractionFocus } from './interactionFocus';
import { randomLottoNumber } from './sliderMath';
import {
  INTERACTION_EMPHASIS_DURATION,
  INTERACTION_IDLE_DELAY,
} from './scrubberV3.constants';

const EXPLORE_DETAIL_HISTORY_KEY = '__lottoExploreDetail';

type ExploreDetailMode = 'explore' | 'comparison' | 'history';

type AnalysisState = AnalysisFilters & {
  snapshot: AnalyticsSnapshot;
};

const defaultAnalysisFilters: AnalysisFilters = {
  includeBonus: false,
  period: { kind: 'preset', label: '전체' },
};

export function ExploreScreen() {
  const styles = useThemedStyles(createStyles);
  const { history: lottoHistory } = useLottoData();
  const firstRound = Math.min(...lottoHistory.map((draw) => draw.round));
  const latestRound = Math.max(...lottoHistory.map((draw) => draw.round));
  const router = useRouter();
  const draft = useCombinationDraft();
  const [selectedNumber, setSelectedNumber] = useState(() => randomLottoNumber());
  const [interactionFocus, setInteractionFocus] = useState<InteractionFocus>('IDLE');
  const [analysisState, setAnalysisState] = useState<AnalysisState>(() => ({
    ...defaultAnalysisFilters,
    snapshot: buildAnalyticsSnapshot(lottoHistory, defaultAnalysisFilters),
  }));
  const analysisStateRef = useRef(analysisState);
  const analyticsSnapshot = analysisState.snapshot;
  const analytics = analyticsSnapshot.numbers[String(selectedNumber)];
  const recent52Snapshot = useMemo(
    () => buildAnalyticsSnapshot(lottoHistory, {
      includeBonus: analysisState.includeBonus,
      period: { kind: 'preset', label: '최근 52회' },
    }),
    [analysisState.includeBonus, lottoHistory],
  );
  const recent52Analytics = recent52Snapshot.numbers[String(selectedNumber)];
  const [detailMode, setDetailMode] = useState<ExploreDetailMode>('explore');
  const detailModeRef = useRef<ExploreDetailMode>('explore');
  const recentAppearanceHistory = useMemo(
    () => getNumberAppearanceHistory(lottoHistory, selectedNumber, {
      includeBonus: analysisState.includeBonus,
      period: { kind: 'preset', label: '최근 52회' },
    }),
    [analysisState.includeBonus, lottoHistory, selectedNumber],
  );
  const activeAppearanceHistory = useMemo(
    () => getNumberAppearanceHistory(lottoHistory, selectedNumber, {
      includeBonus: analysisState.includeBonus,
      period: analysisState.period,
    }),
    [analysisState.includeBonus, analysisState.period, lottoHistory, selectedNumber],
  );
  const commitAnalysisFilters = useCallback((filters: AnalysisFilters) => {
    const nextState: AnalysisState = {
      ...filters,
      snapshot: buildAnalyticsSnapshot(lottoHistory, filters),
    };
    analysisStateRef.current = nextState;
    setAnalysisState(nextState);
  }, [lottoHistory]);
  useEffect(() => {
    commitAnalysisFilters({
      includeBonus: analysisStateRef.current.includeBonus,
      period: analysisStateRef.current.period,
    });
  }, [commitAnalysisFilters]);
  const changeAnalysisPeriod = useCallback(
    (period: AnalysisPeriod) =>
      commitAnalysisFilters({
        includeBonus: analysisStateRef.current.includeBonus,
        period,
      }),
    [commitAnalysisFilters],
  );
  const changeBonusIncluded = useCallback(
    (includeBonus: boolean) =>
      commitAnalysisFilters({
        includeBonus,
        period: analysisStateRef.current.period,
      }),
    [commitAnalysisFilters],
  );
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heroTopRef = useRef(0);
  const scrubberBottomRef = useRef(0);
  const stickySummaryVisibleRef = useRef(false);
  const [stickySummaryVisible, setStickySummaryVisible] = useState(false);
  const analyticsEmphasis = useSharedValue(0);

  const setCurrentDetailMode = useCallback((mode: ExploreDetailMode) => {
    detailModeRef.current = mode;
    setDetailMode(mode);
  }, []);

  const openDetail = useCallback((mode: Exclude<ExploreDetailMode, 'explore'>) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const currentState = window.history.state;
      const state = currentState && typeof currentState === 'object' ? currentState : {};
      window.history.pushState(
        { ...state, [EXPLORE_DETAIL_HISTORY_KEY]: mode },
        '',
        window.location.href,
      );
    }
    setCurrentDetailMode(mode);
  }, [setCurrentDetailMode]);

  const closeDetail = useCallback(() => {
    if (
      Platform.OS === 'web'
      && typeof window !== 'undefined'
      && window.history.state?.[EXPLORE_DETAIL_HISTORY_KEY]
    ) {
      window.history.back();
      return;
    }
    setCurrentDetailMode('explore');
  }, [setCurrentDetailMode]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return undefined;
    }
    const handlePopState = () => {
      if (detailModeRef.current !== 'explore') {
        setCurrentDetailMode('explore');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [setCurrentDetailMode]);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'web') {
        return undefined;
      }
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        if (detailModeRef.current === 'explore') {
          return false;
        }
        setCurrentDetailMode('explore');
        return true;
      });
      return () => subscription.remove();
    }, [setCurrentDetailMode]),
  );

  const activateFocus = useCallback((focus: Exclude<InteractionFocus, 'IDLE'>) => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    setInteractionFocus(focus);
  }, []);

  const scheduleIdle = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    idleTimerRef.current = setTimeout(
      () => setInteractionFocus('IDLE'),
      INTERACTION_IDLE_DELAY,
    );
  }, []);

  useEffect(() => {
    analyticsEmphasis.value = withTiming(
      interactionFocus === 'RIGHT' ? 1 : interactionFocus === 'LEFT' ? -1 : 0,
      { duration: INTERACTION_EMPHASIS_DURATION },
    );
  }, [analyticsEmphasis, interactionFocus]);

  useEffect(
    () => () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    },
    [],
  );

  const analyticsEmphasisStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      analyticsEmphasis.value,
      [-1, 0, 1],
      [0.9, 0.97, 1],
      Extrapolation.CLAMP,
    ),
  }));

  const onAnalyticsScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    activateFocus('RIGHT');
    scheduleIdle();
    const stickyThreshold = heroTopRef.current + scrubberBottomRef.current;
    if (stickyThreshold <= 0) return;
    const visible = event.nativeEvent.contentOffset.y >= stickyThreshold;
    if (visible === stickySummaryVisibleRef.current) return;
    stickySummaryVisibleRef.current = visible;
    setStickySummaryVisible(visible);
  };

  if (detailMode === 'comparison') {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.detailContainer}>
          <AllNumberComparison
            bonusIncluded={analysisState.includeBonus}
            firstRound={firstRound}
            latestRound={latestRound}
            onBack={closeDetail}
            onBonusChange={changeBonusIncluded}
            onPeriodChange={changeAnalysisPeriod}
            onSelect={(number) => {
              setSelectedNumber(number);
              closeDetail();
            }}
            period={analysisState.period}
            selectedNumber={selectedNumber}
            snapshot={analyticsSnapshot}
          />
        </View>
      </SafeAreaView>
    );
  }
  if (detailMode === 'history') return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.detailContainer}>
        <NumberHistoryDetail
          bonusIncluded={analysisState.includeBonus}
          entries={recentAppearanceHistory}
          number={selectedNumber}
          onBack={closeDetail}
        />
      </View>
    </SafeAreaView>
  );
  const selectedInDraft = draft.selectedNumbers.includes(selectedNumber);
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.exploreContainer}>
        <SubScreenHeader
          backAccessibilityLabel="통계보기로 돌아가기"
          onBack={() => router.back()}
          right={(
            <Pressable
              accessibilityLabel="전체 번호 보기"
              accessibilityRole="button"
              hitSlop={6}
              onPress={() => openDetail('comparison')}
              style={({ pressed }) => [styles.headerAction, pressed && styles.headerActionPressed]}>
              <Text style={styles.headerActionText}>전체 보기</Text>
            </Pressable>
          )}
          title="번호별 통계"
        />
        <View style={styles.body} testID={`explore-focus-${interactionFocus.toLowerCase()}`}>
          <Animated.View
            style={[styles.analyticsPane, analyticsEmphasisStyle]}
            testID="analytics-pane">
            {stickySummaryVisible && analytics ? (
              <Animated.View
                accessibilityLabel={`${selectedNumber}번, 출현 순위 ${analytics.appearanceRank}위, 45개 번호 중, ${analytics.appearanceCount}회 출현`}
                accessible
                entering={FadeIn.duration(120)}
                exiting={FadeOut.duration(100)}
                pointerEvents="none"
                style={styles.stickySummaryBar}
                testID="explore-sticky-summary">
                <Text style={styles.stickyNumber}>{selectedNumber}번</Text>
                <Text numberOfLines={1} style={styles.stickyMetrics}>
                  <Text style={styles.stickyRank}>{analytics.appearanceRank}위</Text>
                  <Text style={styles.stickyRankTotal}> / 45</Text>
                  {' · '}{analytics.appearanceCount}회 출현
                </Text>
              </Animated.View>
            ) : null}
            <ScrollView
              bounces
              contentContainerStyle={styles.analyticsContent}
              directionalLockEnabled
              nestedScrollEnabled
              onScroll={onAnalyticsScroll}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator={false}
              style={styles.analyticsScroll}
              testID="analytics-scroll-view">
              {analytics ? (
                <>
                  <View
                    onLayout={(event) => {
                      heroTopRef.current = event.nativeEvent.layout.y;
                    }}
                    style={styles.heroSurface}
                    testID="explore-top-hero">
                    <View
                      onLayout={(event) => {
                        const { height, y } = event.nativeEvent.layout;
                        scrubberBottomRef.current = y + height;
                      }}
                      style={styles.scrubberPane}
                      testID="scrubber-pane">
                      <NumberScrubber
                        interactionFocus={interactionFocus}
                        onInteractionEnd={scheduleIdle}
                        onInteractionStart={() => activateFocus('LEFT')}
                        orientation="horizontal"
                        value={selectedNumber}
                        onValueChange={setSelectedNumber}
                      />
                    </View>
                    <View style={styles.recordSection}>
                      <FrequencyMetrics
                        analytics={analytics}
                        embedded
                        lastAppearance={activeAppearanceHistory[0]}
                        period={analysisState.period}
                      />
                    </View>
                  </View>
                  <View style={styles.analyticsBody}>
                    <View style={styles.filterRow}>
                      <AnalysisControls
                        bonusIncluded={analysisState.includeBonus}
                        compact
                        firstRound={firstRound}
                        latestRound={latestRound}
                        onBonusChange={changeBonusIncluded}
                        onPeriodChange={changeAnalysisPeriod}
                        period={analysisState.period}
                        variant="plain"
                      />
                    </View>
                    <View style={styles.recentSection} testID="recent-analysis-section">
                      <RecentTimeline
                        hitCount={recent52Analytics.recent52Count}
                        values={recent52Analytics.recent52}
                        onOpenHistory={() => openDetail('history')}
                      />
                    </View>
                    <PairSection pairs={analytics.topPairs} onSelectNumber={setSelectedNumber} />
                    <TrioSection
                      selectedNumber={analytics.number}
                      trios={analytics.topTrios.slice(0, 3)}
                      onSelectNumber={setSelectedNumber}
                    />
                  </View>
                </>
              ) : (
                <Text style={styles.unavailable}>분석 데이터를 불러올 수 없습니다.</Text>
              )}
            </ScrollView>
            <View pointerEvents="box-none" style={styles.floatingControl}>
              <CombinationFloatingControl
                currentNumber={selectedNumber}
                currentSelected={selectedInDraft}
                onAnalyze={() => router.push({
                  pathname: COMBINATION_ANALYSIS_ROUTE,
                  params: {
                    analyze: String(Date.now()),
                    returnTo: 'explore',
                  },
                })}
                onToggle={() => draft.toggleNumber(selectedNumber)}
                selectedCount={draft.selectedNumbers.length}
              />
            </View>
          </Animated.View>
        </View>
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
  body: {
    flex: 1,
    width: '100%',
    position: 'relative',
    backgroundColor: colors.background,
  },
  exploreContainer: {
    flex: 1,
    width: '100%',
    maxWidth: 500,
    backgroundColor: colors.background,
  },
  subHeader: {
    minHeight: 54,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  subHeaderTitle: {
    flex: 1,
    marginLeft: spacing.sm,
    color: colors.textPrimary,
    fontSize: typography.sizes.section,
    fontWeight: typography.weights.bold,
    letterSpacing: -0.5,
  },
  scrubberPane: {
    flexShrink: 0,
  },
  headerAction: {
    minWidth: 64,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActionText: {
    color: colors.accentPrimary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
    letterSpacing: -0.2,
  },
  headerActionPressed: {
    opacity: 0.66,
  },
  analyticsPane: {
    flex: 1,
  },
  analyticsScroll: {
    flex: 1,
  },
  analyticsContent: {
    paddingBottom: spacing.huge + spacing.xxxl,
  },
  heroSurface: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    backgroundColor: colors.surface,
  },
  analyticsBody: {
    paddingHorizontal: spacing.xl,
  },
  recordSection: {
    marginTop: spacing.xxl,
  },
  recentSection: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  unavailable: {
    color: colors.textSecondary,
    fontSize: typography.sizes.caption,
    textAlign: 'center',
    paddingTop: spacing.xxxl,
  },
  detailContainer:{flex:1,width:'100%',maxWidth:500},
  filterRow:{alignItems:'flex-end',marginTop:spacing.md},
  stickySummaryBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 19,
    minHeight: ANALYSIS_STICKY_SUMMARY_MIN_HEIGHT,
    paddingHorizontal: spacing.xl,
    paddingVertical: ANALYSIS_STICKY_SUMMARY_VERTICAL_PADDING,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
    backgroundColor: colors.surface,
    boxShadow: colors.cardShadow,
  },
  stickyNumber: {
    color: colors.textPrimary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    fontVariant: ['tabular-nums'],
  },
  stickyMetrics: {
    flexShrink: 1,
    color: colors.textSecondary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.regular,
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
  },
  stickyRank: {
    color: colors.textPrimary,
    fontWeight: typography.weights.semibold,
  },
  stickyRankTotal: {
    color: colors.textTertiary,
  },
  floatingControl:{position:'absolute',right:spacing.md,bottom:spacing.md,alignItems:'flex-end'},
});
