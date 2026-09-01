import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import type { AnalysisPeriod } from '@/domain/analytics/types';
import type { CombinationAnalysis, CombinationSize, PrizeRank } from '@/domain/combination/types';
import {
  CONSECUTIVE_LABELS,
  GENERATOR_BAND_KEYS,
  SAME_ENDING_LABELS,
} from '@/domain/generator/combinationGenerator';
import { AppCard } from '@/components/ui/AppCard';
import { SubScreenHeader } from '@/components/ui/AppTopBar';
import { type ThemeColors, radius, spacing, typography, useThemedStyles } from '@/theme';
import { AnalysisControls } from '@/features/explore/components/AnalysisControls';
import { LibraryStatusActions } from '@/features/library/components/LibraryStatusActions';

import { AiCombinationExplanation } from './AiCombinationExplanation';
import { CombinationNumberPills } from './CombinationNumberPills';

type CombinationResultProps = {
  analysis: CombinationAnalysis;
  bonusIncluded: boolean;
  firstRound: number;
  latestRound: number;
  onBonusChange: (included: boolean) => void;
  onBack?: () => void;
  onToggleFavorite?: () => void;
  onTogglePurchased?: () => void;
  onOpenHistory: () => void;
  onOpenPrizeRank: (rank: PrizeRank) => void;
  onPeriodChange: (period: AnalysisPeriod) => void;
  onOpenPro?: () => void;
  onStartOver: () => void;
  onCompare: () => void;
  period: AnalysisPeriod;
  favorite?: boolean;
  isPro?: boolean;
  purchased?: boolean;
};

const VISIBLE_COMBINATION_SIZES = [2, 3, 4] as const;
const MATCH_COUNTS = [6, 5, 4, 3, 2, 1, 0] as const;
const PRIZE_RANKS = [1, 2, 3, 4, 5] as const;
const CONDITION_STAT_TABS = ['분포', '수 성격', '직전·연번', '번호대·과거'] as const;
const NOOP = () => undefined;
const webPointerStyle = Platform.select({
  web: { cursor: 'pointer' } as unknown as ViewStyle,
});
const webTabStyle = Platform.select({
  web: {
    cursor: 'pointer',
    outlineStyle: 'none',
  } as unknown as ViewStyle,
});

function formatNumber(number: number) {
  return String(number).padStart(2, '0');
}

function SectionCard({ children, testID, title }: {
  children: React.ReactNode;
  testID?: string;
  title?: string;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <AppCard style={styles.card} testID={testID}>
      {title ? <Text style={styles.cardTitle}>{title}</Text> : null}
      {children}
    </AppCard>
  );
}

type ConditionStatTab = (typeof CONDITION_STAT_TABS)[number];
type ConditionStatRow = { label: string; value: string };

