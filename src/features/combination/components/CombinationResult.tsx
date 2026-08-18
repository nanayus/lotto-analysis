import { Platform, Pressable, ScrollView, StyleSheet, Text, View, ViewStyle } from 'react-native';

import type { AnalysisPeriod } from '@/domain/analytics/types';
import type { CombinationAnalysis, CombinationSize, PrizeRank } from '@/domain/combination/types';
import { colors, radius, spacing, typography } from '@/theme';
import { AnalysisControls } from '@/features/explore/components/AnalysisControls';

type CombinationResultProps = {
  analysis: CombinationAnalysis;
  bonusIncluded: boolean;
  firstRound: number;
  latestRound: number;
  onBonusChange: (included: boolean) => void;
  onOpenHistory: () => void;
  onOpenPrizeRank: (rank: PrizeRank) => void;
  onOpenSubCombinations: (size: CombinationSize) => void;
  onPeriodChange: (period: AnalysisPeriod) => void;
  onStartOver: () => void;
  period: AnalysisPeriod;
};

const VISIBLE_COMBINATION_SIZES = [2, 3, 4] as const;
const MATCH_COUNTS = [6, 5, 4, 3, 2, 1, 0] as const;
const PRIZE_RANKS = [1, 2, 3, 4, 5] as const;
const webPointerStyle = Platform.select({
  web: { cursor: 'pointer' } as unknown as ViewStyle,
});

function formatNumber(number: number) {
  return String(number).padStart(2, '0');
}

function analysisCondition(
  period: AnalysisPeriod,
  activeDrawCount: number,
  bonusIncluded: boolean,
) {
  const periodLabel = period.kind === 'custom'
    ? `${period.startRound}회 ~ ${period.endRound}회`
    : period.label === '전체'
      ? `총 ${activeDrawCount}회`
      : period.label;
  return `${periodLabel} · 보너스 ${bonusIncluded ? '포함' : '제외'}`;
}

function NumberPills({ numbers, compact = false }: { compact?: boolean; numbers: number[] }) {
  return (
    <View style={styles.numberPills}>
      {numbers.map((number) => (
        <View key={number} style={[styles.numberPill, compact && styles.numberPillCompact]}>
          <Text style={[styles.numberPillText, compact && styles.numberPillTextCompact]}>
            {formatNumber(number)}
          </Text>
        </View>
      ))}
    </View>
  );
}

