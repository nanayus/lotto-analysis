import type { CombinationAnalysis, DrawCombinationMatch } from './types';

export type CombinationHeadlineMetric =
  | 'empty-period'
  | 'prize-one'
  | 'prize-two'
  | 'prize-three'
  | 'group-frequency'
  | 'consecutive'
  | 'single-parity'
  | 'neutral';

export type CombinationHeadline = {
  metric: CombinationHeadlineMetric;
  sourceLabel: string;
  text: string;
};

const GROUP_DIFFERENCE_THRESHOLD = 5;
const MIN_GROUP_FREQUENCY_DRAWS = 10;

function formatNumbers(numbers: readonly number[]) {
  return numbers.join('·');
}

function formatDecimal(value: number) {
  return value.toFixed(1).replace(/\.0$/, '');
}

function latestPrizeMatch(
  analysis: CombinationAnalysis,
  prizeRank: 1 | 2 | 3,
): DrawCombinationMatch | null {
  return analysis.qualifyingHistory.reduce<DrawCombinationMatch | null>((latest, item) => {
    if (item.prizeRank !== prizeRank) return latest;
    return !latest || item.round > latest.round ? item : latest;
  }, null);
}

function prizeHeadline(
  analysis: CombinationAnalysis,
  prizeRank: 1 | 2 | 3,
): CombinationHeadline | null {
  const match = latestPrizeMatch(analysis, prizeRank);
  if (!match) return null;

  if (prizeRank === 1) {
    return {
      metric: 'prize-one',
      sourceLabel: '본번호 6개 일치',
      text: `${match.round}회 1등 당첨번호와 정확히 같아요.`,
    };
  }

  return {
    metric: prizeRank === 2 ? 'prize-two' : 'prize-three',
    sourceLabel: prizeRank === 2
      ? '본번호 5개 + 보너스 일치'
      : '본번호 5개 일치',
    text: `${match.round}회 당첨번호와 비교하면 ${prizeRank}등에 해당해요.`,
  };
}

function groupFrequencyHeadline(analysis: CombinationAnalysis): CombinationHeadline | null {
  const difference = analysis.groupFrequency.differencePct;
  if (
    analysis.activeDrawCount < MIN_GROUP_FREQUENCY_DRAWS
    || Math.abs(difference) < GROUP_DIFFERENCE_THRESHOLD
  ) {
    return null;
  }

  return {
    metric: 'group-frequency',
    sourceLabel: `선택 번호 평균 ${formatDecimal(analysis.groupFrequency.selectedAverage)}회 · 전체 평균 ${formatDecimal(analysis.groupFrequency.overallAverage)}회`,
    text: difference > 0
      ? `선택한 번호들은 전체 번호보다 평균 ${formatDecimal(Math.abs(difference))}% 더 자주 나왔어요.`
      : `선택한 번호들은 전체 번호보다 평균 ${formatDecimal(Math.abs(difference))}% 적게 나왔어요.`,
  };
}

function consecutiveHeadline(analysis: CombinationAnalysis): CombinationHeadline | null {
  const longestGroup = analysis.shape.consecutiveGroups.reduce<readonly number[]>(
    (longest, group) => (group.length > longest.length ? group : longest),
    [],
  );
  if (longestGroup.length < 3) return null;

  const countLabel: Record<number, string> = {
    3: '세',
    4: '네',
    5: '다섯',
    6: '여섯',
  };
  return {
    metric: 'consecutive',
    sourceLabel: `연속 번호 ${longestGroup.length}개`,
    text: `${formatNumbers(longestGroup)}, ${countLabel[longestGroup.length]} 번호가 연속으로 이어져 있어요.`,
  };
}

function singleParityHeadline(analysis: CombinationAnalysis): CombinationHeadline | null {
  const { evenCount, oddCount } = analysis.shape;
  if (oddCount !== 6 && evenCount !== 6) return null;

  return {
    metric: 'single-parity',
    sourceLabel: `홀짝 ${oddCount}:${evenCount}`,
    text: oddCount === 6
      ? '여섯 번호가 모두 홀수예요.'
      : '여섯 번호가 모두 짝수예요.',
  };
}

export function describeCombinationHeadline(
  analysis: CombinationAnalysis,
): CombinationHeadline {
  if (analysis.activeDrawCount === 0) {
    return {
      metric: 'empty-period',
      sourceLabel: '분석 기간',
      text: '선택한 기간에는 비교할 과거 회차가 없어요.',
    };
  }

  for (const prizeRank of [1, 2, 3] as const) {
    const headline = prizeHeadline(analysis, prizeRank);
    if (headline) return headline;
  }

  const groupFrequency = groupFrequencyHeadline(analysis);
  if (groupFrequency) return groupFrequency;

  const consecutive = consecutiveHeadline(analysis);
  if (consecutive) return consecutive;

  const singleParity = singleParityHeadline(analysis);
  if (singleParity) return singleParity;

  return {
    metric: 'neutral',
    sourceLabel: '조합 형태',
    text: `홀짝 ${analysis.shape.oddCount}:${analysis.shape.evenCount}, 합계 ${analysis.shape.sum}인 조합이에요.`,
  };
}
