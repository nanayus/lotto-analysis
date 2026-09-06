import type {
  CombinationAnalysis,
  CombinationSize,
  SubCombinationAnalysis,
} from './types';

export type CombinationHeadlineMetric =
  | 'empty-period'
  | 'same-six'
  | 'five-number'
  | 'four-number'
  | 'pair-concentration'
  | 'number-gap'
  | 'group-frequency'
  | 'consecutive'
  | 'odd-even'
  | 'low-high'
  | 'sum-position'
  | 'number-band'
  | 'same-ending'
  | 'distribution'
  | 'previous-draw'
  | 'number-property'
  | 'neutral';

export type CombinationHeadlineTone = 'accent' | 'critical' | 'neutral';

export type CombinationHeadline = {
  metric: CombinationHeadlineMetric;
  sourceLabel: string;
  supportingSourceLabel?: string;
  supportingText?: string;
  supportingTone?: CombinationHeadlineTone;
  text: string;
  tone: CombinationHeadlineTone;
  variant?: string;
};

type Candidate = {
  family: string;
  metric: Exclude<CombinationHeadlineMetric, 'empty-period' | 'neutral'>;
  score: number;
  sourceLabel: string;
  text: string;
  tone?: CombinationHeadlineTone;
  variant?: string;
};

const MIN_GROUP_FREQUENCY_DRAWS = 10;
const MIN_SHAPE_DISTRIBUTION_DRAWS = 52;
const PRIMARY_SCORE_THRESHOLD = 35;
const SUPPORT_SCORE_THRESHOLD = 20;

function formatNumbers(numbers: readonly number[]) {
  return numbers.join('·');
}

function formatDecimal(value: number) {
  return value.toFixed(1).replace(/\.0$/, '');
}

function average(items: readonly SubCombinationAnalysis[]) {
  return items.length
    ? items.reduce((sum, item) => sum + item.appearanceCount, 0) / items.length
    : 0;
}

function topCombination(analysis: CombinationAnalysis, size: CombinationSize) {
  return analysis.subCombinations[size].reduce<SubCombinationAnalysis | null>(
    (top, item) => !top || item.appearanceCount > top.appearanceCount ? item : top,
    null,
  );
}

function latestPrizeMatches(analysis: CombinationAnalysis, prizeRank: 1 | 2 | 3) {
  return analysis.qualifyingHistory
    .filter((item) => item.prizeRank === prizeRank)
    .sort((left, right) => right.round - left.round);
}

function prizeCandidate(
  analysis: CombinationAnalysis,
  prizeRank: 1 | 2 | 3,
): Candidate | null {
  const matches = latestPrizeMatches(analysis, prizeRank);
  const latest = matches[0];
  if (!latest) return null;

  if (prizeRank === 1) {
    return {
      family: 'history',
      metric: 'same-six',
      score: 100,
      sourceLabel: matches.length > 1 ? `동일 6번호 · ${matches.length}회` : '본번호 6개 일치',
      text: matches.length > 1
        ? `과거 ${matches.length}개 회차의 1등 본번호와 같아요. 가장 최근은 ${latest.round}회예요.`
        : `${latest.round}회 1등 본번호와 정확히 같은 조합이에요.`,
      tone: 'accent',
      variant: matches.length > 1 ? 'multiple' : 'single',
    };
  }

  const bonusMatched = prizeRank === 2;
  return {
    family: 'history',
    metric: 'five-number',
    score: bonusMatched ? 96 : 94,
    sourceLabel: matches.length > 1
      ? `5번호 일치 · ${matches.length}회`
      : `${prizeRank}등 기록 · ${latest.round}회`,
    text: matches.length > 1
      ? `본번호 5개가 일치한 기록이 ${matches.length}회 있어요. 가장 최근은 ${latest.round}회예요.`
      : bonusMatched
        ? `${latest.round}회 당첨번호와 본번호 5개, 보너스 번호가 일치해요.`
        : `${latest.round}회 당첨번호와 본번호 5개가 일치해요.`,
    tone: 'accent',
    variant: bonusMatched ? 'bonus-match' : 'main-only',
  };
}

