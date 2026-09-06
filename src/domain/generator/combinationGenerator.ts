import type { LottoHistoryDraw } from '@/domain/analytics/types';

import type {
  CombinationMetrics,
  ConditionViolation,
  ConsecutivePattern,
  GenerationOptions,
  GenerationOutcome,
  GeneratorConditions,
  GeneratorSectionKey,
  NumberBandKey,
  PastPrizeRank,
  SameEndingPattern,
} from './types';

const ALL_NUMBERS = Array.from({ length: 45 }, (_, index) => index + 1);
const PRIME_NUMBERS = new Set([2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43]);
const SQUARE_NUMBERS = new Set([4, 9, 16, 25, 36]);
const BAND_KEYS = ['1-9', '10-19', '20-29', '30-39', '40-45'] as const;
const COUNT_VALUES = [0, 1, 2, 3, 4, 5, 6] as const;
export const GENERATOR_METRIC_LIMITS = {
  lastDigitSum: { min: 2, max: 52 },
  standardDeviation: { min: 1.7, max: 21.1 },
  sum: { min: 21, max: 255 },
} as const;
export const GENERATOR_SECTION_KEYS: GeneratorSectionKey[] = [
  'fixedExcluded',
  'sameEnding',
  'oddEven',
  'lowHigh',
  'acValue',
  'primeCount',
  'squareCount',
  'compositeCount',
  'multiple3',
  'multiple4',
  'multiple5',
  'carryCount',
  'neighborCount',
  'consecutivePattern',
  'band1To9',
  'band10To19',
  'band20To29',
  'band30To39',
  'band40To45',
  'pastRanks',
];
const DIRECT_SETUP_RANGE_DEFAULTS = {
  lastDigitSum: { min: 15, max: 40 },
  standardDeviation: { min: 8, max: 16 },
  sum: { min: 100, max: 180 },
} as const;

type PrizeIndex = {
  fiveMain: Map<string, { bonus: number; missing: number }[]>;
  rankOne: Set<string>;
};

const prizeIndexCache = new WeakMap<readonly LottoHistoryDraw[], PrizeIndex>();
const latestDrawCache = new WeakMap<readonly LottoHistoryDraw[], LottoHistoryDraw | null>();
const rangePresetCache = new WeakMap<readonly LottoHistoryDraw[], GeneratorRangePresets>();

export type GeneratorRangePreset = {
  count: number;
  max: number;
  min: number;
};

export type GeneratorRangePresets = Record<
  'lastDigitSum' | 'standardDeviation' | 'sum',
  GeneratorRangePreset
>;

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
  enabledSections: {},
  fixedNumbers: [],
  highLowCounts: [],
  lastDigitSum: { enabled: false, ...GENERATOR_METRIC_LIMITS.lastDigitSum },
  multipleCounts: { 3: [], 4: [], 5: [] },
  neighbor: { allowed: [], includeBonus: false },
  oddCounts: [],
  primeCounts: [],
  sameEndingPatterns: [],
  squareCounts: [],
  standardDeviation: { enabled: false, min: 10, max: 15 },
  sum: { enabled: false, ...GENERATOR_METRIC_LIMITS.sum },
};

const BAND_SECTION_KEYS: Record<NumberBandKey, GeneratorSectionKey> = {
  '1-9': 'band1To9',
  '10-19': 'band10To19',
  '20-29': 'band20To29',
  '30-39': 'band30To39',
  '40-45': 'band40To45',
};

export function generatorSectionEnabled(
  conditions: GeneratorConditions,
  key: GeneratorSectionKey,
) {
  const explicit = conditions.enabledSections?.[key];
  if (explicit !== undefined) return explicit;

  switch (key) {
    case 'fixedExcluded': return conditions.fixedNumbers.length > 0 || conditions.excludedNumbers.length > 0;
    case 'sameEnding': return conditions.sameEndingPatterns.length > 0;
    case 'oddEven': return conditions.oddCounts.length > 0;
    case 'lowHigh': return conditions.highLowCounts.length > 0;
    case 'acValue': return conditions.acValues.length > 0;
    case 'primeCount': return conditions.primeCounts.length > 0;
    case 'squareCount': return conditions.squareCounts.length > 0;
    case 'compositeCount': return conditions.compositeCounts.length > 0;
    case 'multiple3': return conditions.multipleCounts[3].length > 0;
    case 'multiple4': return conditions.multipleCounts[4].length > 0;
    case 'multiple5': return conditions.multipleCounts[5].length > 0;
    case 'carryCount': return conditions.carry.allowed.length > 0;
    case 'neighborCount': return conditions.neighbor.allowed.length > 0;
    case 'consecutivePattern': return conditions.consecutivePatterns.length > 0;
    case 'band1To9': return conditions.bandCounts['1-9'].length > 0;
    case 'band10To19': return conditions.bandCounts['10-19'].length > 0;
    case 'band20To29': return conditions.bandCounts['20-29'].length > 0;
    case 'band30To39': return conditions.bandCounts['30-39'].length > 0;
    case 'band40To45': return conditions.bandCounts['40-45'].length > 0;
    case 'pastRanks': return conditions.excludedPastRanks.length > 0;
  }
}

