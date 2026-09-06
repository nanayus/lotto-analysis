export type CombinationResultSectionKey =
  | 'condition_statistics'
  | 'frequent_combinations'
  | 'group_frequency'
  | 'headline'
  | 'individual_numbers'
  | 'match_distribution'
  | 'prize_history';

export type CombinationResultAction =
  | 'change_combination_size'
  | 'change_condition_tab'
  | 'change_period'
  | 'collapse_combinations'
  | 'expand_combinations'
  | 'open_all_history'
  | 'open_prize_rank'
  | 'regenerate'
  | 'start_over'
  | 'toggle_bonus'
  | 'toggle_favorite';

export type ResultSectionLayout = {
  height: number;
  y: number;
};

export function resultSectionVisibilityRatio(
  layout: ResultSectionLayout,
  scrollY: number,
  viewportHeight: number,
) {
  if (layout.height <= 0 || viewportHeight <= 0) return 0;
  const viewportBottom = scrollY + viewportHeight;
  const sectionBottom = layout.y + layout.height;
  const overlap = Math.max(
    0,
    Math.min(sectionBottom, viewportBottom) - Math.max(layout.y, scrollY),
  );
  return overlap / Math.min(layout.height, viewportHeight);
}
