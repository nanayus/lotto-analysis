import { describe, expect, test } from '@jest/globals';

import { dummyAnalytics, getDummyAnalytics, NumberStatus } from '../dummyAnalytics';

const promptExamples: readonly [
  number,
  NumberStatus,
  number,
  number,
  readonly boolean[],
][] = [
  [17, 'HOT', 187, 7, [true, true, false, true, false]],
  [18, 'NEUTRAL', 181, 21, [false, true, false, false, true]],
  [19, 'COLD', 175, 39, [false, false, true, false, false]],
];

describe('dummyAnalytics', () => {
  test('contains one stable fixture for every lotto number', () => {
    expect(dummyAnalytics).toHaveLength(45);
    expect(dummyAnalytics.map((item) => item.number)).toEqual(
      Array.from({ length: 45 }, (_, index) => index + 1),
    );
    expect(getDummyAnalytics(8)).toBe(getDummyAnalytics(8));
  });

  test.each(promptExamples)(
    'keeps the prompt example for number %i',
    (number, status, frequency, rank, recentFive) => {
      const analytics = getDummyAnalytics(number);

      expect(analytics).toMatchObject({ number, status, frequency, rank });
      expect(analytics.recentFive).toEqual(recentFive);
      expect(analytics.timeline).toHaveLength(52);
    },
  );

  test('clamps fixture lookup to the 1–45 range', () => {
    expect(getDummyAnalytics(0).number).toBe(1);
    expect(getDummyAnalytics(46).number).toBe(45);
  });
});
