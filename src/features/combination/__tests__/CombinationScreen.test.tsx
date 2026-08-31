import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { CombinationScreen } from '../CombinationScreen';
import {
  CombinationDraftProvider,
  useCombinationDraft,
} from '../CombinationDraftContext';

const mockOpenLogin = jest.fn();
const mockOpenPaywall = jest.fn();
let mockIsPro = true;
let mockAuthorizationDecision: 'AUTHORIZED_PRO' | 'AUTHORIZED_WEEKLY' | 'REWARD_OR_PRO_REQUIRED' = 'AUTHORIZED_PRO';
const mockAuthorizeAnalysis = jest.fn(async () => ({
  accessState: {
    bonusAnalysisCredits: 3,
    inviteCode: 'ABCDEF12',
    isPro: mockIsPro,
    nextWeeklyResetAt: '2026-09-06T15:00:00.000Z',
    proExpiresAt: '2026-12-31T00:00:00.000Z',
    rewardedUnlocksLimit: 3,
    rewardedUnlocksUsedThisWeek: 0,
    weeklyFreeAvailable: true,
  },
  combinationKey: '1-7-12-19-34-45',
  decision: mockAuthorizationDecision,
}));
let mockAuthStatus: 'authenticated' | 'guest' = 'authenticated';

jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    canGoBack: jest.fn(() => false),
    navigate: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
  },
  useLocalSearchParams: jest.fn(() => ({
    analyze: 'generated-result',
    returnTo: 'random-draw',
  })),
}));

jest.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => ({
    consumePendingIntent: () => false,
    openLogin: mockOpenLogin,
    state: mockAuthStatus === 'authenticated' ? {
      status: mockAuthStatus,
      user: {
        displayName: null,
        email: 'test@example.com',
        photoUrl: null,
        providers: ['google.com'],
        uid: 'test-user',
      },
    } : { status: mockAuthStatus },
  }),
}));

jest.mock('@/features/monetization/MonetizationContext', () => ({
  useMonetization: () => ({
    authorizeAnalysis: mockAuthorizeAnalysis,
    openPaywall: mockOpenPaywall,
    state: {
      status: 'ready',
      access: {
        bonusAnalysisCredits: 3,
        inviteCode: 'ABCDEF12',
        isPro: mockIsPro,
        nextWeeklyResetAt: '2026-09-06T15:00:00.000Z',
        proExpiresAt: '2026-12-31T00:00:00.000Z',
        rewardedUnlocksLimit: 3,
        rewardedUnlocksUsedThisWeek: 0,
        weeklyFreeAvailable: true,
      },
    },
  }),
}));

const mockReplace = router.replace as jest.Mock;
const mockBack = router.back as jest.Mock;
const mockCanGoBack = router.canGoBack as jest.Mock;
const mockSearchParams = useLocalSearchParams as jest.Mock;

function SeededCombinationScreen() {
  const { setNumbers } = useCombinationDraft();
  useEffect(() => {
    setNumbers([1, 7, 12, 19, 34, 45]);
  }, [setNumbers]);
  return <CombinationScreen />;
}

