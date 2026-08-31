import {
  calculateCombinationMetrics,
  CONSECUTIVE_LABELS,
  GENERATOR_BAND_KEYS,
  SAME_ENDING_LABELS,
} from '@/domain/generator/combinationGenerator';
import type { ConsecutivePattern, NumberBandKey, SameEndingPattern } from '@/domain/generator/types';

import type { LottoHistoryDraw } from './types';

export type OverallNumberFrequency = {
  count: number;
  number: number;
  percentage: number;
};

export type OverallDistributionItem = {
  count: number;
  key: string;
  label: string;
  percentage: number;
};

export type OverallStatistics = {
  acValueDistribution: OverallDistributionItem[];
  averageEvenCount: number;
  averageOddCount: number;
  averageSum: number;
  bandDistributions: Record<NumberBandKey, OverallDistributionItem[]>;
  carryDistributions: Record<'bonusExcluded' | 'bonusIncluded', OverallDistributionItem[]>;
  comparisonDrawCount: number;
  compositeCountDistribution: OverallDistributionItem[];
  consecutiveDistribution: OverallDistributionItem[];
  drawCount: number;
  firstRound: number;
  lastDigitSumDistribution: OverallDistributionItem[];
  latestRound: number;
  lowHighDistribution: OverallDistributionItem[];
  multipleCountDistributions: Record<3 | 4 | 5, OverallDistributionItem[]>;
  neighborDistributions: Record<'bonusExcluded' | 'bonusIncluded', OverallDistributionItem[]>;
  numberFrequencies: OverallNumberFrequency[];
  oddEvenDistribution: OverallDistributionItem[];
  primeCountDistribution: OverallDistributionItem[];
  sameEndingDistribution: OverallDistributionItem[];
  squareCountDistribution: OverallDistributionItem[];
  standardDeviationDistribution: OverallDistributionItem[];
  sumDistribution: OverallDistributionItem[];
  topNumbers: OverallNumberFrequency[];
};

const COUNT_VALUES = [0, 1, 2, 3, 4, 5, 6] as const;
const AC_VALUES = Array.from({ length: 10 }, (_, index) => index + 1);
const SAME_ENDING_ORDER = Object.keys(SAME_ENDING_LABELS) as SameEndingPattern[];
const CONSECUTIVE_ORDER = Object.keys(CONSECUTIVE_LABELS) as ConsecutivePattern[];

function percentage(count: number, total: number) {
  return total ? Number(((count / total) * 100).toFixed(1)) : 0;
}

function categorical<T extends string | number>(
  values: readonly T[],
  order: readonly T[],
  label: (value: T) => string,
): OverallDistributionItem[] {
  const counts = new Map<T, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return order.map((value) => {
    const count = counts.get(value) ?? 0;
    return { count, key: String(value), label: label(value), percentage: percentage(count, values.length) };
  });
}

function buckets(values: readonly number[], size: number, label: (start: number) => string) {
  if (!values.length) return [];
  const bucketValues = values.map((value) => Math.floor(value / size) * size);
  const first = Math.min(...bucketValues);
  const last = Math.max(...bucketValues);
  const order = Array.from({ length: Math.floor((last - first) / size) + 1 }, (_, index) => first + (index * size));
  return categorical(bucketValues, order, label);
}

function buildPreviousDrawValues(history: readonly LottoHistoryDraw[]) {
  const sorted = [...history].sort((left, right) => left.round - right.round);
  const carryExcluded: number[] = [];
  const carryIncluded: number[] = [];
  const neighborExcluded: number[] = [];
  const neighborIncluded: number[] = [];
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    const current = sorted[index];
    ([false, true] as const).forEach((includeBonus) => {
      const base = [...previous.numbers, ...(includeBonus ? [previous.bonus] : [])];
      const carry = new Set(base);
      const neighbor = new Set<number>();
      base.forEach((number) => {
        if (number > 1) neighbor.add(number - 1);
        if (number < 45) neighbor.add(number + 1);
      });
      const carryCount = current.numbers.filter((number) => carry.has(number)).length;
      const neighborCount = current.numbers.filter((number) => neighbor.has(number)).length;
      (includeBonus ? carryIncluded : carryExcluded).push(carryCount);
      (includeBonus ? neighborIncluded : neighborExcluded).push(neighborCount);
    });
  }
  return { carryExcluded, carryIncluded, neighborExcluded, neighborIncluded };
}

