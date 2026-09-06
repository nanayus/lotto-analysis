import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

import lottoHistoryJson from '@/data/generated/lotto_history.json';
import { useNumberLibrary } from '@/features/library/NumberLibraryContext';

import { CombinationComparisonScreen } from '../CombinationComparisonScreen';

jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
    replace: jest.fn(),
  },
}));
jest.mock('@/features/library/NumberLibraryContext', () => ({ useNumberLibrary: jest.fn() }));

const mockUseNumberLibrary = useNumberLibrary as jest.MockedFunction<typeof useNumberLibrary>;
const savedCombinations = [{
  createdAt: '2026-09-04T10:00:00.000Z',
  favorite: true,
  id: 'manual-combination',
  numbers: [1, 7, 12, 19, 34, 45],
  purchased: false,
  source: 'manual' as const,
}, {
  createdAt: '2026-09-03T10:00:00.000Z',
  favorite: false,
  id: 'random-combination',
  numbers: [3, 8, 16, 22, 30, 41],
  purchased: true,
  source: 'random' as const,
}];

describe('CombinationComparisonScreen', () => {
  beforeEach(() => {
    mockUseNumberLibrary.mockReturnValue({
      addCombination: jest.fn(() => undefined),
      canSave: true,
      combinations: savedCombinations,
      isReady: true,
      storageMode: 'device',
      toggleFavorite: jest.fn(),
      togglePurchased: jest.fn(),
    });
  });

  test('combines a saved combination and a winning draw, then compares them with shared controls', async () => {
    const latestRound = Math.max(...lottoHistoryJson.map((draw) => draw.round));
    const screen = await render(<CombinationComparisonScreen />);
    const startButton = screen.getByTestId('start-comparison-button');

    expect(startButton.props.accessibilityState.disabled).toBe(true);
    expect(screen.queryByRole('button', { name: 'A와 B 순서 바꾸기' })).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'A 조합 선택' }));
    await waitFor(() => expect(screen.getByRole('button', {
      name: '직접 선택 1, 7, 12, 19, 34, 45를 A로 선택',
    })).toBeTruthy());
    fireEvent.press(screen.getByRole('button', {
      name: '직접 선택 1, 7, 12, 19, 34, 45를 A로 선택',
    }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'A 조합 변경' })).toBeTruthy());

    fireEvent.press(screen.getByRole('button', { name: 'B 조합 선택' }));
    await waitFor(() => expect(screen.getByRole('tab', { name: '당첨 회차' })).toBeTruthy());
    fireEvent.press(screen.getByRole('tab', { name: '당첨 회차' }));
    await waitFor(() => expect(screen.getByRole('button', {
      name: `${latestRound}회 당첨번호를 B로 선택`,
    })).toBeTruthy());
    fireEvent.press(screen.getByRole('button', { name: `${latestRound}회 당첨번호를 B로 선택` }));

    await waitFor(() => expect(screen.getByText('2 / 2 선택')).toBeTruthy());
    expect(screen.getByTestId('start-comparison-button').props.accessibilityState.disabled).toBe(false);
    expect(screen.getByRole('button', { name: 'A와 B 순서 바꾸기' })).toBeTruthy();

    fireEvent.press(screen.getByTestId('start-comparison-button'));

    await waitFor(() => expect(screen.getByText('핵심 비교')).toBeTruthy());
    expect(screen.getByText(`${latestRound}회 당첨번호`)).toBeTruthy();
    expect(screen.getByText('공통 번호 · 0개')).toBeTruthy();
    expect(screen.getByText('같은 분석 조건에서 두 조합의 핵심 기록을 비교합니다.')).toBeTruthy();
    expect(screen.getByText('기간')).toBeTruthy();
    expect(screen.getByText('보너스')).toBeTruthy();

    const distributionDisclosure = screen.getByRole('button', {
      name: '전체 회차 일치 분포, 본번호가 0–6개 일치한 회차 수, 보기',
    });
    expect(distributionDisclosure.props.accessibilityState.expanded).toBe(false);
    fireEvent.press(distributionDisclosure);
    await waitFor(() => expect(screen.getByRole('button', {
      name: '전체 회차 일치 분포, 본번호가 0–6개 일치한 회차 수, 접기',
    }).props.accessibilityState.expanded).toBe(true));
  });

  test('prevents choosing the same six numbers for both slots', async () => {
    const screen = await render(<CombinationComparisonScreen />);
    const candidateLabel = '직접 선택 1, 7, 12, 19, 34, 45를 A로 선택';

    fireEvent.press(screen.getByRole('button', { name: 'A 조합 선택' }));
    await waitFor(() => expect(screen.getByRole('button', { name: candidateLabel })).toBeTruthy());
    fireEvent.press(screen.getByRole('button', { name: candidateLabel }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'A 조합 변경' })).toBeTruthy());
    fireEvent.press(screen.getByRole('button', { name: 'B 조합 선택' }));

    await waitFor(() => expect(screen.getByRole('button', {
      name: '직접 선택 1, 7, 12, 19, 34, 45를 B로 선택',
    })).toBeTruthy());
    const duplicate = screen.getByRole('button', {
      name: '직접 선택 1, 7, 12, 19, 34, 45를 B로 선택',
    });
    expect(duplicate.props.accessibilityState.disabled).toBe(true);
    expect(screen.getByText('이미 반대쪽에 선택됨')).toBeTruthy();
  });
});