describe('CombinationScreen', () => {
  beforeEach(() => {
    mockBack.mockClear();
    mockCanGoBack.mockReturnValue(false);
    mockReplace.mockClear();
    mockSearchParams.mockReturnValue({
      analyze: 'generated-result',
      returnTo: 'random-draw',
    });
    mockAuthStatus = 'authenticated';
    mockOpenLogin.mockClear();
    mockOpenPaywall.mockClear();
    mockAuthorizeAnalysis.mockClear();
    mockIsPro = true;
    mockAuthorizationDecision = 'AUTHORIZED_PRO';
  });

  test('requires login before opening a requested analysis', async () => {
    mockAuthStatus = 'guest';
    await render(
      <CombinationDraftProvider>
        <SeededCombinationScreen />
      </CombinationDraftProvider>,
    );

    await waitFor(() => expect(mockOpenLogin).toHaveBeenCalledWith('combination-analysis'));
  });

  test('skips the number selector while a generated combination is being authorized', async () => {
    mockAuthorizeAnalysis.mockImplementationOnce(() => new Promise(() => undefined));
    const screen = await render(
      <CombinationDraftProvider>
        <SeededCombinationScreen />
      </CombinationDraftProvider>,
    );

    await waitFor(() => expect(mockAuthorizeAnalysis).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('generated-analysis-transition')).toBeTruthy();
    expect(screen.queryByTestId('combination-number-grid')).toBeNull();
    await screen.unmount();
  });

  test('keeps the number selector for direct manual analysis', async () => {
    mockSearchParams.mockReturnValue({ returnTo: 'draw' });
    const screen = await render(
      <CombinationDraftProvider>
        <SeededCombinationScreen />
      </CombinationDraftProvider>,
    );

    expect(screen.getByTestId('combination-number-grid')).toBeTruthy();
    expect(screen.queryByTestId('generated-analysis-transition')).toBeNull();
  });

  test('returns New analysis from a result to the Number Draw home', async () => {
    mockReplace.mockClear();
    const screen = await render(
      <CombinationDraftProvider>
        <SeededCombinationScreen />
      </CombinationDraftProvider>,
    );

    await waitFor(() => expect(screen.getByText('조합 분석')).toBeTruthy());
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: '새 조합 분석' }));
    });

    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/draw');
  });

  test('shows the access choices without calculating when free analysis is exhausted', async () => {
    mockIsPro = false;
    mockAuthorizationDecision = 'REWARD_OR_PRO_REQUIRED';
    const screen = await render(
      <CombinationDraftProvider>
        <SeededCombinationScreen />
      </CombinationDraftProvider>,
    );

    await waitFor(() => expect(screen.getByText('분석 이용권이 필요해요')).toBeTruthy());
    expect(screen.getByTestId('generated-analysis-transition')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Pro 살펴보기' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '광고 보고 이번 결과 보기, 연결 준비 중' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '다음에 하기' })).toBeTruthy();
    expect(screen.queryByText('이용 방법 보기')).toBeNull();
    expect(screen.queryByText('이번 주 무료 분석을 모두 사용했어요')).toBeNull();
    expect(screen.queryByTestId('result-section-prize')).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'Pro 살펴보기' }));
    expect(mockOpenPaywall).toHaveBeenCalledWith('analysis-limit');
  });

  test('keeps the access modal for a direct manual analysis', async () => {
    mockSearchParams.mockReturnValue({ returnTo: 'draw' });
    mockIsPro = false;
    mockAuthorizationDecision = 'REWARD_OR_PRO_REQUIRED';
    const screen = await render(
      <CombinationDraftProvider>
        <SeededCombinationScreen />
      </CombinationDraftProvider>,
    );

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: '분석하기' }));
    });

    await waitFor(() => expect(screen.getByText('이번 주 무료 분석을 모두 사용했어요')).toBeTruthy());
    expect(screen.queryByTestId('generated-analysis-transition')).toBeNull();
  });

  test('opens Pro when a free user requests combination comparison', async () => {
    mockIsPro = false;
    mockAuthorizationDecision = 'AUTHORIZED_WEEKLY';
    const screen = await render(
      <CombinationDraftProvider>
        <SeededCombinationScreen />
      </CombinationDraftProvider>,
    );

    await waitFor(() => expect(screen.getByText('조합 분석')).toBeTruthy());
    fireEvent.press(screen.getByRole('button', { name: '비교할 조합 추가' }));
    expect(mockOpenPaywall).toHaveBeenCalledWith('combination-comparison');
  });

  test('returns to the originating tab through history when the shared detail was pushed', async () => {
    mockCanGoBack.mockReturnValue(true);
    mockSearchParams.mockReturnValue({
      analyze: 'saved-combination-result',
      returnTo: 'my-numbers',
    });
    const screen = await render(
      <CombinationDraftProvider>
        <SeededCombinationScreen />
      </CombinationDraftProvider>,
    );

    await waitFor(() => expect(screen.getByText('조합 분석')).toBeTruthy());
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: '이전 화면으로 돌아가기' }));
    });

    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  test('returns to the existing condition selector instead of recreating it', async () => {
    mockCanGoBack.mockReturnValue(true);
    mockSearchParams.mockReturnValue({
      analyze: 'condition-result',
      returnTo: 'combination-generator',
    });
    const screen = await render(
      <CombinationDraftProvider>
        <SeededCombinationScreen />
      </CombinationDraftProvider>,
    );

    await waitFor(() => expect(screen.getByText('조합 분석')).toBeTruthy());
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: '이전 화면으로 돌아가기' }));
    });

    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
