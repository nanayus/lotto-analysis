import { fillCombinationRandomly } from '../randomFill';
import { describe, expect, test } from '@jest/globals';

describe('fillCombinationRandomly', () => {
  test('keeps selected values and fills six unique in-range numbers', () => {
    const result = fillCombinationRandomly([7, 18], () => 0);
    expect(result).toHaveLength(6);
    expect(result).toEqual(expect.arrayContaining([7, 18]));
    expect(new Set(result).size).toBe(6);
    expect(result.every((number) => number >= 1 && number <= 45)).toBe(true);
  });

  test('does not change a complete combination', () => {
    expect(fillCombinationRandomly([6, 5, 4, 3, 2, 1], () => 0.9)).toEqual([1, 2, 3, 4, 5, 6]);
  });
});
