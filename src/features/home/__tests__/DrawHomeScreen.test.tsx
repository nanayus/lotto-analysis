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

let mockTier: AccountTier = 'guest';
let mockProPlanEnabled = true;

jest.mock('expo-router', () => ({
  router: { navigate: jest.fn() },
}));

jest.mock('rn-number-flow', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  const MockNumberFlow = ({ value }: { value: string }) => React.createElement(Text, null, value);
  MockNumberFlow.displayName = 'MockNumberFlow';
  return MockNumberFlow;
});

jest.mock('@/features/monetization/MonetizationContext', () => ({
  useMonetization: () => ({
    openPaywall: jest.fn(),
    proPlanEnabled: mockProPlanEnabled,
    productAccess: {
      canRegenerateWithSameConditions: mockTier === 'pro' || !mockProPlanEnabled,
      canSaveNumbers: true,
      canUseBalancedPreset: mockTier === 'pro' || !mockProPlanEnabled,
      canUseAiExplanation: mockTier === 'pro' || !mockProPlanEnabled,
      canUseCustomPeriod: mockTier === 'pro' || !mockProPlanEnabled,
      combinationSelectionLimit: mockTier === 'pro' || !mockProPlanEnabled ? 5 : 2,
      conditionSelectionLimit: mockTier === 'pro' || !mockProPlanEnabled ? null : 99,
      requiresAdForResults: mockTier !== 'pro' && mockProPlanEnabled,
      storageMode: mockTier === 'pro' ? 'cloud' : 'device',
      tier: mockTier,
    },
    state: { access: { ...freeAccess, isPro: mockTier === 'pro' }, status: 'ready' },
  }),
}));

const mockNavigate = router.navigate as jest.Mock;

describe('DrawHomeScreen', () => {
  beforeEach(() => {
    mockTier = 'guest';
    mockProPlanEnabled = true;
  });

  test('shows Pro entry instead of ticket balance for guests', async () => {
    const screen = await render(<DrawHomeScreen />);

    expect(screen.getByLabelText('FREE 플랜, Pro 혜택 보기')).toBeTruthy();
    expect(screen.queryByText('4')).toBeNull();
    expect(screen.getAllByText('FREE').length).toBeGreaterThan(0);
  });

  test('shows Pro instead of tickets for subscribers', async () => {
    mockTier = 'pro';
    const screen = await render(<DrawHomeScreen />);

    expect(screen.getByText('PRO')).toBeTruthy();
    expect(screen.getByText('Pro · 최대 5게임')).toBeTruthy();
    expect(screen.getByLabelText('PRO 플랜, 이용 정보 보기')).toBeTruthy();
  });

  test('keeps the random game count independent from the single AI condition draw', async () => {
    mockTier = 'pro';
    mockNavigate.mockClear();
    const screen = await render(<DrawHomeScreen />);

    expect(screen.queryByText('몇 게임을 뽑을까요?')).toBeNull();
    expect(screen.getByLabelText('랜덤조합 게임 수')).toBeTruthy();

    await act(async () => {
      await fireEvent.press(screen.getByRole('radio', { name: '3게임' }));
    });
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: /조건 뽑기/ }));
    });

    expect(mockNavigate).toHaveBeenCalledWith({
      pathname: '/combination-generator',
      params: {
        count: '1',
        openConditions: expect.any(String),
      },
    });
  });

  test('keeps game and condition features unlocked while the Pro plan is paused', async () => {
    mockTier = 'guest';
    mockProPlanEnabled = false;
    const screen = await render(<DrawHomeScreen />);
    expect(screen.getByText('최대 5게임')).toBeTruthy();
    expect(screen.getByText('조건 무제한 · 추천 조건')).toBeTruthy();
  });

  test('opens the dedicated random draw route instead of drawing inline', async () => {
    mockTier = 'pro';
    mockNavigate.mockClear();
    const screen = await render(<DrawHomeScreen />);

    await act(async () => {
      await fireEvent.press(screen.getByRole('radio', { name: '5게임' }));
    });
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: '랜덤으로 5게임 뽑기' }));
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

  test('shows the latest draw and countdown as non-interactive information', async () => {
    const screen = await render(<DrawHomeScreen />);

    expect(screen.queryByText('최근 당첨번호')).toBeNull();
    expect(screen.getByText('제 1239회 · 8월 29일')).toBeTruthy();
    expect(screen.getByText('다음 추첨까지')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /최근 당첨번호/ })).toBeNull();
  });
});
