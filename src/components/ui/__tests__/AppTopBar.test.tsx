import { act, fireEvent, render } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { router } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { MainTabHeader, SubScreenHeader, TOP_BAR_HEIGHT } from '../AppTopBar';

const mockOpenLogin = jest.fn();
const mockOpenPaywall = jest.fn();
let mockTier: 'free' | 'pro' = 'free';

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
      fireEvent.press(screen.getByRole('button', { name: '이전 화면으로 돌아가기' }));
      fireEvent.press(screen.getByText('도움말'));
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
    mockTier = 'free';
  });

  test('opens settings when an authenticated user presses the account area', async () => {
    const screen = await render(<MainTabHeader />);

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: '테스터 계정' }));
    });

    expect(mockNavigate).toHaveBeenCalledWith('/(tabs)/settings');
  });

  test('opens settings when a Pro user presses the subscription state', async () => {
    mockTier = 'pro';
    const screen = await render(<MainTabHeader />);

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'PRO 이용 중' }));
    });

    expect(mockNavigate).toHaveBeenCalledWith('/(tabs)/settings');
    expect(mockOpenPaywall).not.toHaveBeenCalled();
  });
});
