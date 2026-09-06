import { describe, expect, test } from '@jest/globals';

import {
  buildGeneratorConditionDefaults,
  cloneGeneratorConditions,
  DEFAULT_GENERATOR_CONDITIONS,
} from '@/domain/generator/combinationGenerator';
import {
  describeGeneratorConditions,
  restoreGeneratorConditions,
} from '@/domain/generator/describeGeneratorConditions';
import type { LottoHistoryDraw } from '@/domain/analytics/types';

const history: LottoHistoryDraw[] = [{
  bonus: 7,
  numbers: [1, 2, 3, 4, 5, 6],
  round: 1234,
}];

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
      { key: 'numberBands', label: '번호대별 개수', value: '40-45 0 · 1개' },
      { key: 'pastRanks', label: '과거 등수 조합 제외', value: '1 · 3등' },
    ]);
  });

  test('restores every persisted condition from its description', () => {
    const conditions = buildGeneratorConditionDefaults(history);
    conditions.fixedNumbers = [7];
    conditions.excludedNumbers = [8, 9];
    conditions.sameEndingPatterns = ['2', '3+2'];
    conditions.oddCounts = [2, 4];
    conditions.highLowCounts = [3];
    conditions.acValues = [7, 8];
    conditions.primeCounts = [2];
    conditions.squareCounts = [1];
    conditions.compositeCounts = [3];
    conditions.multipleCounts[3] = [2];
    conditions.multipleCounts[4] = [1];
    conditions.multipleCounts[5] = [0];
    conditions.carry = { allowed: [1, 2], includeBonus: true };
    conditions.neighbor = { allowed: [2], includeBonus: false };
    conditions.consecutivePatterns = ['none', '2+2'];
    conditions.bandCounts['1-9'] = [1, 2];
    conditions.excludedPastRanks = [1, 2];

    const descriptions = describeGeneratorConditions(conditions);
    const restored = restoreGeneratorConditions(descriptions);

    expect(describeGeneratorConditions(restored)).toEqual(descriptions);
  });
});
