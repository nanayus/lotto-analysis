import {
  cloneGeneratorConditions,
  CONSECUTIVE_LABELS,
  DEFAULT_GENERATOR_CONDITIONS,
  GENERATOR_BAND_KEYS,
  generatorSectionEnabled,
  SAME_ENDING_LABELS,
} from './combinationGenerator';
import type { GeneratorConditions } from './types';

const BAND_SECTION_KEYS = {
  '1-9': 'band1To9',
  '10-19': 'band10To19',
  '20-29': 'band20To29',
  '30-39': 'band30To39',
  '40-45': 'band40To45',
} as const;

export type GeneratorConditionDescription = {
  key: string;
  label: string;
  value: string;
};

function numbersFromDescription(value: string) {
  return (value.match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
}

function patternFromLabel<T extends string>(labels: Record<T, string>, value: string) {
  return (Object.entries(labels) as [T, string][])
    .filter(([, label]) => value.split(' · ').includes(label))
    .map(([pattern]) => pattern);
}

export function restoreGeneratorConditions(
  descriptions: readonly GeneratorConditionDescription[],
): GeneratorConditions {
  const conditions = cloneGeneratorConditions(DEFAULT_GENERATOR_CONDITIONS);

  descriptions.forEach(({ key, value }) => {
    const values = numbersFromDescription(value);
    switch (key) {
      case 'fixed': conditions.fixedNumbers = values; break;
      case 'excluded': conditions.excludedNumbers = values; break;
      case 'sameEnding': conditions.sameEndingPatterns = patternFromLabel(SAME_ENDING_LABELS, value); break;
      case 'standardDeviation': {
        const [min, max] = values;
        if (min !== undefined && max !== undefined) conditions.standardDeviation = { enabled: true, min, max };
        break;
      }
      case 'sum': {
        const [min, max] = values;
        if (min !== undefined && max !== undefined) conditions.sum = { enabled: true, min, max };
        break;
      }
      case 'lastDigitSum': {
        const [min, max] = values;
        if (min !== undefined && max !== undefined) conditions.lastDigitSum = { enabled: true, min, max };
        break;
      }
      case 'odd': conditions.oddCounts = values as GeneratorConditions['oddCounts']; break;
      case 'low': conditions.highLowCounts = values as GeneratorConditions['highLowCounts']; break;
      case 'ac': conditions.acValues = values; break;
      case 'prime': conditions.primeCounts = values as GeneratorConditions['primeCounts']; break;
      case 'square': conditions.squareCounts = values as GeneratorConditions['squareCounts']; break;
      case 'composite': conditions.compositeCounts = values as GeneratorConditions['compositeCounts']; break;
      case 'multiple:3': conditions.multipleCounts[3] = values as GeneratorConditions['multipleCounts'][3]; break;
      case 'multiple:4': conditions.multipleCounts[4] = values as GeneratorConditions['multipleCounts'][4]; break;
      case 'multiple:5': conditions.multipleCounts[5] = values as GeneratorConditions['multipleCounts'][5]; break;
      case 'carry': conditions.carry = { allowed: values as GeneratorConditions['carry']['allowed'], includeBonus: value.includes('보너스 포함') }; break;
      case 'neighbor': conditions.neighbor = { allowed: values as GeneratorConditions['neighbor']['allowed'], includeBonus: value.includes('보너스 포함') }; break;
      case 'consecutive': conditions.consecutivePatterns = patternFromLabel(CONSECUTIVE_LABELS, value); break;
      case 'pastRanks': conditions.excludedPastRanks = values as GeneratorConditions['excludedPastRanks']; break;
      default: {
        if (key.startsWith('band:')) {
          const band = key.slice(5) as keyof GeneratorConditions['bandCounts'];
          if (band in conditions.bandCounts) {
            conditions.bandCounts[band] = values as GeneratorConditions['bandCounts'][typeof band];
          }
        }
      }
    }
  });

  return conditions;
}

function joined(values: readonly number[]) {
  return [...values].sort((left, right) => left - right).join(' · ');
}

function countValue(values: readonly number[]) {
  return `${joined(values)}개`;
}

function rangeValue(min: number, max: number) {
  return `${min}–${max}`;
}

export function describeGeneratorConditions(
  conditions: GeneratorConditions,
): GeneratorConditionDescription[] {
  const items: GeneratorConditionDescription[] = [];
  const add = (key: string, label: string, value: string) => items.push({ key, label, value });

  if (generatorSectionEnabled(conditions, 'fixedExcluded') && conditions.fixedNumbers.length) add('fixed', '고정수', joined(conditions.fixedNumbers));
  if (generatorSectionEnabled(conditions, 'fixedExcluded') && conditions.excludedNumbers.length) add('excluded', '제외수', joined(conditions.excludedNumbers));
  if (generatorSectionEnabled(conditions, 'sameEnding') && conditions.sameEndingPatterns.length) {
    add(
      'sameEnding',
      '동끝수 형태',
      conditions.sameEndingPatterns.map((pattern) => SAME_ENDING_LABELS[pattern]).join(' · '),
    );
  }
  if (conditions.standardDeviation.enabled) {
    add('standardDeviation', '표준편차', rangeValue(conditions.standardDeviation.min, conditions.standardDeviation.max));
  }
  if (conditions.sum.enabled) add('sum', '번호 총합', rangeValue(conditions.sum.min, conditions.sum.max));
  if (conditions.lastDigitSum.enabled) {
    add('lastDigitSum', '끝수 총합', rangeValue(conditions.lastDigitSum.min, conditions.lastDigitSum.max));
  }
  if (generatorSectionEnabled(conditions, 'oddEven') && conditions.oddCounts.length) add('odd', '홀수 개수', countValue(conditions.oddCounts));
  if (generatorSectionEnabled(conditions, 'lowHigh') && conditions.highLowCounts.length) add('low', '저번호(1–22)', countValue(conditions.highLowCounts));
  if (generatorSectionEnabled(conditions, 'acValue') && conditions.acValues.length) add('ac', 'A/C 값', joined(conditions.acValues));
  if (generatorSectionEnabled(conditions, 'primeCount') && conditions.primeCounts.length) add('prime', '소수', countValue(conditions.primeCounts));
  if (generatorSectionEnabled(conditions, 'squareCount') && conditions.squareCounts.length) add('square', '완전제곱수', countValue(conditions.squareCounts));
  if (generatorSectionEnabled(conditions, 'compositeCount') && conditions.compositeCounts.length) add('composite', '합성수', countValue(conditions.compositeCounts));
  ([3, 4, 5] as const).forEach((multiple) => {
    if (generatorSectionEnabled(conditions, `multiple${multiple}`) && conditions.multipleCounts[multiple].length) {
      add(`multiple:${multiple}`, `${multiple}의 배수`, countValue(conditions.multipleCounts[multiple]));
    }
  });
  if (generatorSectionEnabled(conditions, 'carryCount') && conditions.carry.allowed.length) {
    add(
      'carry',
      '이월수',
      `${countValue(conditions.carry.allowed)} · 보너스 ${conditions.carry.includeBonus ? '포함' : '제외'}`,
    );
  }
  if (generatorSectionEnabled(conditions, 'neighborCount') && conditions.neighbor.allowed.length) {
    add(
      'neighbor',
      '이웃수',
      `${countValue(conditions.neighbor.allowed)} · 보너스 ${conditions.neighbor.includeBonus ? '포함' : '제외'}`,
    );
  }
  if (generatorSectionEnabled(conditions, 'consecutivePattern') && conditions.consecutivePatterns.length) {
    add(
      'consecutive',
      '연번 형태',
      conditions.consecutivePatterns.map((pattern) => CONSECUTIVE_LABELS[pattern]).join(' · '),
    );
  }
  GENERATOR_BAND_KEYS.forEach((band) => {
    if (generatorSectionEnabled(conditions, BAND_SECTION_KEYS[band]) && conditions.bandCounts[band].length) {
      add(`band:${band}`, `${band} 번호대`, countValue(conditions.bandCounts[band]));
    }
  });
  if (generatorSectionEnabled(conditions, 'pastRanks') && conditions.excludedPastRanks.length) {
    add('pastRanks', '과거 등수 조합 제외', `${joined(conditions.excludedPastRanks)}등`);
  }

  return items;
}
