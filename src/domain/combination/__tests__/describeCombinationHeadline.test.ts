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
      metric: 'prize-one',
      sourceLabel: '본번호 6개 일치',
      text: '1098회 1등 당첨번호와 정확히 같아요.',
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
      metric: 'prize-two',
      sourceLabel: '본번호 5개 + 보너스 일치',
      text: '1215회 당첨번호와 비교하면 2등에 해당해요.',
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
      metric: 'prize-three',
      sourceLabel: '본번호 5개 일치',
      text: '1113회 당첨번호와 비교하면 3등에 해당해요.',
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
      sourceLabel: '선택 번호 평균 9.4회 · 전체 평균 8회',
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
      text: '홀짝 3:3, 합계 85인 조합이에요.',
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
      metric: 'single-parity',
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
      text: '홀짝 3:3, 합계 120인 조합이에요.',
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
