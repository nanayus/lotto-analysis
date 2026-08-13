import { StyleSheet, Text, View } from 'react-native';

import { AnimatedValue } from '@/components/AnimatedValue';
import type { GeneratedNumberAnalytics } from '@/data/numberAnalytics.types';
import { colors, radius, spacing, typography } from '@/theme';

import { SectionHeading } from './SectionHeading';

type FrequencyMetricsProps = {
  analytics: GeneratedNumberAnalytics;
};

export function FrequencyMetrics({ analytics }: FrequencyMetricsProps) {
  const metrics = [
    { label: '평균 간격', value: `${analytics.averageGap.toFixed(1)}회` },
    { label: '현재 미출현', value: `${analytics.currentGap}회` },
    { label: '최대 미출현', value: `${analytics.maxGap}회` },
  ];

  return (
    <View style={styles.section}>
      <SectionHeading title="출현 기록" subtitle="" />
      <View style={styles.grid}>
        {metrics.map((metric) => (
          <View key={metric.label} style={styles.metric}>
            <Text style={styles.label}>{metric.label}</Text>
            <AnimatedValue height={22} style={styles.value} width="100%">
              {metric.value}
            </AnimatedValue>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingBottom: spacing.xxl,
  },
  grid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metric: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 9,
    marginBottom: spacing.sm,
  },
  value: {
    color: colors.textPrimary,
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.semibold,
    fontVariant: ['tabular-nums'],
  },
});
