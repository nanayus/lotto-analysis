import type { AnalysisPeriod } from './types';

/** Formats an analysis period for use inside a user-facing sentence. */
export function formatAnalysisPeriodRange(period: AnalysisPeriod) {
  if (period.kind === 'custom') {
    return `${period.startRound}~${period.endRound}회`;
  }
  return period.label === '전체' ? '전체 기간' : period.label;
}
