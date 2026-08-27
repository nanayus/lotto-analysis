import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Appearance, Pressable, Text, View } from 'react-native';

import { AppThemeProvider, THEME_STORAGE_KEY, useAppTheme } from '@/theme';

function ThemeProbe() {
  const { isReady, mode, resolvedTheme, setMode } = useAppTheme();
  return (
    <View>
      <Text testID="theme-state">{`${mode}:${resolvedTheme}:${isReady}`}</Text>
      <Pressable accessibilityRole="button" onPress={() => setMode('light')}>
        <Text>밝게 전환</Text>
      </Pressable>
    </View>
  );
}

describe('AppThemeProvider', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.spyOn(Appearance, 'setColorScheme').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('restores a saved mode and persists a new selection', async () => {
    await AsyncStorage.setItem(THEME_STORAGE_KEY, 'dark');
    const view = await render(<AppThemeProvider><ThemeProbe /></AppThemeProvider>);

    await waitFor(() => expect(view.getByTestId('theme-state').props.children).toBe('dark:dark:true'));

    fireEvent.press(view.getByText('밝게 전환'));

    await waitFor(() => expect(view.getByTestId('theme-state').props.children).toBe('light:light:true'));
    await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, 'light'));
  });

  it('falls back to system when the stored value is invalid', async () => {
    await AsyncStorage.setItem(THEME_STORAGE_KEY, 'invalid-theme');
    const view = await render(<AppThemeProvider><ThemeProbe /></AppThemeProvider>);

    await waitFor(() => expect(view.getByTestId('theme-state').props.children).toMatch(/^system:(light|dark):true$/));
  });

  it('continues with the system mode when storage cannot be read', async () => {
    jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error('storage unavailable'));
    const view = await render(<AppThemeProvider><ThemeProbe /></AppThemeProvider>);

    await waitFor(() => expect(view.getByTestId('theme-state').props.children).toMatch(/^system:(light|dark):true$/));
  });
});
