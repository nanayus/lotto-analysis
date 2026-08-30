import { Stack } from 'expo-router';

export default function DrawStackLayout() {
  return (
    <Stack
      screenOptions={{
        animation: 'fade',
        headerShown: false,
      }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="combination-generator" />
      <Stack.Screen name="random-draw" />
      <Stack.Screen name="combination" />
    </Stack>
  );
}
