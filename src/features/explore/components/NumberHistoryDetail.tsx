import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { LottoDrawBalls } from '@/components/ui/LottoDrawBalls';
import type { NumberAppearanceHistoryItem } from '@/domain/analytics/numberHistory';
import { colors, spacing, typography } from '@/theme';

type NumberHistoryDetailProps = {
  entries: readonly NumberAppearanceHistoryItem[];
  number: number;
  onBack: () => void;
};

export function NumberHistoryDetail({ entries, number, onBack }: NumberHistoryDetailProps) {
  const { width } = useWindowDimensions();
  const compact = width <= 360;

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
        <Text style={styles.title}>상세보기</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, compact && styles.contentCompact]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.listSummary} testID="number-history-summary">
          <Text style={styles.summaryValue}>총 {entries.length}회</Text>
        </View>
        {entries.length ? entries.map((entry) => (
          <View
            key={entry.round}
            style={[styles.row, compact && styles.rowCompact]}
            testID={`number-history-row-${entry.round}`}>
            <Text numberOfLines={1} style={[styles.round, compact && styles.roundCompact]}>
              {entry.round}회
            </Text>
            <LottoDrawBalls
              bonus={entry.bonus}
              highlightedNumbers={[number]}
              numbers={entry.numbers}
              size={compact ? 22 : 24}
              style={styles.balls}
            />
            <Text numberOfLines={1} style={[styles.gap, compact && styles.gapCompact]}>
              {entry.gapSincePrevious === null
                ? '첫 등장'
                : `${entry.gapSincePrevious}회 만에 등장`}
            </Text>
          </View>
        )) : (
          <Text style={styles.empty}>출현 기록이 없습니다.</Text>
        )}
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
  pressed: {
    opacity: 0.6,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  contentCompact: {
    paddingHorizontal: spacing.xs,
  },
  listSummary: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  summaryValue: {
    color: colors.textPrimary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.medium,
  },
  row: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  rowCompact: {
    gap: spacing.xs,
  },
  round: {
    width: 48,
    color: colors.textPrimary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    fontVariant: ['tabular-nums'],
  },
  roundCompact: {
    width: 44,
    fontSize: 12,
  },
  balls: {
    flex: 1,
    minWidth: 0,
  },
  gap: {
    width: 92,
    color: colors.textSecondary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.medium,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  gapCompact: {
    width: 80,
    fontSize: 12,
  },
  empty: {
    color: colors.textSecondary,
    fontSize: typography.sizes.small,
    textAlign: 'center',
    paddingVertical: spacing.huge,
  },
});
