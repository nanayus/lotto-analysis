import { beforeEach, describe, expect, it } from '@jest/globals';

import type { AnalysisFilters, LottoHistoryDraw } from '@/domain/analytics/types';

import { analyzeCombination, clearCombinationAnalysisCache } from '../analyzeCombination';

const history: LottoHistoryDraw[] = [
  { round: 1, numbers: [1, 2, 3, 4, 5, 6], bonus: 7 },
  { round: 2, numbers: [1, 2, 3, 4, 5, 8], bonus: 6 },
  { round: 3, numbers: [1, 2, 3, 4, 5, 8], bonus: 9 },
  { round: 4, numbers: [1, 2, 3, 4, 8, 9], bonus: 10 },
  { round: 5, numbers: [1, 2, 3, 8, 9, 10], bonus: 11 },
  { round: 6, numbers: [7, 8, 9, 10, 11, 12], bonus: 1 },
];

const allMainOnly: AnalysisFilters = {
  includeBonus: false,
  period: { kind: 'preset', label: '전체' },
};

describe('analyzeCombination', () => {
  beforeEach(clearCombinationAnalysisCache);

  it('classifies 1st through 5th prize equivalents and raw matches independently', () => {
    const result = analyzeCombination(history, [1, 2, 3, 4, 5, 6], allMainOnly);

    expect(result.prizeCounts).toEqual({ 1: 1, 2: 1, 3: 1, 4: 1, 5: 1 });
    expect(result.matchDistribution).toEqual({ 0: 1, 1: 0, 2: 0, 3: 1, 4: 1, 5: 2, 6: 1 });
    expect(result.qualifyingHistory[4].prizeRank).toBe(1);
  });

  it('keeps prize history unchanged while bonus analytics changes frequency', () => {
    const withoutBonus = analyzeCombination(history, [1, 2, 3, 4, 5, 6], allMainOnly);
    const withBonus = analyzeCombination(history, [1, 2, 3, 4, 5, 6], {
      ...allMainOnly,
      includeBonus: true,
    });

    expect(withBonus.prizeCounts).toEqual(withoutBonus.prizeCounts);
    expect(withBonus.matchDistribution).toEqual(withoutBonus.matchDistribution);
    expect(withBonus.individualNumbers.find((item) => item.number === 6)?.appearanceCount).toBeGreaterThan(
      withoutBonus.individualNumbers.find((item) => item.number === 6)!.appearanceCount,
    );
  });

  it('creates every unordered sub-combination and applies period filtering', () => {
    const result = analyzeCombination(history, [1, 2, 3, 4, 5, 6], {
      includeBonus: false,
      period: { kind: 'preset', label: '최근 3회' },
    });

    expect(result.activeDrawCount).toBe(3);
    expect(result.subCombinations[2]).toHaveLength(15);
    expect(result.subCombinations[3]).toHaveLength(20);
    expect(result.subCombinations[4]).toHaveLength(15);
    expect(result.subCombinations[5]).toHaveLength(6);
    expect(result.subCombinations[6]).toHaveLength(1);
    expect(result.subCombinations[2][0].numbers).toEqual([1, 2]);
    expect(result.subCombinations[2][0].appearanceCount).toBe(2);
    expect(result.subCombinations[2][0].latestRound).toBe(5);
  });

  it('memoizes by normalized selection and filter', () => {
    const first = analyzeCombination(history, [6, 5, 4, 3, 2, 1], allMainOnly);
    const second = analyzeCombination(history, [1, 2, 3, 4, 5, 6], allMainOnly);
    expect(second).toBe(first);
  });
});
