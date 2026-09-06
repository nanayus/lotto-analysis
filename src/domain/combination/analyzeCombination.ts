import type { AnalysisFilters, AnalysisPeriod, LottoHistoryDraw } from '@/domain/analytics/types';
import { calculateCombinationMetrics } from '@/domain/generator/combinationGenerator';

import type {
  CombinationAnalysis,
  CombinationSize,
  DrawCombinationMatch,
  MainMatchCount,
  PrizeRank,
  SubCombinationAnalysis,
} from './types';

const MIN_NUMBER = 1;
const MAX_NUMBER = 45;
const COMBINATION_SIZES = [2, 3, 4, 5, 6] as const;
const analysisCache = new Map<string, CombinationAnalysis>();
const sortedHistoryCache = new WeakMap<readonly LottoHistoryDraw[], readonly LottoHistoryDraw[]>();
const historyIds = new WeakMap<readonly LottoHistoryDraw[], number>();
let nextHistoryId = 1;

type NormalizedFilters = AnalysisFilters & {
  endRound: number;
  startRound: number;
};

function normalizeNumbers(numbers: readonly number[]) {
  const normalized = [...new Set(numbers)].sort((left, right) => left - right);
  if (
    normalized.length !== 6 ||
    normalized.some((number) => !Number.isInteger(number) || number < MIN_NUMBER || number > MAX_NUMBER)
  ) {
    throw new Error('Combination analysis requires six unique numbers from 1 to 45.');
  }
  return normalized;
}

function presetDrawCount(period: AnalysisPeriod) {
  if (period.kind !== 'preset') return null;
  const match = period.label.match(/^최근 (\d+)회$/);
  return match ? Number(match[1]) : null;
}

function normalizeFilters(
  filters: AnalysisFilters,
  firstRound: number,
  latestRound: number,
): NormalizedFilters {
  if (filters.period.kind === 'custom') {
    const start = Math.max(firstRound, Math.min(latestRound, filters.period.startRound));
    const end = Math.max(firstRound, Math.min(latestRound, filters.period.endRound));
    const startRound = Math.min(start, end);
    const endRound = Math.max(start, end);
    return {
      includeBonus: filters.includeBonus,
      period: { kind: 'custom', startRound, endRound },
      startRound,
      endRound,
    };
  }

  return { ...filters, startRound: firstRound, endRound: latestRound };
}

function sortedHistory(history: readonly LottoHistoryDraw[]) {
  const cached = sortedHistoryCache.get(history);
  if (cached) return cached;
  const sorted = [...history].sort((left, right) => left.round - right.round);
  sortedHistoryCache.set(history, sorted);
  return sorted;
}

function activeDraws(history: readonly LottoHistoryDraw[], filters: NormalizedFilters) {
  if (filters.period.kind === 'custom') {
    return history.filter(
      (draw) => filters.startRound <= draw.round && draw.round <= filters.endRound,
    );
  }
  const count = presetDrawCount(filters.period);
  return count === null ? [...history] : history.slice(-count);
}

function sourceKey(history: readonly LottoHistoryDraw[]) {
  let id = historyIds.get(history);
  if (!id) {
    id = nextHistoryId;
    nextHistoryId += 1;
    historyIds.set(history, id);
  }
  return `${id}:${history[0]?.round ?? 0}:${history.at(-1)?.round ?? 0}:${history.length}`;
}

function filterKey(filters: NormalizedFilters) {
  const periodKey = filters.period.kind === 'custom'
    ? `custom:${filters.startRound}:${filters.endRound}`
    : `preset:${filters.period.label}`;
  return `${periodKey}:bonus:${filters.includeBonus ? 1 : 0}`;
}

function generateCombinations(numbers: readonly number[], size: number) {
  const result: number[][] = [];
  const visit = (start: number, current: number[]) => {
    if (current.length === size) {
      result.push(current);
      return;
    }
    for (let index = start; index <= numbers.length - (size - current.length); index += 1) {
      visit(index + 1, [...current, numbers[index]]);
    }
  };
  visit(0, []);
  return result;
}

function classifyPrize(mainMatchCount: MainMatchCount, bonusMatched: boolean): PrizeRank | null {
  if (mainMatchCount === 6) return 1;
  if (mainMatchCount === 5) return bonusMatched ? 2 : 3;
  if (mainMatchCount === 4) return 4;
  if (mainMatchCount === 3) return 5;
  return null;
}

