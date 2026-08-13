export type NumberStatus = 'HOT' | 'NEUTRAL' | 'COLD';

export type DrawHit = {
  round: number;
  hit: boolean;
};

export type PairDatum = {
  number: number;
  count: number;
};

export type TrioDatum = {
  numbers: [number, number];
  count: number;
};

export type GeneratedNumberAnalytics = {
  number: number;
  status: NumberStatus;
  appearanceCount: number;
  appearanceRate: number;
  appearanceRatePct: number;
  appearanceRank: number;
  recent52Count: number;
  recent5: DrawHit[];
  recent52: DrawHit[];
  averageGap: number;
  currentGap: number;
  maxGap: number;
  topPairs: PairDatum[];
  topTrios: TrioDatum[];
};

export type NumberAnalyticsDataset = {
  metadata: {
    firstDrawNumber: number;
    latestDrawNumber: number;
  };
  numbers: Record<string, GeneratedNumberAnalytics>;
};
