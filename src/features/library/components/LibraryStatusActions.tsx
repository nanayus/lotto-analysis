import Ionicons from '@expo/vector-icons/Ionicons';
import { Platform, Pressable, StyleSheet, type ViewStyle, View } from 'react-native';

import { type ThemeColors, radius, spacing, useAppTheme, useThemedStyles } from '@/theme';

type LibraryStatusActionsProps = {
  favorite: boolean;
  onToggleFavorite: () => void;
  onTogglePurchased: () => void;
  purchased: boolean;
  testID?: string;
};

const webPointerStyle = Platform.select({
  web: { cursor: 'pointer' } as unknown as ViewStyle,
});

export function LibraryStatusActions({
  favorite,
  onToggleFavorite,
  onTogglePurchased,
  purchased,
  testID,
}: LibraryStatusActionsProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.actions} testID={testID}>
      <Pressable
        accessibilityLabel={purchased ? '구매 표시 해제' : '구매한 번호로 표시'}
        accessibilityRole="button"
        accessibilityState={{ selected: purchased }}
        hitSlop={8}
        onPress={onTogglePurchased}
        style={({ pressed }) => [
          styles.iconButton,
          purchased && styles.iconButtonActive,
          webPointerStyle,
          pressed && styles.pressed,
        ]}>
        <Ionicons
          color={purchased ? colors.accentPrimary : colors.textSecondary}
          name={purchased ? 'bag-check' : 'bag-check-outline'}
          size={17}
        />
      </Pressable>
      <Pressable
        accessibilityLabel={favorite ? '즐겨찾기 해제' : '즐겨찾기에 추가'}
        accessibilityRole="button"
        accessibilityState={{ selected: favorite }}
        hitSlop={8}
        onPress={onToggleFavorite}
        style={({ pressed }) => [
          styles.iconButton,
          favorite && styles.iconButtonActive,
          webPointerStyle,
          pressed && styles.pressed,
        ]}>
        <Ionicons
          color={favorite ? colors.accentPrimary : colors.textSecondary}
          name={favorite ? 'heart' : 'heart-outline'}
          size={18}
        />
      </Pressable>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  actions: { flexDirection: 'row', gap: spacing.xs },
  iconButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
  },
  iconButtonActive: { backgroundColor: colors.surfaceAccent },
  pressed: { opacity: 0.68 },
});
