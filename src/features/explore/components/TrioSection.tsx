import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AnimatedValue } from '@/components/AnimatedValue';
import type { TrioDatum } from '@/data/numberAnalytics.types';
import { type ThemeColors, spacing, typography, useThemedStyles } from '@/theme';

import { SectionHeading } from './SectionHeading';

type TrioSectionProps = {
  selectedNumber: number;
  trios: readonly TrioDatum[];
  onSelectNumber: (number: number) => void;
};

export function TrioSection({ onSelectNumber, selectedNumber, trios }: TrioSectionProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.section} testID="trio-analysis-section">
      <SectionHeading title="자주 함께 나온 3개 조합" subtitle="TOP 3" />
      <View style={styles.list}>
        {trios.map((trio, rowIndex) => {
          const displayNumbers = [selectedNumber, ...trio.numbers].sort((a, b) => a - b);
          return (
          <View
            key={trio.numbers.join('-')}
            style={[styles.row, rowIndex > 0 && styles.rowDivider]}
            testID={`trio-row-${rowIndex + 1}`}>
            <View style={styles.numberGroup}>
              {displayNumbers.map((number, numberIndex) => {
                const selected = number === selectedNumber;
                return (
                  <View key={number} style={styles.numberItem}>
                    {numberIndex > 0 ? <Text style={styles.separator}>·</Text> : null}
                    <Pressable
                      accessibilityLabel={`${number}번 탐색`}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => onSelectNumber(number)}
                      style={({ pressed }) => [styles.numberAction, pressed && styles.pressed]}>
                      <AnimatedValue
                        align="center"
                        height={20}
                        style={[styles.number, selected && styles.numberSelected]}
                        width={24}>
                        {String(number).padStart(2, '0')}
                      </AnimatedValue>
                    </Pressable>
                  </View>
                );
              })}
            </View>
            <AnimatedValue align="right" height={20} style={styles.count} width={42}>
              {`${trio.count}회`}
            </AnimatedValue>
          </View>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  section: {
    marginTop: spacing.xxxl,
    marginBottom: spacing.xxxl,
    paddingTop: spacing.xxl,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  list: {
    marginTop: -spacing.xs,
  },
  row: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingRight: spacing.xxl,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
  },
  numberGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  numberItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  numberAction: {
    minWidth: 28,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: {
    color: colors.textPrimary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    fontVariant: ['tabular-nums'],
  },
  numberSelected: {
    color: colors.accentPrimary,
    fontWeight: typography.weights.bold,
  },
  separator: {
    color: colors.textSecondary,
    fontSize: typography.sizes.small,
  },
  pressed: { opacity: 0.62 },
  count: {
    color: colors.accentPrimary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.medium,
    fontVariant: ['tabular-nums'],
  },
});
