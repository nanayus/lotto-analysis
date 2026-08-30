import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { useAppTheme } from '@/theme';

type SubScreenBackButtonProps = {
  accessibilityLabel?: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

export function SubScreenBackButton({
  accessibilityLabel = '이전 화면으로 돌아가기',
  onPress,
  style,
}: SubScreenBackButtonProps) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.button, style, pressed && styles.pressed]}>
      <Ionicons color={colors.textPrimary} name="chevron-back" size={24} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  pressed: {
    opacity: 0.5,
  },
});
