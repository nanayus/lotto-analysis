import { describe, expect, it } from '@jest/globals';

import { resultSectionVisibilityRatio } from '../resultAnalytics';

describe('combination result analytics', () => {
  it('calculates how much of a section is visible in the result viewport', () => {
    expect(resultSectionVisibilityRatio({ height: 200, y: 100 }, 0, 400)).toBe(1);
    expect(resultSectionVisibilityRatio({ height: 200, y: 300 }, 0, 400)).toBe(0.5);
    expect(resultSectionVisibilityRatio({ height: 200, y: 500 }, 0, 400)).toBe(0);
  });

  it('uses viewport height as the denominator for very tall sections', () => {
    expect(resultSectionVisibilityRatio({ height: 1000, y: 0 }, 200, 400)).toBe(1);
  });
});
