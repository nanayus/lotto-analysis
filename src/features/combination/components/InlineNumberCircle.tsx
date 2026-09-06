import { StyleSheet, Text, View } from 'react-native';

import { type ThemeColors, radius, typography, useThemedStyles } from '@/theme';

type InlineNumberCircleProps = {
  compact?: boolean;
  number: number;
  testID?: string;
  tone?: 'accent' | 'critical';
};

export function InlineNumberCircle({
  compact = false,
  number,
  testID,
  tone = 'accent',
}: InlineNumberCircleProps) {
  const styles = useThemedStyles(createStyles);
  const critical = tone === 'critical';

  return (
    <View
      style={[
        styles.circle,
        compact && styles.circleCompact,
        critical && styles.circleCritical,
      ]}
      testID={testID}>
      <Text
        style={[
          styles.number,
          compact && styles.numberCompact,
          critical && styles.numberCritical,
        ]}>
        {number}
      </Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  circle: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.accentPrimary,
    borderRadius: radius.round,
    backgroundColor: colors.surfaceAccent,
  },
  circleCompact: {
    width: 21,
    height: 21,
  },
  circleCritical: {
    borderColor: colors.hot,
    backgroundColor: colors.surfaceAccent,
  },
  number: {
    color: colors.accentPrimary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
    lineHeight: 14,
  },
  numberCompact: {
    fontSize: typography.sizes.caption,
    lineHeight: 14,
  },
  numberCritical: {
    color: colors.hot,
  },
});
