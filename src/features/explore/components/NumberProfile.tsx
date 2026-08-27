import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AnimatedValue } from '@/components/AnimatedValue';
import { type ThemeColors, spacing, typography, useThemedStyles } from '@/theme';
import type { GeneratedNumberAnalytics } from '@/data/numberAnalytics.types';

import { RankBadge } from './RankBadge';

type NumberProfileProps = {
  analytics: GeneratedNumberAnalytics;
  onOpenComparison: () => void;
};

export function NumberProfile({ analytics, onOpenComparison }: NumberProfileProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.container}>
      <View style={styles.actionRow}>
        <Pressable
          accessibilityRole="button"
          hitSlop={6}
          onPress={onOpenComparison}
          style={({ pressed }) => [styles.comparisonAction, pressed && styles.pressed]}>
          <Text style={styles.comparisonText}>전체 번호 보기</Text>
          <Text style={styles.comparisonChevron}>›</Text>
        </Pressable>
      </View>
      <View style={styles.profileRow}>
        <View accessibilityLabel={`선택된 번호 ${analytics.number}`}>
          <AnimatedValue height={76} style={styles.heroNumber} width={100}>
            {analytics.number}
          </AnimatedValue>
        </View>
        <RankBadge rank={analytics.appearanceRank} />
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    paddingTop: spacing.lg,
  },
  actionRow: {
    minHeight: 40,
    alignItems: 'flex-end',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: spacing.lg,
  },
  heroNumber: {
    color: colors.textPrimary,
    fontSize: typography.sizes.hero,
    lineHeight: 76,
    fontWeight: typography.weights.semibold,
    letterSpacing: -2.4,
    fontVariant: ['tabular-nums'],
  },
  comparisonAction: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  comparisonText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.medium,
  },
  comparisonChevron: {
    color: colors.textSecondary,
    fontSize: typography.sizes.body,
    marginLeft: 2,
  },
  pressed: {
    opacity: 0.68,
  },
});