function competitionRanks(counts: readonly number[]) {
  return counts.map((count) => 1 + counts.filter((other) => other > count).length);
}

function combinationStandardDeviation(numbers: readonly number[]) {
  const mean = numbers.reduce((sum, number) => sum + number, 0) / numbers.length;
  return Math.sqrt(
    numbers.reduce((sum, number) => sum + (number - mean) ** 2, 0) / numbers.length,
  );
}

function combinationAcValue(numbers: readonly number[]) {
  const differences = new Set<number>();
  for (let left = 0; left < numbers.length; left += 1) {
    for (let right = left + 1; right < numbers.length; right += 1) {
      differences.add(Math.abs(numbers[right] - numbers[left]));
    }
  }
  return differences.size - 5;
}

function percentileRank(value: number, values: readonly number[]) {
  if (!values.length) return 0;
  const less = values.filter((item) => item < value).length;
  const equal = values.filter((item) => item === value).length;
  return Number((((less + equal / 2) / values.length) * 100).toFixed(1));
}

function consecutiveGroups(numbers: readonly number[]) {
  const groups: number[][] = [];
  let current: number[] = [];
  numbers.forEach((number, index) => {
    if (!current.length || number === current.at(-1)! + 1) {
      current.push(number);
    } else {
      if (current.length >= 2) groups.push(current);
      current = [number];
    }
    if (index === numbers.length - 1 && current.length >= 2) groups.push(current);
  });
  return groups;
}

function compareSubCombinations(left: SubCombinationAnalysis, right: SubCombinationAnalysis) {
  const primary =
    right.appearanceCount - left.appearanceCount ||
    (right.latestRound ?? 0) - (left.latestRound ?? 0);
  if (primary) return primary;
  for (let index = 0; index < left.numbers.length; index += 1) {
    const difference = left.numbers[index] - right.numbers[index];
    if (difference) return difference;
  }
  return 0;
}

