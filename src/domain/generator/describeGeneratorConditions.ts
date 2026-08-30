import {
  CONSECUTIVE_LABELS,
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
