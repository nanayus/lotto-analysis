import { StyleSheet, Text, View } from 'react-native';

import { AnimatedValue } from '@/components/AnimatedValue';
import { AppCard } from '@/components/ui/AppCard';
import type { GeneratedNumberAnalytics } from '@/data/numberAnalytics.types';
import type { AnalysisPeriod, LottoHistoryDraw } from '@/domain/analytics/types';
import {
  type ThemeColors,
  spacing,
  typography,
  useThemedStyles,
} from '@/theme';

type FrequencyMetricsProps = {
  analytics: GeneratedNumberAnalytics;
  embedded?: boolean;
  lastAppearance?: Pick<LottoHistoryDraw, 'date' | 'round'>;
  period: AnalysisPeriod;
};

function periodRangeLabel(period: AnalysisPeriod) {
  if (period.kind === 'custom') {
    const startRound = Math.min(period.startRound, period.endRound).toLocaleString('ko-KR');
    const endRound = Math.max(period.startRound, period.endRound).toLocaleString('ko-KR');
    return `${startRound}~${endRound}회`;
  }
  return period.label === '전체' ? '전체 기간' : period.label;
}

function formattedDrawDate(date?: string) {
  if (!date) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;
  return `${Number(match[2])}월 ${Number(match[3])}일`;
}

function lastAppearanceText(
  analytics: GeneratedNumberAnalytics,
  lastAppearance: Pick<LottoHistoryDraw, 'date' | 'round'> | undefined,
  period: AnalysisPeriod,
) {
  if (analytics.appearanceCount === 0) {
    return `${periodRangeLabel(period)} 동안 한 번도 나오지 않았어요`;
  }
  if (!lastAppearance) return '가장 최근 출현 기록을 확인할 수 없어요';
  const appearanceLabel = formattedDrawDate(lastAppearance.date)
    ?? `${lastAppearance.round.toLocaleString('ko-KR')}회`;
  return `가장 최근에는 ${appearanceLabel}에 등장했어요`;
}

function currentGapText(analytics: GeneratedNumberAnalytics) {
  const currentGap = analytics.currentGap === 0
    ? '현재 미출현 없음'
    : `현재 ${analytics.currentGap}회째 미출현`;
  return `${currentGap} / 평균 간격 ${analytics.averageGap.toFixed(1)}회 (가장 길었던 간격 ${analytics.maxGap}회)`;
}

export function FrequencyMetrics({
  analytics,
  embedded = false,
  lastAppearance,
  period,
}: FrequencyMetricsProps) {
  const styles = useThemedStyles(createStyles);
  const appearanceText = lastAppearanceText(analytics, lastAppearance, period);

  const content = (
    <>
        <View
          style={[styles.rankSection, embedded && styles.rankSectionEmbedded]}
          testID="frequency-rank-section">
          <Text style={styles.rankLabel}>출현 순위</Text>
          <View style={styles.rankRow}>
            <View style={styles.rankSummary}>
              <View style={styles.rankValueSlot} testID="frequency-rank">
                <AnimatedValue height={44} style={styles.rankValue} width="100%">
                  {`${analytics.appearanceRank}위`}
                </AnimatedValue>
              </View>
              <Text style={styles.rankTotal}>/ 45개 번호</Text>
            </View>
            <View style={styles.countValueSlot} testID="frequency-appearance-count">
              <AnimatedValue align="right" height={22} style={styles.countValue} width="100%">
                {`${analytics.appearanceCount}회 출현`}
              </AnimatedValue>
            </View>
          </View>
        </View>
        <View style={[styles.divider, embedded && styles.dividerEmbedded]} />
        <View style={[styles.gapSection, embedded && styles.gapSectionEmbedded]}>
          <Text style={styles.lastAppearance}>{appearanceText}</Text>
          {analytics.appearanceCount > 0 ? (
            <Text style={styles.gapContext}>
              {currentGapText(analytics)}
            </Text>
          ) : null}
        </View>
    </>
  );

  return (
    <View testID={embedded ? 'frequency-record-hero' : undefined}>
      {embedded ? content : (
        <AppCard elevated={false} style={styles.card} testID="frequency-record-card">
          {content}
        </AppCard>
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  rankSection: {
    padding: spacing.xl,
  },
  rankSectionEmbedded: {
    padding: 0,
  },
  rankLabel: {
    color: colors.textSecondary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  rankSummary: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  rankValueSlot: {
    width: 80,
  },
  rankValue: {
    color: colors.textPrimary,
    fontSize: typography.sizes.title,
    lineHeight: 42,
    fontWeight: typography.weights.semibold,
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  rankTotal: {
    color: colors.textTertiary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.regular,
    marginBottom: 7,
  },
  countValueSlot: {
    width: 84,
  },
  countValue: {
    color: colors.textSecondary,
    fontSize: typography.sizes.small,
    lineHeight: 20,
    fontWeight: typography.weights.semibold,
    fontVariant: ['tabular-nums'],
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
  },
  dividerEmbedded: {
    display: 'none',
  },
  gapSection: {
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  gapSectionEmbedded: {
    paddingTop: spacing.xl,
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
  lastAppearance: {
    color: colors.textPrimary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    letterSpacing: -0.3,
    fontVariant: ['tabular-nums'],
  },
  gapContext: {
    marginTop: spacing.sm,
    color: colors.textTertiary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.regular,
    fontVariant: ['tabular-nums'],
  },
});