export function buildOverallStatistics(history: readonly LottoHistoryDraw[]): OverallStatistics {
  const drawCount = history.length;
  const numberCounts = Array.from({ length: 46 }, () => 0);
  let oddTotal = 0;
  let sumTotal = 0;
  history.forEach((draw) => draw.numbers.forEach((number) => {
    numberCounts[number] += 1;
    if (number % 2) oddTotal += 1;
    sumTotal += number;
  }));

  const numberFrequencies = numberCounts.slice(1).map((count, index) => ({
    count,
    number: index + 1,
    percentage: percentage(count, drawCount),
  }));
  const topNumbers = drawCount
    ? [...numberFrequencies]
      .sort((left, right) => right.count - left.count || left.number - right.number)
      .slice(0, 6)
    : [];
  const metrics = history.map((draw) => calculateCombinationMetrics(draw.numbers, history, undefined, false));
  const previous = buildPreviousDrawValues(history);
  const countDistribution = (values: readonly number[]) => categorical(values, COUNT_VALUES, (value) => `${value}개`);

  return {
    acValueDistribution: categorical(metrics.map((item) => item.acValue), AC_VALUES, String),
    averageEvenCount: drawCount ? 6 - (oddTotal / drawCount) : 0,
    averageOddCount: drawCount ? oddTotal / drawCount : 0,
    averageSum: drawCount ? sumTotal / drawCount : 0,
    bandDistributions: Object.fromEntries(GENERATOR_BAND_KEYS.map((band) => [
      band,
      countDistribution(metrics.map((item) => item.bandCounts[band])),
    ])) as OverallStatistics['bandDistributions'],
    carryDistributions: {
      bonusExcluded: countDistribution(previous.carryExcluded),
      bonusIncluded: countDistribution(previous.carryIncluded),
    },
    comparisonDrawCount: Math.max(0, drawCount - 1),
    compositeCountDistribution: countDistribution(metrics.map((item) => item.compositeCount)),
    consecutiveDistribution: categorical(
      metrics.map((item) => item.consecutivePattern),
      CONSECUTIVE_ORDER,
      (value) => CONSECUTIVE_LABELS[value],
    ),
    drawCount,
    firstRound: drawCount ? Math.min(...history.map((draw) => draw.round)) : 0,
    lastDigitSumDistribution: buckets(metrics.map((item) => item.lastDigitSum), 5, (start) => `${start}–${start + 4}`),
    latestRound: drawCount ? Math.max(...history.map((draw) => draw.round)) : 0,
    lowHighDistribution: categorical(metrics.map((item) => item.lowCount), COUNT_VALUES, (value) => `${value}:${6 - value}`),
    multipleCountDistributions: {
      3: countDistribution(metrics.map((item) => item.multipleCounts[3])),
      4: countDistribution(metrics.map((item) => item.multipleCounts[4])),
      5: countDistribution(metrics.map((item) => item.multipleCounts[5])),
    },
    neighborDistributions: {
      bonusExcluded: countDistribution(previous.neighborExcluded),
      bonusIncluded: countDistribution(previous.neighborIncluded),
    },
    numberFrequencies,
    oddEvenDistribution: categorical(metrics.map((item) => item.oddCount), COUNT_VALUES, (value) => `${value}:${6 - value}`),
    primeCountDistribution: countDistribution(metrics.map((item) => item.primeCount)),
    sameEndingDistribution: categorical(
      metrics.map((item) => item.sameEndingPattern),
      SAME_ENDING_ORDER,
      (value) => SAME_ENDING_LABELS[value],
    ),
    squareCountDistribution: countDistribution(metrics.map((item) => item.squareCount)),
    standardDeviationDistribution: buckets(
      metrics.map((item) => item.standardDeviation),
      1,
      (start) => `${start.toFixed(1)}–${(start + 0.9).toFixed(1)}`,
    ),
    sumDistribution: buckets(metrics.map((item) => item.sum), 10, (start) => `${start}–${start + 9}`),
    topNumbers,
  };
}
