import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { LottoDrawBalls } from '@/components/ui/LottoDrawBalls';
import type { CombinationAnalysis, PrizeRank } from '@/domain/combination/types';
import { type ThemeColors, spacing, typography, useThemedStyles } from '@/theme';

type DetailMode =
  | { kind: 'history' }
  | { kind: 'prizeRank'; rank: PrizeRank };

type CombinationDetailProps = {
  analysis: CombinationAnalysis;
  mode: DetailMode;
  onBack: () => void;
};

export function CombinationDetail({ analysis, mode, onBack }: CombinationDetailProps) {
  const styles = useThemedStyles(createStyles);
  const history = mode.kind === 'prizeRank'
    ? analysis.qualifyingHistory.filter((draw) => draw.prizeRank === mode.rank)
    : analysis.qualifyingHistory;
  const title = mode.kind === 'history' ? '전체 기록' : `${mode.rank}등 기록`;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="분석 결과로 돌아가기"
          accessibilityRole="button"
          onPress={onBack}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.listSummary}>
          <Text style={styles.summaryValue}>총 {history.length}회</Text>
        </View>
        {history.length ? history.map((draw) => (
          <View key={draw.round} style={styles.historyItem} testID={`history-row-${draw.round}`}>
            <Text numberOfLines={1} style={styles.round}>{draw.round}회</Text>
            <LottoDrawBalls
              bonus={draw.bonus}
              highlightedNumbers={analysis.numbers}
              numbers={draw.numbers}
              style={styles.winningRow}
            />
            <Text numberOfLines={1} style={styles.matchLabel}>
              {draw.prizeRank ? `${draw.prizeRank}등` : '-'}
            </Text>
          </View>
        )) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>해당 기록이 없습니다.</Text>
            <Text style={styles.emptyDescription}>선택한 기간에 해당하는 회차가 없습니다.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
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
  historyItem: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  round: {
    width: 48,
    color: colors.textPrimary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
  },
  matchLabel: {
    width: 28,
    color: colors.highlight,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.medium,
    textAlign: 'right',
  },
  winningRow: {
    flex: 1,
    minWidth: 0,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.huge,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
  },
  emptyDescription: {
    color: colors.textSecondary,
    fontSize: typography.sizes.caption,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
