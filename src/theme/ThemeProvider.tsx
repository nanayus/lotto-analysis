import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Appearance,
  Platform,
  type ColorSchemeName,
  type StyleSheet,
  useColorScheme,
} from 'react-native';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { darkColors, lightColors, type ThemeColors } from './colors';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = Exclude<ThemeMode, 'system'>;

type AppThemeContextValue = {
  colors: ThemeColors;
  isReady: boolean;
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
};

export const THEME_STORAGE_KEY = 'lotto.themeMode';

const defaultValue: AppThemeContextValue = {
  colors: darkColors,
  isReady: false,
  mode: 'system',
  resolvedTheme: 'dark',
  setMode: () => undefined,
};

const AppThemeContext = createContext<AppThemeContextValue>(defaultValue);

export function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system';
}

function resolveTheme(mode: ThemeMode, systemTheme: ColorSchemeName): ResolvedTheme {
  if (mode !== 'system') return mode;
  return systemTheme === 'light' ? 'light' : 'dark';
}

export function AppThemeProvider({ children }: PropsWithChildren) {
  const systemTheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [isReady, setIsReady] = useState(false);
  const resolvedTheme = resolveTheme(mode, systemTheme);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((storedMode) => {
        if (active && isThemeMode(storedMode)) setModeState(storedMode);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setIsReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      if (typeof document !== 'undefined') document.documentElement.style.colorScheme = resolvedTheme;
      return;
    }
    Appearance.setColorScheme(mode === 'system' ? 'unspecified' : mode);
  }, [mode, resolvedTheme]);

  const setMode = useCallback((nextMode: ThemeMode) => {
    setModeState(nextMode);
    void AsyncStorage.setItem(THEME_STORAGE_KEY, nextMode).catch(() => undefined);
  }, []);

  const value = useMemo<AppThemeContextValue>(() => ({
    colors: resolvedTheme === 'light' ? lightColors : darkColors,
    isReady,
    mode,
    resolvedTheme,
    setMode,
  }), [isReady, mode, resolvedTheme, setMode]);

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme() {
  return useContext(AppThemeContext);
}

export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (colors: ThemeColors) => T,
) {
  const { colors } = useAppTheme();
  return useMemo(() => factory(colors), [colors, factory]);
}
