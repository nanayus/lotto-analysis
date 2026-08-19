import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  Pressable,
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
import { getNumberAppearanceRounds } from '@/domain/analytics/numberHistory';
import { useCombinationDraft } from '@/features/combination/CombinationDraftContext';
import { AllNumberComparison } from './components/AllNumberComparison';
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
  const [detailMode, setDetailMode] = useState<'explore' | 'comparison' | 'history'>('explore');
  const appearanceRounds = getNumberAppearanceRounds(lottoHistory, selectedNumber, analysisState);
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

  if (detailMode === 'comparison') return <SafeAreaView style={styles.safeArea} edges={['top','left','right']}><View style={styles.detailContainer}><AllNumberComparison snapshot={analyticsSnapshot} recent52Snapshot={recent52Snapshot} onBack={() => setDetailMode('explore')} onSelect={(number) => { setSelectedNumber(number); setDetailMode('explore'); }} /></View></SafeAreaView>;
  if (detailMode === 'history') return <SafeAreaView style={styles.safeArea} edges={['top','left','right']}><ScrollView contentContainerStyle={styles.historyContent}><Pressable onPress={() => setDetailMode('explore')} style={styles.backButton}><Text style={styles.actionText}>‹ 탐색</Text></Pressable><Text style={styles.historyTitle}>{selectedNumber}번 출현 기록</Text>{appearanceRounds.map((round) => <View key={round} style={styles.historyRow}><Text style={styles.historyRound}>{round}회</Text></View>)}{!appearanceRounds.length && <Text style={styles.unavailable}>선택 범위에 출현 기록이 없습니다.</Text>}</ScrollView></SafeAreaView>;
  const selectedInDraft = draft.selectedNumbers.includes(selectedNumber);
  const draftFull = draft.selectedNumbers.length >= 6 && !selectedInDraft;
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
                <View style={styles.exploreActions}>
                  <Pressable accessibilityRole="button" accessibilityState={{disabled:draftFull}} disabled={draftFull} onPress={() => draft.toggleNumber(selectedNumber)} style={[styles.secondaryAction,draftFull&&styles.disabledAction]}><Text style={styles.actionText}>{selectedInDraft ? '✓ 조합에 담김' : '+ 조합에 담기'}</Text></Pressable>
                  <Pressable accessibilityRole="button" onPress={() => setDetailMode('comparison')} style={styles.secondaryAction}><Text style={styles.actionText}>45개 번호 비교 ›</Text></Pressable>
                </View>
                <NumberProfile analytics={analytics} />
                <RecentTimeline
                  appearanceRounds={appearanceRounds}
                  hitCount={analytics.recent52Count}
                  periodLabel={analyticsSnapshot.timelineLabel}
                  values={analytics.recent52}
                  onOpenHistory={() => setDetailMode('history')}
                />
                <FrequencyMetrics analytics={analytics} />
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
          {draft.selectedNumbers.length ? <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/combination')} style={styles.draftBar}><Text style={styles.draftText}>조합 {draft.selectedNumbers.length} / 6</Text><Text style={styles.draftLink}>{draft.selectedNumbers.length === 6 ? '분석하러 가기 ›' : '보기 ›'}</Text></Pressable> : null}
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
  detailContainer:{flex:1,width:'100%',maxWidth:500},historyContent:{width:'100%',maxWidth:500,alignSelf:'center',padding:spacing.lg,paddingBottom:spacing.xxxl},backButton:{minHeight:44,justifyContent:'center',alignSelf:'flex-start'},historyTitle:{color:colors.textPrimary,fontSize:typography.sizes.section,fontWeight:typography.weights.semibold,marginVertical:spacing.lg},historyRow:{minHeight:48,justifyContent:'center',borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:colors.divider},historyRound:{color:colors.textPrimary,fontSize:typography.sizes.small,fontVariant:['tabular-nums']},
  exploreActions:{flexDirection:'row',justifyContent:'space-between',gap:spacing.sm,marginTop:spacing.md},secondaryAction:{minHeight:40,justifyContent:'center',paddingHorizontal:spacing.sm,borderRadius:8,borderWidth:1,borderColor:colors.divider,backgroundColor:colors.surface},disabledAction:{opacity:.38},actionText:{color:colors.accentPrimary,fontSize:typography.sizes.caption,fontWeight:typography.weights.medium},draftBar:{position:'absolute',left:spacing.lg,right:spacing.lg,bottom:spacing.md,minHeight:48,paddingHorizontal:spacing.lg,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderRadius:12,borderWidth:1,borderColor:colors.divider,backgroundColor:'#111522'},draftText:{color:colors.textPrimary,fontSize:typography.sizes.small,fontWeight:typography.weights.semibold},draftLink:{color:colors.accentPrimary,fontSize:typography.sizes.caption},
});
