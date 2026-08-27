import type { LottoHistoryDraw } from '@/domain/analytics/types';

import type {
  CombinationMetrics,
  ConditionViolation,
  ConsecutivePattern,
  GenerationOptions,
  GenerationOutcome,
  GeneratorConditions,
  NumberBandKey,
  PastPrizeRank,
  SameEndingPattern,
} from './types';

const ALL_NUMBERS = Array.from({ length: 45 }, (_, index) => index + 1);
const PRIME_NUMBERS = new Set([2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43]);
const SQUARE_NUMBERS = new Set([4, 9, 16, 25, 36]);
const BAND_KEYS = ['1-9', '10-19', '20-29', '30-39', '40-45'] as const;
const COUNT_VALUES = [0, 1, 2, 3, 4, 5, 6] as const;

type PrizeIndex = {
  fiveMain: Map<string, { bonus: number; missing: number }[]>;
  rankOne: Set<string>;
};

const prizeIndexCache = new WeakMap<readonly LottoHistoryDraw[], PrizeIndex>();
const latestDrawCache = new WeakMap<readonly LottoHistoryDraw[], LottoHistoryDraw | null>();

export const SAME_ENDING_LABELS: Record<SameEndingPattern, string> = {
  none: '없음',
  '2': '2수 1쌍',
  '2+2': '2수 2쌍',
  '2+2+2': '2수 3쌍',
  '3': '3수 1쌍',
  '3+2': '3수 1쌍 + 2수 1쌍',
  '3+3': '3수 2쌍',
  '4': '4수 1쌍',
  '4+2': '4수 1쌍 + 2수 1쌍',
  '5': '5수 1쌍',
};

export const CONSECUTIVE_LABELS: Record<ConsecutivePattern, string> = {
  none: '없음',
  '2': '2연번 1회',
  '2+2': '2연번 2회',
  '2+2+2': '2연번 3회',
  '3': '3연번 1회',
  '3+2': '3연번 1회 + 2연번 1회',
  '3+3': '3연번 2회',
  '4': '4연번',
  '4+2': '4연번 + 2연번',
  '5': '5연번',
  '6': '6연번',
};

export const DEFAULT_GENERATOR_CONDITIONS: GeneratorConditions = {
  acValues: [],
  bandCounts: { '1-9': [], '10-19': [], '20-29': [], '30-39': [], '40-45': [] },
  carry: { allowed: [], includeBonus: false },
  compositeCounts: [],
  consecutivePatterns: [],
  excludedNumbers: [],
  excludedPastRanks: [],
  fixedNumbers: [],
  highLowCounts: [],
  lastDigitSum: { enabled: false, min: 2, max: 52 },
  multipleCounts: { 3: [], 4: [], 5: [] },
  neighbor: { allowed: [], includeBonus: false },
  oddCounts: [],
  primeCounts: [],
  sameEndingPatterns: [],
  squareCounts: [],
  standardDeviation: { enabled: false, min: 10, max: 15 },
  sum: { enabled: false, min: 21, max: 255 },
};

export function cloneGeneratorConditions(conditions: GeneratorConditions): GeneratorConditions {
  return {
    ...conditions,
    acValues: [...conditions.acValues],
    bandCounts: Object.fromEntries(
      BAND_KEYS.map((key) => [key, [...conditions.bandCounts[key]]]),
    ) as GeneratorConditions['bandCounts'],
    carry: { ...conditions.carry, allowed: [...conditions.carry.allowed] },
    compositeCounts: [...conditions.compositeCounts],
    consecutivePatterns: [...conditions.consecutivePatterns],
    excludedNumbers: [...conditions.excludedNumbers],
    excludedPastRanks: [...conditions.excludedPastRanks],
    fixedNumbers: [...conditions.fixedNumbers],
    highLowCounts: [...conditions.highLowCounts],
    lastDigitSum: { ...conditions.lastDigitSum },
    multipleCounts: {
      3: [...conditions.multipleCounts[3]],
      4: [...conditions.multipleCounts[4]],
      5: [...conditions.multipleCounts[5]],
    },
    neighbor: { ...conditions.neighbor, allowed: [...conditions.neighbor.allowed] },
    oddCounts: [...conditions.oddCounts],
    primeCounts: [...conditions.primeCounts],
    sameEndingPatterns: [...conditions.sameEndingPatterns],
    squareCounts: [...conditions.squareCounts],
    standardDeviation: { ...conditions.standardDeviation },
    sum: { ...conditions.sum },
  };
}

