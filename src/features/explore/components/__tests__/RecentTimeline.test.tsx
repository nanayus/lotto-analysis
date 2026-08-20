import { act, fireEvent, render } from '@testing-library/react-native';
import { describe, expect, jest, test } from '@jest/globals';
import { StyleSheet } from 'react-native';

import { colors } from '@/theme';

import { RecentTimeline } from '../RecentTimeline';

describe('RecentTimeline', () => {
  test('shows a compact recent-52 summary and opens detail', async () => {
    const onOpenHistory = jest.fn();
    const { getAllByTestId, getByRole, getByTestId, getByText, queryByText } = await render(
      <RecentTimeline
        hitCount={9}
        onOpenHistory={onOpenHistory}
        values={Array.from({ length: 52 }, (_, index) => ({
          hit: index % 6 === 0,
          round: index + 1,
        }))}
      />,
    );

    expect(getByText('최근 52회 중 9회 등장')).toBeTruthy();
    expect(queryByText('최근 흐름')).toBeNull();
    expect(queryByText('최근 출현')).toBeNull();
    expect(queryByText('전체 보기 ›')).toBeNull();
    expect(getAllByTestId(/^recent52-cell-/)[0].props.testID).toBe('recent52-cell-52');
    expect(getByTestId('recent52-row-1').props.children).toHaveLength(18);
    expect(getByTestId('recent52-row-2').props.children).toHaveLength(17);
    expect(getByTestId('recent52-row-3').props.children).toHaveLength(17);
    expect(StyleSheet.flatten(getByTestId('recent52-latest-ring').props.style).borderColor)
      .toBe(colors.accentPrimary);
    expect(StyleSheet.flatten(getByTestId('recent52-latest-ring').props.style).borderWidth)
      .toBe(1);

    await act(async () => {
      fireEvent.press(getByRole('button', { name: '번호 등장 상세보기' }));
    });

    expect(onOpenHistory).toHaveBeenCalledTimes(1);
  });
});
