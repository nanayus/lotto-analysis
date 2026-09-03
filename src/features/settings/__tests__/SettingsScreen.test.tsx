import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { router } from 'expo-router';
import { Linking } from 'react-native';

import type { AuthState } from '@/features/auth/types';
import { SettingsScreen } from '@/features/settings/SettingsScreen';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '0.0.1' } },
}));

let mockAuthState: AuthState = { status: 'guest' };

jest.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => ({
    clearError: jest.fn(),
    closeLogin: jest.fn(),
    consumePendingIntent: jest.fn(),
    deleteAccount: jest.fn(),
    error: null,
    isConfigured: true,
    isLoginVisible: false,
    isWorking: false,
    link: jest.fn(),
    openLogin: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
    state: mockAuthState,
  }),
}));

const mockPush = router.push as jest.Mock;

describe('SettingsScreen', () => {
  beforeEach(() => {
    mockAuthState = { status: 'guest' };
    mockPush.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows the app information and all display choices', async () => {
    const view = await render(<SettingsScreen />);

    expect(view.getByText('0.0.1')).toBeTruthy();
    fireEvent.press(view.getByText('디스플레이'));
    await waitFor(() => expect(view.getByText('밝은 UI')).toBeTruthy());
    expect(view.getByText('밝은 UI')).toBeTruthy();
    expect(view.getByText('어두운 UI')).toBeTruthy();
    expect(view.getAllByText('휴대폰 설정에 따라 바뀜')).toHaveLength(2);
    fireEvent.press(view.getByText('밝은 UI'));
    await waitFor(() => expect(view.queryByText('어두운 UI')).toBeNull());
  });

  it('opens the Wondly FAQ and privacy pages', async () => {
    const openUrl = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const view = await render(<SettingsScreen />);

    await act(async () => {
      fireEvent.press(view.getByText('FAQ'));
    });
    expect(openUrl).toHaveBeenCalledWith('https://wondly.net/#faq-title');

    await act(async () => {
      fireEvent.press(view.getByText('개인정보처리방침'));
    });
    expect(openUrl).toHaveBeenCalledWith('https://wondly.net/privacy');
  });

  it('opens release notes only for the configured owner account', async () => {
    const guestView = await render(<SettingsScreen />);
    expect(guestView.queryByRole('button', { name: /변경 내역 보기/ })).toBeNull();
    await act(async () => guestView.unmount());

    mockAuthState = {
      status: 'authenticated',
      user: {
        displayName: 'Owner',
        email: 'ynleesss@gmail.com',
        photoUrl: null,
        providers: ['google.com'],
        uid: 'owner',
      },
    };
    const ownerView = await render(<SettingsScreen />);

    await act(async () => {
      fireEvent.press(ownerView.getByRole('button', { name: '버전 0.0.1, 변경 내역 보기' }));
    });
    expect(mockPush).toHaveBeenCalledWith('/release-notes');
  });
});
