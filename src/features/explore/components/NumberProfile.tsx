import { StyleSheet, Text, View } from 'react-native';

import { type ThemeColors, spacing, typography, useThemedStyles } from '@/theme';
import type { GeneratedNumberAnalytics } from '@/data/numberAnalytics.types';

import { RankBadge } from './RankBadge';

type NumberProfileProps = {
  analytics: GeneratedNumberAnalytics;
};

export function NumberProfile({ analytics }: NumberProfileProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.container}>
      <View style={styles.identityRow}>
        <Text style={styles.number}>{analytics.number}번 분석</Text>
        <RankBadge rank={analytics.appearanceRank} />
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    paddingTop: spacing.xl,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  number: {
    color: colors.textPrimary,
    fontSize: typography.sizes.section,
    lineHeight: 28,
    fontWeight: typography.weights.semibold,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
});
