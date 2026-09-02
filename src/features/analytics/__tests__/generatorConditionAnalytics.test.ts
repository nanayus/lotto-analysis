import { describe, expect, it } from '@jest/globals';

import {
  activeConditionCount,
  cloneGeneratorConditions,
  DEFAULT_GENERATOR_CONDITIONS,
} from '@/domain/generator/combinationGenerator';

import { activeGeneratorConditionKeys } from '../generatorConditionAnalytics';

describe('generator condition analytics', () => {
  it('returns one stable key for every active generator condition', () => {
    const conditions = cloneGeneratorConditions(DEFAULT_GENERATOR_CONDITIONS);
    conditions.fixedNumbers = [3];
    conditions.excludedNumbers = [45];
    conditions.sum.enabled = true;
    conditions.oddCounts = [3];
    conditions.bandCounts['20-29'] = [2];
    conditions.multipleCounts[3] = [1, 2];
    conditions.enabledSections = {
      fixedExcluded: true,
      oddEven: true,
      band20To29: true,
      multiple3: true,
    };

    const keys = activeGeneratorConditionKeys(conditions);

    expect(keys).toEqual([
      'fixed_numbers',
      'excluded_numbers',
      'number_sum',
      'odd_even',
      'band_20_29',
      'multiple_3',
    ]);
    expect(keys).toHaveLength(activeConditionCount(conditions));
  });

  it('ignores values from a section the user disabled', () => {
    const conditions = cloneGeneratorConditions(DEFAULT_GENERATOR_CONDITIONS);
    conditions.primeCounts = [2];
    conditions.enabledSections = { primeCount: false };

    expect(activeGeneratorConditionKeys(conditions)).toEqual([]);
    expect(activeConditionCount(conditions)).toBe(0);
  });
});
