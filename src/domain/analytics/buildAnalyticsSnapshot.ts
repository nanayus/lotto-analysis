import type {
  GeneratedNumberAnalytics,
  NumberStatus,
  PairDatum,
  TrioDatum,
} from '@/data/numberAnalytics.types';

import type {
  AnalysisFilters,
  AnalysisPeriod,
  AnalyticsSnapshot,
  LottoHistoryDraw,
} from './types';

const MIN_NUMBER = 1;
const MAX_NUMBER = 45;
const TIMELINE_LIMIT = 52;
const snapshotCache = new Map<string, AnalyticsSnapshot>();
const sortedHistoryCache = new WeakMap<
  readonly LottoHistoryDraw[],
  readonly LottoHistoryDraw[]
>();
const historyIds = new WeakMap<readonly LottoHistoryDraw[], number>();
let nextHistoryId = 1;

function historyId(history: readonly LottoHistoryDraw[]) {
  let id = historyIds.get(history);
  if (!id) { id = nextHistoryId++; historyIds.set(history, id); }
  return id;
}

type NumberAccumulator = {
  count: number;
  firstHitIndex: number;
  gapCount: number;
  gapSum: number;
  lastHitIndex: number;
  maxInternalGap: number;
  pairs: Map<number, number>;
  trios: Map<string, number>;
};

type NormalizedFilters = AnalysisFilters & {
  endRound: number;
  startRound: number;
};

function presetDrawCount(period: AnalysisPeriod): number | null {
  if (period.kind !== 'preset') {
    return null;
  }
  const match = period.label.match(/^최근 (\d+)회$/);
  return match ? Number(match[1]) : null;
}

function normalizeFilters(
  filters: AnalysisFilters,
  firstRound: number,
  latestRound: number,
): NormalizedFilters {
  if (filters.period.kind === 'custom') {
    const boundedStart = Math.max(firstRound, Math.min(latestRound, filters.period.startRound));
    const boundedEnd = Math.max(firstRound, Math.min(latestRound, filters.period.endRound));
    return {
      ...filters,
      period: {
        kind: 'custom',
        startRound: Math.min(boundedStart, boundedEnd),
        endRound: Math.max(boundedStart, boundedEnd),
      },
      startRound: Math.min(boundedStart, boundedEnd),
      endRound: Math.max(boundedStart, boundedEnd),
    };
  }

  return { ...filters, startRound: firstRound, endRound: latestRound };
}

export function analyticsFilterKey(filters: AnalysisFilters, history: readonly LottoHistoryDraw[]) {
  if (!history.length) {
    return `empty:${filters.period.kind}:${filters.includeBonus ? 1 : 0}`;
  }
  const rounds = history.map((draw) => draw.round);
  const normalized = normalizeFilters(filters, Math.min(...rounds), Math.max(...rounds));
  const periodKey =
    normalized.period.kind === 'custom'
      ? `custom:${normalized.startRound}:${normalized.endRound}`
      : `preset:${normalized.period.label}`;
  return `source:${historyId(history)}:${Math.min(...rounds)}:${Math.max(...rounds)}:${history.length}:${periodKey}:bonus:${normalized.includeBonus ? 1 : 0}`;
}

function selectActiveDraws(
  sortedHistory: readonly LottoHistoryDraw[],
  filters: NormalizedFilters,
) {
  if (filters.period.kind === 'custom') {
    return sortedHistory.filter(
      (draw) => filters.startRound <= draw.round && draw.round <= filters.endRound,
    );
  }
  const count = presetDrawCount(filters.period);
  return count === null ? [...sortedHistory] : sortedHistory.slice(-count);
}

function sortedHistory(history: readonly LottoHistoryDraw[]) {
  const cached = sortedHistoryCache.get(history);
  if (cached) return cached;
  const sorted = [...history].sort((left, right) => left.round - right.round);
  sortedHistoryCache.set(history, sorted);
  return sorted;
}

function activeNumbers(draw: LottoHistoryDraw, includeBonus: boolean) {
  const values = includeBonus ? [...draw.numbers, draw.bonus] : draw.numbers;
  return [...new Set(values)].filter(
    (number) => MIN_NUMBER <= number && number <= MAX_NUMBER,
  ).sort((a, b) => a - b);
}

function competitionRanks(counts: readonly number[]) {
  return counts.map((count) => 1 + counts.filter((other) => other > count).length);
}

function statusForCount(count: number, counts: readonly number[]): NumberStatus {
  const less = counts.filter((other) => other < count).length;
  const equal = counts.filter((other) => other === count).length;
  const percentile = ((less + (equal - 1) / 2) / (MAX_NUMBER - 1)) * 100;
  if (percentile >= 80) return 'HOT';
  if (percentile <= 20) return 'COLD';
  return 'NEUTRAL';
}

function sortedPairs(values: Map<number, number>): PairDatum[] {
  return [...values.entries()]
    .map(([number, count]) => ({ number, count }))
    .sort((left, right) => right.count - left.count || left.number - right.number)
    .slice(0, 10);
}

function sortedTrios(values: Map<string, number>): TrioDatum[] {
  return [...values.entries()]
    .map(([key, count]) => ({
      numbers: key.split('-').map(Number) as [number, number],
      count,
    }))
    .sort(
      (left, right) =>
        right.count - left.count ||
        left.numbers[0] - right.numbers[0] ||
        left.numbers[1] - right.numbers[1],
    )
    .slice(0, 10);
}

function timelineLabel(period: AnalysisPeriod, activeDrawCount: number, timelineDrawCount: number) {
  if (activeDrawCount > TIMELINE_LIMIT) return `최근 ${timelineDrawCount}회`;
  if (period.kind === 'custom') return `${period.startRound}~${period.endRound}회`;
  return period.label === '전체' ? `최근 ${timelineDrawCount}회` : period.label;
}

