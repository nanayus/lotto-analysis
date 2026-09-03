import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { router } from 'expo-router';

import type { AuthState } from '@/features/auth/types';
import { ReleaseNotesScreen } from '@/features/settings/ReleaseNotesScreen';

let mockAuthState: AuthState = { status: 'guest' };

jest.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => ({ state: mockAuthState }),
}));

const mockBack = router.back as jest.Mock;
const mockReplace = router.replace as jest.Mock;

describe('ReleaseNotesScreen', () => {
  beforeEach(() => {
    mockAuthState = { status: 'guest' };
    mockBack.mockClear();
    mockReplace.mockClear();
  });

  it('redirects accounts that are not allowed to read release notes', async () => {
    await render(<ReleaseNotesScreen />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(tabs)/settings'));
  });

  it('shows all screen-by-screen changes to the configured owner', async () => {
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
    const view = await render(<ReleaseNotesScreen />);

    expect(view.getByText('버전 0.0.1')).toBeTruthy();
    expect(view.getAllByText('번호뽑기 홈')).toHaveLength(3);
    expect(view.getByText('환경설정')).toBeTruthy();
    expect(view.getByText(/당첨번호 공의 가독성을 높였습니다/)).toBeTruthy();

    fireEvent.press(view.getByLabelText('이전 화면으로 돌아가기'));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
