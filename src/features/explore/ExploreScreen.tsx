import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
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
import type {
  AnalysisFilters,
  AnalyticsSnapshot,
  LottoHistoryDraw,
} from '@/domain/analytics/types';
import { colors, spacing, typography } from '@/theme';

import {
  AnalysisControls,
  type AnalysisPeriod,
} from './components/AnalysisControls';
import { FrequencyMetrics } from './components/FrequencyMetrics';
import { NumberProfile } from './components/NumberProfile';
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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.columns} testID={`explore-focus-${interactionFocus.toLowerCase()}`}>
        <View
          style={[styles.sliderPane, { width: windowWidth <= 360 ? '32%' : '30%' }]}
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
                <AnalysisControls
                  bonusIncluded={analysisState.includeBonus}
                  firstRound={numberAnalytics.metadata.firstDrawNumber}
                  latestRound={numberAnalytics.metadata.latestDrawNumber}
                  onBonusChange={changeBonusIncluded}
                  onPeriodChange={changeAnalysisPeriod}
                  period={analysisState.period}
                />
                <NumberProfile analytics={analytics} />
                <RecentTimeline
                  hitCount={analytics.recent52Count}
                  periodLabel={analyticsSnapshot.timelineLabel}
                  values={analytics.recent52}
                />
                <FrequencyMetrics analytics={analytics} />
                <PairSection pairs={analytics.topPairs} />
                <TrioSection
                  selectedNumber={analytics.number}
                  trios={analytics.topTrios.slice(0, 3)}
                />
              </>
            ) : (
              <Text style={styles.unavailable}>분석 데이터를 불러올 수 없습니다.</Text>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  columns: {
    flex: 1,
    width: '100%',
    maxWidth: 500,
    flexDirection: 'row',
    backgroundColor: colors.background,
  },
  sliderPane: {
    paddingLeft: spacing.xs,
    paddingRight: 0,
    paddingVertical: spacing.md,
  },
  analyticsPane: {
    flex: 1,
  },
  analyticsScroll: {
    flex: 1,
  },
  analyticsContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  unavailable: {
    color: colors.textSecondary,
    fontSize: typography.sizes.caption,
    textAlign: 'center',
    paddingTop: spacing.xxxl,
  },
});
