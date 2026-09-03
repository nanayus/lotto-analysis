import { describe, expect, test } from '@jest/globals';

import type { LottoHistoryDraw } from '@/domain/analytics/types';
import historyJson from '@/data/generated/lotto_history.json';

import {
  applyConditionHelpSuggestion,
  buildConditionHelp,
} from '../conditionHelp';
import { buildGeneratorConditionDefaults } from '../combinationGenerator';

const history = historyJson as LottoHistoryDraw[];

describe('condition help suggestions', () => {
  test('applies historical values to their matching condition shapes', () => {
    const help = buildConditionHelp(history);
    const defaults = buildGeneratorConditionDefaults(history);

    const fixedSuggestion = help.fixedExcluded.suggestion!;
    const fixed = applyConditionHelpSuggestion(defaults, fixedSuggestion);
    expect(fixed.enabledSections?.fixedExcluded).toBe(true);
    expect(fixed.fixedNumbers).toContain(fixedSuggestion.kind === 'fixedNumber' ? fixedSuggestion.number : -1);

    const rangeSuggestion = help.sum.suggestion!;
    const ranged = applyConditionHelpSuggestion(defaults, rangeSuggestion);
    expect(ranged.sum).toEqual(rangeSuggestion.kind === 'range'
      ? { enabled: true, min: rangeSuggestion.min, max: rangeSuggestion.max }
      : null);

    const patternSuggestion = help.sameEnding.suggestion!;
    const patterned = applyConditionHelpSuggestion(defaults, patternSuggestion);
    expect(patterned.enabledSections?.sameEnding).toBe(true);
    expect(patterned.sameEndingPatterns).toEqual(patternSuggestion.kind === 'singleValue'
      ? [patternSuggestion.value]
      : []);

    const bandSuggestion = help.band20To29.suggestion!;
    const banded = applyConditionHelpSuggestion(defaults, bandSuggestion);
    expect(banded.enabledSections?.band20To29).toBe(true);
    expect(banded.bandCounts['20-29']).toEqual(bandSuggestion.kind === 'bandCount'
      ? [bandSuggestion.value]
      : []);
  });

  test('uses the current bonus setting for previous-draw suggestions', () => {
    const help = buildConditionHelp(history);
    const defaults = buildGeneratorConditionDefaults(history);
    defaults.neighbor.includeBonus = true;
    const suggestion = help.neighborCount.suggestion!;

    const applied = applyConditionHelpSuggestion(defaults, suggestion);

    expect(applied.enabledSections?.neighborCount).toBe(true);
    expect(applied.neighbor.allowed).toEqual(suggestion.kind === 'recentCount'
      ? [suggestion.withBonus]
      : []);
    expect(applied.neighbor.includeBonus).toBe(true);
  });

  test('does not offer an apply action for non-selectable comparison information', () => {
    expect(buildConditionHelp(history).pastRanks.suggestion).toBeNull();
  });
});
