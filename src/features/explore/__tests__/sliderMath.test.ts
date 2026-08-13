import { describe, expect, test } from '@jest/globals';

import { NUMBER_STEP } from '../constants';
import { numberOffsetFromSelection, snapNumber } from '../sliderMath';

describe('continuous slider mapping', () => {
  test('derives every row offset from the same fractional wheel value', () => {
    expect(numberOffsetFromSelection(18, 17.25)).toBe(NUMBER_STEP * 0.75);
    expect(numberOffsetFromSelection(17, 17.25)).toBe(-NUMBER_STEP * 0.25);
  });

  test('moves higher labels upward when the continuous value increases', () => {
    const before = numberOffsetFromSelection(20, 17);
    const after = numberOffsetFromSelection(20, 18);

    expect(after).toBe(before - NUMBER_STEP);
  });

  test('snaps only the released continuous value to its nearest integer', () => {
    expect(snapNumber(17.49)).toBe(17);
    expect(snapNumber(17.5)).toBe(18);
  });
});
