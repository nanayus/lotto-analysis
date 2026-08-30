import { describe, expect, test } from '@jest/globals';

import type { LottoHistoryDraw } from '@/domain/analytics/types';
import historyJson from '@/data/generated/lotto_history.json';

import {
  activeConditionCount,
  buildBalancedGeneratorPreset,
  buildGeneratorConditionDefaults,
  buildGeneratorRangePresets,
  DEFAULT_GENERATOR_CONDITIONS,
} from '../combinationGenerator';

describe('generator condition defaults', () => {
  test('uses the most frequent bundled historical ranges with every condition enabled', () => {
    const defaults = buildGeneratorConditionDefaults(historyJson as LottoHistoryDraw[]);

    expect(defaults.standardDeviation).toEqual({ enabled: true, min: 12, max: 12.9 });
    expect(defaults.sum).toEqual({ enabled: true, min: 130, max: 139 });
    expect(defaults.lastDigitSum).toEqual({ enabled: true, min: 25, max: 29 });
    expect(Object.values(defaults.enabledSections ?? {})).toHaveLength(20);
    expect(Object.values(defaults.enabledSections ?? {}).every(Boolean)).toBe(true);
  });

  test('falls back to the unrestricted static ranges when history is empty', () => {
    const defaults = buildGeneratorConditionDefaults([]);

    expect(defaults.standardDeviation).toEqual({ ...DEFAULT_GENERATOR_CONDITIONS.standardDeviation, enabled: true });
    expect(defaults.sum).toEqual({ ...DEFAULT_GENERATOR_CONDITIONS.sum, enabled: true });
    expect(defaults.lastDigitSum).toEqual({ ...DEFAULT_GENERATOR_CONDITIONS.lastDigitSum, enabled: true });
  });

  test('builds the broad six-condition balanced preset', () => {
    const preset = buildBalancedGeneratorPreset(historyJson as LottoHistoryDraw[]);

    expect(activeConditionCount(preset)).toBe(6);
    expect(preset.standardDeviation).toEqual({ enabled: true, min: 8, max: 16 });
    expect(preset.sum).toEqual({ enabled: true, min: 100, max: 180 });
    expect(preset.oddCounts).toEqual([2, 3, 4]);
    expect(preset.highLowCounts).toEqual([2, 3, 4]);
    expect(preset.acValues).toEqual([7, 8, 9, 10]);
    expect(preset.consecutivePatterns).toEqual(['none', '2', '2+2', '2+2+2']);
  });

  test('chooses the lower bucket when historical bucket counts tie', () => {
    const tiedHistory: LottoHistoryDraw[] = [
      { round: 2, numbers: [10, 20, 30, 40, 44, 45], bonus: 1 },
      { round: 1, numbers: [1, 2, 3, 4, 5, 6], bonus: 7 },
    ];

    const presets = buildGeneratorRangePresets(tiedHistory);

    expect(presets.standardDeviation.min).toBe(1);
    expect(presets.sum.min).toBe(20);
    expect(presets.lastDigitSum.min).toBe(5);
  });
});
