import { DarkTheme, DefaultTheme, Stack, ThemeProvider, usePathname } from 'expo-router';
import Head from 'expo-router/head';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { BrandSplash } from '@/components/BrandSplash';
import { CombinationDraftProvider } from '@/features/combination/CombinationDraftContext';
import { AppThemeProvider, useAppTheme } from '@/theme';

void SplashScreen.preventAutoHideAsync();

const SITE_URL = 'https://lotto-analysis.vercel.app';

const exploreMetadata = {
  title: '로또 6/45 번호분석 | Lotto Insight',
  description:
    '로또 6/45 과거 당첨 데이터를 바탕으로 번호별 출현 기록과 빈도, 페어·트리오 통계를 탐색하는 데이터 분석 웹앱입니다.',
  path: '/explore',
};

const combinationMetadata = {
  title: '로또 랜덤조합 | Lotto Insight',
  description:
    '직접 선택한 로또 6/45 번호 6개의 과거 일치 기록, 출현 빈도, 조합 형태와 부분 조합 통계를 분석합니다.',
  path: '/combination',
};

const generatorMetadata = {
  title: '로또 AI조합 | Lotto Insight',
  description:
    '고정수, 제외수, 번호 분포와 수학적 형태 조건을 직접 선택해 로또 6/45 번호 한 조합을 무작위로 만듭니다.',
  path: '/combination-generator',
};

const settingsMetadata = {
  title: '환경설정 | Lotto Insight',
  description: 'Lotto Insight의 화면 모드, 자주 묻는 질문, 개인정보처리방침과 앱 버전을 확인합니다.',
  path: '/settings',
};

function AppMetadata() {
  const pathname = usePathname();
  const metadata = pathname === combinationMetadata.path
    ? combinationMetadata
    : pathname === generatorMetadata.path
      ? generatorMetadata
      : pathname === settingsMetadata.path
        ? settingsMetadata
        : exploreMetadata;
  const canonicalUrl = `${SITE_URL}${metadata.path}`;

  return (
    <Head>
      <title>{metadata.title}</title>
      <meta name="description" content={metadata.description} />
      <link rel="canonical" href={canonicalUrl} />

      <meta property="og:type" content="website" />
      <meta property="og:locale" content="ko_KR" />
      <meta property="og:site_name" content="Lotto Insight" />
      <meta property="og:title" content={metadata.title} />
      <meta property="og:description" content={metadata.description} />
      <meta property="og:url" content={canonicalUrl} />
    </Head>
  );
}

function ThemedApp() {
  const { colors, isReady, resolvedTheme } = useAppTheme();

  useEffect(() => {
    if (isReady) void SplashScreen.hideAsync();
  }, [isReady]);

  const navigationTheme = useMemo(() => {
    const baseTheme = resolvedTheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...baseTheme,
      colors: {
        ...baseTheme.colors,
        background: colors.background,
        border: colors.divider,
        card: colors.surface,
        primary: colors.accentPrimary,
        text: colors.textPrimary,
      },
    };
  }, [colors, resolvedTheme]);

  if (!isReady && Platform.OS !== 'web') return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <AppMetadata />
      <CombinationDraftProvider>
        <ThemeProvider value={navigationTheme}>
          <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
          <Stack screenOptions={{ animation: 'fade', headerShown: false }} />
          <BrandSplash />
        </ThemeProvider>
      </CombinationDraftProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <ThemedApp />
    </AppThemeProvider>
  );
}