export function buildAnalyticsSnapshot(
  history: readonly LottoHistoryDraw[],
  filters: AnalysisFilters,
): AnalyticsSnapshot {
  const chronologicalHistory = sortedHistory(history);
  const firstRound = chronologicalHistory[0]?.round ?? 0;
  const latestRound = chronologicalHistory.at(-1)?.round ?? 0;
  const normalized = normalizeFilters(filters, firstRound, latestRound);
  const filterKey = analyticsFilterKey(normalized, chronologicalHistory);
  const cached = snapshotCache.get(filterKey);
  if (cached) return cached;

  const activeDraws = selectActiveDraws(chronologicalHistory, normalized);
  const timelineStart = Math.max(0, activeDraws.length - TIMELINE_LIMIT);
  const timelineByNumber = Array.from({ length: MAX_NUMBER + 1 }, () => [] as {
    round: number;
    hit: boolean;
  }[]);
  const accumulators = Array.from<unknown, NumberAccumulator>(
    { length: MAX_NUMBER + 1 },
    () => ({
      count: 0,
      firstHitIndex: -1,
      gapCount: 0,
      gapSum: 0,
      lastHitIndex: -1,
      maxInternalGap: 0,
      pairs: new Map(),
      trios: new Map(),
    }),
  );

  activeDraws.forEach((draw, drawIndex) => {
    const numbers = activeNumbers(draw, normalized.includeBonus);
    const present = new Set(numbers);

    for (const number of numbers) {
      const accumulator = accumulators[number];
      accumulator.count += 1;
      if (accumulator.firstHitIndex < 0) accumulator.firstHitIndex = drawIndex;
      if (accumulator.lastHitIndex >= 0) {
        const gap = drawIndex - accumulator.lastHitIndex - 1;
        accumulator.gapSum += gap;
        accumulator.gapCount += 1;
        accumulator.maxInternalGap = Math.max(accumulator.maxInternalGap, gap);
      }
      accumulator.lastHitIndex = drawIndex;
    }

    for (let left = 0; left < numbers.length; left += 1) {
      for (let right = left + 1; right < numbers.length; right += 1) {
        const first = numbers[left];
        const second = numbers[right];
        accumulators[first].pairs.set(
          second,
          (accumulators[first].pairs.get(second) ?? 0) + 1,
        );
        accumulators[second].pairs.set(
          first,
          (accumulators[second].pairs.get(first) ?? 0) + 1,
        );
      }
    }

    for (let firstIndex = 0; firstIndex < numbers.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < numbers.length; secondIndex += 1) {
        for (let thirdIndex = secondIndex + 1; thirdIndex < numbers.length; thirdIndex += 1) {
          const triple = [numbers[firstIndex], numbers[secondIndex], numbers[thirdIndex]];
          for (const target of triple) {
            const companions = triple.filter((number) => number !== target);
            const key = `${companions[0]}-${companions[1]}`;
            const targetTrios = accumulators[target].trios;
            targetTrios.set(key, (targetTrios.get(key) ?? 0) + 1);
          }
        }
      }
    }

    if (drawIndex >= timelineStart) {
      for (let number = MIN_NUMBER; number <= MAX_NUMBER; number += 1) {
        timelineByNumber[number].push({ round: draw.round, hit: present.has(number) });
      }
    }
  });

  const counts = accumulators.slice(1).map((accumulator) => accumulator.count);
  const ranks = competitionRanks(counts);
  const numbers: Record<string, GeneratedNumberAnalytics> = {};

  for (let number = MIN_NUMBER; number <= MAX_NUMBER; number += 1) {
    const accumulator = accumulators[number];
    const trailingGap =
      accumulator.lastHitIndex < 0
        ? activeDraws.length
        : activeDraws.length - accumulator.lastHitIndex - 1;
    const leadingGap = accumulator.firstHitIndex < 0 ? activeDraws.length : accumulator.firstHitIndex;
    const averageGap = accumulator.gapCount
      ? Number((accumulator.gapSum / accumulator.gapCount).toFixed(2))
      : 0;
    const maxGap = Math.max(accumulator.maxInternalGap, leadingGap, trailingGap);
    const appearanceRate = activeDraws.length
      ? accumulator.count / activeDraws.length
      : 0;
    const recent52 = timelineByNumber[number];

    numbers[String(number)] = {
      number,
      status: statusForCount(accumulator.count, counts),
      appearanceCount: accumulator.count,
      appearanceRate: Number(appearanceRate.toFixed(6)),
      appearanceRatePct: Number((appearanceRate * 100).toFixed(2)),
      appearanceRank: ranks[number - 1],
      recent52Count: recent52.filter((entry) => entry.hit).length,
      recent5: recent52.slice(-5),
      recent52,
      averageGap,
      currentGap: trailingGap,
      maxGap,
      topPairs: sortedPairs(accumulator.pairs),
      topTrios: sortedTrios(accumulator.trios),
    };
  }

  const snapshot: AnalyticsSnapshot = {
    activeDrawCount: activeDraws.length,
    filterKey,
    numbers,
    timelineDrawCount: Math.min(activeDraws.length, TIMELINE_LIMIT),
    timelineLabel: timelineLabel(
      normalized.period,
      activeDraws.length,
      Math.min(activeDraws.length, TIMELINE_LIMIT),
    ),
  };
  snapshotCache.set(filterKey, snapshot);
  return snapshot;
}

export function clearAnalyticsSnapshotCache() {
  snapshotCache.clear();
}