function coOccurrenceCandidates(analysis: CombinationAnalysis): Candidate[] {
  const candidates: Candidate[] = [];
  const topFour = topCombination(analysis, 4);
  if (
    topFour
    && topFour.appearanceCount > 0
    && (topFour.appearanceCount >= 2 || analysis.activeDrawCount <= 104)
  ) {
    candidates.push({
      family: 'co-occurrence',
      metric: 'four-number',
      score: 86 + Math.min(5, topFour.appearanceCount - 1),
      sourceLabel: `4번호 조합 · ${topFour.appearanceCount}회`,
      text: `${formatNumbers(topFour.numbers)} 네 번호가 선택 기간에 ${topFour.appearanceCount}번 함께 나왔어요.`,
      tone: 'accent',
    });
  }

  const pairs = analysis.subCombinations[2];
  const topPair = topCombination(analysis, 2);
  const pairAverage = average(pairs);
  if (
    topPair
    && topPair.appearanceCount >= 2
    && topPair.appearanceCount >= Math.max(2, pairAverage * 1.35)
  ) {
    const tiedPair = pairs.find(
      (item) => item !== topPair && item.appearanceCount === topPair.appearanceCount,
    );
    candidates.push({
      family: 'co-occurrence',
      metric: 'pair-concentration',
      score: 72 + Math.min(5, Math.max(0, topPair.appearanceCount - pairAverage)),
      sourceLabel: `${formatNumbers(topPair.numbers)} ${topPair.appearanceCount}회 · 선택 쌍 평균 ${formatDecimal(pairAverage)}회`,
      text: tiedPair
        ? `가장 자주 함께 나온 번호쌍은 ${formatNumbers(topPair.numbers)}와 ${formatNumbers(tiedPair.numbers)}로, 각각 ${topPair.appearanceCount}회예요.`
        : `선택한 번호쌍 중 가장 자주 함께 나온 것은 ${formatNumbers(topPair.numbers)}예요.`,
      tone: 'accent',
      variant: tiedPair ? 'tie' : 'single',
    });
  }

  return candidates;
}

function groupFrequencyCandidates(analysis: CombinationAnalysis): Candidate[] {
  if (analysis.activeDrawCount < MIN_GROUP_FREQUENCY_DRAWS) return [];
  const candidates: Candidate[] = [];
  const difference = analysis.groupFrequency.differencePct;
  if (Math.abs(difference) >= 5) {
    candidates.push({
      family: 'frequency',
      metric: 'group-frequency',
      score: 66 + Math.min(10, Math.abs(difference)),
      sourceLabel: `선택 평균 ${formatDecimal(analysis.groupFrequency.selectedAverage)}회 · 전체 평균 ${formatDecimal(analysis.groupFrequency.overallAverage)}회`,
      text: difference > 0
        ? `선택한 번호들은 전체 번호보다 평균 ${formatDecimal(Math.abs(difference))}% 더 자주 나왔어요.`
        : `선택한 번호들은 전체 번호보다 평균 ${formatDecimal(Math.abs(difference))}% 적게 나왔어요.`,
      tone: 'accent',
      variant: difference > 0 ? 'above-average' : 'below-average',
    });
  }

  const overallAverage = analysis.groupFrequency.overallAverage;
  if (overallAverage <= 0 || !analysis.individualNumbers.length) return candidates;
  const highest = [...analysis.individualNumbers].sort(
    (left, right) => right.appearanceCount - left.appearanceCount || left.number - right.number,
  )[0];
  const lowest = [...analysis.individualNumbers].sort(
    (left, right) => left.appearanceCount - right.appearanceCount || left.number - right.number,
  )[0];
  const highDifference = ((highest.appearanceCount - overallAverage) / overallAverage) * 100;
  const lowDifference = ((overallAverage - lowest.appearanceCount) / overallAverage) * 100;
  if (Math.max(highDifference, lowDifference) >= 8) {
    const selected = highDifference >= lowDifference ? highest : lowest;
    const higher = selected === highest;
    candidates.push({
      family: 'frequency',
      metric: 'group-frequency',
      score: 52 + Math.min(8, Math.max(highDifference, lowDifference) / 2),
      sourceLabel: `${selected.number}번 ${selected.appearanceCount}회 · 전체 ${selected.appearanceRank}위`,
      text: `선택 번호 중 ${selected.number}번의 과거 출현 횟수가 가장 ${higher ? '많아요' : '적어요'}.`,
      tone: 'accent',
      variant: higher ? 'individual-high' : 'individual-low',
    });
  }
  return candidates;
}

