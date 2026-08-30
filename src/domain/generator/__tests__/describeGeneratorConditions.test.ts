import { describe, expect, test } from '@jest/globals';

import {
  cloneGeneratorConditions,
  DEFAULT_GENERATOR_CONDITIONS,
} from '@/domain/generator/combinationGenerator';
import { describeGeneratorConditions } from '@/domain/generator/describeGeneratorConditions';

describe('describeGeneratorConditions', () => {
  test('returns no rows for an unrestricted generation', () => {
    expect(describeGeneratorConditions(DEFAULT_GENERATOR_CONDITIONS)).toEqual([]);
  });

  test('preserves the selected values and bonus semantics in display order', () => {
    const conditions = cloneGeneratorConditions(DEFAULT_GENERATOR_CONDITIONS);
    conditions.fixedNumbers = [12, 3];
    conditions.sum = { enabled: true, min: 100, max: 150 };
    conditions.oddCounts = [2, 4];
    conditions.carry = { allowed: [1, 2], includeBonus: true };
    conditions.bandCounts['40-45'] = [0, 1];
    conditions.excludedPastRanks = [1, 3];

    expect(describeGeneratorConditions(conditions)).toEqual([
      { key: 'fixed', label: '고정수', value: '3 · 12' },
      { key: 'sum', label: '번호 총합', value: '100–150' },
      { key: 'odd', label: '홀수 개수', value: '2 · 4개' },
      { key: 'carry', label: '이월수', value: '1 · 2개 · 보너스 포함' },
      { key: 'band:40-45', label: '40-45 번호대', value: '0 · 1개' },
      { key: 'pastRanks', label: '과거 등수 조합 제외', value: '1 · 3등' },
    ]);
  });
});
