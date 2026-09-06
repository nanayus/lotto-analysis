import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { SubScreenHeader } from '@/components/ui/AppTopBar';
import type { AnalysisPeriod, AnalyticsSnapshot } from '@/domain/analytics/types';
import {
  type ThemeColors,
  radius,
  spacing,
  typography,
  useAppTheme,
  useThemedStyles,
} from '@/theme';

import { AnalysisControls } from './AnalysisControls';

const WIDE_GRID_BREAKPOINT = 480;
const MOBILE_COLUMN_COUNT = 5;
const WIDE_COLUMN_COUNT = 10;
const RING_SIZE = 42;
const RING_STROKE = 3;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

type ComparisonMetric = 'appearanceCount' | 'currentGap';
type ComparisonOrder = 'number' | 'appearanceRank' | 'currentGap';

const comparisonMetrics: readonly { key: ComparisonMetric; label: string }[] = [
  { key: 'appearanceCount', label: '출현 횟수' },
  { key: 'currentGap', label: '현재 미출현 횟수' },
];

const comparisonOrders: readonly { key: ComparisonOrder; label: string }[] = [
  { key: 'number', label: '번호순' },
  { key: 'appearanceRank', label: '출현 순위순' },
  { key: 'currentGap', label: '미출현 많은 순' },
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

type MetricRingProps = {
  number: number;
  progress: number;
  selected: boolean;
};

function MetricRing({ number, progress, selected }: MetricRingProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View
      style={[styles.ring, selected && styles.ringSelected]}
      testID={`all-number-ball-${number}`}>
      <Svg
        aria-hidden
        height={RING_SIZE}
        style={[StyleSheet.absoluteFill, styles.ringSvg]}
        width={RING_SIZE}>
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          fill="transparent"
          r={RING_RADIUS}
          stroke={colors.divider}
          strokeWidth={RING_STROKE}
        />
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          fill="transparent"
          r={RING_RADIUS}
          stroke={selected ? colors.accentPrimary : colors.textTertiary}
          strokeDasharray={`${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
          strokeDashoffset={RING_CIRCUMFERENCE * (1 - progress)}
          strokeLinecap="round"
          strokeWidth={RING_STROKE}
          testID={`all-number-progress-${number}`}
          transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
        />
      </Svg>
      <Text style={[styles.number, selected && styles.numberSelected]}>
        {String(number).padStart(2, '0')}
      </Text>
    </View>
  );
}

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
  const styles = useThemedStyles(createStyles);
  const { width } = useWindowDimensions();
  const [metric, setMetric] = useState<ComparisonMetric>('appearanceCount');
  const [order, setOrder] = useState<ComparisonOrder>('number');
  const [orderSelectorVisible, setOrderSelectorVisible] = useState(false);
  const selectedOrder = comparisonOrders.find((option) => option.key === order) ?? comparisonOrders[0];
  const columnCount = width >= WIDE_GRID_BREAKPOINT
    ? WIDE_COLUMN_COUNT
    : MOBILE_COLUMN_COUNT;
  const numbers = useMemo(() => Object.values(snapshot.numbers).sort((left, right) => {
    if (order === 'appearanceRank') {
      return left.appearanceRank - right.appearanceRank || left.number - right.number;
    }
    if (order === 'currentGap') {
      return right.currentGap - left.currentGap || left.number - right.number;
    }
    return left.number - right.number;
  }), [order, snapshot.numbers]);
  const maxMetricValue = useMemo(
    () => Math.max(...numbers.map((item) => item[metric]), 1),
    [metric, numbers],
  );
  const rows = Array.from(
    { length: Math.ceil(numbers.length / columnCount) },
    (_, index) => numbers.slice(index * columnCount, (index + 1) * columnCount),
  );

  return (
    <View style={styles.screen}>
      <SubScreenHeader
        backAccessibilityLabel="번호분석으로 돌아가기"
        onBack={onBack}
        title="전체 번호 비교"
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.introRow}>
          <View style={styles.introCopy}>
            <Text style={styles.introTitle}>1–45 번호 비교</Text>
            <Text style={styles.introDescription}>같은 기준으로 모든 번호를 한눈에 살펴보세요.</Text>
          </View>
          <View style={styles.selectionBadge}>
            <Text style={styles.selectionLabel}>선택</Text>
            <Text style={styles.selectionNumber}>{selectedNumber}</Text>
          </View>
        </View>

        <View style={styles.filterBar}>
          <Text style={styles.filterTitle}>보기 설정</Text>
          <View style={styles.viewControls}>
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
            <View style={styles.controlDivider} />
            <Pressable
              accessibilityLabel={`정렬 ${selectedOrder.label}`}
              accessibilityRole="button"
              onPress={() => setOrderSelectorVisible(true)}
              style={({ pressed }) => [styles.filterOrderButton, pressed && styles.pressed]}
              testID="all-number-order-button">
              <Ionicons color={styles.filterOrderButtonText.color} name="swap-vertical-outline" size={14} />
              <Text style={styles.filterOrderButtonText}>{selectedOrder.label}</Text>
              <Text style={styles.orderChevron}>⌄</Text>
            </Pressable>
          </View>
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
                    <MetricRing
                      number={item.number}
                      progress={metricValue / maxMetricValue}
                      selected={selected}
                    />
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

      <Modal
        animationType="fade"
        onRequestClose={() => setOrderSelectorVisible(false)}
        transparent
        visible={orderSelectorVisible}>
        <Pressable onPress={() => setOrderSelectorVisible(false)} style={styles.backdrop}>
          <Pressable onPress={() => undefined} style={styles.orderSheet}>
            <Text style={styles.orderSheetTitle}>정렬</Text>
            {comparisonOrders.map((option) => {
              const selected = order === option.key;
              return (
                <Pressable
                  accessibilityLabel={`${option.label}으로 정렬`}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  key={option.key}
                  onPress={() => {
                    setOrder(option.key);
                    setOrderSelectorVisible(false);
                  }}
                  style={({ pressed }) => [
                    styles.orderSheetOption,
                    selected && styles.orderSheetOptionSelected,
                    pressed && styles.pressed,
                  ]}
                  testID={`all-number-order-${option.key}`}>
                  <Text style={[styles.orderSheetOptionText, selected && styles.orderSheetOptionTextSelected]}>
                    {option.label}
                  </Text>
                  {selected ? <Text style={styles.orderCheck}>✓</Text> : null}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.sizes.section,
    fontWeight: typography.weights.semibold,
    letterSpacing: -0.5,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.huge,
  },
  introRow: {
    minHeight: 96,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.lg,
  },
  introCopy: {
    flex: 1,
  },
  introTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    letterSpacing: -0.35,
  },
  introDescription: {
    color: colors.textSecondary,
    fontSize: typography.sizes.caption,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  selectionBadge: {
    minWidth: 64,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    backgroundColor: colors.surfaceAccent,
  },
  selectionLabel: {
    color: colors.textSecondary,
    fontSize: 10,
  },
  selectionNumber: {
    color: colors.accentPrimary,
    fontSize: typography.sizes.section,
    fontWeight: typography.weights.bold,
    fontVariant: ['tabular-nums'],
  },
  filterBar: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
  },
  filterTitle: {
    color: colors.textSecondary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  viewControls: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  controlDivider: {
    width: StyleSheet.hairlineWidth,
    height: 20,
    marginHorizontal: spacing.xs,
    backgroundColor: colors.borderStrong,
  },
  filterOrderButton: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.sm,
  },
  filterOrderButtonText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.medium,
  },
  metricFilters: {
    minHeight: 44,
    flexDirection: 'row',
    marginTop: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  metricFilter: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
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
    color: colors.accentPrimary,
    fontWeight: typography.weights.semibold,
  },
  orderChevron: {
    color: colors.textTertiary,
    fontSize: 12,
    marginTop: -2,
  },
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    backgroundColor: colors.backdrop,
  },
  orderSheet: {
    width: '100%',
    maxWidth: 280,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.background,
  },
  orderSheetTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing.sm,
  },
  orderSheetOption: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  orderSheetOptionSelected: {
    backgroundColor: colors.surfaceAccent,
  },
  orderSheetOptionText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.small,
  },
  orderSheetOptionTextSelected: {
    color: colors.accentPrimary,
    fontWeight: typography.weights.semibold,
  },
  orderCheck: {
    color: colors.accentPrimary,
    fontSize: typography.sizes.small,
  },
  grid: {
    width: '100%',
    marginTop: spacing.lg,
    overflow: 'hidden',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
  },
  gridRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  item: {
    minHeight: 74,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  ring: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
  },
  ringSelected: {
    backgroundColor: colors.surfaceAccent,
  },
  ringSvg: {
    pointerEvents: 'none',
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
    fontSize: typography.sizes.caption,
    fontVariant: ['tabular-nums'],
  },
  countSelected: {
    color: colors.accentPrimary,
  },
  pressed: {
    opacity: 0.65,
  },
});
