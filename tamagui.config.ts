import { getDefaultTamaguiConfig } from '@tamagui/config-default';
import { createTamagui } from '@tamagui/core';
import { Platform } from 'react-native';

const defaultConfig = getDefaultTamaguiConfig(Platform.OS === 'web' ? 'web' : 'native');

export const tamaguiConfig = createTamagui({
  ...defaultConfig,
  themes: {
    ...defaultConfig.themes,
    light: {
      ...defaultConfig.themes.light,
      background: '#FFFFFF',
      backgroundHover: '#FAFAFC',
      backgroundPress: '#F5F5F7',
      borderColor: '#E0E0E0',
      color: '#1D1D1F',
      colorHover: '#1D1D1F',
      colorPress: '#333333',
    },
    dark: {
      ...defaultConfig.themes.dark,
      background: '#1D1D1F',
      backgroundHover: '#272729',
      backgroundPress: '#2A2A2C',
      borderColor: '#333336',
      color: '#FFFFFF',
      colorHover: '#FFFFFF',
      colorPress: '#EBEBEB',
    },
  },
  settings: {
    ...defaultConfig.settings,
    onlyAllowShorthands: false,
  },
});

export type TamaguiAppConfig = typeof tamaguiConfig;

declare module '@tamagui/core' {
  interface TamaguiCustomConfig extends TamaguiAppConfig {}
}

declare module '@tamagui/web' {
  interface TamaguiCustomConfig extends TamaguiAppConfig {}
}

export default tamaguiConfig;
