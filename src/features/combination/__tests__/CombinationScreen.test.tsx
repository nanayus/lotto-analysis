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
let mockAuthorizationDecision: 'AUTHORIZED_PRO' | 'REWARD_OR_PRO_REQUIRED' = 'AUTHORIZED_PRO';
const mockAuthorizeAnalysis = jest.fn(async () => ({
  accessState: {
    canApplyReferralCode: false,
    inviteCode: 'ABCDEF12',
    isPro: mockIsPro,
    proExpiresAt: '2026-12-31T00:00:00.000Z',
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
    productAccess: {
      canCompareCombinations: mockAuthStatus === 'authenticated' && mockIsPro,
      canSaveNumbers: mockAuthStatus === 'authenticated',
      canUseBalancedPreset: mockAuthStatus === 'authenticated',
      canUseAiExplanation: mockAuthStatus === 'authenticated' && mockIsPro,
      canUseCustomPeriod: mockAuthStatus === 'authenticated' && mockIsPro,
      combinationSelectionLimit: mockAuthStatus === 'authenticated' ? 5 : 2,
      requiresRewardedAdForResults: mockAuthStatus !== 'authenticated' || !mockIsPro,
      storageMode: mockAuthStatus === 'authenticated' && mockIsPro ? 'cloud' : mockAuthStatus === 'authenticated' ? 'device' : 'unavailable',
      tier: mockAuthStatus === 'authenticated' && mockIsPro ? 'pro' : mockAuthStatus === 'authenticated' ? 'free' : 'guest',
    },
    refresh: jest.fn(async () => undefined),
    state: {
      status: 'ready',
      access: {
        canApplyReferralCode: false,
        inviteCode: 'ABCDEF12',
        isPro: mockIsPro,
        proExpiresAt: '2026-12-31T00:00:00.000Z',
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

  test('lets a guest continue to the rewarded-ad result gate', async () => {
    mockAuthStatus = 'guest';
    mockIsPro = false;
    mockAuthorizationDecision = 'REWARD_OR_PRO_REQUIRED';
    const screen = await render(
      <CombinationDraftProvider>
        <SeededCombinationScreen />
      </CombinationDraftProvider>,
    );

    await waitFor(() => expect(screen.getByText('결과를 여는 방법을 선택하세요')).toBeTruthy());
    expect(mockOpenLogin).not.toHaveBeenCalled();
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
    expect(screen.getByTestId('loading-number-shuffle', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getAllByTestId(
      /loading-number-shuffle-number-/,
      { includeHiddenElements: true },
    )).toHaveLength(6);
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

  test('keeps manual number selection available for free members', async () => {
    mockSearchParams.mockReturnValue({ returnTo: 'draw' });
    mockIsPro = false;
    const screen = await render(
      <CombinationDraftProvider>
        <SeededCombinationScreen />
      </CombinationDraftProvider>,
    );

    expect(screen.getByTestId('combination-number-grid')).toBeTruthy();
    expect(screen.getByText('무료회원 · 광고 후 결과 공개')).toBeTruthy();
    expect(screen.queryByTestId('generated-analysis-transition')).toBeNull();
    expect(mockAuthorizeAnalysis).not.toHaveBeenCalled();
  });

  test('shows a recoverable page for a direct analysis URL without six numbers', async () => {
    const screen = await render(
      <CombinationDraftProvider>
        <CombinationScreen />
      </CombinationDraftProvider>,
    );

    expect(screen.getByText('분석할 번호를 찾지 못했어요')).toBeTruthy();
    expect(screen.getByRole('button', { name: '번호 다시 선택하기' })).toBeTruthy();
    expect(screen.queryByTestId('combination-number-grid')).toBeNull();
    expect(mockAuthorizeAnalysis).not.toHaveBeenCalled();

    fireEvent.press(screen.getByRole('button', { name: '번호 다시 선택하기' }));
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/combination-analysis',
      params: { returnTo: 'random-draw' },
    });
  });

  test('returns New analysis from a result to the Number Draw home', async () => {
    mockReplace.mockClear();
    const screen = await render(
      <CombinationDraftProvider>
        <SeededCombinationScreen />
      </CombinationDraftProvider>,
    );

    await waitFor(() => expect(screen.getByRole('button', { name: '새 조합 분석' })).toBeTruthy());
    expect(screen.getByText('해설 보기')).toBeTruthy();
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

    await waitFor(() => expect(screen.getByText('결과를 여는 방법을 선택하세요')).toBeTruthy());
    expect(screen.getByTestId('generated-analysis-transition')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Pro 살펴보기' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '광고 보고 이번 결과 보기, 광고 연결 준비 중' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '다음에 하기' })).toBeTruthy();
    expect(screen.getByTestId('access-number-shuffle', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.queryByText('이용 방법 보기')).toBeNull();
    expect(screen.queryByText('이번 주 무료 분석을 모두 사용했어요')).toBeNull();
    expect(screen.queryByTestId('result-section-prize')).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'Pro 살펴보기' }));
    expect(mockOpenPaywall).toHaveBeenCalledWith('analysis-limit');
  });

  test('uses the full access page when a direct manual analysis is denied', async () => {
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

    await waitFor(() => expect(screen.getByText('결과를 여는 방법을 선택하세요')).toBeTruthy());
    expect(screen.getByTestId('generated-analysis-transition')).toBeTruthy();
    expect(screen.queryByTestId('combination-number-grid')).toBeNull();
    expect(screen.queryByText('이번 주 무료 분석을 모두 사용했어요')).toBeNull();
  });

  test('requires another ad when a free member reopens a saved combination', async () => {
    mockIsPro = false;
    mockAuthorizationDecision = 'REWARD_OR_PRO_REQUIRED';
    const screen = await render(
      <CombinationDraftProvider>
        <SeededCombinationScreen />
      </CombinationDraftProvider>,
    );

    await waitFor(() => expect(screen.getByText('결과를 여는 방법을 선택하세요')).toBeTruthy());
    expect(screen.queryByTestId('result-section-prize')).toBeNull();
  });

  test('hides an open analysis result after sign-out', async () => {
    const screen = await render(
      <CombinationDraftProvider>
        <SeededCombinationScreen />
      </CombinationDraftProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('result-section-prize')).toBeTruthy());
    mockAuthStatus = 'guest';
    await act(async () => {
      screen.rerender(
        <CombinationDraftProvider>
          <SeededCombinationScreen />
        </CombinationDraftProvider>,
      );
    });

    await waitFor(() => expect(screen.getByText('결과를 여는 방법을 선택하세요')).toBeTruthy());
    expect(screen.queryByTestId('result-section-prize')).toBeNull();
  });

  test('opens Pro when a free user requests combination comparison', async () => {
    mockIsPro = false;
    mockAuthorizationDecision = 'AUTHORIZED_PRO';
    const screen = await render(
      <CombinationDraftProvider>
        <SeededCombinationScreen />
      </CombinationDraftProvider>,
    );

    const compareButton = await waitFor(() => screen.getByRole('button', { name: '비교할 조합 추가, Pro 전용' }));
    fireEvent.press(compareButton);
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
