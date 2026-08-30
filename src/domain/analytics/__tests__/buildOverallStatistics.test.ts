import { describe, expect, test } from '@jest/globals';

import type { LottoHistoryDraw } from '../types';
import { buildOverallStatistics } from '../buildOverallStatistics';

const draws: LottoHistoryDraw[] = [
  { bonus: 7, numbers: [1, 2, 3, 4, 5, 6], round: 1 },
  { bonus: 8, numbers: [1, 2, 9, 10, 11, 12], round: 2 },
];

describe('buildOverallStatistics', () => {
  test('summarizes main-number frequency and combination shape without bonus numbers', () => {
    const result = buildOverallStatistics(draws);

    expect(result).toMatchObject({
      averageEvenCount: 3,
      averageOddCount: 3,
      averageSum: 33,
      drawCount: 2,
      firstRound: 1,
      latestRound: 2,
    });
    expect(result.topNumbers.slice(0, 2)).toEqual([
      { count: 2, number: 1 },
      { count: 2, number: 2 },
    ]);
    expect(result.topNumbers).not.toContainEqual({ count: 1, number: 7 });
  });

  test('returns a safe empty summary', () => {
    expect(buildOverallStatistics([])).toMatchObject({
      averageEvenCount: 0,
      averageOddCount: 0,
      averageSum: 0,
      drawCount: 0,
      topNumbers: [],
    });
  });
});