function mostFrequentBucket(values: readonly number[], bucketSize: number) {
  const counts = new Map<number, number>();
  values.forEach((value) => {
    const bucket = Math.floor(value / bucketSize) * bucketSize;
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  });
  return [...counts.entries()].sort((left, right) => right[1] - left[1] || left[0] - right[0])[0];
}

export function buildGeneratorRangePresets(
  history: readonly LottoHistoryDraw[],
): GeneratorRangePresets {
  const cached = rangePresetCache.get(history);
  if (cached) return cached;

  if (!history.length) {
    return {
      lastDigitSum: { count: 0, min: DEFAULT_GENERATOR_CONDITIONS.lastDigitSum.min, max: DEFAULT_GENERATOR_CONDITIONS.lastDigitSum.max },
      standardDeviation: { count: 0, min: DEFAULT_GENERATOR_CONDITIONS.standardDeviation.min, max: DEFAULT_GENERATOR_CONDITIONS.standardDeviation.max },
      sum: { count: 0, min: DEFAULT_GENERATOR_CONDITIONS.sum.min, max: DEFAULT_GENERATOR_CONDITIONS.sum.max },
    };
  }

  const metrics = history.map((draw) => calculateCombinationMetrics(draw.numbers, history, undefined, false));
  const standardDeviation = mostFrequentBucket(metrics.map((metric) => metric.standardDeviation), 1)!;
  const sum = mostFrequentBucket(metrics.map((metric) => metric.sum), 10)!;
  const lastDigitSum = mostFrequentBucket(metrics.map((metric) => metric.lastDigitSum), 5)!;
  const presets = {
    standardDeviation: { count: standardDeviation[1], min: standardDeviation[0], max: standardDeviation[0] + 0.9 },
    sum: { count: sum[1], min: sum[0], max: sum[0] + 9 },
    lastDigitSum: { count: lastDigitSum[1], min: lastDigitSum[0], max: lastDigitSum[0] + 4 },
  };
  rangePresetCache.set(history, presets);
  return presets;
}

export function buildGeneratorConditionDefaults(history: readonly LottoHistoryDraw[]) {
  const defaults = cloneGeneratorConditions(DEFAULT_GENERATOR_CONDITIONS);
  const presets = buildGeneratorRangePresets(history);
  defaults.enabledSections = Object.fromEntries(
    GENERATOR_SECTION_KEYS.map((key) => [key, false]),
  ) as Record<GeneratorSectionKey, boolean>;
  defaults.standardDeviation = { enabled: true, min: presets.standardDeviation.min, max: presets.standardDeviation.max };
  defaults.sum = { enabled: true, min: presets.sum.min, max: presets.sum.max };
  defaults.lastDigitSum = { enabled: false, min: presets.lastDigitSum.min, max: presets.lastDigitSum.max };
  return defaults;
}

export function buildDirectSetupGeneratorConditions(conditions: GeneratorConditions) {
  const directSetup = cloneGeneratorConditions(conditions);
  directSetup.enabledSections = Object.fromEntries(
    GENERATOR_SECTION_KEYS.map((key) => [key, true]),
  ) as Record<GeneratorSectionKey, boolean>;
  directSetup.standardDeviation = { enabled: true, ...DIRECT_SETUP_RANGE_DEFAULTS.standardDeviation };
  directSetup.sum = { enabled: true, ...DIRECT_SETUP_RANGE_DEFAULTS.sum };
  directSetup.lastDigitSum = { enabled: true, ...DIRECT_SETUP_RANGE_DEFAULTS.lastDigitSum };
  return directSetup;
}

