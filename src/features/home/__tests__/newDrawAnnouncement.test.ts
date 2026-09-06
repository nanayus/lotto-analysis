import { describe, expect, test } from '@jest/globals';

import type { LottoHistoryDraw } from '@/domain/analytics/types';

import { shouldShowNewDrawAnnouncement } from '../newDrawAnnouncement';

const draw: LottoHistoryDraw = {
  bonus: 27,
  date: '2026-09-05',
  numbers: [11, 13, 19, 20, 31, 44],
  round: 1240,
};

describe('shouldShowNewDrawAnnouncement', () => {
  test('shows after 20:35 KST on draw Saturday and throughout Sunday', () => {
    expect(shouldShowNewDrawAnnouncement(draw, 1239, new Date('2026-09-05T11:34:00Z'))).toBe(false);
    expect(shouldShowNewDrawAnnouncement(draw, 1239, new Date('2026-09-05T11:35:00Z'))).toBe(true);
    expect(shouldShowNewDrawAnnouncement(draw, 1239, new Date('2026-09-06T14:59:00Z'))).toBe(true);
  });

  test('does not show after Sunday or for a round already seen', () => {
    expect(shouldShowNewDrawAnnouncement(draw, 1239, new Date('2026-09-06T15:00:00Z'))).toBe(false);
    expect(shouldShowNewDrawAnnouncement(draw, 1240, new Date('2026-09-05T12:00:00Z'))).toBe(false);
  });
});
