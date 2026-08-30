import { act, fireEvent, render } from '@testing-library/react-native';
import { describe, expect, jest, test } from '@jest/globals';
import { router } from 'expo-router';

import { DrawHomeScreen } from '../DrawHomeScreen';

jest.mock('expo-router', () => ({
  router: { navigate: jest.fn() },
}));

const mockNavigate = router.navigate as jest.Mock;

describe('DrawHomeScreen', () => {
  test('keeps the random game count independent from the single AI condition draw', async () => {
    mockNavigate.mockClear();
    const screen = await render(<DrawHomeScreen />);

    expect(screen.queryByText('몇 게임을 뽑을까요?')).toBeNull();
    expect(screen.getByLabelText('랜덤조합 게임 수')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByRole('radio', { name: '3게임' }));
    });
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: /AI 뽑기/ }));
    });

    expect(mockNavigate).toHaveBeenCalledWith({
      pathname: '/(tabs)/draw/combination-generator',
      params: {
        count: '1',
        openConditions: expect.any(String),
      },
    });
  });

  test('opens the dedicated random draw route instead of drawing inline', async () => {
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