function gapCandidate(analysis: CombinationAnalysis): Candidate | null {
  const noAppearance = analysis.individualNumbers
    .filter((item) => item.appearanceCount === 0)
    .sort((left, right) => right.currentGap - left.currentGap || left.number - right.number);
  if (analysis.activeDrawCount >= MIN_GROUP_FREQUENCY_DRAWS && noAppearance.length > 0) {
    const numbers = noAppearance.map((item) => item.number);
    return {
      family: 'gap',
      metric: 'number-gap',
      score: 61,
      sourceLabel: `선택 기간 ${analysis.activeDrawCount}회 · 미출현 ${numbers.length}개`,
      text: numbers.length === 1
        ? `${numbers[0]}번은 선택한 ${analysis.activeDrawCount}회 동안 출현 기록이 없어요.`
        : `${formatNumbers(numbers)}번은 선택한 ${analysis.activeDrawCount}회 동안 출현 기록이 없어요.`,
      tone: 'accent',
      variant: 'no-appearance',
    };
  }
  const notable = analysis.individualNumbers
    .filter((item) => item.appearanceCount >= 2 && item.averageGap > 0 && item.currentGap > item.averageGap)
    .map((item) => ({ item, ratio: item.currentGap / item.averageGap }))
    .sort((left, right) => right.ratio - left.ratio || left.item.number - right.item.number);
  const selected = notable[0];
  if (!selected) return null;
  const critical = selected.ratio >= 2;
  return {
    family: 'gap',
    metric: 'number-gap',
    score: critical ? 78 + Math.min(5, selected.ratio - 2) : 58 + Math.min(5, selected.ratio - 1),
    sourceLabel: critical
      ? `${selected.item.number}번 · 평균 ${formatDecimal(selected.item.averageGap)}회 · 현재 ${selected.item.currentGap}회`
      : `${selected.item.number}번 · 평균 초과`,
    text: critical
      ? `${selected.item.number}번은 평균 출현 간격의 ${formatDecimal(selected.ratio)}배인 ${selected.item.currentGap}회째 미출현이에요.`
      : `${selected.item.number}번은 평균 출현 간격 ${formatDecimal(selected.item.averageGap)}회보다 긴 ${selected.item.currentGap}회째 미출현이에요.`,
    tone: critical ? 'critical' : 'accent',
    variant: critical ? 'double-average' : 'above-average',
  };
}

function consecutiveCandidate(analysis: CombinationAnalysis): Candidate | null {
  const groups = [...analysis.shape.consecutiveGroups].sort(
    (left, right) => right.length - left.length || left[0] - right[0],
  );
  const longest = groups[0];
  if (!longest) return null;
  if (groups.length >= 2 && longest.length === 2) {
    return {
      family: 'sequence', metric: 'consecutive', score: 32,
      sourceLabel: `연속 번호 그룹 ${groups.length}개`,
      text: `연속 번호 그룹이 ${groups.length}개 있어요: ${groups.map((group) => `${group[0]}–${group.at(-1)}`).join(', ')}.`,
      tone: 'accent', variant: 'multiple-pairs',
    };
  }
  const words: Record<number, string> = { 2: '두', 3: '세', 4: '네', 5: '다섯', 6: '여섯' };
  return {
    family: 'sequence', metric: 'consecutive',
    score: longest.length >= 3 ? 64 + longest.length * 3 : 28,
    sourceLabel: `연속 번호 ${longest.length}개`,
    text: longest.length >= 4
      ? `${longest[0]}부터 ${longest.at(-1)}까지 ${words[longest.length]} 번호가 연속으로 이어져 있어요.`
      : `${formatNumbers(longest)}, ${words[longest.length]} 번호가 연속으로 이어져 있어요.`,
    tone: 'accent', variant: `${longest.length}-run`,
  };
}

