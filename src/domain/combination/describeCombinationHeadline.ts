import type { CombinationAnalysis, CombinationSize } from './types';

export type CombinationHeadlineMetric =
  | 'empty-period'
  | 'same-six'
  | 'five-number'
  | 'four-number'
  | 'group-frequency'
  | 'three-number'
  | 'pair-concentration'
  | 'odd-even'
  | 'consecutive'
  | 'neutral';

export type CombinationHeadline = {
  metric: CombinationHeadlineMetric;
  score: number;
  sourceLabel: string;
  text: string;
};

type Candidate = CombinationHeadline & { priority: number };

const GROUP_DIFFERENCE_THRESHOLD = 5;
const MIN_GROUP_FREQUENCY_DRAWS = 10;

function formatNumbers(numbers: readonly number[]) {
  return numbers.join('·');
}

function topCombination(analysis: CombinationAnalysis, size: CombinationSize) {
  return analysis.subCombinations[size].reduce<CombinationAnalysis['subCombinations'][CombinationSize][number] | null>(
    (top, item) => (!top || item.appearanceCount > top.appearanceCount ? item : top),
    null,
  );
}

function stabilityScore(activeDrawCount: number) {
  return Math.min(20, Math.max(0, (activeDrawCount / 52) * 20));
}

function groupFrequencyCandidate(analysis: CombinationAnalysis): Candidate | null {
  const difference = analysis.groupFrequency.differencePct;
  if (
    analysis.activeDrawCount < MIN_GROUP_FREQUENCY_DRAWS
    || Math.abs(difference) < GROUP_DIFFERENCE_THRESHOLD
  ) {
    return null;
  }

  const deviationScore = Math.min(40, Math.abs(difference) * 2.5);
  return {
    metric: 'group-frequency',
    priority: 4,
    score: deviationScore + stabilityScore(analysis.activeDrawCount),
    sourceLabel: '선택 번호 평균 출현 / 전체 번호 평균',
    text: difference > 0
      ? '선택한 기간의 과거 기록에서 전체 평균보다 자주 등장한 흐름이에요.'
      : '선택한 기간의 과거 기록에서 전체 평균보다 드물게 등장한 흐름이에요.',
  };
}

function pairConcentrationCandidate(analysis: CombinationAnalysis): Candidate | null {
  const pairs = analysis.subCombinations[2];
  const top = topCombination(analysis, 2);
  if (!top || top.appearanceCount < 2 || !pairs.length) return null;

  const average = pairs.reduce((sum, item) => sum + item.appearanceCount, 0) / pairs.length;
  if (average > 0 && top.appearanceCount < average * 1.5) return null;

  return {
    metric: 'pair-concentration',
    priority: 6,
    score: 35 + Math.min(9, top.appearanceCount - 2),
    sourceLabel: '2번호 조합 출현',
    text: `${formatNumbers(top.numbers)} 번호쌍의 동시 출현 기록이 상대적으로 두드러져요.`,
  };
}

function oddEvenCandidate(analysis: CombinationAnalysis): Candidate {
  const { evenCount, oddCount } = analysis.shape;
  if (oddCount === 3) {
    return {
      metric: 'odd-even',
      priority: 7,
      score: 25,
      sourceLabel: '홀짝 비율',
      text: '홀수와 짝수가 3 대 3으로 고르게 구성됐어요.',
    };
  }

  const dominantLabel = oddCount > evenCount ? '홀수' : '짝수';
  const dominantCount = Math.max(oddCount, evenCount);
  return {
    metric: 'odd-even',
    priority: 7,
    score: dominantCount === 6 ? 32 : dominantCount === 5 ? 27 : 18,
    sourceLabel: '홀짝 비율',
    text: dominantCount === 6
      ? `${dominantLabel}로만 구성된 형태가 눈에 띄어요.`
      : `${dominantLabel} 비중이 더 큰 조합이에요.`,
  };
}

function consecutiveCandidate(analysis: CombinationAnalysis): Candidate | null {
  const longest = analysis.shape.consecutiveGroups.reduce(
    (length, group) => Math.max(length, group.length),
    0,
  );
  if (longest < 2) return null;

  return {
    metric: 'consecutive',
    priority: 8,
    score: longest >= 3 ? 30 + Math.min(5, longest - 3) : 20,
    sourceLabel: '연속 번호',
    text: longest >= 3
      ? `${longest}개의 번호가 연속으로 이어지는 형태예요.`
      : '서로 이어지는 연속 번호가 포함된 조합이에요.',
  };
}

export function describeCombinationHeadline(
  analysis: CombinationAnalysis,
): CombinationHeadline {
  if (analysis.activeDrawCount === 0) {
    return {
      metric: 'empty-period',
      score: 0,
      sourceLabel: '분석 기간',
      text: '선택한 기간에는 비교할 과거 회차가 없어요.',
    };
  }

  const candidates: Candidate[] = [];
  const sameSix = analysis.sameSixCount;
  if (sameSix > 0) {
    candidates.push({
      metric: 'same-six',
      priority: 1,
      score: 100,
      sourceLabel: '6번호 조합 출현',
      text: '과거 기록에서 선택 번호 6개가 함께 나온 회차가 있어요.',
    });
  }

  const topFive = topCombination(analysis, 5);
  if (topFive && topFive.appearanceCount > 0) {
    candidates.push({
      metric: 'five-number',
      priority: 2,
      score: 90 + Math.min(4, topFive.appearanceCount - 1),
      sourceLabel: '5번호 조합 출현',
      text: '과거 기록에서 선택 번호 5개가 함께 나온 회차가 있어요.',
    });
  }

  const topFour = topCombination(analysis, 4);
  if (topFour && topFour.appearanceCount > 0) {
    candidates.push({
      metric: 'four-number',
      priority: 3,
      score: 75 + Math.min(4, topFour.appearanceCount - 1),
      sourceLabel: '4번호 조합 출현',
      text: '과거 기록에서 선택 번호 4개가 함께 나온 회차가 있어요.',
    });
  }

  const groupFrequency = groupFrequencyCandidate(analysis);
  if (groupFrequency) candidates.push(groupFrequency);

  const topThree = topCombination(analysis, 3);
  if (topThree && topThree.appearanceCount >= 2) {
    candidates.push({
      metric: 'three-number',
      priority: 5,
      score: 50 + Math.min(9, (topThree.appearanceCount - 2) * 3),
      sourceLabel: '3번호 조합 출현',
      text: `${formatNumbers(topThree.numbers)} 세 번호가 함께 나온 과거 기록이 반복됐어요.`,
    });
  }

  const pairConcentration = pairConcentrationCandidate(analysis);
  if (pairConcentration) candidates.push(pairConcentration);
  candidates.push(oddEvenCandidate(analysis));

  const consecutive = consecutiveCandidate(analysis);
  if (consecutive) candidates.push(consecutive);

  const selected = candidates.reduce<Candidate | null>((best, candidate) => {
    if (!best || candidate.score > best.score) return candidate;
    if (candidate.score === best.score && candidate.priority < best.priority) return candidate;
    return best;
  }, null);

  if (!selected) {
    return {
      metric: 'neutral',
      score: 0,
      sourceLabel: '조합 형태',
      text: '여러 특징이 한쪽으로 치우치지 않은 조합이에요.',
    };
  }

  return {
    metric: selected.metric,
    score: selected.score,
    sourceLabel: selected.sourceLabel,
    text: selected.text,
  };
}
