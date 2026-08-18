import type { AnalysisFilters } from '@/domain/analytics/types';

export type PrizeRank = 1 | 2 | 3 | 4 | 5;

export type MainMatchCount = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type CombinationSize = 2 | 3 | 4 | 5 | 6;

export type DrawCombinationMatch = {
  bonus: number;
  bonusMatched: boolean;
  mainMatchCount: MainMatchCount;
  matchedMainNumbers: number[];
  numbers: number[];
  prizeRank: PrizeRank | null;
  round: number;
};

export type IndividualNumberAnalysis = {
  appearanceCount: number;
  appearanceRank: number;
  number: number;
};

export type SubCombinationAnalysis = {
  appearanceCount: number;
  latestRound: number | null;
  numbers: number[];
};

export type CombinationAnalysis = {
  activeDrawCount: number;
  filters: AnalysisFilters;
  groupFrequency: {
    differencePct: number;
    overallAverage: number;
    selectedAverage: number;
  };
  highestMainMatch: MainMatchCount;
  individualNumbers: IndividualNumberAnalysis[];
  matchDistribution: Record<MainMatchCount, number>;
  numbers: number[];
  prizeCounts: Record<PrizeRank, number>;
  qualifyingHistory: DrawCombinationMatch[];
  recentMeaningfulMatch: DrawCombinationMatch | null;
  sameSixCount: number;
  shape: {
    consecutiveGroups: number[][];
    evenCount: number;
    oddCount: number;
    sum: number;
  };
  subCombinations: Record<CombinationSize, SubCombinationAnalysis[]>;
};