function balanceCandidates(analysis: CombinationAnalysis): Candidate[] {
  const { evenCount, oddCount } = analysis.shape;
  const dominantOdd = oddCount > evenCount;
  const dominantParityCount = Math.max(oddCount, evenCount);
  const lowCount = analysis.conditionMetrics.lowCount
    ?? analysis.numbers.filter((number) => number <= 22).length;
  const highCount = analysis.conditionMetrics.highCount ?? 6 - lowCount;
  const dominantLow = lowCount > highCount;
  const dominantRangeCount = Math.max(lowCount, highCount);
  return [{
    family: 'parity', metric: 'odd-even',
    score: dominantParityCount === 6 ? 62 : dominantParityCount === 5 ? 46 : dominantParityCount === 4 ? 28 : 22,
    sourceLabel: `홀짝 ${oddCount}:${evenCount}`,
    text: dominantParityCount === 6
      ? `여섯 번호가 모두 ${dominantOdd ? '홀수' : '짝수'}예요.`
      : dominantParityCount === 5
        ? `${dominantOdd ? '홀수' : '짝수'}가 5개로 구성의 대부분을 차지해요.`
        : dominantParityCount === 4
          ? `홀수가 ${oddCount}개, 짝수가 ${evenCount}개예요.`
          : '홀수와 짝수가 3개씩 나뉘어 있어요.',
    tone: 'accent', variant: `${oddCount}-${evenCount}`,
  }, {
    family: 'range-balance', metric: 'low-high',
    score: dominantRangeCount === 6 ? 60 : dominantRangeCount === 5 ? 44 : dominantRangeCount === 4 ? 27 : 21,
    sourceLabel: `저고 ${lowCount}:${highCount}`,
    text: dominantRangeCount === 6
      ? `여섯 번호가 모두 ${dominantLow ? '22 이하의 저수' : '23 이상의 고수'}예요.`
      : dominantRangeCount === 5
        ? `${dominantLow ? '저수' : '고수'}가 5개로 구성의 대부분을 차지해요.`
        : dominantRangeCount === 4
          ? `저수가 ${lowCount}개, 고수가 ${highCount}개예요.`
          : '저수와 고수가 3개씩 나뉘어 있어요.',
    tone: 'accent', variant: `${lowCount}-${highCount}`,
  }];
}

function distributionCandidates(analysis: CombinationAnalysis): Candidate[] {
  const distribution = analysis.shapeDistribution;
  if (!distribution || distribution.sampleSize < MIN_SHAPE_DISTRIBUTION_DRAWS) return [];
  const candidates: Candidate[] = [];
  const sumPercentile = distribution.sumPercentile;
  if (sumPercentile <= 25 || sumPercentile >= 75) {
    const veryLow = sumPercentile <= 10;
    const veryHigh = sumPercentile >= 90;
    const low = sumPercentile < 50;
    candidates.push({
      family: 'sum', metric: 'sum-position',
      score: veryLow || veryHigh ? 64 : 34,
      sourceLabel: `합계 ${analysis.shape.sum} · ${low ? '하위' : '상위'} ${veryLow || veryHigh ? '10%' : '25%'} 구간`,
      text: veryLow || veryHigh
        ? `번호 합계는 ${analysis.shape.sum}이며 과거 당첨 조합 중 ${low ? '낮은' : '높은'} 쪽 10% 구간에 있어요.`
        : `번호 합계는 ${analysis.shape.sum}이며 과거 기록에서 비교적 ${low ? '낮은' : '높은'} 구간에 있어요.`,
      tone: 'accent',
      variant: veryLow ? 'very-low' : veryHigh ? 'very-high' : low ? 'low' : 'high',
    });
  }
  const standardDeviation = distribution.standardDeviationPercentile;
  if (standardDeviation <= 10 || standardDeviation >= 90) {
    const spread = standardDeviation >= 90;
    candidates.push({
      family: 'spread', metric: 'distribution', score: 56,
      sourceLabel: `표준편차 ${formatDecimal(analysis.conditionMetrics.standardDeviation)} · ${spread ? '상위' : '하위'} 10%`,
      text: spread ? '번호들이 낮은 수부터 높은 수까지 넓게 퍼져 있어요.' : '번호들이 비교적 가까운 범위에 모여 있어요.',
      tone: 'accent', variant: spread ? 'wide' : 'narrow',
    });
  }
  const acValue = distribution.acValuePercentile;
  if (acValue <= 10 || acValue >= 90) {
    const diverse = acValue >= 90;
    candidates.push({
      family: 'spread', metric: 'distribution', score: 52,
      sourceLabel: `A/C ${analysis.conditionMetrics.acValue} · ${diverse ? '상위' : '하위'} 10%`,
      text: diverse ? '번호 사이의 차이값이 비교적 다양하게 구성돼 있어요.' : '번호 사이의 차이값이 서로 겹치는 형태가 많아요.',
      tone: 'accent', variant: diverse ? 'ac-high' : 'ac-low',
    });
  }
  return candidates;
}

