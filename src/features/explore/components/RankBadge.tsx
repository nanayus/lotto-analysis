import { StyleSheet, Text, View } from 'react-native';

import { type ThemeColors, radius, spacing, typography, useAppTheme, useThemedStyles } from '@/theme';

type RankBadgeProps = {
  rank: number;
};

function rankColor(rank: number, colors: ThemeColors) {
  if (rank <= 6) return colors.hot;
  if (rank >= 40) return colors.cold;
  return colors.neutral;
}

export function RankBadge({ rank }: RankBadgeProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const color = rankColor(rank, colors);

  return (
    <View
      accessibilityLabel={`전체 출현 순위 ${rank}위`}
      style={[styles.badge, { backgroundColor: `${color}1F`, borderColor: `${color}5C` }]}
      testID="rank-badge">
      <View style={[styles.dot, { backgroundColor: color }]} testID="rank-badge-dot" />
      <Text style={[styles.label, { color }]}>{rank}위</Text>
    </View>
  );
}

const createStyles = (_colors: ThemeColors) => StyleSheet.create({
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
