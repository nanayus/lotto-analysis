import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';

import {
  cloneGeneratorConditions,
  DEFAULT_GENERATOR_CONDITIONS,
  generateCombination,
} from '@/domain/generator/combinationGenerator';
import { describeGeneratorConditions } from '@/domain/generator/describeGeneratorConditions';
import { useNumberLibrary } from '@/features/library/NumberLibraryContext';

import { CombinationScreen } from '../CombinationScreen';
import {
  CombinationDraftProvider,
  useCombinationDraft,
} from '../CombinationDraftContext';

const mockOpenLogin = jest.fn();
const mockOpenPaywall = jest.fn();
const mockShowRewardedAd = jest.fn(async () => true);
const mockAddCombination = jest.fn(() => 'saved-condition-combination');
let mockIsPro = true;
let mockProPlanEnabled = true;
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
    proPlanEnabled: mockProPlanEnabled,
    productAccess: {
      canRegenerateWithSameConditions: mockAuthStatus === 'authenticated' && mockIsPro,
      canSaveNumbers: true,
      canUseBalancedPreset: mockAuthStatus === 'authenticated' && mockIsPro,
      canUseAiExplanation: mockAuthStatus === 'authenticated' && mockIsPro,
      canUseCustomPeriod: mockAuthStatus === 'authenticated' && mockIsPro,
      combinationSelectionLimit: mockIsPro ? 5 : 2,
      conditionSelectionLimit: mockAuthStatus === 'authenticated' && mockIsPro
        ? null
        : 2,
      requiresRewardedAdForResults: mockAuthStatus !== 'authenticated' || !mockIsPro,
      storageMode: mockAuthStatus === 'authenticated' && mockIsPro ? 'cloud' : 'device',
      tier: mockAuthStatus === 'authenticated' && mockIsPro ? 'pro' : 'guest',
    },
    refresh: jest.fn(async () => undefined),
    rewardedAdsAvailable: true,
    showRewardedAd: mockShowRewardedAd,
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

jest.mock('@/features/library/NumberLibraryContext', () => ({
  useNumberLibrary: jest.fn(),
}));

jest.mock('@/domain/generator/combinationGenerator', () => {
  const actual = jest.requireActual<typeof import('@/domain/generator/combinationGenerator')>(
    '@/domain/generator/combinationGenerator',
  );
  return { ...actual, generateCombination: jest.fn() };
});

const mockReplace = router.replace as jest.Mock;
const mockBack = router.back as jest.Mock;
const mockCanGoBack = router.canGoBack as jest.Mock;
const mockSearchParams = useLocalSearchParams as jest.Mock;
const mockGenerateCombination = generateCombination as jest.MockedFunction<typeof generateCombination>;
const mockUseNumberLibrary = useNumberLibrary as jest.MockedFunction<typeof useNumberLibrary>;

function SeededCombinationScreen() {
  const { setNumbers } = useCombinationDraft();
  useEffect(() => {
    setNumbers([1, 7, 12, 19, 34, 45]);
  }, [setNumbers]);
  return <CombinationScreen />;
}

