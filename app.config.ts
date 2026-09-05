import type { ConfigContext, ExpoConfig } from 'expo/config';

const GOOGLE_ADMOB_TEST_APP_IDS = {
  android: 'ca-app-pub-3940256099942544~3347511713',
  ios: 'ca-app-pub-3940256099942544~1458002511',
} as const;

export default ({ config }: ConfigContext): ExpoConfig => {
  const iosUrlScheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME;
  const adMobTestMode = process.env.EXPO_PUBLIC_ADMOB_TEST_MODE === 'true';
  const androidAdMobAppId = adMobTestMode
    ? GOOGLE_ADMOB_TEST_APP_IDS.android
    : process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID?.trim();
  const iosAdMobAppId = adMobTestMode
    ? GOOGLE_ADMOB_TEST_APP_IDS.ios
    : process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID?.trim();
  const adMobPlugin = androidAdMobAppId || iosAdMobAppId
    ? [[
        'react-native-google-mobile-ads',
        {
          ...(androidAdMobAppId ? { androidAppId: androidAdMobAppId } : {}),
          ...(iosAdMobAppId ? { iosAppId: iosAdMobAppId } : {}),
        },
      ] as const]
    : [];

  return {
    ...config,
    plugins: [
      ...(config.plugins ?? []),
      '@react-native-firebase/app',
      '@react-native-firebase/analytics',
      ...adMobPlugin,
      ...(iosUrlScheme ? [[
        '@react-native-google-signin/google-signin',
        { iosUrlScheme },
      ] as const] : []),
    ],
  } as ExpoConfig;
};
