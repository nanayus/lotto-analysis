import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import type { AnalysisPeriod, AnalyticsSnapshot } from '@/domain/analytics/types';
import { colors, radius, spacing, typography } from '@/theme';

import { AnalysisControls } from './AnalysisControls';

const WIDE_GRID_BREAKPOINT = 480;
const MOBILE_COLUMN_COUNT = 5;
const WIDE_COLUMN_COUNT = 10;

type ComparisonMetric = 'appearanceCount' | 'currentGap';

const comparisonMetrics: readonly { key: ComparisonMetric; label: string }[] = [
  { key: 'appearanceCount', label: '출현 횟수' },
  { key: 'currentGap', label: '현재 미출현 횟수' },
];

type AllNumberComparisonProps = {
  bonusIncluded: boolean;
  firstRound: number;
  latestRound: number;
  onBack: () => void;
  onBonusChange: (included: boolean) => void;
  onPeriodChange: (period: AnalysisPeriod) => void;
  onSelect: (number: number) => void;
  period: AnalysisPeriod;
  selectedNumber: number;
  snapshot: AnalyticsSnapshot;
};

export function AllNumberComparison({
  bonusIncluded,
  firstRound,
  latestRound,
  onBack,
  onBonusChange,
  onPeriodChange,
  onSelect,
  period,
  selectedNumber,
  snapshot,
}: AllNumberComparisonProps) {
  const { width } = useWindowDimensions();
  const [metric, setMetric] = useState<ComparisonMetric>('appearanceCount');
  const columnCount = width >= WIDE_GRID_BREAKPOINT
    ? WIDE_COLUMN_COUNT
    : MOBILE_COLUMN_COUNT;
  const numbers = Object.values(snapshot.numbers).sort((a, b) => a.number - b.number);
  const rows = Array.from(
    { length: Math.ceil(numbers.length / columnCount) },
    (_, index) => numbers.slice(index * columnCount, (index + 1) * columnCount),
  );

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="탐색으로 돌아가기"
          accessibilityRole="button"
          onPress={onBack}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <Text style={styles.title}>전체 번호</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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

        <View style={styles.metricFilters}>
          {comparisonMetrics.map((option) => {
            const selected = metric === option.key;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected }}
                key={option.key}
                onPress={() => setMetric(option.key)}
                style={({ pressed }) => [
                  styles.metricFilter,
                  selected && styles.metricFilterSelected,
                  pressed && styles.pressed,
                ]}
                testID={`all-number-metric-${option.key}`}>
                <Text style={[styles.metricFilterText, selected && styles.metricFilterTextSelected]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.grid} testID={`all-number-grid-${columnCount}-columns`}>
          {rows.map((row, rowIndex) => (
            <View
              key={row[0].number}
              style={[styles.gridRow, rowIndex > 0 && styles.rowDivider]}
              testID={`all-number-row-${rowIndex + 1}`}>
              {row.map((item) => {
                const selected = item.number === selectedNumber;
                const metricLabel = metric === 'appearanceCount'
                  ? '출현 횟수'
                  : '현재 미출현 횟수';
                const metricValue = item[metric];
                return (
                  <Pressable
                    accessibilityLabel={`${item.number}번, ${metricLabel} ${metricValue}회`}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    key={item.number}
                    onPress={() => onSelect(item.number)}
                    style={({ pressed }) => [
                      styles.item,
                      { width: `${100 / columnCount}%` },
                      pressed && styles.pressed,
                    ]}
                    testID={`all-number-item-${item.number}`}>
                    <View
                      style={[styles.ball, selected && styles.ballSelected]}
                      testID={`all-number-ball-${item.number}`}>
                      <Text style={[styles.number, selected && styles.numberSelected]}>
                        {String(item.number).padStart(2, '0')}
                      </Text>
                    </View>
                    <Text style={[styles.count, selected && styles.countSelected]}>
                      {metricValue}회
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
    paddingHorizontal: spacing.sm,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    color: colors.textPrimary,
    fontSize: 32,
    lineHeight: 34,
    fontWeight: typography.weights.regular,
  },
  title: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  filterRow: {
    alignItems: 'flex-end',
    paddingVertical: spacing.md,
  },
  metricFilters: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  metricFilter: {
    minHeight: 44,
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  metricFilterSelected: {
    borderBottomColor: colors.accentPrimary,
  },
  metricFilterText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.medium,
  },
  metricFilterTextSelected: {
    color: colors.textPrimary,
    fontWeight: typography.weights.semibold,
  },
  grid: {
    width: '100%',
  },
  gridRow: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  item: {
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  ball: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
  },
  ballSelected: {
    borderColor: colors.accentPrimary,
    backgroundColor: '#171E48',
  },
  number: {
    color: colors.textPrimary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    fontVariant: ['tabular-nums'],
  },
  numberSelected: {
    color: colors.highlight,
  },
  count: {
    color: colors.textSecondary,
    fontSize: typography.sizes.small,
    fontVariant: ['tabular-nums'],
  },
  countSelected: {
    color: colors.accentPrimary,
  },
  pressed: {
    opacity: 0.65,
  },
});
