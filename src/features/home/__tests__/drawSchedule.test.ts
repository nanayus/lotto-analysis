import { describe, expect, test } from '@jest/globals';

import {
  formatDrawDate,
  formatLottoCountdown,
  getLottoCountdownParts,
  getNextLottoDrawAt,
} from '../drawSchedule';

describe('drawSchedule', () => {
  test('targets Saturday at 20:35 in Korea before the weekly draw', () => {
    const now = new Date('2026-09-03T03:00:00.000Z');

    expect(getNextLottoDrawAt(now).toISOString()).toBe('2026-09-05T11:35:00.000Z');
    expect(formatLottoCountdown(now)).toBe('2일 08:35:00');
    expect(getLottoCountdownParts(now)).toEqual({ days: 2, hours: 8, minutes: 35, seconds: 0 });
  });

  test('rolls over to the following week once the draw time passes', () => {
    const now = new Date('2026-09-05T11:36:00.000Z');

    expect(getNextLottoDrawAt(now).toISOString()).toBe('2026-09-12T11:35:00.000Z');
    expect(formatLottoCountdown(now)).toBe('6일 23:59:00');
  });

  test('formats bundled draw dates without depending on device locale', () => {
    expect(formatDrawDate('2026-08-29')).toBe('8월 29일');
    expect(formatDrawDate(undefined)).toBeNull();
    expect(formatDrawDate('unknown')).toBeNull();
  });
});