export function analyzeCombination(
  history: readonly LottoHistoryDraw[],
  selectedNumbers: readonly number[],
  filters: AnalysisFilters,
): CombinationAnalysis {
  const numbers = normalizeNumbers(selectedNumbers);
  const chronologicalHistory = sortedHistory(history);
  const normalizedFilters = normalizeFilters(
    filters,
    chronologicalHistory[0]?.round ?? 0,
    chronologicalHistory.at(-1)?.round ?? 0,
  );
  const key = `${sourceKey(chronologicalHistory)}:${numbers.join('-')}:${filterKey(normalizedFilters)}`;
  const cached = analysisCache.get(key);
  if (cached) return cached;

  const draws = activeDraws(chronologicalHistory, normalizedFilters);
  const selectedSet = new Set(numbers);
  const frequencies = Array.from({ length: MAX_NUMBER + 1 }, () => 0);
  const gapCounts = Array.from({ length: MAX_NUMBER + 1 }, () => 0);
  const gapSums = Array.from({ length: MAX_NUMBER + 1 }, () => 0);
  const lastHitIndexes = Array.from({ length: MAX_NUMBER + 1 }, () => -1);
  const matchDistribution = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 } as Record<MainMatchCount, number>;
  const prizeCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<PrizeRank, number>;
  const qualifyingHistory: DrawCombinationMatch[] = [];
  const subCombinations = {} as Record<CombinationSize, SubCombinationAnalysis[]>;
  const historicAcValues: number[] = [];
  const historicStandardDeviations: number[] = [];
  const historicSums: number[] = [];

  for (const size of COMBINATION_SIZES) {
    subCombinations[size] = generateCombinations(numbers, size).map((combination) => ({
      appearanceCount: 0,
      latestRound: null,
      numbers: combination,
    }));
  }

  let highestMainMatch: MainMatchCount = 0;
  for (let drawIndex = 0; drawIndex < draws.length; drawIndex += 1) {
    const draw = draws[drawIndex];
    historicAcValues.push(combinationAcValue(draw.numbers));
    historicStandardDeviations.push(combinationStandardDeviation(draw.numbers));
    historicSums.push(draw.numbers.reduce((sum, number) => sum + number, 0));
    const mainSet = new Set(draw.numbers);
    const matchedMainNumbers = numbers.filter((number) => mainSet.has(number));
    const mainMatchCount = matchedMainNumbers.length as MainMatchCount;
    const bonusMatched = selectedSet.has(draw.bonus);
    const prizeRank = classifyPrize(mainMatchCount, bonusMatched);
    highestMainMatch = Math.max(highestMainMatch, mainMatchCount) as MainMatchCount;
    matchDistribution[mainMatchCount] += 1;
    if (prizeRank) prizeCounts[prizeRank] += 1;

    if (mainMatchCount >= 3) {
      qualifyingHistory.push({
        bonus: draw.bonus,
        bonusMatched,
        mainMatchCount,
        matchedMainNumbers,
        numbers: [...draw.numbers].sort((left, right) => left - right),
        prizeRank,
        round: draw.round,
      });
    }

    const analyticsNumbers = normalizedFilters.includeBonus
      ? [...new Set([...draw.numbers, draw.bonus])]
      : draw.numbers;
    const analyticsSet = new Set(analyticsNumbers);
    analyticsNumbers.forEach((number) => {
      if (MIN_NUMBER <= number && number <= MAX_NUMBER) {
        frequencies[number] += 1;
        if (lastHitIndexes[number] >= 0) {
          gapSums[number] += drawIndex - lastHitIndexes[number] - 1;
          gapCounts[number] += 1;
        }
        lastHitIndexes[number] = drawIndex;
      }
    });

    for (const size of COMBINATION_SIZES) {
      for (const combination of subCombinations[size]) {
        if (combination.numbers.every((number) => analyticsSet.has(number))) {
          combination.appearanceCount += 1;
          combination.latestRound = draw.round;
        }
      }
    }
  }

  qualifyingHistory.sort((left, right) => right.round - left.round);
  for (const size of COMBINATION_SIZES) subCombinations[size].sort(compareSubCombinations);

  const counts = frequencies.slice(1);
  const ranks = competitionRanks(counts);
  const individualNumbers = numbers.map((number) => ({
    appearanceCount: frequencies[number],
    appearanceRank: ranks[number - 1],
    averageGap: gapCounts[number]
      ? Number((gapSums[number] / gapCounts[number]).toFixed(2))
      : 0,
    currentGap: lastHitIndexes[number] < 0
      ? draws.length
      : draws.length - lastHitIndexes[number] - 1,
    number,
  }));
  const selectedAverage = individualNumbers.reduce(
    (sum, item) => sum + item.appearanceCount,
    0,
  ) / numbers.length;
  const overallAverage = counts.reduce((sum, count) => sum + count, 0) / MAX_NUMBER;
  const differencePct = overallAverage
    ? ((selectedAverage - overallAverage) / overallAverage) * 100
    : 0;

  const conditionMetrics = calculateCombinationMetrics(
    numbers,
    chronologicalHistory,
    {
      carry: { allowed: [], includeBonus: normalizedFilters.includeBonus },
      neighbor: { allowed: [], includeBonus: normalizedFilters.includeBonus },
    },
  );
  const result: CombinationAnalysis = {
    activeDrawCount: draws.length,
    conditionMetrics,
    filters: normalizedFilters,
    groupFrequency: {
      differencePct: Number(differencePct.toFixed(1)),
      overallAverage: Number(overallAverage.toFixed(1)),
      selectedAverage: Number(selectedAverage.toFixed(1)),
    },
    highestMainMatch,
    individualNumbers,
    matchDistribution,
    numbers,
    prizeCounts,
    qualifyingHistory,
    recentMeaningfulMatch: qualifyingHistory[0] ?? null,
    sameSixCount: subCombinations[6][0]?.appearanceCount ?? 0,
    shapeDistribution: {
      acValuePercentile: percentileRank(conditionMetrics.acValue, historicAcValues),
      sampleSize: draws.length,
      standardDeviationPercentile: percentileRank(
        conditionMetrics.standardDeviation,
        historicStandardDeviations,
      ),
      sumPercentile: percentileRank(conditionMetrics.sum, historicSums),
    },
    shape: {
      consecutiveGroups: consecutiveGroups(numbers),
      evenCount: numbers.filter((number) => number % 2 === 0).length,
      oddCount: numbers.filter((number) => number % 2 !== 0).length,
      sum: numbers.reduce((sum, number) => sum + number, 0),
    },
    subCombinations,
  };
  analysisCache.set(key, result);
  return result;
}

export function clearCombinationAnalysisCache() {
  analysisCache.clear();
}
