import { act, fireEvent, render } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { router } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { MainTabHeader, SubScreenHeader, TOP_BAR_HEIGHT } from '../AppTopBar';

const mockOpenLogin = jest.fn();
const mockOpenPaywall = jest.fn();
let mockTier: 'guest' | 'pro' = 'guest';
let mockProExpiresAt: string | null = null;

jest.mock('expo-router', () => ({
  router: { navigate: jest.fn() },
}));

jest.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => ({
    openLogin: mockOpenLogin,
    state: {
      status: 'authenticated',
      user: {
        displayName: '테스터',
        email: 'tester@example.com',
        photoUrl: null,
        providers: ['google.com'],
        uid: 'tester',
      },
    },
  }),
}));

jest.mock('@/features/monetization/MonetizationContext', () => ({
  useMonetization: () => ({
    openPaywall: mockOpenPaywall,
    productAccess: {
      tier: mockTier,
    },
    state: {
      access: {
        canApplyReferralCode: false,
        inviteCode: '',
        isPro: mockTier === 'pro',
        proExpiresAt: mockProExpiresAt,
      },
      status: 'ready',
    },
  }),
}));

const mockNavigate = router.navigate as jest.Mock;

describe('SubScreenHeader', () => {
  test('keeps every sub screen on the shared 58px header and routes its actions', async () => {
    const onBack = jest.fn();
    const onRight = jest.fn();
    const screen = await render(
      <SubScreenHeader
        onBack={onBack}
        right={<Text onPress={onRight}>도움말</Text>}
        title="상세 화면"
      />,
    );

    expect(StyleSheet.flatten(screen.getByTestId('sub-screen-header').props.style).height)
      .toBe(TOP_BAR_HEIGHT);
    expect(TOP_BAR_HEIGHT).toBe(58);
    expect(screen.getByText('상세 화면')).toBeTruthy();

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: '이전 화면으로 돌아가기' }));
      await fireEvent.press(screen.getByText('도움말'));
    });

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onRight).toHaveBeenCalledTimes(1);
  });
});

describe('MainTabHeader', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockOpenLogin.mockClear();
    mockOpenPaywall.mockClear();
    mockTier = 'guest';
    mockProExpiresAt = null;
  });

  test('opens settings when an authenticated user presses the account area', async () => {
    const screen = await render(<MainTabHeader />);

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: '테스터 계정' }));
    });

    expect(mockNavigate).toHaveBeenCalledWith('/(tabs)/settings');
  });

  test('places an icon-only settings action at the trailing edge', async () => {
    const screen = await render(<MainTabHeader />);

    expect(screen.queryByText('설정')).toBeNull();
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: '환경설정' }));
    });

    expect(mockNavigate).toHaveBeenCalledWith('/(tabs)/settings');
  });

  test('opens the shared Pro paywall when a FREE user presses the plan badge', async () => {
    const screen = await render(<MainTabHeader />);

    expect(screen.getByText('FREE')).toBeTruthy();
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: 'FREE 플랜, Pro 혜택 보기' }));
    });

    expect(mockOpenPaywall).toHaveBeenCalledWith('main-header');
  });

  test('shows the expiry information when a Pro user presses the plan badge', async () => {
    mockTier = 'pro';
    mockProExpiresAt = '2026-12-31T00:00:00.000Z';
    const screen = await render(<MainTabHeader />);

    expect(screen.getByText('PRO')).toBeTruthy();
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: 'PRO 플랜, 이용 정보 보기' }));
    });

    expect(screen.getByText('Pro를 이용 중이에요')).toBeTruthy();
    expect(screen.getByText('2026년 12월 31일까지')).toBeTruthy();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockOpenPaywall).not.toHaveBeenCalled();
  });
});
