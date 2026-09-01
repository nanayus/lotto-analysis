import { Pressable, StyleSheet, View } from 'react-native';

import { type ThemeColors, radius, useThemedStyles } from '@/theme';

export function ConditionToggle({
  enabled,
  locked = false,
  onChange,
  onLockedPress,
  title,
}: {
  enabled: boolean;
  locked?: boolean;
  onChange: (enabled: boolean) => void;
  onLockedPress?: () => void;
  title: string;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable
      accessibilityLabel={`${title} 조건`}
      accessibilityRole="switch"
      accessibilityState={{ checked: enabled, disabled: locked }}
      onPress={() => locked ? onLockedPress?.() : onChange(!enabled)}
      style={[styles.switch, enabled && styles.switchOn, locked && styles.switchLocked]}>
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
  switchLocked: { opacity: 0.42 },
  switchKnob: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.neutral },
  switchKnobOn: { alignSelf: 'flex-end', backgroundColor: colors.background },
});
