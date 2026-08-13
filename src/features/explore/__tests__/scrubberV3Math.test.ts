import { describe, expect, test } from '@jest/globals';

import { NUMBER_STEP } from '../scrubberV3.constants';
import {
  continuousNumberForOffset,
  nearestScrubberOffset,
  scrubberOffsetForNumber,
} from '../scrubberV3Math';

describe('NumberScrubberV3 continuous mapping', () => {
  test('maps 1 and 45 to the full physical ScrollView range', () => {
    expect(scrubberOffsetForNumber(1)).toBe(0);
    expect(scrubberOffsetForNumber(45)).toBe(44 * NUMBER_STEP);
  });

  test('preserves fractional positions between adjacent numbers', () => {
    expect(continuousNumberForOffset(16.5 * NUMBER_STEP)).toBe(17.5);
  });

  test('settles to the nearest integer offset and clamps edges', () => {
    expect(nearestScrubberOffset(16.49 * NUMBER_STEP)).toBe(16 * NUMBER_STEP);
    expect(nearestScrubberOffset(16.51 * NUMBER_STEP)).toBe(17 * NUMBER_STEP);
    expect(nearestScrubberOffset(-100)).toBe(0);
    expect(nearestScrubberOffset(99999)).toBe(44 * NUMBER_STEP);
  });
});
