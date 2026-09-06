import { describe, expect, test } from '@jest/globals';

import type { LottoHistoryDraw } from '@/domain/analytics/types';

import {
  expectedLatestLottoDrawDate,
  isLottoHistoryDraw,
  mergeLottoHistory,
  shouldRefreshLottoData,
} from '../LottoDataContext';

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

  test('treats the previous Saturday as latest before the Saturday publish time', () => {
    expect(expectedLatestLottoDrawDate(new Date('2026-09-05T11:44:00Z')))
      .toBe('2026-08-29');
    expect(expectedLatestLottoDrawDate(new Date('2026-09-05T11:45:00Z')))
      .toBe('2026-09-05');
  });

  test('uses the most recent Saturday from Sunday through Friday', () => {
    expect(expectedLatestLottoDrawDate(new Date('2026-09-06T03:00:00Z')))
      .toBe('2026-09-05');
    expect(expectedLatestLottoDrawDate(new Date('2026-09-11T03:00:00Z')))
      .toBe('2026-09-05');
  });

  test('refreshes only when local data is behind the expected draw date', () => {
    const sunday = new Date('2026-09-06T03:00:00Z');
    expect(shouldRefreshLottoData(bundled[0], 0, sunday)).toBe(true);
    expect(shouldRefreshLottoData(
      { ...bundled[0], date: '2026-09-05', round: 1240 },
      0,
      sunday,
    )).toBe(false);
  });

  test('backs off stale-data checks for 15 minutes and allows a forced refresh', () => {
    const sunday = new Date('2026-09-06T03:00:00Z');
    const tenMinutesAgo = sunday.getTime() - 10 * 60 * 1_000;
    expect(shouldRefreshLottoData(bundled[0], tenMinutesAgo, sunday)).toBe(false);
    expect(shouldRefreshLottoData(bundled[0], tenMinutesAgo, sunday, true)).toBe(true);
  });
});
