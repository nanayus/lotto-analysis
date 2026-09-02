import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const iosUrlScheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME;
  return {
    ...config,
    plugins: [
      ...(config.plugins ?? []),
      '@react-native-firebase/app',
      '@react-native-firebase/analytics',
      ...(iosUrlScheme ? [[
        '@react-native-google-signin/google-signin',
        { iosUrlScheme },
      ] as const] : []),
    ],
  } as ExpoConfig;
};
