import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, ViewStyle } from 'react-native';

import type { AnalysisPeriod } from '@/domain/analytics/types';
import type { CombinationAnalysis, CombinationSize, PrizeRank } from '@/domain/combination/types';
import { type ThemeColors, radius, spacing, typography, useThemedStyles } from '@/theme';
import { AnalysisControls } from '@/features/explore/components/AnalysisControls';

type CombinationResultProps = {
  analysis: CombinationAnalysis;
  bonusIncluded: boolean;
  firstRound: number;
  latestRound: number;
  onBonusChange: (included: boolean) => void;
  onOpenHistory: () => void;
  onOpenPrizeRank: (rank: PrizeRank) => void;
  onPeriodChange: (period: AnalysisPeriod) => void;
  onStartOver: () => void;
  onCompare: () => void;
  period: AnalysisPeriod;
};

const VISIBLE_COMBINATION_SIZES = [2, 3, 4] as const;
const PRIZE_RANKS = [1, 2, 3, 4, 5] as const;
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

function NumberPills({ numbers }: { numbers: number[] }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.numberPills}>
      {numbers.map((number) => (
        <View key={number} style={styles.numberPill}>
          <Text style={styles.numberPillText}>{formatNumber(number)}</Text>
        </View>
      ))}
    </View>
  );
}

function SectionCard({ children, title }: {
  children: React.ReactNode;
  title?: string;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.card}>
      {title ? <Text style={styles.cardTitle}>{title}</Text> : null}
      {children}
    </View>
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
  onOpenHistory,
  onOpenPrizeRank,
  onPeriodChange,
  onStartOver,
  onCompare,
  period,
}: CombinationResultProps) {
  const styles = useThemedStyles(createStyles);
  const individualNumbers = [...analysis.individualNumbers].sort(
    (left, right) => right.appearanceCount - left.appearanceCount || left.number - right.number,
  );
  const maxIndividualAppearance = Math.max(
    ...individualNumbers.map((item) => item.appearanceCount),
    1,
  );
  const recent = analysis.recentMeaningfulMatch;
  const consecutiveLabel = analysis.shape.consecutiveGroups.length
    ? analysis.shape.consecutiveGroups
      .map((group) => `${formatNumber(group[0])}‑${formatNumber(group.at(-1)!)}`)
      .join(' · ')
    : '-';

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      testID="combination-result-scroll">
      <View style={styles.topBar}>
        <Text style={styles.title}>조합 분석</Text>
        <Pressable
          accessibilityLabel="새 조합 분석"
          accessibilityRole="button"
          onPress={onStartOver}
          style={({ pressed }) => [
            styles.startOverButton,
            webPointerStyle,
            pressed && styles.pressed,
          ]}>
          <Text style={styles.startOverText}>↻ 새로하기</Text>
        </Pressable>
      </View>

      <View style={styles.selectedProfile}>
        <NumberPills numbers={analysis.numbers} />
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
          accessibilityLabel="비교할 조합 추가"
          accessibilityRole="button"
          onPress={onCompare}
          style={({ pressed }) => [
            styles.compareButton,
            webPointerStyle,
            pressed && styles.pressed,
          ]}>
          <Text style={styles.compareText}>+ 비교할 조합 추가</Text>
        </Pressable>
      </View>

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

      <View style={styles.prizeSection}>
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
      </View>

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
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.sizes.section,
    fontWeight: typography.weights.semibold,
  },
  startOverButton: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: spacing.md,
  },
  startOverText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.medium,
  },
  selectedProfile: {
    alignItems: 'center',
  },
  compareButton: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  compareText: {
    color: colors.accentPrimary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.medium,
  },
  numberPills: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    width: '100%',
  },
  numberPill: {
    width: '13%',
    maxWidth: 48,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: colors.accentPrimary,
    backgroundColor: colors.surfaceAccent,
  },
  numberPillText: {
    color: colors.highlight,
    fontSize: 18,
    fontWeight: typography.weights.semibold,
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
  filterRow: {
    alignItems: 'flex-end',
    marginBottom: -spacing.xs,
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
