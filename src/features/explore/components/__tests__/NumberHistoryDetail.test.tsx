import { render } from '@testing-library/react-native';
import { describe, expect, test } from '@jest/globals';

import type { NumberAppearanceHistoryItem } from '@/domain/analytics/numberHistory';

import { NumberHistoryDetail } from '../NumberHistoryDetail';

const entries: NumberAppearanceHistoryItem[] = [
  {
    bonus: 13,
    gapSincePrevious: 7,
    numbers: [1, 14, 39, 41, 44, 45],
    round: 1234,
  },
];

describe('NumberHistoryDetail', () => {
  test('shows one compact row and highlights only the explored number', async () => {
    const { getAllByText, getByLabelText, getByTestId, getByText, queryByText } = await render(
      <NumberHistoryDetail
        bonusIncluded={false}
        entries={entries}
        number={39}
        onBack={() => undefined}
      />,
    );

    expect(getAllByText('39번 출현 기록')).toHaveLength(2);
    expect(getByText('총 1회')).toBeTruthy();
    expect(getByText('1234회')).toBeTruthy();
    expect(getByText('7회 만에 등장')).toBeTruthy();
    expect(getByTestId('number-history-round-1234').props.numberOfLines).toBeUndefined();
    expect(getByTestId('number-history-summary')).toBeTruthy();
    expect(getByText('최근 52회에서 본번호로 등장한 회차와 직전 출현 간격입니다.')).toBeTruthy();
    expect(getByLabelText('39번, 선택 번호와 일치')).toBeTruthy();
    expect(getByLabelText('14번')).toBeTruthy();
    expect(getByLabelText('보너스 13번')).toBeTruthy();
    expect(queryByText('최근 흐름 상세')).toBeNull();
  });
});
