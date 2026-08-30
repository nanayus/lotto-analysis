import { Stack } from 'expo-router';
import { Platform } from 'react-native';

const STACK_ANIMATION = Platform.select({
  android: 'ios_from_right' as const,
  ios: 'simple_push' as const,
  default: 'fade' as const,
});
const STACK_ANIMATION_DURATION_MS = 240;

export default function DrawStackLayout() {
  return (
    <Stack
      screenOptions={{
        animation: STACK_ANIMATION,
        animationDuration: STACK_ANIMATION_DURATION_MS,
        headerShown: false,
      }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="combination-generator" />
      <Stack.Screen name="random-draw" />
    </Stack>
  );
}
