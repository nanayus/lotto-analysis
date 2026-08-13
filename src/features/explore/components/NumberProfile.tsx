import { StyleSheet, Text, View } from 'react-native';

import { AnimatedValue } from '@/components/AnimatedValue';
import { colors, spacing, typography } from '@/theme';
import type { GeneratedNumberAnalytics } from '@/data/numberAnalytics.types';

import { StatusBadge } from './StatusBadge';

type NumberProfileProps = {
  analytics: GeneratedNumberAnalytics;
};

export function NumberProfile({ analytics }: NumberProfileProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>번호</Text>
      <View style={styles.numberRow}>
        <View accessibilityLabel={`선택된 번호 ${analytics.number}`}>
          <AnimatedValue height={76} style={styles.heroNumber} width={100}>
            {analytics.number}
          </AnimatedValue>
        </View>
        <StatusBadge status={analytics.status} />
      </View>
      <View style={styles.metaRow}>
        <View>
          <AnimatedValue height={22} style={styles.metaValue} width={68}>
            {`${analytics.appearanceCount}회`}
          </AnimatedValue>
          <Text style={styles.metaLabel}>전체 출현</Text>
        </View>
        <View style={styles.metaDivider} />
        <View>
          <AnimatedValue height={22} style={styles.metaValue} width={82}>
            {`전체 ${analytics.appearanceRank}위`}
          </AnimatedValue>
          <Text style={styles.metaLabel}>출현 순위</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.xxl,
  },
  eyebrow: {
    color: colors.textSecondary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.medium,
    letterSpacing: 0.4,
  },
  numberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  heroNumber: {
    color: colors.textPrimary,
    fontSize: typography.sizes.hero,
    lineHeight: 76,
    fontWeight: typography.weights.semibold,
    letterSpacing: -2.4,
    fontVariant: ['tabular-nums'],
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.lg,
  },
  metaValue: {
    color: colors.textPrimary,
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.semibold,
    fontVariant: ['tabular-nums'],
  },
  metaLabel: {
    color: colors.textSecondary,
    fontSize: 9,
    marginTop: spacing.xs,
  },
  metaDivider: {
    width: StyleSheet.hairlineWidth,
    height: 27,
    backgroundColor: colors.divider,
  },
});
