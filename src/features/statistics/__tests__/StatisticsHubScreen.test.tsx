import { fireEvent, render } from '@testing-library/react-native';
import { describe, expect, jest, test } from '@jest/globals';
import { router } from 'expo-router';

import { useCombinationDraft } from '@/features/combination/CombinationDraftContext';
import { StatisticsHubScreen } from '../StatisticsHubScreen';

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));
jest.mock('@/features/combination/CombinationDraftContext', () => ({ useCombinationDraft: jest.fn() }));

const mockClear = jest.fn();
const mockPush = router.push as jest.Mock;
const mockUseCombinationDraft = useCombinationDraft as jest.MockedFunction<typeof useCombinationDraft>;

describe('StatisticsHubScreen', () => {
  test('orders entries by user intent and opens a fresh manual combination analysis', async () => {
    mockUseCombinationDraft.mockReturnValue({
      clear: mockClear,
    } as unknown as ReturnType<typeof useCombinationDraft>);
    const screen = await render(<StatisticsHubScreen />);
    const entryLabels: string[] = [];
    screen.getAllByRole('button').forEach((button) => {
      const label: unknown = button.props.accessibilityLabel;
      if (typeof label === 'string' && label.endsWith(' 열기')) entryLabels.push(label);
    });

    expect(entryLabels).toEqual([
      '번호별 통계 열기',
      '조합 분석 열기',
      '당첨번호 분석 열기',
      '종합 통계 열기',
      '조합 비교 열기',
    ]);
    expect(screen.getByText('6개 번호를 직접 선택해 과거 당첨 데이터와 비교해 보세요.')).toBeTruthy();
    expect(screen.queryByText('6개 직접 선택')).toBeNull();
    expect(screen.queryByTestId('analysis-scope-bar')).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: '조합 분석 열기' }));

    expect(mockClear).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/combination-analysis',
      params: { returnTo: 'statistics', selectionMode: 'manual' },
    });
  });
});
