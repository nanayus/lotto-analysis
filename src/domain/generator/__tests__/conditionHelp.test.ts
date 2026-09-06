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

    const bandSuggestion = help.numberBands.suggestion!;
    const banded = applyConditionHelpSuggestion(defaults, bandSuggestion);
    expect(Object.values(banded.enabledSections ?? {}).filter(Boolean)).toHaveLength(5);
    expect(banded.bandCounts).toEqual(bandSuggestion.kind === 'bandCounts'
      ? Object.fromEntries(Object.entries(bandSuggestion.values).map(([band, value]) => [band, [value]]))
      : {});

    const multipleSuggestion = help.multiples.suggestion!;
    const multiplied = applyConditionHelpSuggestion(defaults, multipleSuggestion);
    expect(multiplied.enabledSections).toMatchObject({ multiple3: true, multiple4: true, multiple5: true });
    expect(multiplied.multipleCounts).toEqual(multipleSuggestion.kind === 'multipleCounts'
      ? Object.fromEntries(Object.entries(multipleSuggestion.values).map(([multiple, value]) => [multiple, [value]]))
      : {});
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