function numberKey(numbers: readonly number[]) {
  return [...numbers].sort((left, right) => left - right).join('-');
}

function buildPrizeIndex(history: readonly LottoHistoryDraw[]) {
  const cached = prizeIndexCache.get(history);
  if (cached) return cached;
  const index: PrizeIndex = { fiveMain: new Map(), rankOne: new Set() };
  for (const draw of history) {
    const main = [...draw.numbers].sort((left, right) => left - right);
    index.rankOne.add(numberKey(main));
    main.forEach((missing, missingIndex) => {
      const key = numberKey(main.filter((_, indexValue) => indexValue !== missingIndex));
      const entries = index.fiveMain.get(key) ?? [];
      entries.push({ bonus: draw.bonus, missing });
      index.fiveMain.set(key, entries);
    });
  }
  prizeIndexCache.set(history, index);
  return index;
}

function latestDraw(history: readonly LottoHistoryDraw[]) {
  const cached = latestDrawCache.get(history);
  if (cached !== undefined) return cached;
  const latest = history.reduce<LottoHistoryDraw | null>(
    (latest, draw) => !latest || draw.round > latest.round ? draw : latest,
    null,
  );
  latestDrawCache.set(history, latest);
  return latest;
}

function matchingPastRanks(numbers: readonly number[], index: PrizeIndex) {
  const ranks = new Set<PastPrizeRank>();
  if (index.rankOne.has(numberKey(numbers))) ranks.add(1);
  numbers.forEach((extra, extraIndex) => {
    const fiveKey = numberKey(numbers.filter((_, indexValue) => indexValue !== extraIndex));
    for (const entry of index.fiveMain.get(fiveKey) ?? []) {
      if (extra === entry.bonus) ranks.add(2);
      else if (extra !== entry.missing) ranks.add(3);
    }
  });
  return [...ranks].sort() as PastPrizeRank[];
}

function groupPattern(values: readonly number[]) {
  const counts = new Map<number, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.values()]
    .filter((count) => count >= 2)
    .sort((left, right) => right - left)
    .join('+') || 'none';
}

function consecutivePattern(numbers: readonly number[]) {
  const sorted = [...numbers].sort((left, right) => left - right);
  const runs: number[] = [];
  let current = 1;
  for (let index = 1; index < sorted.length; index += 1) {
    if (sorted[index] === sorted[index - 1] + 1) current += 1;
    else {
      if (current >= 2) runs.push(current);
      current = 1;
    }
  }
  if (current >= 2) runs.push(current);
  return runs.sort((left, right) => right - left).join('+') || 'none';
}

function bandFor(number: number): NumberBandKey {
  if (number <= 9) return '1-9';
  if (number <= 19) return '10-19';
  if (number <= 29) return '20-29';
  if (number <= 39) return '30-39';
  return '40-45';
}

