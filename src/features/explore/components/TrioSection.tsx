import { StyleSheet, View } from 'react-native';

import { AnimatedValue } from '@/components/AnimatedValue';
import type { TrioDatum } from '@/data/numberAnalytics.types';
import { colors, radius, spacing, typography } from '@/theme';

import { SectionHeading } from './SectionHeading';

type TrioSectionProps = {
  selectedNumber: number;
  trios: readonly TrioDatum[];
};

export function TrioSection({ selectedNumber, trios }: TrioSectionProps) {
  return (
    <View style={styles.section}>
      <SectionHeading title="자주 함께 나온 3개 조합" subtitle="TOP 3" />
      <View style={styles.list}>
        {trios.map((trio) => {
          const displayNumbers = [selectedNumber, ...trio.numbers].sort((a, b) => a - b);
          return (
          <View key={trio.numbers.join('-')} style={styles.row}>
            <View style={styles.numberGroup}>
              {displayNumbers.map((number) => (
                <View key={number} style={styles.numberCapsule}>
                  <AnimatedValue align="center" height={16} style={styles.number} width="100%">
                    {String(number).padStart(2, '0')}
                  </AnimatedValue>
                </View>
              ))}
            </View>
            <AnimatedValue align="right" height={16} style={styles.count} width={42}>
              {`${trio.count}회`}
            </AnimatedValue>
          </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingBottom: spacing.xxxl,
  },
  list: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  numberGroup: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  numberCapsule: {
    minWidth: 32,
    height: 28,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.round,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.divider,
  },
  number: {
    color: colors.textPrimary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
    fontVariant: ['tabular-nums'],
  },
  count: {
    color: colors.accentPrimary,
    fontSize: typography.sizes.caption,
    fontVariant: ['tabular-nums'],
  },
});
