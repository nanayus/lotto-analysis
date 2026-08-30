import { StyleSheet, Text, View, type ViewStyle, type StyleProp } from 'react-native';

import { type ThemeColors, radius, spacing, typography, useThemedStyles } from '@/theme';

type CombinationNumberRowProps = {
  numbers: readonly number[];
  size?: 'small' | 'medium';
  style?: StyleProp<ViewStyle>;
};

export function CombinationNumberRow({ numbers, size = 'medium', style }: CombinationNumberRowProps) {
  const styles = useThemedStyles(createStyles);
  const small = size === 'small';
  return (
    <View accessibilityLabel={`번호 ${numbers.join(', ')}`} style={[styles.row, style]}>
      {numbers.map((number) => (
        <View key={number} style={[styles.ball, small && styles.ballSmall]}>
          <Text style={[styles.number, small && styles.numberSmall]}>{number}</Text>
        </View>
      ))}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  ball: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    backgroundColor: colors.surfaceAccent,
  },
  ballSmall: { width: 34, height: 34 },
  number: {
    color: colors.textPrimary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
    fontVariant: ['tabular-nums'],
  },
  numberSmall: { fontSize: typography.sizes.caption },
});