export function calculateCombinationMetrics(
  input: readonly number[],
  history: readonly LottoHistoryDraw[],
  conditions: Pick<GeneratorConditions, 'carry' | 'neighbor'> = DEFAULT_GENERATOR_CONDITIONS,
  includePastRanks = true,
): CombinationMetrics {
  const numbers = [...input].sort((left, right) => left - right);
  if (numbers.length !== 6 || new Set(numbers).size !== 6) {
    throw new Error('조합은 서로 다른 1~45 번호 6개여야 합니다.');
  }
  const sum = numbers.reduce((total, number) => total + number, 0);
  const mean = sum / 6;
  const differences = new Set<number>();
  for (let left = 0; left < numbers.length; left += 1) {
    for (let right = left + 1; right < numbers.length; right += 1) {
      differences.add(numbers[right] - numbers[left]);
    }
  }
  const bands = { '1-9': 0, '10-19': 0, '20-29': 0, '30-39': 0, '40-45': 0 };
  numbers.forEach((number) => { bands[bandFor(number)] += 1; });

  const latest = latestDraw(history);
  const carrySource = new Set(latest
    ? [...latest.numbers, ...(conditions.carry.includeBonus ? [latest.bonus] : [])]
    : []);
  const neighborBase = latest
    ? [...latest.numbers, ...(conditions.neighbor.includeBonus ? [latest.bonus] : [])]
    : [];
  const neighborSource = new Set<number>();
  neighborBase.forEach((number) => {
    if (number > 1) neighborSource.add(number - 1);
    if (number < 45) neighborSource.add(number + 1);
  });

  return {
    acValue: differences.size - 5,
    bandCounts: bands,
    carryCount: numbers.filter((number) => carrySource.has(number)).length,
    compositeCount: numbers.filter((number) => number > 1 && !PRIME_NUMBERS.has(number)).length,
    consecutivePattern: consecutivePattern(numbers) as ConsecutivePattern,
    highCount: numbers.filter((number) => number >= 23).length,
    lastDigitSum: numbers.reduce((total, number) => total + number % 10, 0),
    lowCount: numbers.filter((number) => number <= 22).length,
    multipleCounts: {
      3: numbers.filter((number) => number % 3 === 0).length,
      4: numbers.filter((number) => number % 4 === 0).length,
      5: numbers.filter((number) => number % 5 === 0).length,
    },
    neighborCount: numbers.filter((number) => neighborSource.has(number)).length,
    oddCount: numbers.filter((number) => number % 2 !== 0).length,
    pastPrizeRanks: includePastRanks ? matchingPastRanks(numbers, buildPrizeIndex(history)) : [],
    primeCount: numbers.filter((number) => PRIME_NUMBERS.has(number)).length,
    sameEndingPattern: groupPattern(numbers.map((number) => number % 10)) as SameEndingPattern,
    squareCount: numbers.filter((number) => SQUARE_NUMBERS.has(number)).length,
    standardDeviation: Math.sqrt(
      numbers.reduce((total, number) => total + (number - mean) ** 2, 0) / 6,
    ),
    sum,
  };
}

function allowedText(values: readonly number[]) {
  return [...values].sort((left, right) => left - right).join(', ');
}

function countDistance(actual: number, allowed: readonly number[]) {
  return Math.min(...allowed.map((value) => Math.abs(actual - value))) / 6;
}

function rangeDistance(actual: number, min: number, max: number, span: number) {
  if (actual < min) return (min - actual) / span;
  if (actual > max) return (actual - max) / span;
  return 0;
}

