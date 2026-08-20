import type { AnalysisFilters, AnalysisPeriod, LottoHistoryDraw } from './types';

export type NumberAppearanceHistoryItem = LottoHistoryDraw & {
  gapSincePrevious: number | null;
};

function periodCount(period: AnalysisPeriod) {
  if (period.kind !== 'preset') return null;
  return Number(period.label.match(/^최근 (\d+)회$/)?.[1] ?? 0) || null;
}

export function getActiveDraws(history: readonly LottoHistoryDraw[], filters: AnalysisFilters) {
  const sorted = [...history].sort((a, b) => a.round - b.round);
  if (filters.period.kind === 'custom') {
    const { startRound, endRound } = filters.period;
    return sorted.filter((draw) => draw.round >= startRound && draw.round <= endRound);
  }
  const count = periodCount(filters.period);
  return count ? sorted.slice(-count) : sorted;
}

export function getNumberAppearanceRounds(
  history: readonly LottoHistoryDraw[], number: number, filters: AnalysisFilters,
) {
  return getActiveDraws(history, filters)
    .filter((draw) => draw.numbers.includes(number) || (filters.includeBonus && draw.bonus === number))
    .map((draw) => draw.round)
    .sort((a, b) => b - a);
}

export function getNumberAppearanceHistory(
  history: readonly LottoHistoryDraw[], number: number, filters: AnalysisFilters,
): NumberAppearanceHistoryItem[] {
  const activeRounds = new Set(getActiveDraws(history, filters).map((draw) => draw.round));
  const appearances = [...history]
    .sort((a, b) => a.round - b.round)
    .filter((draw) => draw.numbers.includes(number) || (filters.includeBonus && draw.bonus === number));

  return appearances
    .map((draw, index) => ({
      ...draw,
      gapSincePrevious: index > 0 ? draw.round - appearances[index - 1].round : null,
    }))
    .filter((draw) => activeRounds.has(draw.round))
    .sort((a, b) => b.round - a.round);
}
