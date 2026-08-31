import { StyleSheet, Text, View } from 'react-native';

import { radius, spacing, typography, type ThemeColors, useThemedStyles } from '@/theme';

type CombinationNumberPillsProps = {
  accessibilityLabel?: string;
  numbers: readonly number[];
};

export function CombinationNumberPills({
  accessibilityLabel,
  numbers,
}: CombinationNumberPillsProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <View accessibilityLabel={accessibilityLabel} style={styles.numberPills}>
      {numbers.map((number) => (
        <View key={number} style={styles.numberPill}>
          <Text style={styles.numberPillText}>{String(number).padStart(2, '0')}</Text>
        </View>
      ))}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  numberPills: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    width: '100%',
  },
  numberPill: {
    width: '13%',
    maxWidth: 48,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: colors.accentPrimary,
    backgroundColor: colors.surfaceAccent,
  },
  numberPillText: {
    color: colors.highlight,
    fontSize: 18,
    fontWeight: typography.weights.semibold,
  },
});