export function evaluateCombination(
  numbers: readonly number[],
  conditions: GeneratorConditions,
  history: readonly LottoHistoryDraw[],
) {
  const metrics = calculateCombinationMetrics(
    numbers,
    history,
    conditions,
    conditions.excludedPastRanks.length > 0,
  );
  const violations: ConditionViolation[] = [];
  const add = (key: string, label: string, actual: string, expected: string, distance: number) => {
    violations.push({ key, label, actual, expected, distance });
  };
  const checkCount = (key: string, label: string, actual: number, allowed: readonly number[]) => {
    if (allowed.length && !allowed.includes(actual)) {
      add(key, label, `${actual}개`, `${allowedText(allowed)}개`, countDistance(actual, allowed));
    }
  };
  const checkRange = (
    key: string,
    label: string,
    actual: number,
    condition: GeneratorConditions['sum'],
    span: number,
    digits = 0,
  ) => {
    if (condition.enabled && (actual < condition.min || actual > condition.max)) {
      add(
        key,
        label,
        actual.toFixed(digits),
        `${condition.min.toFixed(digits)}~${condition.max.toFixed(digits)}`,
        rangeDistance(actual, condition.min, condition.max, span),
      );
    }
  };

  if (conditions.sameEndingPatterns.length
    && !conditions.sameEndingPatterns.includes(metrics.sameEndingPattern)) {
    add(
      'sameEnding',
      '동끝수',
      SAME_ENDING_LABELS[metrics.sameEndingPattern],
      conditions.sameEndingPatterns.map((pattern) => SAME_ENDING_LABELS[pattern]).join(', '),
      1,
    );
  }
  checkRange('standardDeviation', '표준편차', metrics.standardDeviation, conditions.standardDeviation, 19.4, 1);
  checkRange('sum', '총합', metrics.sum, conditions.sum, 234);
  checkRange('lastDigitSum', '끝수 총합', metrics.lastDigitSum, conditions.lastDigitSum, 50);
  checkCount('odd', '홀짝 비율', metrics.oddCount, conditions.oddCounts);
  checkCount('highLow', '저고 비율', metrics.lowCount, conditions.highLowCounts);
  if (conditions.acValues.length && !conditions.acValues.includes(metrics.acValue)) {
    add('ac', 'A/C 값', String(metrics.acValue), allowedText(conditions.acValues), countDistance(metrics.acValue, conditions.acValues));
  }
  checkCount('prime', '소수', metrics.primeCount, conditions.primeCounts);
  checkCount('square', '완전제곱수', metrics.squareCount, conditions.squareCounts);
  checkCount('composite', '합성수', metrics.compositeCount, conditions.compositeCounts);
  checkCount('carry', '이월수', metrics.carryCount, conditions.carry.allowed);
  checkCount('neighbor', '이웃수', metrics.neighborCount, conditions.neighbor.allowed);
  if (conditions.consecutivePatterns.length
    && !conditions.consecutivePatterns.includes(metrics.consecutivePattern)) {
    add(
      'consecutive',
      '연번 형태',
      CONSECUTIVE_LABELS[metrics.consecutivePattern],
      conditions.consecutivePatterns.map((pattern) => CONSECUTIVE_LABELS[pattern]).join(', '),
      1,
    );
  }
  BAND_KEYS.forEach((key) => checkCount(`band:${key}`, `${key} 번호대`, metrics.bandCounts[key], conditions.bandCounts[key]));
  ([3, 4, 5] as const).forEach((multiple) => checkCount(
    `multiple:${multiple}`,
    `${multiple}의 배수`,
    metrics.multipleCounts[multiple],
    conditions.multipleCounts[multiple],
  ));
  const blockedRanks = metrics.pastPrizeRanks.filter((rank) => conditions.excludedPastRanks.includes(rank));
  if (blockedRanks.length) {
    add('pastRank', '과거 등수', `${blockedRanks.join(', ')}등 상당`, '선택 등수 제외', 1);
  }
  return { metrics, violations };
}

function normalizeHardNumbers(values: readonly number[]) {
  return [...new Set(values)]
    .filter((number) => Number.isInteger(number) && number >= 1 && number <= 45)
    .sort((left, right) => left - right);
}

function shuffle<T>(values: readonly T[], random: () => number) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.min(index, Math.floor(random() * (index + 1)));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function *candidateCombinations(
  fixed: readonly number[],
  pool: readonly number[],
  required: number,
  conditions?: GeneratorConditions,
) {
  if (required === 0) {
    yield [...fixed].sort((left, right) => left - right);
    return;
  }
  const chosen: number[] = [];
  function *visit(start: number): Generator<number[]> {
    if (chosen.length === required) {
      yield [...fixed, ...chosen].sort((left, right) => left - right);
      return;
    }
    const remaining = required - chosen.length;
    if (conditions && !partialCanSatisfy([...fixed, ...chosen], pool.slice(start), remaining, conditions)) return;
    for (let index = start; index <= pool.length - remaining; index += 1) {
      chosen.push(pool[index]);
      yield *visit(index + 1);
      chosen.pop();
    }
  }
  yield *visit(0);
}