function bandCandidate(analysis: CombinationAnalysis): Candidate | null {
  const counts = analysis.conditionMetrics.bandCounts;
  if (!counts) return null;
  const entries = Object.entries(counts).sort((left, right) => right[1] - left[1]);
  const [topBand, topCount] = entries[0] ?? [];
  const occupied = entries.filter(([, count]) => count > 0).length;
  if (topBand && topCount >= 3) return {
    family: 'bands', metric: 'number-band', score: topCount >= 4 ? 52 : 32,
    sourceLabel: `${topBand} 번호대 · ${topCount}개`,
    text: `${topBand} 번호대에 여섯 번호 중 ${topCount}개가 모여 있어요.`,
    tone: 'accent', variant: 'concentrated',
  };
  if (occupied === 5) return {
    family: 'bands', metric: 'number-band', score: 25,
    sourceLabel: '번호대 5개 구간', text: '번호가 다섯 개 번호대에 걸쳐 분포해 있어요.',
    tone: 'accent', variant: 'spread',
  };
  return null;
}

function sameEndingCandidate(analysis: CombinationAnalysis): Candidate | null {
  const groups = new Map<number, number[]>();
  analysis.numbers.forEach((number) => {
    const ending = number % 10;
    groups.set(ending, [...(groups.get(ending) ?? []), number]);
  });
  const repeated = [...groups.entries()]
    .filter(([, numbers]) => numbers.length >= 2)
    .sort((left, right) => right[1].length - left[1].length || left[0] - right[0]);
  const [ending, numbers] = repeated[0] ?? [];
  if (!numbers || ending === undefined) return null;
  const pairCount = repeated.filter(([, items]) => items.length === 2).length;
  return {
    family: 'ending', metric: 'same-ending', score: numbers.length >= 3 ? 54 : 30,
    sourceLabel: `끝수 ${ending} · ${numbers.length}개`,
    text: numbers.length >= 3
      ? `끝수가 ${ending}로 같은 번호는 ${formatNumbers(numbers)}예요.`
      : pairCount >= 2 ? `같은 끝수로 묶이는 번호쌍이 ${pairCount}개 있어요.` : `${numbers[0]}번과 ${numbers[1]}번은 끝수가 ${ending}로 같아요.`,
    tone: 'accent', variant: numbers.length >= 3 ? 'group' : pairCount >= 2 ? 'multiple-pairs' : 'pair',
  };
}

function previousDrawCandidate(analysis: CombinationAnalysis): Candidate | null {
  const metrics = analysis.conditionMetrics;
  if (!metrics.previousRound) return null;
  if (metrics.carryCount > 0 && metrics.neighborCount > 0) return {
    family: 'previous', metric: 'previous-draw',
    score: metrics.carryCount >= 2 ? 44 : 34,
    sourceLabel: `이월수 ${metrics.carryCount}개 · 이웃수 ${metrics.neighborCount}개`,
    text: `직전 ${metrics.previousRound}회와 같은 번호 ${metrics.carryCount}개, 이웃한 번호 ${metrics.neighborCount}개가 포함돼 있어요.`,
    tone: 'accent', variant: 'carry-and-neighbor',
  };
  if (metrics.carryCount > 0) return {
    family: 'previous', metric: 'previous-draw', score: metrics.carryCount >= 2 ? 42 : 31,
    sourceLabel: `이월수 ${metrics.carryCount}개 · ${metrics.previousRound}회 기준`,
    text: metrics.carryCount === 1
      ? `${metrics.carryNumbers[0]}번은 직전 ${metrics.previousRound}회에도 나온 번호예요.`
      : `직전 ${metrics.previousRound}회와 같은 번호가 ${metrics.carryCount}개 있어요: ${formatNumbers(metrics.carryNumbers)}.`,
    tone: 'accent', variant: 'carry',
  };
  if (metrics.neighborCount > 0) return {
    family: 'previous', metric: 'previous-draw', score: 22 + Math.min(6, metrics.neighborCount),
    sourceLabel: `이웃수 ${metrics.neighborCount}개 · ${metrics.previousRound}회 기준`,
    text: `직전 회차 번호와 이웃한 수가 ${metrics.neighborCount}개 있어요: ${formatNumbers(metrics.neighborNumbers)}.`,
    tone: 'accent', variant: 'neighbor',
  };
  return null;
}

