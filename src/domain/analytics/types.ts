import type { GeneratedNumberAnalytics } from '@/data/numberAnalytics.types';

export type AnalysisPeriod =
  | { kind: 'preset'; label: '최근 3회' | '최근 5회' | '최근 10회' | '최근 52회' | '전체' }
  | { endRound: number; kind: 'custom'; startRound: number };

export type AnalysisFilters = {
  includeBonus: boolean;
  period: AnalysisPeriod;
};

export type LottoHistoryDraw = {
  bonus: number;
  numbers: number[];
  round: number;
};

export type AnalyticsSnapshot = {
  activeDrawCount: number;
  filterKey: string;
  numbers: Record<string, GeneratedNumberAnalytics>;
  timelineDrawCount: number;
  timelineLabel: string;
};
