import { StyleSheet, Text, View } from 'react-native';

import { type ThemeColors, spacing, typography, useThemedStyles } from '@/theme';

type SectionHeadingProps = {
  title: string;
  subtitle: string;
};

export function SectionHeading({ title, subtitle }: SectionHeadingProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.sizes.caption,
  },
});