function partialCanSatisfy(
  selected: readonly number[],
  available: readonly number[],
  remaining: number,
  conditions: GeneratorConditions,
) {
  const rangeCanMatch = (
    condition: GeneratorConditions['sum'],
    value: (number: number) => number,
  ) => {
    if (!condition.enabled) return true;
    const current = selected.reduce((total, number) => total + value(number), 0);
    const values = available.map(value).sort((left, right) => left - right);
    const minPossible = current + values.slice(0, remaining).reduce((total, number) => total + number, 0);
    const maxPossible = current + values.slice(-remaining).reduce((total, number) => total + number, 0);
    return maxPossible >= condition.min && minPossible <= condition.max;
  };
  const countCanMatch = (allowed: readonly number[], predicate: (number: number) => boolean) => {
    if (!allowed.length) return true;
    const current = selected.filter(predicate).length;
    const matching = available.filter(predicate).length;
    const nonMatching = available.length - matching;
    const minPossible = current + Math.max(0, remaining - nonMatching);
    const maxPossible = current + Math.min(remaining, matching);
    return allowed.some((value) => minPossible <= value && value <= maxPossible);
  };
  if (!rangeCanMatch(conditions.sum, (number) => number)) return false;
  if (!rangeCanMatch(conditions.lastDigitSum, (number) => number % 10)) return false;
  if (!countCanMatch(conditions.oddCounts, (number) => number % 2 !== 0)) return false;
  if (!countCanMatch(conditions.highLowCounts, (number) => number <= 22)) return false;
  if (!countCanMatch(conditions.primeCounts, (number) => PRIME_NUMBERS.has(number))) return false;
  if (!countCanMatch(conditions.squareCounts, (number) => SQUARE_NUMBERS.has(number))) return false;
  if (!countCanMatch(conditions.compositeCounts, (number) => number > 1 && !PRIME_NUMBERS.has(number))) return false;
  for (const band of BAND_KEYS) {
    if (!countCanMatch(conditions.bandCounts[band], (number) => bandFor(number) === band)) return false;
  }
  for (const multiple of [3, 4, 5] as const) {
    if (!countCanMatch(conditions.multipleCounts[multiple], (number) => number % multiple === 0)) return false;
  }
  return true;
}

function scoreViolations(violations: readonly ConditionViolation[]) {
  return violations.reduce((total, violation) => total + violation.distance, 0);
}

