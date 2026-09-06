import { StyleSheet, Text, View } from 'react-native';

import { AnimatedNumberBall } from '@/components/ui/AnimatedNumberBall';
import { radius, spacing, typography, type ThemeColors, useThemedStyles } from '@/theme';

type CombinationNumberPillsProps = {
  accessibilityLabel?: string;
  compact?: boolean;
  numbers: readonly number[];
  revealedCount?: number;
};

export function CombinationNumberPills({
  accessibilityLabel,
  compact = false,
  numbers,
  revealedCount,
}: CombinationNumberPillsProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessible={Boolean(accessibilityLabel)}
      style={[styles.numberPills, compact && styles.numberPillsCompact]}>
      {numbers.map((number, index) => (
        revealedCount === undefined ? (
          <View key={number} style={[styles.numberPill, compact && styles.numberPillCompact]}>
            <Text style={[styles.numberPillText, compact && styles.numberPillTextCompact]}>
              {number}
            </Text>
          </View>
        ) : (
          <AnimatedNumberBall
            key={number}
            number={number}
            revealed={revealedCount > index}
            revealedStyle={styles.numberPillRevealed}
            revealedTextStyle={styles.numberPillTextRevealed}
            style={styles.numberPill}
            testID={`animated-combination-number-${index}`}
            textStyle={styles.numberPillTextWaiting}
          />
        )
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
  numberPillsCompact: {
    width: 'auto',
    gap: spacing.xs,
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
  numberPillCompact: {
    width: 34,
    maxWidth: 34,
  },
  numberPillText: {
    color: colors.highlight,
    fontSize: 18,
    fontWeight: typography.weights.semibold,
  },
  numberPillTextCompact: {
    fontSize: 13,
  },
  numberPillRevealed: {
    borderColor: colors.accentBorder,
    backgroundColor: colors.surfaceAccent,
  },
  numberPillTextWaiting: {
    color: colors.textTertiary,
    fontSize: 18,
    fontWeight: typography.weights.semibold,
  },
  numberPillTextRevealed: {
    color: colors.highlight,
  },
});
