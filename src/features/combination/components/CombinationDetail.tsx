import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { SubScreenHeader } from '@/components/ui/AppTopBar';
import { LottoDrawBalls } from '@/components/ui/LottoDrawBalls';
import { formatAnalysisPeriodRange } from '@/domain/analytics/formatAnalysisPeriod';
import type { CombinationAnalysis, PrizeRank } from '@/domain/combination/types';
import { type ThemeColors, spacing, typography, useThemedStyles } from '@/theme';

export type CombinationDetailMode =
  | { kind: 'history' }
  | { kind: 'prizeRank'; rank: PrizeRank };

type CombinationDetailProps = {
  analysis: CombinationAnalysis;
  mode: CombinationDetailMode;
  onBack: () => void;
};

export function CombinationDetail({ analysis, mode, onBack }: CombinationDetailProps) {
  const styles = useThemedStyles(createStyles);
  const history = mode.kind === 'prizeRank'
    ? analysis.qualifyingHistory.filter((draw) => draw.prizeRank === mode.rank)
    : analysis.qualifyingHistory;
  const periodRange = formatAnalysisPeriodRange(analysis.filters.period);
  const title = mode.kind === 'history' ? '전체 기록' : `${mode.rank}등 기록`;

  return (
    <View style={styles.screen}>
      <SubScreenHeader
        backAccessibilityLabel="분석 결과로 돌아가기"
        onBack={onBack}
        title={title}
      />

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
            <Text style={styles.emptyDescription}>
              {mode.kind === 'history'
                ? `${periodRange}에 3개 이상 일치한 기록이 없습니다.`
                : `${periodRange}에 ${mode.rank}등 기록이 없습니다.`}
            </Text>
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