function nextTask() {
  return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

export async function generateCombination(
  conditions: GeneratorConditions,
  options: GenerationOptions,
): Promise<GenerationOutcome> {
  const random = options.random ?? Math.random;
  const yieldEvery = Math.max(128, options.yieldEvery ?? 4096);
  const fixed = normalizeHardNumbers(conditions.fixedNumbers);
  const excluded = new Set(normalizeHardNumbers(conditions.excludedNumbers));
  if (fixed.length > 6) throw new Error('고정수는 최대 6개까지 선택할 수 있어요.');
  if (fixed.some((number) => excluded.has(number))) {
    throw new Error('같은 번호를 고정수와 제외수로 함께 선택할 수 없어요.');
  }
  const pool = shuffle(
    ALL_NUMBERS.filter((number) => !excluded.has(number) && !fixed.includes(number)),
    random,
  );
  const required = 6 - fixed.length;
  if (pool.length < required) throw new Error('제외하지 않은 번호가 6개보다 적어요.');

  let searchedCandidates = 0;
  for (const numbers of candidateCombinations(fixed, pool, required, conditions)) {
    if (options.isCancelled?.()) throw new Error('GENERATION_CANCELLED');
    searchedCandidates += 1;
    const evaluated = evaluateCombination(numbers, conditions, options.history);
    if (!evaluated.violations.length) {
      return {
        metrics: evaluated.metrics,
        mode: 'exact',
        numbers,
        searchedCandidates,
        violations: [],
      };
    }

    if (searchedCandidates % yieldEvery === 0) {
      options.onProgress?.(searchedCandidates);
      await nextTask();
    }
  }

  // The exact pass may prune branches using soft conditions. A second complete pass is
  // required to guarantee that the fallback is the globally closest hard-valid candidate.
  let nearest: GenerationOutcome | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  let nearestTies = 0;
  for (const numbers of candidateCombinations(fixed, pool, required)) {
    if (options.isCancelled?.()) throw new Error('GENERATION_CANCELLED');
    searchedCandidates += 1;
    const evaluated = evaluateCombination(numbers, conditions, options.history);
    const distance = scoreViolations(evaluated.violations);
    const better = !nearest
      || evaluated.violations.length < nearest.violations.length
      || (
        evaluated.violations.length === nearest.violations.length
        && distance < nearestDistance - Number.EPSILON
      );
    const tied = nearest
      && evaluated.violations.length === nearest.violations.length
      && Math.abs(distance - nearestDistance) <= Number.EPSILON;
    if (better) {
      nearest = {
        metrics: evaluated.metrics,
        mode: 'nearest',
        numbers,
        searchedCandidates,
        violations: evaluated.violations,
      };
      nearestDistance = distance;
      nearestTies = 1;
    } else if (tied) {
      nearestTies += 1;
      if (random() < 1 / nearestTies) {
        nearest = {
          metrics: evaluated.metrics,
          mode: 'nearest',
          numbers,
          searchedCandidates,
          violations: evaluated.violations,
        };
      }
    }

    if (searchedCandidates % yieldEvery === 0) {
      options.onProgress?.(searchedCandidates);
      await nextTask();
    }
  }
  if (!nearest) throw new Error('생성 가능한 번호 조합이 없어요.');
  return { ...nearest, searchedCandidates };
}

export function activeConditionCount(conditions: GeneratorConditions) {
  return [
    conditions.fixedNumbers.length > 0,
    conditions.excludedNumbers.length > 0,
    conditions.sameEndingPatterns.length > 0,
    conditions.standardDeviation.enabled,
    conditions.sum.enabled,
    conditions.lastDigitSum.enabled,
    conditions.oddCounts.length > 0,
    conditions.highLowCounts.length > 0,
    conditions.acValues.length > 0,
    conditions.primeCounts.length > 0,
    conditions.squareCounts.length > 0,
    conditions.compositeCounts.length > 0,
    conditions.carry.allowed.length > 0,
    conditions.neighbor.allowed.length > 0,
    conditions.consecutivePatterns.length > 0,
    ...BAND_KEYS.map((key) => conditions.bandCounts[key].length > 0),
    ...([3, 4, 5] as const).map((multiple) => conditions.multipleCounts[multiple].length > 0),
    conditions.excludedPastRanks.length > 0,
  ].filter(Boolean).length;
}

export function conditionDerivedExclusions(conditions: GeneratorConditions, history: readonly LottoHistoryDraw[]) {
  const derived = new Set<number>();
  const addWhenZeroOnly = (allowed: readonly number[], predicate: (number: number) => boolean) => {
    if (allowed.length === 1 && allowed[0] === 0) ALL_NUMBERS.filter(predicate).forEach((number) => derived.add(number));
  };
  addWhenZeroOnly(conditions.primeCounts, (number) => PRIME_NUMBERS.has(number));
  addWhenZeroOnly(conditions.squareCounts, (number) => SQUARE_NUMBERS.has(number));
  addWhenZeroOnly(conditions.compositeCounts, (number) => number > 1 && !PRIME_NUMBERS.has(number));
  ([3, 4, 5] as const).forEach((multiple) => addWhenZeroOnly(
    conditions.multipleCounts[multiple],
    (number) => number % multiple === 0,
  ));
  BAND_KEYS.forEach((key) => addWhenZeroOnly(conditions.bandCounts[key], (number) => bandFor(number) === key));
  if (conditions.oddCounts.length === 1 && conditions.oddCounts[0] === 0) {
    ALL_NUMBERS.filter((number) => number % 2 !== 0).forEach((number) => derived.add(number));
  }
  if (conditions.oddCounts.length === 1 && conditions.oddCounts[0] === 6) {
    ALL_NUMBERS.filter((number) => number % 2 === 0).forEach((number) => derived.add(number));
  }
  if (conditions.highLowCounts.length === 1 && conditions.highLowCounts[0] === 0) {
    ALL_NUMBERS.filter((number) => number <= 22).forEach((number) => derived.add(number));
  }
  if (conditions.highLowCounts.length === 1 && conditions.highLowCounts[0] === 6) {
    ALL_NUMBERS.filter((number) => number >= 23).forEach((number) => derived.add(number));
  }
  const latest = latestDraw(history);
  if (latest) {
    const carry = new Set([...latest.numbers, ...(conditions.carry.includeBonus ? [latest.bonus] : [])]);
    addWhenZeroOnly(conditions.carry.allowed, (number) => carry.has(number));
    const neighbor = new Set<number>();
    [...latest.numbers, ...(conditions.neighbor.includeBonus ? [latest.bonus] : [])].forEach((number) => {
      if (number > 1) neighbor.add(number - 1);
      if (number < 45) neighbor.add(number + 1);
    });
    addWhenZeroOnly(conditions.neighbor.allowed, (number) => neighbor.has(number));
  }
  conditions.excludedNumbers.forEach((number) => derived.delete(number));
  return [...derived].sort((left, right) => left - right);
}

export const GENERATOR_COUNT_VALUES = COUNT_VALUES;
export const GENERATOR_BAND_KEYS = BAND_KEYS;