function ConditionStatistics({
  analysis,
  bonusIncluded,
  latestRound,
}: {
  analysis: CombinationAnalysis;
  bonusIncluded: boolean;
  latestRound: number;
}) {
  const styles = useThemedStyles(createStyles);
  const [activeTab, setActiveTab] = useState<ConditionStatTab>('분포');
  const metrics = analysis.conditionMetrics;
  const rows: Record<ConditionStatTab, ConditionStatRow[]> = {
    '분포': [
      { label: '동끝수 형태', value: SAME_ENDING_LABELS[metrics.sameEndingPattern] },
      { label: '표준편차', value: metrics.standardDeviation.toFixed(1) },
      { label: '번호 총합', value: String(metrics.sum) },
      { label: '끝수 총합', value: String(metrics.lastDigitSum) },
      { label: '홀짝 비율', value: `${metrics.oddCount} : ${6 - metrics.oddCount}` },
      { label: '저고 비율', value: `${metrics.lowCount} : ${metrics.highCount}` },
    ],
    '수 성격': [
      { label: 'A/C 값', value: String(metrics.acValue) },
      { label: '소수 개수', value: `${metrics.primeCount}개` },
      { label: '완전제곱수 개수', value: `${metrics.squareCount}개` },
      { label: '합성수 개수', value: `${metrics.compositeCount}개` },
      { label: '3의 배수', value: `${metrics.multipleCounts[3]}개` },
      { label: '4의 배수', value: `${metrics.multipleCounts[4]}개` },
      { label: '5의 배수', value: `${metrics.multipleCounts[5]}개` },
    ],
    '직전·연번': [
      { label: '이월수 개수', value: `${metrics.carryCount}개` },
      { label: '이웃수 개수', value: `${metrics.neighborCount}개` },
      { label: '연번 형태', value: CONSECUTIVE_LABELS[metrics.consecutivePattern] },
    ],
    '번호대·과거': [
      ...GENERATOR_BAND_KEYS.map((band) => ({
        label: `${band} 번호대`,
        value: `${metrics.bandCounts[band]}개`,
      })),
      {
        label: '과거 1–3등 동일 이력',
        value: metrics.pastPrizeRanks.length
          ? metrics.pastPrizeRanks.map((rank) => `${rank}등`).join(' · ')
          : '없음',
      },
    ],
  };

  return (
    <SectionCard testID="result-section-condition-statistics" title="조건별 통계">
      <Text style={styles.conditionStatsDescription}>
        조합 선택 화면과 같은 기준으로 현재 조합을 계산했어요.
      </Text>
      <ScrollView
        contentContainerStyle={styles.conditionTabContent}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.conditionTabs}>
        {CONDITION_STAT_TABS.map((tab) => {
          const selected = tab === activeTab;
          return (
            <Pressable
              accessibilityLabel={`${tab} 통계`}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={({ pressed }) => [
                styles.conditionTab,
                selected && styles.conditionTabSelected,
                webTabStyle,
                pressed && styles.pressed,
              ]}
              testID={`condition-stat-tab-${tab}`}>
              <Text style={[styles.conditionTabText, selected && styles.conditionTabTextSelected]}>
                {tab}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.conditionStatList}>
        {rows[activeTab].map((item, index) => (
          <View
            accessibilityLabel={`${item.label}, ${item.value}`}
            accessible
            key={item.label}
            style={[
              styles.conditionStatRow,
              index < rows[activeTab].length - 1 && styles.conditionStatRowDivider,
            ]}>
            <Text style={styles.conditionStatLabel}>{item.label}</Text>
            <Text style={styles.conditionStatValue}>{item.value}</Text>
          </View>
        ))}
      </View>

      {activeTab === '직전·연번' ? (
        <Text style={styles.conditionStatsNote}>
          이월수·이웃수는 {latestRound}회와 보너스 번호 {bonusIncluded ? '포함' : '제외'} 기준입니다.
        </Text>
      ) : activeTab === '번호대·과거' ? (
        <Text style={styles.conditionStatsNote}>
          과거 등수 이력은 전체 회차의 본번호와 보너스 번호를 기준으로 확인합니다.
        </Text>
      ) : null}
    </SectionCard>
  );
}

function FrequentCombinations({ analysis }: { analysis: CombinationAnalysis }) {
  const styles = useThemedStyles(createStyles);
  const [activeSize, setActiveSize] = useState<(typeof VISIBLE_COMBINATION_SIZES)[number]>(2);
  const [focusedSize, setFocusedSize] = useState<CombinationSize | null>(null);
  const [expanded, setExpanded] = useState(false);
  const combinations = analysis.subCombinations[activeSize];
  const collapsedCombinations = combinations
    .filter((item) => item.appearanceCount > 0)
    .slice(0, 3);
  const visibleCombinations = expanded ? combinations : collapsedCombinations;
  const remainingCount = combinations.length - collapsedCombinations.length;

  return (
    <SectionCard title="자주 나온 조합">
      <View accessibilityRole="tablist" style={styles.comboTabs}>
        {VISIBLE_COMBINATION_SIZES.map((size) => {
          const selected = size === activeSize;
          return (
            <Pressable
              accessibilityLabel={`${size}개 조합`}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              key={size}
              onBlur={() => setFocusedSize(null)}
              onFocus={(event) => {
                const target = event.target as unknown as { matches?: (selector: string) => boolean };
                const focusVisible = Platform.OS !== 'web'
                  || target.matches?.(':focus-visible') !== false;
                setFocusedSize(focusVisible ? size : null);
              }}
              onPress={() => {
                setActiveSize(size);
                setExpanded(false);
              }}
              style={({ pressed }) => [
                styles.comboTab,
                selected && styles.comboTabSelected,
                webTabStyle,
                focusedSize === size && styles.comboTabFocused,
                pressed && styles.pressed,
              ]}
              testID={`combination-size-tab-${size}`}>
              <Text style={[styles.comboTabText, selected && styles.comboTabTextSelected]}>
                {size}개
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.comboList}>
        {visibleCombinations.length ? visibleCombinations.map((item, index) => (
          <View
            accessibilityLabel={`${item.numbers.join(', ')} 조합, ${item.appearanceCount}회, ${item.latestRound ? `최근 ${item.latestRound}회` : '최근 기록 없음'}`}
            accessible
            key={item.numbers.join('-')}
            style={[
              styles.comboRow,
              index < visibleCombinations.length - 1 && styles.comboRowDivider,
            ]}
            testID={`frequent-combination-row-${activeSize}-${item.numbers.join('-')}`}>
            <Text numberOfLines={1} style={styles.comboNumbers}>
              {item.numbers.map(formatNumber).join(' · ')}
            </Text>
            <View style={styles.comboMetaGroup}>
              <Text numberOfLines={1} style={[
                styles.comboCount,
                item.appearanceCount === 0 && styles.comboCountZero,
              ]}>
                {item.appearanceCount}회
              </Text>
              <Text numberOfLines={1} style={styles.comboRound}>
                {item.latestRound ? `최근 ${item.latestRound}회` : '-'}
              </Text>
            </View>
          </View>
        )) : (
          <Text style={styles.emptyText}>선택 범위에서 동시 출현 기록이 없습니다.</Text>
        )}
        {expanded || remainingCount > 0 ? (
          <Pressable
            accessibilityLabel={expanded ? '조합 목록 접기' : `${remainingCount}개 조합 더보기`}
            accessibilityRole="button"
            hitSlop={6}
            onPress={() => setExpanded((current) => !current)}
            style={({ pressed }) => [
              styles.comboExpandAction,
              webPointerStyle,
              pressed && styles.pressed,
            ]}>
            <Text style={styles.comboExpandText}>
              {expanded ? '접기' : `+ ${remainingCount}개 더보기`}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </SectionCard>
  );
}

export function CombinationResult({
  analysis,
  bonusIncluded,
  firstRound,
  latestRound,
  onBonusChange,
  onBack = NOOP,
  onToggleFavorite = NOOP,
  onTogglePurchased = NOOP,
  onOpenHistory,
  onOpenPrizeRank,
  onPeriodChange,
  onOpenPro = NOOP,
  onStartOver,
  onCompare,
  period,
  favorite = false,
  isPro = false,
  purchased = false,
}: CombinationResultProps) {
  const styles = useThemedStyles(createStyles);
  const [libraryNotice, setLibraryNotice] = useState<string | null>(null);
  const [favoriteSelection, setFavoriteSelection] = useState<{ key: string; value: boolean } | null>(null);
  const [purchasedSelection, setPurchasedSelection] = useState<{ key: string; value: boolean } | null>(null);
  const libraryNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const individualNumbers = [...analysis.individualNumbers].sort(
    (left, right) => right.appearanceCount - left.appearanceCount || left.number - right.number,
  );
  const maxIndividualAppearance = Math.max(
    ...individualNumbers.map((item) => item.appearanceCount),
    1,
  );
  const maxDistribution = Math.max(...Object.values(analysis.matchDistribution), 1);
  const recent = analysis.recentMeaningfulMatch;
  const consecutiveLabel = analysis.shape.consecutiveGroups.length
    ? analysis.shape.consecutiveGroups
      .map((group) => `${formatNumber(group[0])}‑${formatNumber(group.at(-1)!)}`)
      .join(' · ')
    : '-';
  const analysisNumberKey = analysis.numbers.join('-');
  const favoriteSelected = favoriteSelection?.key === analysisNumberKey
    ? favoriteSelection.value
    : favorite;
  const purchasedSelected = purchasedSelection?.key === analysisNumberKey
    ? purchasedSelection.value
    : purchased;

  useEffect(() => () => {
    if (libraryNoticeTimerRef.current) clearTimeout(libraryNoticeTimerRef.current);
  }, []);

  const showLibraryNotice = (message: string) => {
    if (libraryNoticeTimerRef.current) clearTimeout(libraryNoticeTimerRef.current);
    setLibraryNotice(message);
    libraryNoticeTimerRef.current = setTimeout(() => setLibraryNotice(null), 1800);
  };

  const handleTogglePurchased = () => {
    const selected = !purchasedSelected;
    setPurchasedSelection({ key: analysisNumberKey, value: selected });
    onTogglePurchased();
    showLibraryNotice(selected ? '구매번호로 등록되었습니다.' : '구매번호에서 해제되었습니다.');
  };

  const handleToggleFavorite = () => {
    const selected = !favoriteSelected;
    setFavoriteSelection({ key: analysisNumberKey, value: selected });
    onToggleFavorite();
    showLibraryNotice(selected ? '즐겨찾기에 등록되었습니다.' : '즐겨찾기에서 해제되었습니다.');
  };

  return (
    <View style={styles.screen}>
      <SubScreenHeader
        onBack={onBack}
        right={(
          <Pressable
            accessibilityLabel="새 조합 분석"
            accessibilityRole="button"
            onPress={onStartOver}
            style={({ pressed }) => [styles.startOverButton, webPointerStyle, pressed && styles.pressed]}>
            <Ionicons color={styles.startOverIcon.color} name="refresh-outline" size={20} />
          </Pressable>
        )}
        title="조합 분석"
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        testID="combination-result-scroll">
      <AppCard style={styles.selectedProfile}>
        <View style={styles.profileLibraryActions}>
          <LibraryStatusActions
            favorite={favoriteSelected}
            onToggleFavorite={handleToggleFavorite}
            onTogglePurchased={handleTogglePurchased}
            purchased={purchasedSelected}
            testID="result-card-actions"
          />
        </View>
        <CombinationNumberPills numbers={analysis.numbers} />
        <Text style={styles.profileMeta}>
          <Text style={styles.profileMetaMuted}>최근 </Text>
          <Text style={styles.profileMetaStrong}>
            {recent?.prizeRank ? `${recent.prizeRank}등` : '-'}
          </Text>
          {recent?.prizeRank ? (
            <Text style={styles.profileMetaRound}> ({recent.round}회)</Text>
          ) : null}
          <Text style={styles.profileMetaSeparator}>  |  </Text>
          <Text style={styles.profileMetaMuted}>
            홀짝 {analysis.shape.oddCount}:{analysis.shape.evenCount}
            {' · '}합계 {analysis.shape.sum}
            {' · 연\u2060속\u00A0'}{consecutiveLabel}
          </Text>
        </Text>
        <Pressable
          accessibilityLabel={isPro ? '비교할 조합 추가' : '비교할 조합 추가, Pro 전용'}
          accessibilityRole="button"
          onPress={onCompare}
          style={({ pressed }) => [
            styles.compareButton,
            webPointerStyle,
            pressed && styles.pressed,
          ]}>
          <Text style={styles.compareText}>+ 비교할 조합 추가</Text>
          {!isPro ? <View style={styles.compareProBadge}><Text style={styles.compareProText}>PRO</Text></View> : null}
        </Pressable>
      </AppCard>

      <View style={styles.filterRow}>
        <AnalysisControls
          bonusIncluded={bonusIncluded}
          compact
          firstRound={firstRound}
          latestRound={latestRound}
          onBonusChange={onBonusChange}
          onPeriodChange={onPeriodChange}
          period={period}
          variant="plain"
        />
      </View>

      <AiCombinationExplanation
        analysis={analysis}
        isPro={isPro}
        onOpenPro={onOpenPro}
      />

      <AppCard style={styles.prizeSection} testID="result-section-prize">
        <View style={styles.prizeHeadingRow}>
          <Text style={styles.prizeSectionTitle}>과거 당첨 기록</Text>
          <Pressable
            accessibilityLabel="전체 기록"
            accessibilityRole="button"
            hitSlop={10}
            onPress={onOpenHistory}
            style={({ pressed }) => [
              styles.historyAction,
              webPointerStyle,
              pressed && styles.pressed,
            ]}>
            <Text style={styles.historyActionText}>전체 기록</Text>
            <Text style={styles.historyActionChevron}>›</Text>
          </Pressable>
        </View>
        <View style={styles.prizeRow}>
          {PRIZE_RANKS.map((rank, index) => {
            const disabled = analysis.prizeCounts[rank] === 0;
            return (
              <Pressable
                accessibilityLabel={`${rank}등 기록 ${analysis.prizeCounts[rank]}회`}
                accessibilityRole="button"
                accessibilityState={{ disabled }}
                disabled={disabled}
                key={rank}
                onPress={() => onOpenPrizeRank(rank)}
                style={({ pressed }) => [
                  styles.prizeItem,
                  index > 0 && styles.prizeDivider,
                  !disabled && webPointerStyle,
                  disabled && styles.prizeItemDisabled,
                  pressed && styles.prizeItemPressed,
                ]}>
                <Text style={styles.prizeLabel}>{rank}등</Text>
                <Text style={styles.prizeValue}>{analysis.prizeCounts[rank]}회</Text>
              </Pressable>
            );
          })}
        </View>
      </AppCard>

      <SectionCard testID="result-section-match-distribution" title="전체 회차 일치 분포">
        <Text style={styles.cardDescription}>
          선택 번호가 과거 각 회차에서 몇 개씩 일치했는지 보여줍니다.
        </Text>
        <View style={styles.distributionList}>
          {MATCH_COUNTS.map((count) => {
            const value = analysis.matchDistribution[count];
            const percentage = analysis.activeDrawCount
              ? (value / analysis.activeDrawCount) * 100
              : 0;
            return (
              <View
                accessibilityLabel={`${count}개 일치, ${value}회, ${percentage.toFixed(1)}%`}
                accessible
                key={count}
                style={styles.distributionRow}
                testID={`match-distribution-row-${count}`}>
                <Text style={styles.distributionLabel}>{count}개</Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { width: `${(value / maxDistribution) * 100}%` },
                    ]}
                    testID={`match-distribution-bar-${count}`}
                  />
                </View>
                <Text style={styles.distributionValue}>{value}회</Text>
                <Text style={styles.distributionPct}>{percentage.toFixed(1)}%</Text>
              </View>
            );
          })}
        </View>
      </SectionCard>

      <SectionCard testID="result-section-group-frequency" title="선택 번호 출현 빈도">
        <View style={styles.trendRow}>
          <View
            accessibilityLabel={`선택 6개 평균, ${analysis.groupFrequency.selectedAverage.toFixed(1)}회`}
            accessible
            style={styles.trendItem}>
            <Text style={styles.trendValue}>
              {analysis.groupFrequency.selectedAverage.toFixed(1)}회
            </Text>
            <Text style={styles.trendLabel}>선택 6개 평균</Text>
          </View>
          <View style={styles.trendDivider} />
          <View
            accessibilityLabel={`전체 번호 평균, ${analysis.groupFrequency.overallAverage.toFixed(1)}회`}
            accessible
            style={styles.trendItem}>
            <Text style={styles.trendValue}>
              {analysis.groupFrequency.overallAverage.toFixed(1)}회
            </Text>
            <Text style={styles.trendLabel}>전체 번호 평균</Text>
          </View>
        </View>
        <Text style={styles.comparisonText}>
          전체 평균 대비 {analysis.groupFrequency.differencePct >= 0 ? '+' : ''}
          {analysis.groupFrequency.differencePct.toFixed(1)}%
        </Text>
        <Text style={styles.cardNote}>선택한 분석 범위의 과거 출현 횟수 비교입니다.</Text>
      </SectionCard>

      <ConditionStatistics
        analysis={analysis}
        bonusIncluded={bonusIncluded}
        latestRound={latestRound}
      />

      <SectionCard title="번호별 분석">
        <View style={styles.numberBarList}>
          {individualNumbers.map((item) => (
            <View
              accessibilityLabel={`${item.number}번, ${item.appearanceCount}회, 전체 ${item.appearanceRank}위`}
              accessible
              key={item.number}
              style={styles.numberBarRow}
              testID={`individual-number-row-${item.number}`}>
              <Text style={styles.numberBarNumber}>{formatNumber(item.number)}</Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${(item.appearanceCount / maxIndividualAppearance) * 100}%` },
                  ]}
                  testID={`individual-number-bar-${item.number}`}
                />
              </View>
              <Text style={styles.numberBarCount}>{item.appearanceCount}회</Text>
              <Text style={styles.numberBarRank}>{item.appearanceRank}위</Text>
            </View>
          ))}
        </View>
      </SectionCard>

      <FrequentCombinations analysis={analysis} />
      </ScrollView>
      {libraryNotice ? (
        <Animated.View
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          entering={FadeIn.duration(140)}
          exiting={FadeOut.duration(140)}
          pointerEvents="none"
          style={styles.toastPositioner}
          testID="library-action-toast">
          <View style={styles.toast}>
            <Ionicons color={styles.toastText.color} name="checkmark-circle" size={17} />
            <Text style={styles.toastText}>{libraryNotice}</Text>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { flex: 1 },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  startOverButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startOverIcon: { color: colors.textSecondary },
  selectedProfile: {
    position: 'relative',
    alignItems: 'center',
    padding: spacing.lg,
    paddingTop: spacing.huge + spacing.sm,
  },
  compareButton: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  compareText: {
    color: colors.accentPrimary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.medium,
  },
  compareProBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.round, backgroundColor: colors.surfaceAccent },
  compareProText: { color: colors.accentPrimary, fontSize: 8, fontWeight: typography.weights.bold, letterSpacing: 0.6 },
  profileLibraryActions: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.md,
  },
  profileMeta: {
    alignSelf: 'stretch',
    color: colors.textSecondary,
    fontSize: typography.sizes.small,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  profileMetaStrong: {
    color: colors.highlight,
    fontWeight: typography.weights.semibold,
  },
  profileMetaRound: {
    color: colors.textSecondary,
  },
  profileMetaSeparator: {
    color: colors.neutral,
  },
  profileMetaMuted: {
    color: colors.textSecondary,
  },
  accountPrompt: {
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  accountPromptCopy: {
    flex: 1,
  },
  accountPromptTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
  },
  accountPromptDescription: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: typography.sizes.caption,
    lineHeight: 18,
  },
  accountPromptButton: {
    minWidth: 66,
    minHeight: 38,
    paddingHorizontal: spacing.md,
    borderRadius: radius.round,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAccent,
  },
  accountPromptButtonText: {
    color: colors.accentPrimary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  filterRow: {
    alignItems: 'flex-end',
    marginBottom: -spacing.xs,
  },
  toastPositioner: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: spacing.xl,
    alignItems: 'center',
    zIndex: 20,
    elevation: 8,
  },
  toast: {
    minHeight: 42,
    maxWidth: '90%',
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.round,
    backgroundColor: colors.textPrimary,
    boxShadow: colors.cardShadow,
  },
  toastText: {
    color: colors.background,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing.lg,
  },
  cardDescription: {
    color: colors.textSecondary,
    fontSize: typography.sizes.small,
    lineHeight: 19,
    marginBottom: spacing.lg,
  },
  cardNote: {
    color: colors.textSecondary,
    fontSize: typography.sizes.small,
    lineHeight: 19,
    marginTop: spacing.md,
  },
  conditionStatsDescription: {
    color: colors.textSecondary,
    fontSize: typography.sizes.caption,
    lineHeight: 18,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  conditionTabs: {
    marginHorizontal: -spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  conditionTabContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  conditionTab: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  conditionTabSelected: {
    borderBottomColor: colors.accentPrimary,
  },
  conditionTabText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.medium,
  },
  conditionTabTextSelected: {
    color: colors.highlight,
    fontWeight: typography.weights.semibold,
  },
  conditionStatList: {
    paddingTop: spacing.sm,
  },
  conditionStatRow: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  conditionStatRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  conditionStatLabel: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: typography.sizes.small,
  },
  conditionStatValue: {
    color: colors.textPrimary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  conditionStatsNote: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 17,
    marginTop: spacing.md,
  },
  prizeSection: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  prizeHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  prizeSectionTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: typography.weights.semibold,
  },
  historyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.md,
    paddingVertical: spacing.xs,
  },
  historyActionText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: typography.weights.medium,
  },
  historyActionChevron: {
    color: colors.textSecondary,
    fontSize: 14,
    marginLeft: 2,
  },
  prizeRow: {
    flexDirection: 'row',
  },
  prizeItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  prizeDivider: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: colors.divider,
  },
  prizeLabel: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  prizeValue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: typography.weights.semibold,
    marginTop: spacing.xs,
  },
  prizeItemDisabled: {
    opacity: 0.6,
  },
  prizeItemPressed: {
    opacity: 0.62,
  },
  pressed: {
    opacity: 0.7,
  },
  distributionList: {
    gap: spacing.md,
  },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distributionLabel: {
    width: 28,
    color: colors.textSecondary,
    fontSize: typography.sizes.small,
  },
  distributionValue: {
    width: 52,
    color: colors.textPrimary,
    fontSize: typography.sizes.small,
    textAlign: 'right',
  },
  distributionPct: {
    width: 48,
    color: colors.textSecondary,
    fontSize: typography.sizes.small,
    textAlign: 'right',
  },
  barTrack: {
    flex: 1,
    height: 6,
    borderRadius: radius.round,
    backgroundColor: colors.divider,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: radius.round,
    backgroundColor: colors.accentPrimary,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  trendItem: {
    flex: 1,
    alignItems: 'center',
  },
  trendDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
  },
  trendValue: {
    color: colors.highlight,
    fontSize: typography.sizes.section,
    fontWeight: typography.weights.semibold,
  },
  trendLabel: {
    color: colors.textSecondary,
    fontSize: typography.sizes.small,
    marginTop: spacing.xs,
  },
  comparisonText: {
    color: colors.highlight,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.medium,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  numberBarList: {
    gap: spacing.md,
  },
  numberBarRow: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  numberBarNumber: {
    width: 30,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: typography.weights.semibold,
    marginRight: spacing.sm,
  },
  numberBarCount: {
    width: 52,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: typography.weights.semibold,
    textAlign: 'right',
    marginLeft: spacing.sm,
  },
  numberBarRank: {
    width: 36,
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'right',
  },
  comboRow: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
  },
  comboRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  comboNumbers: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    paddingRight: spacing.md,
  },
  comboMetaGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  comboCount: {
    minWidth: 34,
    color: colors.highlight,
    fontSize: 14,
    fontWeight: typography.weights.medium,
    textAlign: 'right',
  },
  comboRound: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'right',
  },
  comboCountZero: {
    color: colors.textSecondary,
  },
  comboExpandAction: {
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  comboExpandText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: typography.weights.medium,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.small,
    lineHeight: 20,
    paddingVertical: spacing.md,
  },
  comboTabs: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  comboTab: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  comboTabSelected: {
    borderBottomColor: colors.accentPrimary,
  },
  comboTabFocused: {
    backgroundColor: colors.surfaceElevated,
  },
  comboTabText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: typography.weights.medium,
  },
  comboTabTextSelected: {
    color: colors.highlight,
    fontWeight: typography.weights.semibold,
  },
  comboList: {
    paddingTop: spacing.xs,
  },
});
