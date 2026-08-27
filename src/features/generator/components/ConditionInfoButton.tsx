import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet } from 'react-native';

import { type ThemeColors, useThemedStyles } from '@/theme';

export function ConditionInfoButton({ onPress, title }: { onPress: () => void; title: string }) {
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable
      accessibilityLabel={`${title} 설명 보기`}
      accessibilityRole="button"
      hitSlop={6}
      onPress={onPress}
      style={styles.hitArea}>
      <Ionicons color={styles.icon.color} name="help-circle-outline" size={21} />
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  hitArea: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  icon: { color: colors.textSecondary },
});