export function buildBalancedGeneratorPreset(history: readonly LottoHistoryDraw[]) {
  const preset = buildGeneratorConditionDefaults(history);
  preset.standardDeviation = { enabled: true, min: 8, max: 16 };
  preset.sum = { enabled: true, min: 100, max: 180 };
  preset.oddCounts = [2, 3, 4];
  preset.highLowCounts = [2, 3, 4];
  preset.acValues = [7, 8, 9, 10];
  preset.consecutivePatterns = ['none', '2', '2+2', '2+2+2'];
  preset.lastDigitSum.enabled = false;
  preset.enabledSections = {
    ...Object.fromEntries(GENERATOR_SECTION_KEYS.map((key) => [key, false])),
    oddEven: true,
    lowHigh: true,
    acValue: true,
    consecutivePattern: true,
  };
  return preset;
}

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
    enabledSections: { ...conditions.enabledSections },
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
  const carryNumbers = numbers.filter((number) => carrySource.has(number));
  const neighborNumbers = numbers.filter((number) => neighborSource.has(number));
  const compositeNumbers = numbers.filter((number) => number > 1 && !PRIME_NUMBERS.has(number));
  const primeNumbers = numbers.filter((number) => PRIME_NUMBERS.has(number));
  const squareNumbers = numbers.filter((number) => SQUARE_NUMBERS.has(number));
  const multipleNumbers = {
    3: numbers.filter((number) => number % 3 === 0),
    4: numbers.filter((number) => number % 4 === 0),
    5: numbers.filter((number) => number % 5 === 0),
  };

  return {
    acValue: differences.size - 5,
    bandCounts: bands,
    carryCount: carryNumbers.length,
    carryNumbers,
    compositeCount: compositeNumbers.length,
    compositeNumbers,
    consecutivePattern: consecutivePattern(numbers) as ConsecutivePattern,
    highCount: numbers.filter((number) => number >= 23).length,
    lastDigitSum: numbers.reduce((total, number) => total + number % 10, 0),
    lowCount: numbers.filter((number) => number <= 22).length,
    multipleCounts: {
      3: multipleNumbers[3].length,
      4: multipleNumbers[4].length,
      5: multipleNumbers[5].length,
    },
    multipleNumbers,
    neighborCount: neighborNumbers.length,
    neighborNumbers,
    oddCount: numbers.filter((number) => number % 2 !== 0).length,
    pastPrizeRanks: includePastRanks ? matchingPastRanks(numbers, buildPrizeIndex(history)) : [],
    previousBonus: latest?.bonus ?? null,
    previousNumbers: latest ? [...latest.numbers].sort((left, right) => left - right) : [],
    previousRound: latest?.round ?? null,
    primeCount: primeNumbers.length,
    primeNumbers,
    sameEndingPattern: groupPattern(numbers.map((number) => number % 10)) as SameEndingPattern,
    squareCount: squareNumbers.length,
    squareNumbers,
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
    generatorSectionEnabled(conditions, 'pastRanks') && conditions.excludedPastRanks.length > 0,
  );
  const violations: ConditionViolation[] = [];
  const add = (key: string, label: string, actual: string, expected: string, distance: number) => {
    violations.push({ key, label, actual, expected, distance });
  };
  const checkCount = (
    key: string,
    label: string,
    actual: number,
    allowed: readonly number[],
    enabled: boolean,
  ) => {
    if (enabled && allowed.length && !allowed.includes(actual)) {
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

  if (generatorSectionEnabled(conditions, 'sameEnding')
    && conditions.sameEndingPatterns.length
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
  checkCount('odd', '홀짝 비율', metrics.oddCount, conditions.oddCounts, generatorSectionEnabled(conditions, 'oddEven'));
  checkCount('highLow', '저고 비율', metrics.lowCount, conditions.highLowCounts, generatorSectionEnabled(conditions, 'lowHigh'));
  if (generatorSectionEnabled(conditions, 'acValue')
    && conditions.acValues.length && !conditions.acValues.includes(metrics.acValue)) {
    add('ac', 'A/C 값', String(metrics.acValue), allowedText(conditions.acValues), countDistance(metrics.acValue, conditions.acValues));
  }
  checkCount('prime', '소수', metrics.primeCount, conditions.primeCounts, generatorSectionEnabled(conditions, 'primeCount'));
  checkCount('square', '완전제곱수', metrics.squareCount, conditions.squareCounts, generatorSectionEnabled(conditions, 'squareCount'));
  checkCount('composite', '합성수', metrics.compositeCount, conditions.compositeCounts, generatorSectionEnabled(conditions, 'compositeCount'));
  checkCount('carry', '이월수', metrics.carryCount, conditions.carry.allowed, generatorSectionEnabled(conditions, 'carryCount'));
  checkCount('neighbor', '이웃수', metrics.neighborCount, conditions.neighbor.allowed, generatorSectionEnabled(conditions, 'neighborCount'));
  if (generatorSectionEnabled(conditions, 'consecutivePattern')
    && conditions.consecutivePatterns.length
    && !conditions.consecutivePatterns.includes(metrics.consecutivePattern)) {
    add(
      'consecutive',
      '연번 형태',
      CONSECUTIVE_LABELS[metrics.consecutivePattern],
      conditions.consecutivePatterns.map((pattern) => CONSECUTIVE_LABELS[pattern]).join(', '),
      1,
    );
  }
  BAND_KEYS.forEach((key) => checkCount(
    `band:${key}`,
    `${key} 번호대`,
    metrics.bandCounts[key],
    conditions.bandCounts[key],
    generatorSectionEnabled(conditions, BAND_SECTION_KEYS[key]),
  ));
  ([3, 4, 5] as const).forEach((multiple) => checkCount(
    `multiple:${multiple}`,
    `${multiple}의 배수`,
    metrics.multipleCounts[multiple],
    conditions.multipleCounts[multiple],
    generatorSectionEnabled(conditions, `multiple${multiple}`),
  ));
  const blockedRanks = generatorSectionEnabled(conditions, 'pastRanks')
    ? metrics.pastPrizeRanks.filter((rank) => conditions.excludedPastRanks.includes(rank))
    : [];
  if (blockedRanks.length) {
    add('pastRank', '과거 등수', `${blockedRanks.join(', ')}등 기록`, '선택 등수 제외', 1);
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
  if (generatorSectionEnabled(conditions, 'oddEven') && !countCanMatch(conditions.oddCounts, (number) => number % 2 !== 0)) return false;
  if (generatorSectionEnabled(conditions, 'lowHigh') && !countCanMatch(conditions.highLowCounts, (number) => number <= 22)) return false;
  if (generatorSectionEnabled(conditions, 'primeCount') && !countCanMatch(conditions.primeCounts, (number) => PRIME_NUMBERS.has(number))) return false;
  if (generatorSectionEnabled(conditions, 'squareCount') && !countCanMatch(conditions.squareCounts, (number) => SQUARE_NUMBERS.has(number))) return false;
  if (generatorSectionEnabled(conditions, 'compositeCount') && !countCanMatch(conditions.compositeCounts, (number) => number > 1 && !PRIME_NUMBERS.has(number))) return false;
  for (const band of BAND_KEYS) {
    if (generatorSectionEnabled(conditions, BAND_SECTION_KEYS[band])
      && !countCanMatch(conditions.bandCounts[band], (number) => bandFor(number) === band)) return false;
  }
  for (const multiple of [3, 4, 5] as const) {
    if (generatorSectionEnabled(conditions, `multiple${multiple}`)
      && !countCanMatch(conditions.multipleCounts[multiple], (number) => number % multiple === 0)) return false;
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
  const hardNumbersEnabled = generatorSectionEnabled(conditions, 'fixedExcluded');
  const fixed = hardNumbersEnabled ? normalizeHardNumbers(conditions.fixedNumbers) : [];
  const excluded = new Set(hardNumbersEnabled ? normalizeHardNumbers(conditions.excludedNumbers) : []);
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
    generatorSectionEnabled(conditions, 'fixedExcluded') && conditions.fixedNumbers.length > 0,
    generatorSectionEnabled(conditions, 'fixedExcluded') && conditions.excludedNumbers.length > 0,
    generatorSectionEnabled(conditions, 'sameEnding') && conditions.sameEndingPatterns.length > 0,
    conditions.standardDeviation.enabled,
    conditions.sum.enabled,
    conditions.lastDigitSum.enabled,
    generatorSectionEnabled(conditions, 'oddEven') && conditions.oddCounts.length > 0,
    generatorSectionEnabled(conditions, 'lowHigh') && conditions.highLowCounts.length > 0,
    generatorSectionEnabled(conditions, 'acValue') && conditions.acValues.length > 0,
    generatorSectionEnabled(conditions, 'primeCount') && conditions.primeCounts.length > 0,
    generatorSectionEnabled(conditions, 'squareCount') && conditions.squareCounts.length > 0,
    generatorSectionEnabled(conditions, 'compositeCount') && conditions.compositeCounts.length > 0,
    generatorSectionEnabled(conditions, 'carryCount') && conditions.carry.allowed.length > 0,
    generatorSectionEnabled(conditions, 'neighborCount') && conditions.neighbor.allowed.length > 0,
    generatorSectionEnabled(conditions, 'consecutivePattern') && conditions.consecutivePatterns.length > 0,
    ...BAND_KEYS.map((key) => generatorSectionEnabled(conditions, BAND_SECTION_KEYS[key]) && conditions.bandCounts[key].length > 0),
    ...([3, 4, 5] as const).map((multiple) => generatorSectionEnabled(conditions, `multiple${multiple}`) && conditions.multipleCounts[multiple].length > 0),
    generatorSectionEnabled(conditions, 'pastRanks') && conditions.excludedPastRanks.length > 0,
  ].filter(Boolean).length;
}

export function enabledGeneratorConditionCount(conditions: GeneratorConditions) {
  return [
    conditions.standardDeviation.enabled,
    conditions.sum.enabled,
    conditions.lastDigitSum.enabled,
    ...GENERATOR_SECTION_KEYS.map((key) => generatorSectionEnabled(conditions, key)),
  ].filter(Boolean).length;
}

export function conditionDerivedExclusions(conditions: GeneratorConditions, history: readonly LottoHistoryDraw[]) {
  const derived = new Set<number>();
  const addWhenZeroOnly = (allowed: readonly number[], predicate: (number: number) => boolean) => {
    if (allowed.length === 1 && allowed[0] === 0) ALL_NUMBERS.filter(predicate).forEach((number) => derived.add(number));
  };
  if (generatorSectionEnabled(conditions, 'primeCount')) addWhenZeroOnly(conditions.primeCounts, (number) => PRIME_NUMBERS.has(number));
  if (generatorSectionEnabled(conditions, 'squareCount')) addWhenZeroOnly(conditions.squareCounts, (number) => SQUARE_NUMBERS.has(number));
  if (generatorSectionEnabled(conditions, 'compositeCount')) addWhenZeroOnly(conditions.compositeCounts, (number) => number > 1 && !PRIME_NUMBERS.has(number));
  ([3, 4, 5] as const).forEach((multiple) => addWhenZeroOnly(
    generatorSectionEnabled(conditions, `multiple${multiple}`) ? conditions.multipleCounts[multiple] : [],
    (number) => number % multiple === 0,
  ));
  BAND_KEYS.forEach((key) => addWhenZeroOnly(
    generatorSectionEnabled(conditions, BAND_SECTION_KEYS[key]) ? conditions.bandCounts[key] : [],
    (number) => bandFor(number) === key,
  ));
  if (generatorSectionEnabled(conditions, 'oddEven') && conditions.oddCounts.length === 1 && conditions.oddCounts[0] === 0) {
    ALL_NUMBERS.filter((number) => number % 2 !== 0).forEach((number) => derived.add(number));
  }
  if (generatorSectionEnabled(conditions, 'oddEven') && conditions.oddCounts.length === 1 && conditions.oddCounts[0] === 6) {
    ALL_NUMBERS.filter((number) => number % 2 === 0).forEach((number) => derived.add(number));
  }
  if (generatorSectionEnabled(conditions, 'lowHigh') && conditions.highLowCounts.length === 1 && conditions.highLowCounts[0] === 0) {
    ALL_NUMBERS.filter((number) => number <= 22).forEach((number) => derived.add(number));
  }
  if (generatorSectionEnabled(conditions, 'lowHigh') && conditions.highLowCounts.length === 1 && conditions.highLowCounts[0] === 6) {
    ALL_NUMBERS.filter((number) => number >= 23).forEach((number) => derived.add(number));
  }
  const latest = latestDraw(history);
  if (latest) {
    const carry = new Set([...latest.numbers, ...(conditions.carry.includeBonus ? [latest.bonus] : [])]);
    addWhenZeroOnly(generatorSectionEnabled(conditions, 'carryCount') ? conditions.carry.allowed : [], (number) => carry.has(number));
    const neighbor = new Set<number>();
    [...latest.numbers, ...(conditions.neighbor.includeBonus ? [latest.bonus] : [])].forEach((number) => {
      if (number > 1) neighbor.add(number - 1);
      if (number < 45) neighbor.add(number + 1);
    });
    addWhenZeroOnly(generatorSectionEnabled(conditions, 'neighborCount') ? conditions.neighbor.allowed : [], (number) => neighbor.has(number));
  }
  if (generatorSectionEnabled(conditions, 'fixedExcluded')) {
    conditions.excludedNumbers.forEach((number) => derived.delete(number));
  }
  return [...derived].sort((left, right) => left - right);
}

export const GENERATOR_COUNT_VALUES = COUNT_VALUES;
export const GENERATOR_BAND_KEYS = BAND_KEYS;
