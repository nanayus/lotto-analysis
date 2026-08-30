import { DarkTheme, DefaultTheme, Stack, ThemeProvider, usePathname } from 'expo-router';
import Head from 'expo-router/head';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { TamaguiProvider } from '@tamagui/core';

import { BrandSplash } from '@/components/BrandSplash';
import { CombinationDraftProvider } from '@/features/combination/CombinationDraftContext';
import { GeneratorDraftProvider } from '@/features/generator/GeneratorDraftContext';
import { NumberLibraryProvider } from '@/features/library/NumberLibraryContext';
import { AppThemeProvider, useAppTheme } from '@/theme';
import { tamaguiConfig } from '../../tamagui.config';

void SplashScreen.preventAutoHideAsync();

const STACK_ANIMATION = Platform.select({
  android: 'ios_from_right' as const,
  ios: 'simple_push' as const,
  default: 'fade' as const,
});
const STACK_ANIMATION_DURATION_MS = 240;

const SITE_URL = 'https://lotto-analysis.vercel.app';

const drawMetadata = {
  title: '로또 번호뽑기 | Lotto Insight',
  description: '조건 기반 AI 뽑기와 무작위 조합으로 로또 6/45 번호를 만들고 과거 데이터를 분석합니다.',
  path: '/draw',
};

const libraryMetadata = {
  title: '내번호보기 | Lotto Insight',
  description: '뽑았던 로또 조합과 구매번호, 즐겨찾기 조합을 한곳에서 확인합니다.',
  path: '/my-numbers',
};

const statisticsMetadata = {
  title: '로또 통계보기 | Lotto Insight',
  description: '번호별 통계와 로또 6/45 과거 당첨데이터 종합 통계를 탐색합니다.',
  path: '/statistics',
};

const exploreMetadata = {
  title: '로또 6/45 번호분석 | Lotto Insight',
  description:
    '로또 6/45 과거 당첨 데이터를 바탕으로 번호별 출현 기록과 빈도, 페어·트리오 통계를 탐색하는 데이터 분석 웹앱입니다.',
  path: '/statistics/explore',
};

const combinationMetadata = {
  title: '로또 조합분석 | Lotto Insight',
  description:
    '직접 선택한 로또 6/45 번호 6개의 과거 일치 기록, 출현 빈도, 조합 형태와 부분 조합 통계를 분석합니다.',
  path: '/combination-analysis',
};

const generatorMetadata = {
  title: '로또 조합 선택하기 | Lotto Insight',
  description:
    '고정수, 제외수, 번호 분포와 수학적 형태 조건을 직접 선택해 로또 6/45 번호 조합을 만들고 분석합니다.',
  path: '/draw/combination-generator',
};

const randomDrawMetadata = {
  title: '로또 랜덤조합 | Lotto Insight',
  description: '조건 없이 무작위로 로또 6/45 번호 조합을 만들고 과거 당첨 데이터와 비교합니다.',
  path: '/draw/random-draw',
};

const settingsMetadata = {
  title: '환경설정 | Lotto Insight',
  description: 'Lotto Insight의 화면 모드, 자주 묻는 질문, 개인정보처리방침과 앱 버전을 확인합니다.',
  path: '/settings',
};

function AppMetadata() {
  const pathname = usePathname();
  const metadata = pathname === drawMetadata.path
    ? drawMetadata
    : pathname === libraryMetadata.path
      ? libraryMetadata
      : pathname === statisticsMetadata.path || pathname === '/statistics/overall-statistics'
        ? statisticsMetadata
        : pathname === combinationMetadata.path
          ? combinationMetadata
          : pathname === generatorMetadata.path
            ? generatorMetadata
            : pathname === randomDrawMetadata.path
              ? randomDrawMetadata
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
      <TamaguiProvider config={tamaguiConfig} defaultTheme={resolvedTheme}>
        <NumberLibraryProvider>
          <GeneratorDraftProvider>
            <CombinationDraftProvider>
              <ThemeProvider value={navigationTheme}>
                <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
                <Stack
                  screenOptions={{
                    animation: STACK_ANIMATION,
                    animationDuration: STACK_ANIMATION_DURATION_MS,
                    headerShown: false,
                  }}
                />
                <BrandSplash />
              </ThemeProvider>
            </CombinationDraftProvider>
          </GeneratorDraftProvider>
        </NumberLibraryProvider>
      </TamaguiProvider>
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
