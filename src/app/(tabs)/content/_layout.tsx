import { Stack } from 'expo-router';
import { Platform } from 'react-native';

import { useAppTheme } from '@/theme';

const STACK_ANIMATION = Platform.select({
  android: 'ios_from_right' as const,
  ios: 'simple_push' as const,
  default: 'fade' as const,
});

export default function ContentStackLayout() {
  const { colors } = useAppTheme();

  return (
    <Stack
      screenOptions={{
        animation: STACK_ANIMATION,
        animationDuration: 240,
        contentStyle: { backgroundColor: colors.background },
        headerShown: false,
      }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[slug]" />
    </Stack>
  );
}
