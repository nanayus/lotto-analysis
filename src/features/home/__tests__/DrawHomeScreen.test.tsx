import { act, fireEvent, render } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { router } from 'expo-router';

import type { AccountTier } from '@/features/monetization/policy';

import { DrawHomeScreen } from '../DrawHomeScreen';

const freeAccess = {
  bonusAnalysisCredits: 3,
  canApplyReferralCode: false,
  inviteCode: '',
  isPro: false,
  nextWeeklyResetAt: '',
  proExpiresAt: null,
  rewardedUnlocksLimit: 3,
  rewardedUnlocksUsedThisWeek: 0,
  weeklyFreeAvailable: true,
};

let mockTier: AccountTier = 'free';

jest.mock('expo-router', () => ({
  router: { navigate: jest.fn() },
}));

jest.mock('@/features/monetization/MonetizationContext', () => ({
  useMonetization: () => ({
    openPaywall: jest.fn(),
    productAccess: {
      canCompareCombinations: mockTier === 'pro',
      canSaveNumbers: mockTier !== 'guest',
      canUseBalancedPreset: mockTier !== 'guest',
      canUseAiExplanation: mockTier === 'pro',
      canUseCustomPeriod: mockTier === 'pro',
      combinationSelectionLimit: mockTier === 'guest' ? 2 : 5,
      requiresRewardedAdForResults: mockTier !== 'pro',
      storageMode: mockTier === 'pro' ? 'cloud' : mockTier === 'free' ? 'device' : 'unavailable',
      tier: mockTier,
    },
    state: { access: { ...freeAccess, isPro: mockTier === 'pro' }, status: 'ready' },
  }),
}));

const mockNavigate = router.navigate as jest.Mock;

describe('DrawHomeScreen', () => {
  beforeEach(() => {
    mockTier = 'free';
  });

  test('shows Pro entry instead of ticket balance for free users', async () => {
    const screen = await render(<DrawHomeScreen />);

    expect(screen.getByLabelText('Pro 살펴보기')).toBeTruthy();
    expect(screen.queryByText('4')).toBeNull();
    expect(screen.getByText('FREE')).toBeTruthy();
  });

  test('shows Pro instead of tickets for subscribers', async () => {
    mockTier = 'pro';
    const screen = await render(<DrawHomeScreen />);

    expect(screen.getByText('PRO')).toBeTruthy();
    expect(screen.getByText('Pro · 한 번에 최대 5게임')).toBeTruthy();
    expect(screen.queryByText(/무료회원 · 한 번에 최대 5게임/)).toBeNull();
    expect(screen.queryByLabelText('Pro 살펴보기')).toBeNull();
  });

  test('keeps the random game count independent from the single AI condition draw', async () => {
    mockNavigate.mockClear();
    const screen = await render(<DrawHomeScreen />);

    expect(screen.queryByText('몇 게임을 뽑을까요?')).toBeNull();
    expect(screen.getByLabelText('랜덤조합 게임 수')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByRole('radio', { name: '3게임' }));
    });
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: /조건 뽑기/ }));
    });

    expect(mockNavigate).toHaveBeenCalledWith({
      pathname: '/combination-generator',
      params: {
        count: '1',
        openConditions: expect.any(String),
      },
    });
  });

  test('explains the guest game limit and member-only preset', async () => {
    mockTier = 'guest';
    const screen = await render(<DrawHomeScreen />);
    expect(screen.getByText('게스트 · 한 번에 최대 2게임')).toBeTruthy();
    expect(screen.getByText(/균형 프리셋은 로그인 후/)).toBeTruthy();
  });

  test('opens the dedicated random draw route instead of drawing inline', async () => {
    mockTier = 'free';
    mockNavigate.mockClear();
    const screen = await render(<DrawHomeScreen />);

    await act(async () => {
      fireEvent.press(screen.getByRole('radio', { name: '5게임' }));
    });
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: '랜덤으로 5게임 뽑기' }));
    });

    expect(mockNavigate).toHaveBeenCalledWith({
      pathname: '/(tabs)/draw/random-draw',
      params: {
        count: '5',
        draw: expect.any(String),
      },
    });
    expect(screen.queryByText('방금 뽑은 번호')).toBeNull();
  });
});
