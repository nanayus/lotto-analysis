export type NumberStatus = 'HOT' | 'NEUTRAL' | 'COLD';

export type FrequencyMetricsData = {
  averageGap: number;
  currentMiss: number;
  maxMiss: number;
};

export type PairDatum = {
  number: number;
  count: number;
};

export type TrioDatum = {
  numbers: [number, number, number];
  count: number;
};

export type NumberAnalytics = {
  number: number;
  status: NumberStatus;
  frequency: number;
  rank: number;
  recentFive: [boolean, boolean, boolean, boolean, boolean];
  timeline: boolean[];
  metrics: FrequencyMetricsData;
  pairs: [PairDatum, PairDatum, PairDatum];
  trios: [TrioDatum, TrioDatum, TrioDatum];
};

const statuses: NumberStatus[] = ['NEUTRAL', 'HOT', 'COLD'];

function nextDistinctNumber(seed: number, offset: number): number {
  return ((seed * 7 + offset * 11) % 45) + 1;
}

function distinctPartners(number: number): [number, number, number, number] {
  const partners: number[] = [];
  let offset = 1;

  while (partners.length < 4) {
    const candidate = nextDistinctNumber(number, offset);
    if (candidate !== number && !partners.includes(candidate)) {
      partners.push(candidate);
    }
    offset += 1;
  }

  return [partners[0], partners[1], partners[2], partners[3]];
}

function createAnalytics(number: number): NumberAnalytics {
  const partners = distinctPartners(number);
  const recentFive = Array.from(
    { length: 5 },
    (_, index) => ((number * 3 + index * 5) % 9) < 4,
  ) as NumberAnalytics['recentFive'];

  return {
    number,
    status: statuses[number % statuses.length],
    frequency: 164 + ((number * 11) % 31),
    rank: ((number * 13) % 45) + 1,
    recentFive,
    timeline: Array.from(
      { length: 52 },
      (_, index) => ((number * 5 + index * 7) % 17) < 5,
    ),
    metrics: {
      averageGap: Number((5.2 + ((number * 7) % 19) / 10).toFixed(1)),
      currentMiss: (number * 5) % 8,
      maxMiss: 16 + ((number * 3) % 13),
    },
    pairs: [
      { number: partners[0], count: 25 + (number % 9) },
      { number: partners[1], count: 21 + (number % 8) },
      { number: partners[2], count: 18 + (number % 7) },
    ],
    trios: [
      { numbers: [number, partners[0], partners[1]], count: 13 + (number % 6) },
      { numbers: [number, partners[1], partners[2]], count: 11 + (number % 5) },
      { numbers: [number, partners[2], partners[3]], count: 9 + (number % 5) },
    ],
  };
}

function withPromptExamples(data: NumberAnalytics[]): NumberAnalytics[] {
  const examples: Record<number, Pick<NumberAnalytics, 'status' | 'frequency' | 'rank' | 'recentFive'>> = {
    17: {
      status: 'HOT',
      frequency: 187,
      rank: 7,
      recentFive: [true, true, false, true, false],
    },
    18: {
      status: 'NEUTRAL',
      frequency: 181,
      rank: 21,
      recentFive: [false, true, false, false, true],
    },
    19: {
      status: 'COLD',
      frequency: 175,
      rank: 39,
      recentFive: [false, false, true, false, false],
    },
  };

  return data.map((item) => ({ ...item, ...examples[item.number] }));
}

export const dummyAnalytics: readonly NumberAnalytics[] = Object.freeze(
  withPromptExamples(Array.from({ length: 45 }, (_, index) => createAnalytics(index + 1))),
);

export function getDummyAnalytics(number: number): NumberAnalytics {
  return dummyAnalytics[Math.min(44, Math.max(0, Math.round(number) - 1))];
}
