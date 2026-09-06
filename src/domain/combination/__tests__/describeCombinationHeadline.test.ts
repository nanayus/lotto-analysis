import { describe, expect, it } from '@jest/globals';

import type { CombinationAnalysis } from '../types';
import { describeCombinationHeadline } from '../describeCombinationHeadline';

const baseConditionMetrics: CombinationAnalysis['conditionMetrics'] = {
  acValue: 7,
  bandCounts: { '1-9': 2, '10-19': 2, '20-29': 2, '30-39': 0, '40-45': 0 },
  carryCount: 0,
  carryNumbers: [],
  compositeCount: 3,
  compositeNumbers: [12, 20, 26],
  consecutivePattern: '2',
  highCount: 3,
  lastDigitSum: 25,
  lowCount: 3,
  multipleCounts: { 3: 1, 4: 2, 5: 1 },
  multipleNumbers: { 3: [12], 4: [12, 20], 5: [20] },
  neighborCount: 0,
  neighborNumbers: [],
  oddCount: 3,
  pastPrizeRanks: [],
  previousBonus: null,
  previousNumbers: [],
  previousRound: null,
  primeCount: 2,
  primeNumbers: [7, 19],
  sameEndingPattern: 'none',
  squareCount: 0,
  squareNumbers: [],
  standardDeviation: 8.5,
  sum: 85,
};

