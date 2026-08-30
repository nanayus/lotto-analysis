import { act, fireEvent, render } from '@testing-library/react-native';
import { describe, expect, jest, test } from '@jest/globals';
import { router } from 'expo-router';

import { DrawHomeScreen } from '../DrawHomeScreen';

jest.mock('expo-router', () => ({
  router: { navigate: jest.fn() },
}));

const mockNavigate = router.navigate as jest.Mock;

describe('DrawHomeScreen', () => {
  test('opens the AI condition picker route with a fresh open token', async () => {
    mockNavigate.mockClear();
    const screen = await render(<DrawHomeScreen />);

    await act(async () => {
      fireEvent.press(screen.getByRole('radio', { name: '3게임' }));
    });
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: /AI 뽑기/ }));
    });

    expect(mockNavigate).toHaveBeenCalledWith({
      pathname: '/(tabs)/draw/combination-generator',
      params: {
        count: '3',
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
      fireEvent.press(screen.getByRole('button', { name: /랜덤조합/ }));
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
