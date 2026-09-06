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
const mockShowResultAd = jest.fn(async () => true);
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
      requiresAdForResults: mockAuthStatus !== 'authenticated' || !mockIsPro,
      storageMode: mockAuthStatus === 'authenticated' && mockIsPro ? 'cloud' : 'device',
      tier: mockAuthStatus === 'authenticated' && mockIsPro ? 'pro' : 'guest',
    },
    refresh: jest.fn(async () => undefined),
    resultAdsAvailable: true,
    showResultAd: mockShowResultAd,
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
    mockShowResultAd.mockClear();
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
      deleteCombination: jest.fn(),
      isReady: true,
      storageMode: 'cloud',
      toggleFavorite: jest.fn(),
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

  test('keeps manual selection independent from the return destination', async () => {
    mockSearchParams.mockReturnValue({
      returnTo: 'random-draw',
      selectionMode: 'manual',
    });
    const screen = await render(
      <CombinationDraftProvider>
        <CombinationScreen />
      </CombinationDraftProvider>,
    );

    expect(screen.queryByRole('button', { name: '랜덤 채우기' })).toBeNull();
    await act(async () => { await fireEvent.press(screen.getByTestId('combination-number-12')); });
    await act(async () => { await fireEvent.press(screen.getByTestId('combination-number-12')); });
    expect(screen.getByTestId('combination-number-12').props.accessibilityLabel).toBe('12번');
  });

  test('shows an interstitial automatically before a guest result', async () => {
    mockAuthStatus = 'guest';
    mockIsPro = false;
    mockAuthorizationDecision = 'REWARD_OR_PRO_REQUIRED';
    const screen = await render(
      <CombinationDraftProvider>
        <SeededCombinationScreen />
      </CombinationDraftProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('result-section-prize')).toBeTruthy());
    expect(mockShowResultAd).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('결과를 여는 방법을 선택하세요')).toBeNull();
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

  test('opens a condition-generated result immediately after its interstitial closes', async () => {
    mockIsPro = false;
    mockAuthorizationDecision = 'REWARD_OR_PRO_REQUIRED';
    mockSearchParams.mockReturnValue({
      accessMethod: 'interstitial',
      analyze: 'generator-conditions-result',
      returnTo: 'draw',
    });
    const screen = await render(
      <CombinationDraftProvider>
        <SeededCombinationScreen />
      </CombinationDraftProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('result-section-prize')).toBeTruthy());
    expect(mockAuthorizeAnalysis).not.toHaveBeenCalled();
    expect(mockShowResultAd).not.toHaveBeenCalled();
    expect(screen.queryByText('결과를 여는 방법을 선택하세요')).toBeNull();
  });

  test('opens all history as a sheet and returns to the same analysis result', async () => {
    const screen = await render(
      <CombinationDraftProvider>
        <SeededCombinationScreen />
      </CombinationDraftProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('result-section-prize')).toBeTruthy());
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: '전체 기록' }));
    });

    expect(screen.getByTestId('combination-detail-sheet')).toBeTruthy();
    expect(screen.getByTestId('result-section-prize')).toBeTruthy();

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: '분석 결과로 돌아가기' }));
    });

    await waitFor(() => expect(screen.queryByTestId('combination-detail-sheet')).toBeNull());
    expect(screen.getByTestId('result-section-prize')).toBeTruthy();
    expect(screen.queryByTestId('combination-number-grid')).toBeNull();
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

  test('stores a directly selected combination only after a library action', async () => {
    mockSearchParams.mockReturnValue({ returnTo: 'draw' });
    mockUseNumberLibrary.mockReturnValue({
      addCombination: mockAddCombination,
      canSave: true,
      combinations: [],
      deleteCombination: jest.fn(),
      isReady: true,
      storageMode: 'cloud',
      toggleFavorite: jest.fn(),
    });
    const screen = await render(
      <CombinationDraftProvider>
        <SeededCombinationScreen />
      </CombinationDraftProvider>,
    );

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: '분석하기' }));
    });

    await waitFor(() => expect(screen.getByTestId('result-section-prize')).toBeTruthy());
    expect(mockAddCombination).not.toHaveBeenCalled();
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: '즐겨찾기에 추가' }));
    });
    await waitFor(() => expect(mockAddCombination).toHaveBeenCalledWith(
      [1, 7, 12, 19, 34, 45],
      'manual',
      { favorite: true },
    ));
  });

  test('keeps every feature unlocked without an extra ad-choice row', async () => {
    mockSearchParams.mockReturnValue({ returnTo: 'draw' });
    mockIsPro = false;
    mockProPlanEnabled = false;
    const screen = await render(
      <CombinationDraftProvider>
        <SeededCombinationScreen />
      </CombinationDraftProvider>,
    );

    expect(screen.getByTestId('combination-number-grid')).toBeTruthy();
    expect(screen.queryByText('결과 공개')).toBeNull();
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
      params: { returnTo: 'random-draw', selectionMode: 'manual' },
    });
  });

  test('returns New analysis from a result to a fresh selection screen', async () => {
    mockReplace.mockClear();
    const screen = await render(
      <CombinationDraftProvider>
        <SeededCombinationScreen />
      </CombinationDraftProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('combination-header-start-over')).toBeTruthy());
    expect(screen.getAllByRole('button', { name: '새로 분석하기' })).toHaveLength(2);
    expect(screen.getByText('설명 보기')).toBeTruthy();
    await act(async () => {
      await fireEvent.press(screen.getByTestId('combination-header-start-over'));
    });

    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/combination-analysis',
      params: { returnTo: 'random-draw', selectionMode: 'manual' },
    });
  });

  test('returns New analysis from a condition result to the existing condition selector', async () => {
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

    await waitFor(() => expect(screen.getByTestId('combination-footer-start-over')).toBeTruthy());
    await act(async () => {
      await fireEvent.press(screen.getByTestId('combination-footer-start-over'));
    });

    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  test('opens a generated result only after its automatic interstitial closes', async () => {
    mockIsPro = false;
    mockAuthorizationDecision = 'REWARD_OR_PRO_REQUIRED';
    const screen = await render(
      <CombinationDraftProvider>
        <SeededCombinationScreen />
      </CombinationDraftProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('result-section-prize')).toBeTruthy());
    expect(mockShowResultAd).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('결과를 여는 방법을 선택하세요')).toBeNull();
    expect(mockOpenPaywall).not.toHaveBeenCalled();
  });

  test('does not show an ad-choice or Pro action while Pro sales are paused', async () => {
    mockIsPro = false;
    mockProPlanEnabled = false;
    mockAuthorizationDecision = 'REWARD_OR_PRO_REQUIRED';
    const screen = await render(
      <CombinationDraftProvider>
        <SeededCombinationScreen />
      </CombinationDraftProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('result-section-prize')).toBeTruthy());
    expect(screen.queryByRole('button', { name: 'Pro 살펴보기' })).toBeNull();
    expect(screen.queryByRole('button', { name: '광고 보고 이번 결과 보기' })).toBeNull();
    expect(mockShowResultAd).toHaveBeenCalledTimes(1);
  });

  test('opens the result when an enabled ad cannot be loaded', async () => {
    mockIsPro = false;
    mockProPlanEnabled = false;
    mockAuthorizationDecision = 'REWARD_OR_PRO_REQUIRED';
    mockShowResultAd.mockImplementationOnce(async () => false);
    const screen = await render(
      <CombinationDraftProvider>
        <SeededCombinationScreen />
      </CombinationDraftProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('result-section-prize')).toBeTruthy());
    expect(mockShowResultAd).toHaveBeenCalledTimes(1);
  });

  test('shows an interstitial directly when manual analysis is requested', async () => {
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

    await waitFor(() => expect(screen.getByTestId('result-section-prize')).toBeTruthy());
    expect(mockShowResultAd).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('combination-number-grid')).toBeNull();
    expect(screen.queryByTestId('generated-analysis-transition')).toBeNull();
  });

  test('waits for the automatic interstitial to close before showing a manual result', async () => {
    mockSearchParams.mockReturnValue({ returnTo: 'draw' });
    mockIsPro = false;
    mockAuthorizationDecision = 'REWARD_OR_PRO_REQUIRED';
    let finishAd!: (shown: boolean) => void;
    mockShowResultAd.mockImplementationOnce(() => new Promise<boolean>((resolve) => {
      finishAd = resolve;
    }));
    const screen = await render(
      <CombinationDraftProvider>
        <SeededCombinationScreen />
      </CombinationDraftProvider>,
    );

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: '분석하기' }));
    });
    await waitFor(() => expect(mockShowResultAd).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('result-section-prize')).toBeNull();

    await act(async () => { finishAd(true); });
    await waitFor(() => expect(screen.getByTestId('result-section-prize')).toBeTruthy());
  });

  test('requires another ad when a free member reopens a saved combination', async () => {
    mockIsPro = false;
    mockAuthorizationDecision = 'REWARD_OR_PRO_REQUIRED';
    const screen = await render(
      <CombinationDraftProvider>
        <SeededCombinationScreen />
      </CombinationDraftProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('result-section-prize')).toBeTruthy());
    expect(mockShowResultAd).toHaveBeenCalledTimes(1);
  });

  test('keeps an ad-supported result open when auth state changes', async () => {
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

    expect(screen.getByTestId('result-section-prize')).toBeTruthy();
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
    await waitFor(() => expect(screen.queryByText('같은 조건으로 다시 뽑는 중')).toBeNull(), {
      timeout: 2000,
    });
    expect(mockAddCombination).not.toHaveBeenCalled();
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: '즐겨찾기에 추가' }));
    });
    await waitFor(() => expect(mockAddCombination).toHaveBeenCalledWith(
      [2, 8, 13, 20, 35, 44],
      'ai',
      expect.objectContaining({
        favorite: true,
        generatorConditions: expect.objectContaining({
          sum: { enabled: true, min: 100, max: 150 },
        }),
      }),
    ), { timeout: 2000 });
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