const baseAnalysis = {
  activeDrawCount: 52,
  conditionMetrics: baseConditionMetrics,
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
  it('describes an exact first-prize match with its latest round', () => {
    const headline = describeCombinationHeadline(analysisWith({
      qualifyingHistory: [{
        bonus: 30,
        bonusMatched: false,
        mainMatchCount: 6,
        matchedMainNumbers: [...baseAnalysis.numbers],
        numbers: [...baseAnalysis.numbers],
        prizeRank: 1,
        round: 1098,
      }],
    }));

    expect(headline).toMatchObject({
      metric: 'same-six',
      sourceLabel: '본번호 6개 일치',
      text: '1098회 1등 본번호와 정확히 같은 조합이에요.',
    });
  });

  it('explains a second-prize comparison in user-facing language', () => {
    const headline = describeCombinationHeadline(analysisWith({
      filters: { includeBonus: true, period: { kind: 'preset', label: '전체' } },
      qualifyingHistory: [{
        bonus: 20,
        bonusMatched: true,
        mainMatchCount: 5,
        matchedMainNumbers: [1, 7, 12, 19, 26],
        numbers: [1, 7, 12, 19, 26, 33],
        prizeRank: 2,
        round: 1215,
      }],
      sameSixCount: 1,
    }));

    expect(headline).toMatchObject({
      metric: 'five-number',
      sourceLabel: '2등 기록 · 1215회',
      text: '1215회 당첨번호와 본번호 5개, 보너스 번호가 일치해요.',
      variant: 'bonus-match',
    });
  });

  it('uses the latest round when the best prize rank appeared more than once', () => {
    const match = (round: number) => ({
      bonus: 30,
      bonusMatched: false,
      mainMatchCount: 5 as const,
      matchedMainNumbers: [1, 7, 12, 19, 20],
      numbers: [1, 7, 12, 19, 20, 33],
      prizeRank: 3 as const,
      round,
    });
    const headline = describeCombinationHeadline(analysisWith({
      qualifyingHistory: [match(1000), match(1113)],
    }));

    expect(headline).toMatchObject({
      metric: 'five-number',
      sourceLabel: '5번호 일치 · 2회',
      text: '본번호 5개가 일치한 기록이 2회 있어요. 가장 최근은 1113회예요.',
    });
  });

  it('lets a stable, large group-frequency difference lead the summary', () => {
    const headline = describeCombinationHeadline(analysisWith({
      activeDrawCount: 52,
      groupFrequency: { differencePct: 18, overallAverage: 8, selectedAverage: 9.4 },
      shape: { consecutiveGroups: [], evenCount: 3, oddCount: 3, sum: 120 },
    }));

    expect(headline).toMatchObject({
      metric: 'group-frequency',
      sourceLabel: '선택 평균 9.4회 · 전체 평균 8회',
      text: '선택한 번호들은 전체 번호보다 평균 18% 더 자주 나왔어요.',
    });
  });

  it('does not promote common fourth- or fifth-prize histories', () => {
    const headline = describeCombinationHeadline(analysisWith({
      highestMainMatch: 4,
      qualifyingHistory: [{
        bonus: 30,
        bonusMatched: false,
        mainMatchCount: 4,
        matchedMainNumbers: [1, 7, 12, 19],
        numbers: [1, 7, 12, 19, 33, 40],
        prizeRank: 4,
        round: 1215,
      }],
      shape: { consecutiveGroups: [[19, 20]], evenCount: 3, oddCount: 3, sum: 85 },
    }));

    expect(headline).toMatchObject({
      metric: 'neutral',
      sourceLabel: '조합 형태',
      text: '뚜렷하게 두드러진 과거 기록은 없어요.',
      supportingText: '19·20, 두 번호가 연속으로 이어져 있어요.',
    });
  });

  it('calls out three or more consecutive numbers directly', () => {
    const headline = describeCombinationHeadline(analysisWith({
      shape: { consecutiveGroups: [[18, 19, 20]], evenCount: 3, oddCount: 3, sum: 135 },
    }));

    expect(headline).toMatchObject({
      metric: 'consecutive',
      sourceLabel: '연속 번호 3개',
      text: '18·19·20, 세 번호가 연속으로 이어져 있어요.',
    });
  });

  it('calls out a combination made entirely of odd numbers', () => {
    const headline = describeCombinationHeadline(analysisWith({
      shape: { consecutiveGroups: [], evenCount: 0, oddCount: 6, sum: 126 },
    }));

    expect(headline).toMatchObject({
      metric: 'odd-even',
      sourceLabel: '홀짝 6:0',
      text: '여섯 번호가 모두 홀수예요.',
    });
  });

  it('does not amplify group-frequency differences in a very short period', () => {
    const headline = describeCombinationHeadline(analysisWith({
      activeDrawCount: 3,
      groupFrequency: { differencePct: 80, overallAverage: 0.4, selectedAverage: 0.7 },
      shape: { consecutiveGroups: [], evenCount: 3, oddCount: 3, sum: 120 },
    }));

    expect(headline).toMatchObject({
      metric: 'neutral',
      text: '선택 기간이 짧아 출현 차이를 뚜렷한 특징으로 판단하기 어려워요.',
    });
  });

  it('promotes a period-adjusted four-number occurrence', () => {
    const headline = describeCombinationHeadline(analysisWith({
      subCombinations: {
        ...baseAnalysis.subCombinations,
        4: [{ appearanceCount: 1, latestRound: 50, numbers: [1, 7, 12, 19] }],
      },
    }));

    expect(headline).toMatchObject({
      metric: 'four-number',
      sourceLabel: '4번호 조합 · 1회',
      text: '1·7·12·19 네 번호가 선택 기간에 1번 함께 나왔어요.',
    });
  });

  it('keeps repeated three-number combinations out of the headline', () => {
    const headline = describeCombinationHeadline(analysisWith({
      individualNumbers: [
        { appearanceCount: 10, appearanceRank: 10, averageGap: 5, currentGap: 11, number: 1 },
      ],
      subCombinations: {
        ...baseAnalysis.subCombinations,
        3: [
          { appearanceCount: 4, latestRound: 50, numbers: [1, 7, 12] },
          { appearanceCount: 1, latestRound: 49, numbers: [1, 7, 19] },
          { appearanceCount: 0, latestRound: null, numbers: [1, 7, 20] },
          { appearanceCount: 0, latestRound: null, numbers: [1, 7, 26] },
        ],
      },
    }));

    expect(headline).toMatchObject({
      metric: 'number-gap',
      text: '1번은 평균 출현 간격의 2.2배인 11회째 미출현이에요.',
      tone: 'critical',
    });
  });

  it('uses the design-system danger tone for a two-times average gap', () => {
    const headline = describeCombinationHeadline(analysisWith({
      individualNumbers: [
        { appearanceCount: 10, appearanceRank: 10, averageGap: 5, currentGap: 10, number: 26 },
      ],
      shape: { consecutiveGroups: [], evenCount: 3, oddCount: 3, sum: 120 },
    }));

    expect(headline).toMatchObject({
      metric: 'number-gap',
      text: '26번은 평균 출현 간격의 2배인 10회째 미출현이에요.',
      tone: 'critical',
      variant: 'double-average',
    });
  });

  it('describes a number with no appearance in a sufficiently long active period', () => {
    const headline = describeCombinationHeadline(analysisWith({
      activeDrawCount: 52,
      individualNumbers: [
        { appearanceCount: 0, appearanceRank: 45, averageGap: 0, currentGap: 52, number: 32 },
      ],
      shape: { consecutiveGroups: [], evenCount: 3, oddCount: 3, sum: 120 },
    }));

    expect(headline).toMatchObject({
      metric: 'number-gap',
      sourceLabel: '선택 기간 52회 · 미출현 1개',
      text: '32번은 선택한 52회 동안 출현 기록이 없어요.',
      tone: 'accent',
      variant: 'no-appearance',
    });
  });

  it('summarizes carry-over and neighboring numbers together', () => {
    const headline = describeCombinationHeadline(analysisWith({
      conditionMetrics: {
        ...baseConditionMetrics,
        carryCount: 1,
        carryNumbers: [12],
        neighborCount: 2,
        neighborNumbers: [18, 20],
        previousNumbers: [3, 12, 19, 28, 34, 41],
        previousRound: 1237,
      },
      shape: { consecutiveGroups: [], evenCount: 3, oddCount: 3, sum: 120 },
    }));

    expect(headline).toMatchObject({
      metric: 'neutral',
      supportingSourceLabel: '이월수 1개 · 이웃수 2개',
      supportingText: '직전 1237회와 같은 번호 1개, 이웃한 번호 2개가 포함돼 있어요.',
    });
  });

  it('describes an extreme sum using the active historical distribution', () => {
    const headline = describeCombinationHeadline(analysisWith({
      shape: { consecutiveGroups: [], evenCount: 3, oddCount: 3, sum: 220 },
      shapeDistribution: {
        acValuePercentile: 50,
        sampleSize: 100,
        standardDeviationPercentile: 50,
        sumPercentile: 94,
      },
    }));

    expect(headline).toMatchObject({
      metric: 'sum-position',
      sourceLabel: '합계 220 · 상위 10% 구간',
      text: '번호 합계는 220이며 과거 당첨 조합 중 높은 쪽 10% 구간에 있어요.',
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
