import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import numberAnalyticsJson from '@/data/generated/number-analytics.json';
import lottoHistoryJson from '@/data/generated/lotto_history.json';
import type { NumberAnalyticsDataset } from '@/data/numberAnalytics.types';
import { buildAnalyticsSnapshot } from '@/domain/analytics/buildAnalyticsSnapshot';
import { getNumberAppearanceHistory } from '@/domain/analytics/numberHistory';
import { useCombinationDraft } from '@/features/combination/CombinationDraftContext';
import { SubScreenBackButton } from '@/components/ui/SubScreenBackButton';
import { AllNumberComparison } from './components/AllNumberComparison';
import type {
  AnalysisFilters,
  AnalyticsSnapshot,
  LottoHistoryDraw,
} from '@/domain/analytics/types';
import { type ThemeColors, spacing, typography, useThemedStyles } from '@/theme';

import {
  AnalysisControls,
  type AnalysisPeriod,
} from './components/AnalysisControls';
import { FrequencyMetrics } from './components/FrequencyMetrics';
import { CombinationFloatingControl } from './components/CombinationFloatingControl';
import { NumberProfile } from './components/NumberProfile';
import { NumberHistoryDetail } from './components/NumberHistoryDetail';
import { NumberScrubberV3 } from './components/NumberScrubberV3';
import { NumberSlider } from './components/NumberSlider';
import { PairSection } from './components/PairSection';
import { RecentTimeline } from './components/RecentTimeline';
import { TrioSection } from './components/TrioSection';
import type { InteractionFocus } from './interactionFocus';
import { randomLottoNumber } from './sliderMath';
import {
  INTERACTION_EMPHASIS_DURATION,
  INTERACTION_IDLE_DELAY,
  USE_NUMBER_SCRUBBER_V3,
} from './scrubberV3.constants';

const numberAnalytics = numberAnalyticsJson as unknown as NumberAnalyticsDataset;
const lottoHistory = lottoHistoryJson as LottoHistoryDraw[];

type AnalysisState = AnalysisFilters & {
  snapshot: AnalyticsSnapshot;
};

const defaultAnalysisFilters: AnalysisFilters = {
  includeBonus: false,
  period: { kind: 'preset', label: '전체' },
};

