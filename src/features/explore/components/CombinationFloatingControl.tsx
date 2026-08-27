import { Pressable, StyleSheet, Text, View } from 'react-native';

import { type ThemeColors, radius, spacing, typography, useThemedStyles } from '@/theme';

type CombinationFloatingControlProps = {
  currentNumber: number;
  currentSelected: boolean;
  onAnalyze: () => void;
  onToggle: () => void;
  selectedCount: number;
};

export function CombinationFloatingControl({
  currentNumber,
  currentSelected,
  onAnalyze,
  onToggle,
  selectedCount,
}: CombinationFloatingControlProps) {
  const styles = useThemedStyles(createStyles);
  const complete = selectedCount === 6;
  const accessibilityLabel = complete
    ? '선택한 조합 분석하기'
    : currentSelected
      ? `${currentNumber}번 조합에서 빼기, ${selectedCount}/6`
      : `${currentNumber}번 조합에 담기${selectedCount ? `, ${selectedCount}/6` : ''}`;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={complete ? onAnalyze : onToggle}
      style={({ pressed }) => [
        styles.control,
        selectedCount === 0 && styles.controlEmpty,
        complete && styles.controlComplete,
        pressed && styles.pressed,
      ]}
      testID="combination-floating-control">
      {complete ? (
        <>
          <Text style={styles.completeCount}>6/6</Text>
          <Text style={styles.completeAction}>분석하기 →</Text>
        </>
      ) : (
        <View style={styles.defaultContent}>
          <Text style={[styles.icon, currentSelected && styles.iconSelected]}>
            {currentSelected ? '✓' : '+'}
          </Text>
          {selectedCount ? <Text style={styles.count}>{selectedCount}/6</Text> : null}
        </View>
      )}
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  control: {
    minWidth: 70,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    backgroundColor: colors.surface,
  },
  controlEmpty: {
    minWidth: 40,
    width: 40,
    paddingHorizontal: 0,
  },
  controlComplete: {
    minWidth: 136,
    gap: spacing.sm,
    borderColor: colors.accentPrimary,
    backgroundColor: colors.accentPrimary,
  },
  defaultContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  icon: {
    color: colors.accentPrimary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
  },
  iconSelected: {
    color: colors.accentSecondary,
  },
  count: {
    color: colors.textPrimary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    fontVariant: ['tabular-nums'],
  },
  completeCount: {
    color: colors.background,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
    fontVariant: ['tabular-nums'],
  },
  completeAction: {
    color: colors.background,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
  },
  pressed: {
    opacity: 0.72,
  },
});
