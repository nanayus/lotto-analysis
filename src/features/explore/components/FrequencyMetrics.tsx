import { StyleSheet, Text, View } from 'react-native';

import { AnimatedValue } from '@/components/AnimatedValue';
import type { GeneratedNumberAnalytics } from '@/data/numberAnalytics.types';
import { type ThemeColors, spacing, typography, useThemedStyles } from '@/theme';

type FrequencyMetricsProps = {
  analytics: GeneratedNumberAnalytics;
};

export function FrequencyMetrics({ analytics }: FrequencyMetricsProps) {
  const styles = useThemedStyles(createStyles);
  const metrics = [
    { displayLabel: '총 출현', label: '총 출현', value: `${analytics.appearanceCount}회` },
    { displayLabel: '평균 간격', label: '평균 간격', value: `${analytics.averageGap.toFixed(1)}회` },
    { displayLabel: '현재\n미출현', label: '현재 미출현', value: `${analytics.currentGap}회` },
    { displayLabel: '최대\n미출현', label: '최대 미출현', value: `${analytics.maxGap}회` },
  ];

  return (
    <View style={styles.section}>
      <Text style={styles.title}>출현 기록</Text>
      <View style={styles.grid}>
        {metrics.map((metric) => (
          <View key={metric.label} style={styles.metric} testID={`frequency-metric-${metric.label}`}>
            <Text accessibilityLabel={metric.label} style={styles.label}>
              {metric.displayLabel}
            </Text>
            <AnimatedValue height={22} style={styles.value} width="100%">
              {metric.value}
            </AnimatedValue>
          </View>
        ))}
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  section: {
    paddingTop: spacing.xxl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing.lg,
  },
  grid: {
    flexDirection: 'row',
  },
  metric: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
  label: {
    height: 32,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: spacing.xs,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  value: {
    color: colors.textPrimary,
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.semibold,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
});
