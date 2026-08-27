import { describe, expect, test } from '@jest/globals';

import type { LottoHistoryDraw } from '@/domain/analytics/types';

import {
  calculateCombinationMetrics,
  cloneGeneratorConditions,
  DEFAULT_GENERATOR_CONDITIONS,
  evaluateCombination,
  generateCombination,
} from '../combinationGenerator';

const history: LottoHistoryDraw[] = [
  { round: 2, numbers: [1, 7, 12, 19, 34, 45], bonus: 20 },
  { round: 1, numbers: [2, 3, 5, 8, 13, 21], bonus: 34 },
];

describe('combination generator metrics', () => {
  test('calculates population deviation, AC, sums, and number categories', () => {
    const metrics = calculateCombinationMetrics([1, 2, 3, 4, 5, 6], history);
    expect(metrics.standardDeviation).toBeCloseTo(1.7078, 3);
    expect(metrics.acValue).toBe(0);
    expect(metrics.sum).toBe(21);
    expect(metrics.lastDigitSum).toBe(21);
    expect(metrics.primeCount).toBe(3);
    expect(metrics.compositeCount).toBe(2);
    expect(metrics.squareCount).toBe(1);
    expect(metrics.consecutivePattern).toBe('6');
  });

  test('keeps mixed same-ending and consecutive signatures exact', () => {
    const metrics = calculateCombinationMetrics([1, 2, 11, 12, 21, 30], history);
    expect(metrics.sameEndingPattern).toBe('3+2');
    expect(metrics.consecutivePattern).toBe('2+2');
  });

  test('uses latest main numbers and optional bonus for carry and neighbor', () => {
    const conditions = cloneGeneratorConditions(DEFAULT_GENERATOR_CONDITIONS);
    conditions.carry.includeBonus = true;
    conditions.neighbor.includeBonus = true;
    const metrics = calculateCombinationMetrics([6, 7, 8, 20, 21, 45], history, conditions);
    expect(metrics.carryCount).toBe(3);
    expect(metrics.neighborCount).toBe(4);
  });

  test('classifies historical rank-equivalent candidates', () => {
    expect(calculateCombinationMetrics([1, 7, 12, 19, 34, 45], history).pastPrizeRanks).toContain(1);
    expect(calculateCombinationMetrics([1, 7, 12, 19, 34, 20], history).pastPrizeRanks).toContain(2);
    expect(calculateCombinationMetrics([1, 7, 12, 19, 34, 33], history).pastPrizeRanks).toContain(3);
  });
});

describe('condition evaluation and generation', () => {
  test('combines values within a condition as OR and different conditions as AND', () => {
    const conditions = cloneGeneratorConditions(DEFAULT_GENERATOR_CONDITIONS);
    conditions.oddCounts = [2, 3];
    conditions.sum = { enabled: true, min: 30, max: 40 };
    const result = evaluateCombination([1, 2, 3, 4, 5, 6], conditions, history);
    expect(result.violations.map((violation) => violation.key)).toEqual(['sum']);
  });

  test('generates six ascending unique values while preserving hard rules', async () => {
    const conditions = cloneGeneratorConditions(DEFAULT_GENERATOR_CONDITIONS);
    conditions.fixedNumbers = [7, 12];
    conditions.excludedNumbers = [1, 2, 3];
    const result = await generateCombination(conditions, { history, random: () => 0.25 });
    expect(result.mode).toBe('exact');
    expect(result.numbers).toEqual([...result.numbers].sort((left, right) => left - right));
    expect(result.numbers).toEqual(expect.arrayContaining([7, 12]));
    expect(result.numbers.some((number) => [1, 2, 3].includes(number))).toBe(false);
    expect(new Set(result.numbers).size).toBe(6);
  });

  test('returns the hard-fixed combination as nearest with disclosed violations', async () => {
    const conditions = cloneGeneratorConditions(DEFAULT_GENERATOR_CONDITIONS);
    conditions.fixedNumbers = [1, 2, 3, 4, 5, 6];
    conditions.sum = { enabled: true, min: 200, max: 220 };
    const result = await generateCombination(conditions, { history, random: () => 0 });
    expect(result.mode).toBe('nearest');
    expect(result.numbers).toEqual([1, 2, 3, 4, 5, 6]);
    expect(result.violations.map((violation) => violation.key)).toContain('sum');
  });
});
