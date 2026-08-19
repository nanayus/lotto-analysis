import { describe, expect, test } from '@jest/globals';
import { normalizeDraftNumbers } from '../CombinationDraftContext';

describe('normalizeDraftNumbers', () => {
  test('deduplicates, bounds, limits, and sorts draft numbers', () => {
    expect(normalizeDraftNumbers([45, 7, 7, 0, 18, 3, 22, 31, 42, 9])).toEqual([3, 7, 18, 22, 31, 45]);
  });
});