function propertyCandidates(analysis: CombinationAnalysis): Candidate[] {
  const metrics = analysis.conditionMetrics;
  const candidates: Candidate[] = [];
  if (metrics.squareCount >= 2) candidates.push({
    family: 'property', metric: 'number-property', score: 43,
    sourceLabel: `완전제곱수 ${metrics.squareCount}개`,
    text: `완전제곱수가 ${metrics.squareCount}개 포함돼 있어요: ${formatNumbers(metrics.squareNumbers)}.`,
    tone: 'accent', variant: 'square',
  });
  if (metrics.primeCount >= 4) candidates.push({
    family: 'property', metric: 'number-property', score: 41,
    sourceLabel: `소수 ${metrics.primeCount}개`, text: `여섯 번호 중 소수가 ${metrics.primeCount}개예요.`,
    tone: 'accent', variant: 'prime',
  });
  if (metrics.compositeCount >= 5) candidates.push({
    family: 'property', metric: 'number-property', score: 39,
    sourceLabel: `합성수 ${metrics.compositeCount}개`, text: `여섯 번호 중 합성수가 ${metrics.compositeCount}개예요.`,
    tone: 'accent', variant: 'composite',
  });
  ([3, 4, 5] as const).forEach((multiple) => {
    const count = metrics.multipleCounts?.[multiple] ?? 0;
    const threshold = multiple === 3 ? 4 : 3;
    if (count < threshold) return;
    candidates.push({
      family: 'property', metric: 'number-property', score: 38 + count,
      sourceLabel: `${multiple}의 배수 ${count}개`, text: `${multiple}의 배수가 ${count}개 포함돼 있어요.`,
      tone: 'accent', variant: `multiple-${multiple}`,
    });
  });
  return candidates;
}

function candidateSort(left: Candidate, right: Candidate) {
  return right.score - left.score
    || left.metric.localeCompare(right.metric)
    || left.text.localeCompare(right.text);
}

function withSupport(primary: Candidate | null, candidates: Candidate[], analysis: CombinationAnalysis) {
  const shortPeriod = analysis.activeDrawCount < MIN_GROUP_FREQUENCY_DRAWS;
  const primaryFamily = primary?.family ?? 'neutral';
  const supporting = candidates
    .filter((candidate) => candidate.family !== primaryFamily)
    .filter((candidate) => candidate.score >= SUPPORT_SCORE_THRESHOLD)
    .sort(candidateSort)[0];
  return {
    metric: primary?.metric ?? 'neutral',
    sourceLabel: primary?.sourceLabel
      ?? (shortPeriod ? `선택 기간 ${analysis.activeDrawCount}회` : '조합 형태'),
    supportingSourceLabel: supporting?.sourceLabel,
    supportingText: supporting?.text,
    supportingTone: supporting?.tone,
    text: primary?.text ?? (shortPeriod
      ? '선택 기간이 짧아 출현 차이를 뚜렷한 특징으로 판단하기 어려워요.'
      : '뚜렷하게 두드러진 과거 기록은 없어요.'),
    tone: primary?.tone ?? 'neutral',
    variant: primary?.variant,
  } satisfies CombinationHeadline;
}

export function describeCombinationHeadline(analysis: CombinationAnalysis): CombinationHeadline {
  if (analysis.activeDrawCount === 0) return {
    metric: 'empty-period', sourceLabel: '분석 기간',
    text: '선택한 기간에는 비교할 과거 회차가 없어요.', tone: 'neutral',
  };

  const candidates = [
    prizeCandidate(analysis, 1), prizeCandidate(analysis, 2), prizeCandidate(analysis, 3),
    ...coOccurrenceCandidates(analysis), gapCandidate(analysis),
    ...groupFrequencyCandidates(analysis), consecutiveCandidate(analysis),
    ...balanceCandidates(analysis), ...distributionCandidates(analysis),
    bandCandidate(analysis), sameEndingCandidate(analysis), previousDrawCandidate(analysis),
    ...propertyCandidates(analysis),
  ].filter((candidate): candidate is Candidate => Boolean(candidate)).sort(candidateSort);
  const primary = candidates.find((candidate) => candidate.score >= PRIMARY_SCORE_THRESHOLD) ?? null;
  return withSupport(primary, candidates.filter((candidate) => candidate !== primary), analysis);
}
