import type { LottoHistoryDraw } from '@/domain/analytics/types';

export type CountValue = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type SameEndingPattern =
  | 'none'
  | '2'
  | '2+2'
  | '2+2+2'
  | '3'
  | '3+2'
  | '3+3'
  | '4'
  | '4+2'
  | '5';

export type ConsecutivePattern = SameEndingPattern | '6';
export type NumberBandKey = '1-9' | '10-19' | '20-29' | '30-39' | '40-45';
export type PastPrizeRank = 1 | 2 | 3;

export type GeneratorSectionKey =
  | 'fixedExcluded'
  | 'sameEnding'
  | 'oddEven'
  | 'lowHigh'
  | 'acValue'
  | 'primeCount'
  | 'squareCount'
  | 'compositeCount'
  | 'multiple3'
  | 'multiple4'
  | 'multiple5'
  | 'carryCount'
  | 'neighborCount'
  | 'consecutivePattern'
  | 'band1To9'
  | 'band10To19'
  | 'band20To29'
  | 'band30To39'
  | 'band40To45'
  | 'pastRanks';

export type NumericRangeCondition = {
  enabled: boolean;
  max: number;
  min: number;
};

export type RecentCountCondition = {
  allowed: CountValue[];
  includeBonus: boolean;
};

export type GeneratorConditions = {
  acValues: number[];
  bandCounts: Record<NumberBandKey, CountValue[]>;
  carry: RecentCountCondition;
  compositeCounts: CountValue[];
  consecutivePatterns: ConsecutivePattern[];
  excludedNumbers: number[];
  excludedPastRanks: PastPrizeRank[];
  enabledSections?: Partial<Record<GeneratorSectionKey, boolean>>;
  fixedNumbers: number[];
  highLowCounts: CountValue[];
  lastDigitSum: NumericRangeCondition;
  multipleCounts: Record<3 | 4 | 5, CountValue[]>;
  neighbor: RecentCountCondition;
  oddCounts: CountValue[];
  primeCounts: CountValue[];
  sameEndingPatterns: SameEndingPattern[];
  squareCounts: CountValue[];
  standardDeviation: NumericRangeCondition;
  sum: NumericRangeCondition;
};

export type CombinationMetrics = {
  acValue: number;
  bandCounts: Record<NumberBandKey, number>;
  carryCount: number;
  compositeCount: number;
  consecutivePattern: ConsecutivePattern;
  highCount: number;
  lastDigitSum: number;
  lowCount: number;
  multipleCounts: Record<3 | 4 | 5, number>;
  neighborCount: number;
  oddCount: number;
  pastPrizeRanks: PastPrizeRank[];
  primeCount: number;
  sameEndingPattern: SameEndingPattern;
  squareCount: number;
  standardDeviation: number;
  sum: number;
};

export type ConditionViolation = {
  actual: string;
  distance: number;
  expected: string;
  key: string;
  label: string;
};

export type GenerationOutcome = {
  metrics: CombinationMetrics;
  mode: 'exact' | 'nearest';
  numbers: number[];
  searchedCandidates: number;
  violations: ConditionViolation[];
};

export type GenerationOptions = {
  history: readonly LottoHistoryDraw[];
  isCancelled?: () => boolean;
  onProgress?: (searchedCandidates: number) => void;
  random?: () => number;
  yieldEvery?: number;
};