export function ExploreScreen() {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const draft = useCombinationDraft();
  const { width: windowWidth } = useWindowDimensions();
  const [selectedNumber, setSelectedNumber] = useState(() => randomLottoNumber());
  const [interactionFocus, setInteractionFocus] = useState<InteractionFocus>('IDLE');
  const [analysisState, setAnalysisState] = useState<AnalysisState>(() => ({
    ...defaultAnalysisFilters,
    snapshot: buildAnalyticsSnapshot(lottoHistory, defaultAnalysisFilters),
  }));
  const analysisStateRef = useRef(analysisState);
  const analyticsSnapshot = analysisState.snapshot;
  const analytics = analyticsSnapshot.numbers[String(selectedNumber)];
  const recent52Snapshot = buildAnalyticsSnapshot(lottoHistory, {
    includeBonus: analysisState.includeBonus,
    period: { kind: 'preset', label: '최근 52회' },
  });
  const recent52Analytics = recent52Snapshot.numbers[String(selectedNumber)];
  const [detailMode, setDetailMode] = useState<'explore' | 'comparison' | 'history'>('explore');
  const recentAppearanceHistory = useMemo(
    () => getNumberAppearanceHistory(lottoHistory, selectedNumber, {
      includeBonus: analysisState.includeBonus,
      period: { kind: 'preset', label: '최근 52회' },
    }),
    [analysisState.includeBonus, selectedNumber],
  );
  const commitAnalysisFilters = useCallback((filters: AnalysisFilters) => {
    const nextState: AnalysisState = {
      ...filters,
      snapshot: buildAnalyticsSnapshot(lottoHistory, filters),
    };
    analysisStateRef.current = nextState;
    setAnalysisState(nextState);
  }, []);
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
  const analyticsScrollRef = useRef<ScrollView>(null);
  const analyticsScrollOffset = useRef(0);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const analyticsEmphasis = useSharedValue(0);

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

  useLayoutEffect(() => {
    analyticsScrollRef.current?.scrollTo({
      animated: false,
      y: analyticsScrollOffset.current,
    });
  }, [selectedNumber]);

  const onAnalyticsScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    analyticsScrollOffset.current = event.nativeEvent.contentOffset.y;
    activateFocus('RIGHT');
    scheduleIdle();
  };

  if (detailMode === 'comparison') {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.detailContainer}>
          <AllNumberComparison
            bonusIncluded={analysisState.includeBonus}
            firstRound={numberAnalytics.metadata.firstDrawNumber}
            latestRound={numberAnalytics.metadata.latestDrawNumber}
            onBack={() => setDetailMode('explore')}
            onBonusChange={changeBonusIncluded}
            onPeriodChange={changeAnalysisPeriod}
            onSelect={(number) => {
              setSelectedNumber(number);
              setDetailMode('explore');
            }}
            period={analysisState.period}
            selectedNumber={selectedNumber}
            snapshot={analyticsSnapshot}
          />
        </View>
      </SafeAreaView>
    );
  }
  if (detailMode === 'history') return <SafeAreaView style={styles.safeArea} edges={['top','left','right']}><View style={styles.detailContainer}><NumberHistoryDetail entries={recentAppearanceHistory} number={selectedNumber} onBack={() => setDetailMode('explore')} /></View></SafeAreaView>;
  const selectedInDraft = draft.selectedNumbers.includes(selectedNumber);
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.exploreContainer}>
        <View style={styles.subHeader}>
          <SubScreenBackButton
            accessibilityLabel="통계보기로 돌아가기"
            onPress={() => router.back()}
          />
        </View>
        <View style={styles.columns} testID={`explore-focus-${interactionFocus.toLowerCase()}`}>
          <View
            style={[styles.sliderPane, { width: windowWidth <= 360 ? '30%' : '29%' }]}
            testID="scrubber-pane">
            {USE_NUMBER_SCRUBBER_V3 ? (
              <NumberScrubberV3
                interactionFocus={interactionFocus}
                onInteractionEnd={scheduleIdle}
                onInteractionStart={() => activateFocus('LEFT')}
                value={selectedNumber}
                onValueChange={setSelectedNumber}
              />
            ) : (
              <NumberSlider value={selectedNumber} onValueChange={setSelectedNumber} />
            )}
          </View>

          <Animated.View
            style={[styles.analyticsPane, analyticsEmphasisStyle]}
            testID="analytics-pane">
            <ScrollView
              bounces
              contentContainerStyle={styles.analyticsContent}
              directionalLockEnabled
              nestedScrollEnabled
              onScroll={onAnalyticsScroll}
              ref={analyticsScrollRef}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator={false}
              style={styles.analyticsScroll}
              testID="analytics-scroll-view">
              {analytics ? (
                <>
                  <NumberProfile
                    analytics={analytics}
                    onOpenComparison={() => setDetailMode('comparison')}
                  />
                  <View style={styles.filterRow}>
                    <AnalysisControls
                      bonusIncluded={analysisState.includeBonus}
                      compact
                      firstRound={numberAnalytics.metadata.firstDrawNumber}
                      latestRound={numberAnalytics.metadata.latestDrawNumber}
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
                      onOpenHistory={() => setDetailMode('history')}
                    />
                    <FrequencyMetrics analytics={analytics} />
                  </View>
                  <PairSection pairs={analytics.topPairs} onSelectNumber={setSelectedNumber} />
                  <TrioSection
                    selectedNumber={analytics.number}
                    trios={analytics.topTrios.slice(0, 3)}
                    onSelectNumber={setSelectedNumber}
                  />
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
                  pathname: '/(tabs)/draw/combination',
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
  columns: {
    flex: 1,
    width: '100%',
    flexDirection: 'row',
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
    alignItems: 'flex-start',
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  sliderPane: {
    paddingLeft: spacing.xs,
    paddingRight: 0,
    paddingVertical: spacing.md,
  },
  analyticsPane: {
    flex: 1,
    marginLeft: -spacing.xl,
  },
  analyticsScroll: {
    flex: 1,
  },
  analyticsContent: {
    paddingLeft: 0,
    paddingRight: spacing.lg,
    paddingBottom: spacing.huge + spacing.xxxl,
  },
  recentSection: {
    marginTop: spacing.md,
    paddingTop: spacing.xxl,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  unavailable: {
    color: colors.textSecondary,
    fontSize: typography.sizes.caption,
    textAlign: 'center',
    paddingTop: spacing.xxxl,
  },
  detailContainer:{flex:1,width:'100%',maxWidth:500},
  filterRow:{alignItems:'flex-end',marginTop:spacing.sm},floatingControl:{position:'absolute',right:spacing.md,bottom:spacing.md,alignItems:'flex-end'},
});
