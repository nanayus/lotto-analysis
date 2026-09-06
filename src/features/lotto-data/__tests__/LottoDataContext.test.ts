import { describe, expect, test } from '@jest/globals';

import type { LottoHistoryDraw } from '@/domain/analytics/types';

import { isLottoHistoryDraw, mergeLottoHistory } from '../LottoDataContext';

const bundled: LottoHistoryDraw[] = [
  { bonus: 7, date: '2026-08-29', numbers: [1, 2, 3, 4, 5, 6], round: 1239 },
];

describe('LottoDataContext helpers', () => {
  test('merges validated remote draws in newest-first order', () => {
    const remote: LottoHistoryDraw[] = [
      { bonus: 27, date: '2026-09-05', numbers: [44, 11, 31, 13, 20, 19], round: 1240 },
    ];

    expect(mergeLottoHistory(bundled, remote)).toEqual([
      { bonus: 27, date: '2026-09-05', numbers: [11, 13, 19, 20, 31, 44], round: 1240 },
      bundled[0],
    ]);
  });

  test('rejects duplicate, out-of-range, or bonus-colliding values', () => {
    expect(isLottoHistoryDraw({
      bonus: 6,
      date: '2026-09-05',
      numbers: [1, 2, 3, 4, 5, 6],
      round: 1240,
    })).toBe(false);
    expect(isLottoHistoryDraw({
      bonus: 7,
      date: '2026-09-05',
      numbers: [1, 2, 3, 4, 4, 46],
      round: 1240,
    })).toBe(false);
  });
});
