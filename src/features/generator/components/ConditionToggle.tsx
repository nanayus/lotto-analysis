import { Pressable, StyleSheet, View } from 'react-native';

import { type ThemeColors, radius, useThemedStyles } from '@/theme';

export function ConditionToggle({
  enabled,
  onChange,
  title,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  title: string;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable
      accessibilityLabel={`${title} 조건`}
      accessibilityRole="switch"
      accessibilityState={{ checked: enabled }}
      onPress={() => onChange(!enabled)}
      style={[styles.switch, enabled && styles.switchOn]}>
      <View style={[styles.switchKnob, enabled && styles.switchKnobOn]} />
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  switch: {
    width: 42, height: 24, padding: 2, borderRadius: radius.round,
    backgroundColor: colors.divider, justifyContent: 'center',
  },
  switchOn: { backgroundColor: colors.accentPrimary },
  switchKnob: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.neutral },
  switchKnobOn: { alignSelf: 'flex-end', backgroundColor: colors.background },
});
