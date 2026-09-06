import {
  generatorSectionEnabled,
} from '@/domain/generator/combinationGenerator';
import type { GeneratorConditions } from '@/domain/generator/types';

export type GeneratorConditionAnalyticsKey =
  | 'ac_value'
  | 'number_bands'
  | 'carry_count'
  | 'composite_count'
  | 'consecutive_pattern'
  | 'excluded_numbers'
  | 'fixed_numbers'
  | 'last_digit_sum'
  | 'low_high'
  | 'multiples'
  | 'neighbor_count'
  | 'number_sum'
  | 'odd_even'
  | 'past_prize_rank'
  | 'prime_count'
  | 'same_ending'
  | 'square_count'
  | 'standard_deviation';

export function activeGeneratorConditionKeys(
  conditions: GeneratorConditions,
): GeneratorConditionAnalyticsKey[] {
  const entries: [GeneratorConditionAnalyticsKey, boolean][] = [
    ['fixed_numbers', generatorSectionEnabled(conditions, 'fixedExcluded') && conditions.fixedNumbers.length > 0],
    ['excluded_numbers', generatorSectionEnabled(conditions, 'fixedExcluded') && conditions.excludedNumbers.length > 0],
    ['same_ending', generatorSectionEnabled(conditions, 'sameEnding') && conditions.sameEndingPatterns.length > 0],
    ['standard_deviation', conditions.standardDeviation.enabled],
    ['number_sum', conditions.sum.enabled],
    ['last_digit_sum', conditions.lastDigitSum.enabled],
    ['odd_even', generatorSectionEnabled(conditions, 'oddEven') && conditions.oddCounts.length > 0],
    ['low_high', generatorSectionEnabled(conditions, 'lowHigh') && conditions.highLowCounts.length > 0],
    ['ac_value', generatorSectionEnabled(conditions, 'acValue') && conditions.acValues.length > 0],
    ['prime_count', generatorSectionEnabled(conditions, 'primeCount') && conditions.primeCounts.length > 0],
    ['square_count', generatorSectionEnabled(conditions, 'squareCount') && conditions.squareCounts.length > 0],
    ['composite_count', generatorSectionEnabled(conditions, 'compositeCount') && conditions.compositeCounts.length > 0],
    ['carry_count', generatorSectionEnabled(conditions, 'carryCount') && conditions.carry.allowed.length > 0],
    ['neighbor_count', generatorSectionEnabled(conditions, 'neighborCount') && conditions.neighbor.allowed.length > 0],
    ['consecutive_pattern', generatorSectionEnabled(conditions, 'consecutivePattern') && conditions.consecutivePatterns.length > 0],
    ['number_bands', (
      generatorSectionEnabled(conditions, 'band1To9') && conditions.bandCounts['1-9'].length > 0
    ) || (
      generatorSectionEnabled(conditions, 'band10To19') && conditions.bandCounts['10-19'].length > 0
    ) || (
      generatorSectionEnabled(conditions, 'band20To29') && conditions.bandCounts['20-29'].length > 0
    ) || (
      generatorSectionEnabled(conditions, 'band30To39') && conditions.bandCounts['30-39'].length > 0
    ) || (
      generatorSectionEnabled(conditions, 'band40To45') && conditions.bandCounts['40-45'].length > 0
    )],
    ['multiples', (
      generatorSectionEnabled(conditions, 'multiple3') && conditions.multipleCounts[3].length > 0
    ) || (
      generatorSectionEnabled(conditions, 'multiple4') && conditions.multipleCounts[4].length > 0
    ) || (
      generatorSectionEnabled(conditions, 'multiple5') && conditions.multipleCounts[5].length > 0
    )],
    ['past_prize_rank', generatorSectionEnabled(conditions, 'pastRanks') && conditions.excludedPastRanks.length > 0],
  ];

  return entries.filter(([, active]) => active).map(([key]) => key);
}
