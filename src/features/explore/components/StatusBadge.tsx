import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';
import type { NumberStatus } from '@/data/numberAnalytics.types';


type StatusBadgeProps = {
  status: NumberStatus;
};

const statusColors: Record<NumberStatus, string> = {
  HOT: colors.hot,
  NEUTRAL: colors.neutral,
  COLD: colors.cold,
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const color = statusColors[status];

  return (
    <View
      accessibilityLabel={`상태 ${status}`}
      style={[styles.badge, { backgroundColor: `${color}1F`, borderColor: `${color}5C` }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color }]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.round,
    borderWidth: 1,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  label: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    letterSpacing: 0.3,
  },
});
