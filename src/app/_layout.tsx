import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { BrandSplash } from '@/components/BrandSplash';
import { CombinationDraftProvider } from '@/features/combination/CombinationDraftContext';
import { colors } from '@/theme';

void SplashScreen.preventAutoHideAsync();

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    border: colors.divider,
    card: colors.surface,
    primary: colors.accentPrimary,
    text: colors.textPrimary,
  },
};

export default function RootLayout() {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <CombinationDraftProvider>
      <ThemeProvider value={navigationTheme}>
        <StatusBar style="light" />
        <Stack screenOptions={{ animation: 'fade', headerShown: false }} />
        <BrandSplash />
      </ThemeProvider>
      </CombinationDraftProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
