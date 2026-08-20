import { describe, expect, test } from '@jest/globals';

import type { AnalysisFilters, LottoHistoryDraw } from '../types';
import { getNumberAppearanceHistory } from '../numberHistory';

const history: LottoHistoryDraw[] = [
  { bonus: 9, numbers: [1, 2, 3, 4, 5, 6], round: 1 },
  { bonus: 8, numbers: [2, 3, 4, 5, 6, 7], round: 2 },
  { bonus: 7, numbers: [1, 3, 4, 5, 6, 8], round: 3 },
  { bonus: 1, numbers: [2, 3, 4, 5, 6, 9], round: 4 },
];

const allDraws: AnalysisFilters = {
  includeBonus: false,
  period: { kind: 'preset', label: '전체' },
};

describe('getNumberAppearanceHistory', () => {
  test('sorts appearances newest first and measures the previous appearance gap', () => {
    const appearances = getNumberAppearanceHistory(history, 1, allDraws);

    expect(appearances.map(({ gapSincePrevious, round }) => ({ gapSincePrevious, round })))
      .toEqual([
        { gapSincePrevious: 2, round: 3 },
        { gapSincePrevious: null, round: 1 },
      ]);
  });

  test('includes bonus appearances in both rows and gap calculation when enabled', () => {
    const appearances = getNumberAppearanceHistory(history, 1, {
      ...allDraws,
      includeBonus: true,
    });

    expect(appearances.map(({ gapSincePrevious, round }) => ({ gapSincePrevious, round })))
      .toEqual([
        { gapSincePrevious: 1, round: 4 },
        { gapSincePrevious: 2, round: 3 },
        { gapSincePrevious: null, round: 1 },
      ]);
  });
});
