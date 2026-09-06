import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { describe, expect, jest, test } from '@jest/globals';

import lottoHistoryJson from '@/data/generated/lotto_history.json';

import { drawsBeforeRound, WinningNumberAnalysisScreen } from '../WinningNumberAnalysisScreen';

jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
    replace: jest.fn(),
  },
}));

describe('WinningNumberAnalysisScreen', () => {
  test('uses only draws strictly before the selected round', () => {
    const latestRound = Math.max(...lottoHistoryJson.map((draw) => draw.round));
    const priorDraws = drawsBeforeRound(lottoHistoryJson, latestRound);

    expect(priorDraws).toHaveLength(lottoHistoryJson.length - 1);
    expect(Math.max(...priorDraws.map((draw) => draw.round))).toBe(latestRound - 1);
    expect(priorDraws.some((draw) => draw.round === latestRound)).toBe(false);
  });

  test('previews the latest draw and supports adjacent round navigation', async () => {
    const latestRound = Math.max(...lottoHistoryJson.map((draw) => draw.round));
    const screen = await render(<WinningNumberAnalysisScreen />);

    expect(screen.getByText(`제 ${latestRound}회`)).toBeTruthy();
    expect(screen.getByRole('button', { name: `${latestRound}회, 이전 기록으로 분석` })).toBeTruthy();
    expect(screen.getByText(/회 번호는/)).toBeTruthy();
    expect(screen.queryByTestId('analysis-scope-bar')).toBeNull();
    expect(screen.getByText(/이후 회차는 포함하지 않습니다/)).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: '이전 회차' }));
    await waitFor(() => expect(screen.getByText(`제 ${latestRound - 1}회`)).toBeTruthy());
    expect(screen.getByRole('button', {
      name: `현재 ${latestRound - 1}회, 다른 당첨 회차 선택`,
    })).toBeTruthy();
  });

  test('reuses the combination result after explicit confirmation', async () => {
    const latestRound = Math.max(...lottoHistoryJson.map((draw) => draw.round));
    const screen = await render(<WinningNumberAnalysisScreen />);

    fireEvent.press(screen.getByRole('button', { name: `${latestRound}회, 이전 기록으로 분석` }));

    await waitFor(() => expect(screen.getByText('과거 당첨 기록')).toBeTruthy());
    expect(screen.queryByTestId('analysis-scope-bar')).toBeNull();
    expect(screen.queryByText(`${latestRound}회 1등 당첨번호와 정확히 같아요.`)).toBeNull();
    expect(screen.getAllByRole('button', { name: '다른 당첨 회차 선택' })).toHaveLength(2);
    expect(screen.queryByTestId('result-card-actions')).toBeNull();
  });
});
