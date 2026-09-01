import Ionicons from '@expo/vector-icons/Ionicons';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { LottoDrawBalls } from '@/components/ui/LottoDrawBalls';
import { SubScreenHeader } from '@/components/ui/AppTopBar';
import type { NumberAppearanceHistoryItem } from '@/domain/analytics/numberHistory';
import { type ThemeColors, radius, spacing, typography, useThemedStyles } from '@/theme';

type NumberHistoryDetailProps = {
  entries: readonly NumberAppearanceHistoryItem[];
  number: number;
  onBack: () => void;
};

export function NumberHistoryDetail({ entries, number, onBack }: NumberHistoryDetailProps) {
  const styles = useThemedStyles(createStyles);
  const { width } = useWindowDimensions();
  const compact = width <= 360;

  return (
    <View style={styles.screen}>
      <SubScreenHeader
        backAccessibilityLabel="번호분석으로 돌아가기"
        onBack={onBack}
        title={`${number}번 출현 기록`}
      />

      <ScrollView
        contentContainerStyle={[styles.content, compact && styles.contentCompact]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard} testID="number-history-summary">
          <View style={styles.numberBadge}>
            <Text style={styles.numberBadgeValue}>{number}</Text>
          </View>
          <View style={styles.summaryCopy}>
            <Text style={styles.summaryTitle}>{number}번 출현 기록</Text>
            <Text style={styles.summaryDescription}>선택한 번호가 등장한 회차와 직전 출현 간격입니다.</Text>
          </View>
          <View style={styles.summaryCount}>
            <Text style={styles.summaryValue}>총 {entries.length}회</Text>
            <Text style={styles.summaryUnit}>등장</Text>
          </View>
        </View>

        <View style={styles.listHeading}>
          <View>
            <Text style={styles.listTitle}>회차별 기록</Text>
            <Text style={styles.listDescription}>최근 회차부터 표시됩니다</Text>
          </View>
          <Ionicons color={styles.listIcon.color} name="time-outline" size={18} />
        </View>

        {entries.length ? (
          <View style={styles.listCard}>
            {entries.map((entry, index) => (
              <View
                key={entry.round}
                style={[
                  styles.row,
                  index > 0 && styles.rowDivider,
                ]}
                testID={`number-history-row-${entry.round}`}>
                <View style={styles.rowMeta}>
                  <Text
                    style={styles.round}
                    testID={`number-history-round-${entry.round}`}>
                    {entry.round}회
                  </Text>
                  <Text style={styles.gap}>
                    {entry.gapSincePrevious === null
                      ? '첫 등장'
                      : `${entry.gapSincePrevious}회 만에 등장`}
                  </Text>
                </View>
                <LottoDrawBalls
                  bonus={entry.bonus}
                  highlightedNumbers={[number]}
                  numbers={entry.numbers}
                  size={compact ? 22 : 24}
                  style={styles.balls}
                />
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons color={styles.emptyIcon.color} name="calendar-clear-outline" size={26} />
            <Text style={styles.empty}>출현 기록이 없습니다.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.huge,
  },
  contentCompact: {
    paddingHorizontal: spacing.md,
  },
  summaryCard: {
    minHeight: 108,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
  },
  numberBadge: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    backgroundColor: colors.surfaceAccent,
  },
  numberBadgeValue: {
    color: colors.accentPrimary,
    fontSize: typography.sizes.section,
    fontWeight: typography.weights.bold,
    fontVariant: ['tabular-nums'],
  },
  summaryCopy: {
    flex: 1,
    minWidth: 0,
  },
  summaryTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    letterSpacing: -0.3,
  },
  summaryDescription: {
    color: colors.textSecondary,
    fontSize: typography.sizes.caption,
    lineHeight: 17,
    marginTop: spacing.xs,
  },
  summaryCount: {
    alignItems: 'flex-end',
  },
  summaryValue: {
    color: colors.accentPrimary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    fontVariant: ['tabular-nums'],
  },
  summaryUnit: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  listHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
  },
  listTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
  },
  listDescription: {
    color: colors.textSecondary,
    fontSize: typography.sizes.caption,
    marginTop: spacing.xs,
  },
  listIcon: {
    color: colors.accentPrimary,
  },
  listCard: {
    overflow: 'hidden',
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
  },
  row: {
    minHeight: 78,
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  rowMeta: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  round: {
    flexShrink: 0,
    color: colors.textPrimary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    fontVariant: ['tabular-nums'],
  },
  balls: {
    alignSelf: 'flex-start',
  },
  gap: {
    flexShrink: 0,
    color: colors.textSecondary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.medium,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  empty: {
    color: colors.textSecondary,
    fontSize: typography.sizes.small,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  emptyCard: {
    minHeight: 140,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
  },
  emptyIcon: {
    color: colors.textTertiary,
  },
});