describe('CombinationScreen', () => {
  beforeEach(() => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
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
    mockShowRewardedAd.mockClear();
    mockAuthorizeAnalysis.mockClear();
    mockIsPro = true;
    mockProPlanEnabled = true;
    mockAuthorizationDecision = 'AUTHORIZED_PRO';
    mockAddCombination.mockClear();
    mockAddCombination.mockReturnValue('saved-condition-combination');
    mockGenerateCombination.mockReset();
    mockGenerateCombination.mockResolvedValue({
      numbers: [2, 8, 13, 20, 35, 44],
    } as Awaited<ReturnType<typeof generateCombination>>);
    const generatorConditions = cloneGeneratorConditions(DEFAULT_GENERATOR_CONDITIONS);
    generatorConditions.sum = { enabled: true, min: 100, max: 150 };
    mockUseNumberLibrary.mockReturnValue({
      addCombination: mockAddCombination,
      canSave: true,
      combinations: [{
        createdAt: '2026-09-02T10:00:00.000Z',
        favorite: false,
        generationConditions: describeGeneratorConditions(generatorConditions),
        generatorConditions,
        id: 'saved-condition-combination',
        numbers: [1, 7, 12, 19, 34, 45],
        purchased: false,
        source: 'ai',
      }],
      isReady: true,
      storageMode: 'cloud',
      toggleFavorite: jest.fn(),
      togglePurchased: jest.fn(),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('keeps the statistics manual selector free of random fill and exclusion cycling', async () => {
    mockSearchParams.mockReturnValue({ returnTo: 'statistics' });
    const screen = await render(
      <CombinationDraftProvider>
        <CombinationScreen />
      </CombinationDraftProvider>,
    );

    expect(screen.queryByRole('button', { name: '랜덤 채우기' })).toBeNull();
    const number = screen.getByTestId('combination-number-12');
    await act(async () => { await fireEvent.press(number); });
    expect(screen.getByTestId('combination-number-12').props.accessibilityState.checked).toBe(true);

    await act(async () => { await fireEvent.press(screen.getByTestId('combination-number-12')); });
    expect(screen.getByTestId('combination-number-12').props.accessibilityState.checked).toBe(false);
    expect(screen.getByTestId('combination-number-12').props.accessibilityLabel).toBe('12번');

    await act(async () => { await fireEvent.press(screen.getByTestId('combination-number-12')); });
    expect(screen.getByTestId('combination-number-12').props.accessibilityState.checked).toBe(true);
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

  test('stores a directly selected combination with a manual source', async () => {
    mockSearchParams.mockReturnValue({ returnTo: 'draw' });
    mockUseNumberLibrary.mockReturnValue({
      addCombination: mockAddCombination,
      canSave: true,
      combinations: [],
      isReady: true,
      storageMode: 'cloud',
      toggleFavorite: jest.fn(),
      togglePurchased: jest.fn(),
    });
    const screen = await render(
      <CombinationDraftProvider>
        <SeededCombinationScreen />
      </CombinationDraftProvider>,
    );

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: '분석하기' }));
    });

    await waitFor(() => expect(mockAddCombination).toHaveBeenCalledWith(
      [1, 7, 12, 19, 34, 45],
      'manual',
    ));
  });

  test('keeps manual analysis unlocked while the Pro plan is paused', async () => {
    mockSearchParams.mockReturnValue({ returnTo: 'draw' });
    mockIsPro = false;
    mockProPlanEnabled = false;
    const screen = await render(
      <CombinationDraftProvider>
        <SeededCombinationScreen />
      </CombinationDraftProvider>,
    );

    expect(screen.getByTestId('combination-number-grid')).toBeTruthy();
    expect(screen.getByText('광고 없이 결과 보기')).toBeTruthy();
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

    await fireEvent.press(screen.getByRole('button', { name: '번호 다시 선택하기' }));
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/combination-analysis',
      params: { returnTo: 'random-draw' },
    });
  });

  test('returns New analysis from a result to a fresh selection screen', async () => {
    mockReplace.mockClear();
    const screen = await render(
      <CombinationDraftProvider>
        <SeededCombinationScreen />
      </CombinationDraftProvider>,
    );

    await waitFor(() => expect(screen.getByRole('button', { name: '새 조합 분석' })).toBeTruthy());
    expect(screen.getByText('설명 보기')).toBeTruthy();
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: '새 조합 분석' }));
    });

    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/combination-analysis',
      params: { returnTo: 'random-draw' },
    });
  });

  test('offers an active rewarded-ad path without calculating early', async () => {
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
    const rewardButton = screen.getByRole('button', { name: '광고 보고 이번 결과 보기' });
    expect(rewardButton).toBeEnabled();
    expect(screen.getByRole('button', { name: '다음에 하기' })).toBeTruthy();
    expect(screen.getByTestId('access-number-shuffle', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.queryByText('이용 방법 보기')).toBeNull();
    expect(screen.queryByText('이번 주 무료 분석을 모두 사용했어요')).toBeNull();
    expect(screen.queryByTestId('result-section-prize')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Pro 살펴보기' }));
    expect(mockOpenPaywall).toHaveBeenCalledWith('analysis-limit');

    expect(mockShowRewardedAd).not.toHaveBeenCalled();
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
      await fireEvent.press(screen.getByRole('button', { name: '분석하기' }));
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
      await screen.rerender(
        <CombinationDraftProvider>
          <SeededCombinationScreen />
        </CombinationDraftProvider>,
      );
    });

    await waitFor(() => expect(screen.getByText('결과를 여는 방법을 선택하세요')).toBeTruthy());
    expect(screen.queryByTestId('result-section-prize')).toBeNull();
  });

  test('shows same-condition regeneration but opens Pro for a guest', async () => {
    mockIsPro = false;
    mockAuthorizationDecision = 'AUTHORIZED_PRO';
    const screen = await render(
      <CombinationDraftProvider>
        <SeededCombinationScreen />
      </CombinationDraftProvider>,
    );

    const regenerateButton = await waitFor(() => screen.getByRole('button', {
      name: '같은 조건으로 다시 뽑기, Pro 전용',
    }));
    await fireEvent.press(regenerateButton);
    expect(mockOpenPaywall).toHaveBeenCalledWith('same-condition-regeneration');
    expect(mockGenerateCombination).not.toHaveBeenCalled();
  });

  test('shows the lotto loading transition and analyzes the regenerated Pro combination', async () => {
    const screen = await render(
      <CombinationDraftProvider>
        <SeededCombinationScreen />
      </CombinationDraftProvider>,
    );

    const regenerateButton = await waitFor(() => screen.getByRole('button', {
      name: '같은 조건으로 다시 뽑기',
    }));
    await act(async () => {
      await fireEvent.press(regenerateButton);
    });

    expect(screen.getByText('같은 조건으로 다시 뽑는 중')).toBeTruthy();
    expect(screen.getByTestId('loading-number-shuffle', { includeHiddenElements: true })).toBeTruthy();
    await waitFor(() => expect(mockAddCombination).toHaveBeenCalledWith(
      [2, 8, 13, 20, 35, 44],
      'ai',
      expect.objectContaining({
        generatorConditions: expect.objectContaining({
          sum: { enabled: true, min: 100, max: 150 },
        }),
      }),
    ), { timeout: 2000 });
    await waitFor(() => expect(screen.queryByText('같은 조건으로 다시 뽑는 중')).toBeNull(), {
      timeout: 2000,
    });
    expect(screen.getByRole('button', { name: '같은 조건으로 다시 뽑기' })).toBeTruthy();
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
      await fireEvent.press(screen.getByRole('button', { name: '이전 화면으로 돌아가기' }));
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
      await fireEvent.press(screen.getByRole('button', { name: '이전 화면으로 돌아가기' }));
    });

    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
