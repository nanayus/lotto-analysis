import { render } from '@testing-library/react-native';
import { describe, expect, test } from '@jest/globals';

import type { CombinationAnalysis } from '@/domain/combination/types';

import { CombinationDetail } from '../CombinationDetail';

const historyDraw: CombinationAnalysis['qualifyingHistory'][number] = {
  bonus: 26,
  bonusMatched: true,
  mainMatchCount: 3,
  matchedMainNumbers: [1, 7, 12],
  numbers: [1, 7, 12, 33, 40, 45],
  prizeRank: 5,
  round: 98,
};

const analysis = {
  numbers: [1, 7, 12, 19, 20, 26],
  qualifyingHistory: [historyDraw],
  subCombinations: { 2: [], 3: [], 4: [], 5: [], 6: [] },
} as unknown as CombinationAnalysis;

describe('CombinationDetail', () => {
  test('labels matched main and bonus numbers in the history list', async () => {
    const { getByLabelText, getByTestId, getByText, queryByText } = await render(
      <CombinationDetail
        analysis={analysis}
        mode={{ kind: 'history' }}
        onBack={() => undefined}
      />,
    );

    expect(getByText('전체 기록')).toBeTruthy();
    expect(getByText('총 1회')).toBeTruthy();
    expect(getByText('5등')).toBeTruthy();
    expect(getByTestId('history-row-98').props.children).toHaveLength(3);
    expect(queryByText('3개 이상 본번호 일치')).toBeNull();
    expect(queryByText(/5등 상당/)).toBeNull();
    expect(queryByText(/3개 일치/)).toBeNull();
    expect(getByLabelText('1번, 선택 번호와 일치')).toBeTruthy();
    expect(getByLabelText('40번')).toBeTruthy();
    expect(getByText('+')).toBeTruthy();
    expect(getByLabelText('보너스 26번, 선택 번호와 일치')).toBeTruthy();
  });
});
