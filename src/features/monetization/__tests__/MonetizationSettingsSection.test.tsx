import { fireEvent, render } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

import { MonetizationSettingsSection } from '../MonetizationSettingsSection';

const mockOpenLogin = jest.fn();
const mockOpenPaywall = jest.fn();
let mockAuthenticated = false;

jest.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => ({
    openLogin: mockOpenLogin,
    state: mockAuthenticated
      ? {
        status: 'authenticated',
        user: {
          displayName: null,
          email: 'free@example.com',
          photoUrl: null,
          providers: ['google.com'],
          uid: 'free-user',
        },
      }
      : { status: 'guest' },
  }),
}));

jest.mock('../MonetizationContext', () => ({
  useMonetization: () => ({
    openPaywall: mockOpenPaywall,
    productAccess: {
      canCompareCombinations: false,
      canSaveNumbers: mockAuthenticated,
      canUseBalancedPreset: mockAuthenticated,
      canUseAiExplanation: false,
      canUseCustomPeriod: false,
      combinationSelectionLimit: mockAuthenticated ? 5 : 2,
      requiresRewardedAdForResults: true,
      storageMode: mockAuthenticated ? 'device' : 'unavailable',
      tier: mockAuthenticated ? 'free' : 'guest',
    },
    refresh: jest.fn(async () => undefined),
    state: mockAuthenticated
      ? {
        access: {
          canApplyReferralCode: false,
          inviteCode: '',
          isPro: false,
          proExpiresAt: null,
        },
        status: 'ready',
      }
      : { status: 'guest' },
  }),
}));

describe('MonetizationSettingsSection', () => {
  beforeEach(() => {
    mockAuthenticated = false;
    mockOpenLogin.mockClear();
    mockOpenPaywall.mockClear();
  });

  test('uses login as the primary next step for a guest', async () => {
    const screen = await render(<MonetizationSettingsSection />);

    expect(screen.getByText('게스트')).toBeTruthy();
    expect(screen.getByText('광고 후 결과를 보고, 한 번에 최대 2개 조합을 만들 수 있어요.')).toBeTruthy();
    fireEvent.press(screen.getByText('로그인'));

    expect(mockOpenLogin).toHaveBeenCalledWith('settings-plan');
    expect(mockOpenPaywall).not.toHaveBeenCalled();
  });

  test('uses Pro as the primary upgrade step for a free member', async () => {
    mockAuthenticated = true;
    const screen = await render(<MonetizationSettingsSection />);

    expect(screen.getByText('무료회원')).toBeTruthy();
    fireEvent.press(screen.getByText('Pro'));

    expect(mockOpenPaywall).toHaveBeenCalledWith('settings');
    expect(mockOpenLogin).not.toHaveBeenCalled();
  });
});