function SectionCard({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function DetailButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.detailButton, pressed && styles.pressed]}>
      <Text style={styles.detailButtonText}>{label}</Text>
      <Text style={styles.detailChevron}>›</Text>
    </Pressable>
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
  onOpenSubCombinations,
  onPeriodChange,
  onStartOver,
  period,
}: CombinationResultProps) {
  const maxDistribution = Math.max(...Object.values(analysis.matchDistribution), 1);
  const recent = analysis.recentMeaningfulMatch;
  const consecutiveLabel = analysis.shape.consecutiveGroups.length
    ? analysis.shape.consecutiveGroups
      .map((group) => `${formatNumber(group[0])}–${formatNumber(group.at(-1)!)}`)
      .join(' · ')
    : '없음';

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      testID="combination-result-scroll">
      <View style={styles.topBar}>
        <View>
          <Text style={styles.eyebrow}>HISTORICAL COMPARISON</Text>
          <Text style={styles.title}>분석 결과</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={onStartOver}
          style={({ pressed }) => [styles.startOverButton, pressed && styles.pressed]}>
          <Text style={styles.startOverText}>새로하기</Text>
        </Pressable>
      </View>

      <View style={styles.selectedHeader}>
        <Text style={styles.sectionCaption}>내 번호</Text>
        <NumberPills numbers={analysis.numbers} />
        <AnalysisControls
          bonusIncluded={bonusIncluded}
          firstRound={firstRound}
          latestRound={latestRound}
          onBonusChange={onBonusChange}
          onPeriodChange={onPeriodChange}
          period={period}
        />
        <Text style={styles.filterDescription}>
          {analysisCondition(period, analysis.activeDrawCount, bonusIncluded)}
        </Text>
      </View>

      <SectionCard title="한눈에 보기">
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{analysis.highestMainMatch}개</Text>
            <Text style={styles.summaryLabel}>최고 일치</Text>
          </View>
          <View style={[styles.summaryItem, styles.summaryDivider]}>
            <Text style={styles.summaryValue}>{analysis.sameSixCount}회</Text>
            <Text style={styles.summaryLabel}>동일 조합 출현</Text>
          </View>
          <View style={[styles.summaryItem, styles.summaryWide]}>
            <Text style={styles.summaryValue}>
              {recent ? `${recent.mainMatchCount}개 · ${recent.round}회` : '기록 없음'}
            </Text>
            <Text style={styles.summaryLabel}>최근 3개 이상 일치</Text>
          </View>
        </View>
      </SectionCard>

      <SectionCard title="과거 등수 기록">
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
        <Text style={styles.cardNote}>과거 당첨번호와 비교한 결과입니다.</Text>
        <DetailButton label="전체 기록 보기" onPress={onOpenHistory} />
      </SectionCard>

      <SectionCard title="번호별 분석">
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, styles.tableNumber]}>번호</Text>
          <Text style={[styles.tableHeaderText, styles.tableMetric]}>출현 횟수</Text>
          <Text style={[styles.tableHeaderText, styles.tableMetric]}>순위 (1–45)</Text>
        </View>
        {analysis.individualNumbers.map((item) => (
          <View key={item.number} style={styles.tableRow}>
            <Text style={[styles.tableText, styles.tableNumber]}>{formatNumber(item.number)}</Text>
            <Text style={[styles.tableText, styles.tableMetric]}>{item.appearanceCount}회</Text>
            <Text style={[styles.tableText, styles.tableMetric]}>{item.appearanceRank}위</Text>
          </View>
        ))}
      </SectionCard>

      <SectionCard title="선택 번호 출현 빈도">
        <View style={styles.trendRow}>
          <View style={styles.trendItem}>
            <Text style={styles.trendValue}>{analysis.groupFrequency.selectedAverage.toFixed(1)}회</Text>
            <Text style={styles.trendLabel}>선택 6개 평균</Text>
          </View>
          <View style={styles.trendDivider} />
          <View style={styles.trendItem}>
            <Text style={styles.trendValue}>{analysis.groupFrequency.overallAverage.toFixed(1)}회</Text>
            <Text style={styles.trendLabel}>전체 번호 평균</Text>
          </View>
        </View>
        <Text style={styles.comparisonText}>
          전체 평균 대비 {analysis.groupFrequency.differencePct >= 0 ? '+' : ''}
          {analysis.groupFrequency.differencePct.toFixed(1)}%
        </Text>
        <Text style={styles.cardNote}>선택한 분석 범위의 과거 출현 횟수 비교입니다.</Text>
      </SectionCard>

      <SectionCard title="전체 회차 일치 분포">
        <Text style={styles.cardDescription}>
          선택 번호가 과거 각 회차에서 몇 개씩 일치했는지 보여줍니다.
        </Text>
        <View style={styles.distributionList}>
          {MATCH_COUNTS.map((count) => {
            const value = analysis.matchDistribution[count];
            const percentage = analysis.activeDrawCount ? (value / analysis.activeDrawCount) * 100 : 0;
            return (
              <View key={count} style={styles.distributionRow}>
                <Text style={styles.distributionLabel}>{count}개</Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { width: `${(value / maxDistribution) * 100}%` },
                    ]}
                  />
                </View>
                <Text style={styles.distributionValue}>{value}회</Text>
                <Text style={styles.distributionPct}>{percentage.toFixed(1)}%</Text>
              </View>
            );
          })}
        </View>
      </SectionCard>

      <Text style={styles.groupHeading}>함께 나온 조합</Text>
      {VISIBLE_COMBINATION_SIZES.map((size) => {
        const top = analysis.subCombinations[size].filter((item) => item.appearanceCount > 0).slice(0, 3);
        return (
          <SectionCard key={size} title={`${size}개 조합 · TOP 3`}>
            {top.length ? top.map((item) => (
              <View key={item.numbers.join('-')} style={styles.comboRow}>
                <Text style={styles.comboNumbers}>{item.numbers.map(formatNumber).join(' · ')}</Text>
                <View style={styles.comboMeta}>
                  <Text style={styles.comboCount}>{item.appearanceCount}회</Text>
                  <Text style={styles.comboRound}>
                    {item.latestRound ? `최근 ${item.latestRound}회` : ''}
                  </Text>
                </View>
              </View>
            )) : (
              <Text style={styles.emptyText}>선택 범위에서 동시 출현 기록이 없습니다.</Text>
            )}
            <DetailButton label={`전체 ${analysis.subCombinations[size].length}개 보기`} onPress={() => onOpenSubCombinations(size)} />
          </SectionCard>
        );
      })}

      <SectionCard title="번호 구성">
        <View style={styles.shapeRow}>
          <View style={styles.shapeItem}>
            <Text style={styles.shapeLabel}>홀수 : 짝수</Text>
            <Text style={styles.shapeValue}>{analysis.shape.oddCount} : {analysis.shape.evenCount}</Text>
          </View>
          <View style={styles.shapeItem}>
            <Text style={styles.shapeLabel}>번호 합계</Text>
            <Text style={styles.shapeValue}>{analysis.shape.sum}</Text>
          </View>
        </View>
        <View style={styles.consecutiveRow}>
          <Text style={styles.shapeLabel}>연속 번호</Text>
          <Text style={styles.consecutiveValue}>{consecutiveLabel}</Text>
        </View>
      </SectionCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
    marginBottom: spacing.xs,
  },
  eyebrow: {
    color: colors.textSecondary,
    fontSize: 9,
    letterSpacing: 1.5,
    marginBottom: spacing.xs,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.sizes.section,
    fontWeight: typography.weights.semibold,
  },
  startOverButton: {
    minWidth: 72,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
  },
  startOverText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.medium,
  },
  selectedHeader: {
    paddingVertical: spacing.sm,
  },
  sectionCaption: {
    color: colors.textSecondary,
    fontSize: typography.sizes.small,
    marginBottom: spacing.md,
  },
  numberPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  numberPill: {
    width: 44,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: colors.accentPrimary,
    backgroundColor: '#252E6D',
  },
  numberPillCompact: {
    width: 34,
    height: 30,
  },
  numberPillText: {
    color: colors.highlight,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
  },
  numberPillTextCompact: {
    fontSize: typography.sizes.caption,
  },
  filterDescription: {
    color: colors.textSecondary,
    fontSize: typography.sizes.small,
    textAlign: 'right',
    marginTop: spacing.sm,
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
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing.lg,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  summaryItem: {
    width: '50%',
    paddingRight: spacing.md,
  },
  summaryDivider: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: colors.divider,
    paddingLeft: spacing.lg,
  },
  summaryWide: {
    width: '100%',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
  },
  summaryValue: {
    color: colors.highlight,
    fontSize: typography.sizes.section,
    fontWeight: typography.weights.semibold,
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontSize: typography.sizes.small,
    marginTop: spacing.xs,
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
    fontSize: typography.sizes.small,
  },
  prizeValue: {
    color: colors.textPrimary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    marginTop: spacing.xs,
  },
  prizeItemDisabled: {
    opacity: 0.42,
  },
  prizeItemPressed: {
    opacity: 0.62,
  },
  cardNote: {
    color: colors.textSecondary,
    fontSize: typography.sizes.small,
    lineHeight: 19,
    marginTop: spacing.md,
  },
  cardDescription: {
    color: colors.textSecondary,
    fontSize: typography.sizes.small,
    lineHeight: 19,
    marginBottom: spacing.lg,
  },
  detailButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    backgroundColor: '#171C2A',
    marginTop: spacing.lg,
  },
  detailButtonText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.medium,
  },
  detailChevron: {
    color: colors.textSecondary,
    fontSize: typography.sizes.body,
    marginLeft: spacing.xs,
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
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  tableHeaderText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.small,
  },
  tableRow: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  tableText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.small,
  },
  tableNumber: {
    width: '25%',
  },
  tableMetric: {
    width: '37.5%',
    textAlign: 'right',
  },
  shapeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  shapeItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: '#0D101A',
  },
  shapeLabel: {
    color: colors.textSecondary,
    fontSize: typography.sizes.small,
  },
  shapeValue: {
    color: colors.textPrimary,
    fontSize: typography.sizes.section,
    fontWeight: typography.weights.semibold,
    marginTop: spacing.sm,
  },
  consecutiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  consecutiveValue: {
    color: colors.textPrimary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.medium,
  },
  comboRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  comboNumbers: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.sizes.small,
  },
  comboMeta: {
    alignItems: 'flex-end',
    marginLeft: spacing.sm,
  },
  comboCount: {
    color: colors.highlight,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.medium,
  },
  comboRound: {
    color: colors.textSecondary,
    fontSize: typography.sizes.caption,
    marginTop: 2,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.small,
    lineHeight: 20,
  },
  groupHeading: {
    color: colors.textPrimary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
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
});
