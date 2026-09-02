import { describe, expect, it } from '@jest/globals';

import type { CombinationAnalysis } from '../types';
import { describeCombinationHeadline } from '../describeCombinationHeadline';

const baseAnalysis = {
  activeDrawCount: 52,
  conditionMetrics: {} as CombinationAnalysis['conditionMetrics'],
  filters: { includeBonus: false, period: { kind: 'preset', label: '전체' } },
  groupFrequency: { differencePct: 0, overallAverage: 8, selectedAverage: 8 },
  highestMainMatch: 3,
  individualNumbers: [],
  matchDistribution: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
  numbers: [1, 7, 12, 19, 20, 26],
  prizeCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  qualifyingHistory: [],
  recentMeaningfulMatch: null,
  sameSixCount: 0,
  shape: { consecutiveGroups: [[19, 20]], evenCount: 3, oddCount: 3, sum: 85 },
  subCombinations: {
    2: [{ appearanceCount: 1, latestRound: 50, numbers: [1, 7] }],
    3: [{ appearanceCount: 1, latestRound: 50, numbers: [1, 7, 12] }],
    4: [],
    5: [],
    6: [],
  },
} as CombinationAnalysis;

function analysisWith(overrides: Partial<CombinationAnalysis>): CombinationAnalysis {
  return { ...baseAnalysis, ...overrides };
}

describe('describeCombinationHeadline', () => {
  it('prioritizes an identical six-number history over other observations', () => {
    const headline = describeCombinationHeadline(analysisWith({
      sameSixCount: 1,
      subCombinations: {
        ...baseAnalysis.subCombinations,
        5: [{ appearanceCount: 2, latestRound: 51, numbers: [1, 7, 12, 19, 20] }],
      },
    }));

    expect(headline).toMatchObject({
      metric: 'same-six',
      score: 100,
      sourceLabel: '6번호 조합 출현',
    });
  });

  it('uses a repeated trio when no higher-order combination appeared', () => {
    const headline = describeCombinationHeadline(analysisWith({
      subCombinations: {
        ...baseAnalysis.subCombinations,
        3: [{ appearanceCount: 3, latestRound: 50, numbers: [1, 7, 12] }],
      },
    }));

    expect(headline).toMatchObject({
      metric: 'three-number',
      sourceLabel: '3번호 조합 출현',
      text: '1·7·12 세 번호가 함께 나온 과거 기록이 반복됐어요.',
    });
  });

  it('lets a stable, large group-frequency difference lead the summary', () => {
    const headline = describeCombinationHeadline(analysisWith({
      activeDrawCount: 52,
      groupFrequency: { differencePct: 18, overallAverage: 8, selectedAverage: 9.4 },
      shape: { consecutiveGroups: [], evenCount: 3, oddCount: 3, sum: 120 },
    }));

    expect(headline.metric).toBe('group-frequency');
    expect(headline.text).toContain('전체 평균보다 자주');
  });

  it('does not amplify group-frequency differences in a very short period', () => {
    const headline = describeCombinationHeadline(analysisWith({
      activeDrawCount: 3,
      groupFrequency: { differencePct: 80, overallAverage: 0.4, selectedAverage: 0.7 },
      shape: { consecutiveGroups: [], evenCount: 3, oddCount: 3, sum: 120 },
    }));

    expect(headline).toMatchObject({
      metric: 'odd-even',
      text: '홀수와 짝수가 3 대 3으로 고르게 구성됐어요.',
    });
  });

  it('shows a calm empty-period sentence when there are no comparable draws', () => {
    expect(describeCombinationHeadline(analysisWith({ activeDrawCount: 0 }))).toMatchObject({
      metric: 'empty-period',
      sourceLabel: '분석 기간',
      text: '선택한 기간에는 비교할 과거 회차가 없어요.',
    });
  });
});
