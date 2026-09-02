import { describe, expect, test } from '@jest/globals';

import generatedJson from '@/data/generated/number-analytics.json';
import historyJson from '@/data/generated/lotto_history.json';
import type { NumberAnalyticsDataset } from '@/data/numberAnalytics.types';

import {
  buildAnalyticsSnapshot,
  clearAnalyticsSnapshotCache,
} from '../buildAnalyticsSnapshot';
import type { AnalysisFilters, LottoHistoryDraw } from '../types';

const history = historyJson as LottoHistoryDraw[];
const generated = generatedJson as unknown as NumberAnalyticsDataset;
const allWithoutBonus: AnalysisFilters = {
  includeBonus: false,
  period: { kind: 'preset', label: '전체' },
};
const recentCases: [
  '최근 3회' | '최근 5회' | '최근 10회' | '최근 52회',
  number,
][] = [
  ['최근 3회', 3],
  ['최근 5회', 5],
  ['최근 10회', 10],
  ['최근 52회', 52],
];

describe('buildAnalyticsSnapshot', () => {
  test('matches the generated all-draw snapshot for all 45 numbers', () => {
    clearAnalyticsSnapshotCache();
    const snapshot = buildAnalyticsSnapshot(history, allWithoutBonus);

    for (let number = 1; number <= 45; number += 1) {
      const actual = snapshot.numbers[String(number)];
      const expected = generated.numbers[String(number)];
      expect(actual.appearanceCount).toBe(expected.appearanceCount);
      expect(actual.appearanceRank).toBe(expected.appearanceRank);
      expect(actual.averageGap).toBe(expected.averageGap);
      expect(actual.currentGap).toBe(expected.currentGap);
      expect(actual.maxGap).toBe(expected.maxGap);
      expect(actual.topPairs).toEqual(expected.topPairs);
      expect(actual.topTrios).toEqual(expected.topTrios);
    }
  });

  test.each(recentCases)('%s selects the expected active draw count', (label, expectedCount) => {
    const snapshot = buildAnalyticsSnapshot(history, {
      includeBonus: false,
      period: { kind: 'preset', label },
    });
    expect(snapshot.activeDrawCount).toBe(expectedCount);
    expect(snapshot.timelineDrawCount).toBe(expectedCount);
  });

  test('custom ranges include both endpoints and clamp cleanly', () => {
    const snapshot = buildAnalyticsSnapshot(history, {
      includeBonus: false,
      period: { kind: 'custom', startRound: 1234, endRound: 9999 },
    });
    expect(snapshot.activeDrawCount).toBe(6);
    expect(snapshot.numbers['1'].recent52.map((entry) => entry.round)).toEqual([
      1234, 1235, 1236, 1237, 1238, 1239,
    ]);
  });

  test('bonus inclusion changes the completed snapshot and counts each draw once', () => {
    const withoutBonus = buildAnalyticsSnapshot(history, allWithoutBonus);
    const withBonus = buildAnalyticsSnapshot(history, {
      ...allWithoutBonus,
      includeBonus: true,
    });
    expect(withBonus.numbers['10'].appearanceCount).toBeGreaterThan(
      withoutBonus.numbers['10'].appearanceCount,
    );

    const duplicateDraw: LottoHistoryDraw[] = [
      { round: 1, numbers: [1, 1, 2, 3, 4, 5], bonus: 1 },
    ];
    const duplicateSnapshot = buildAnalyticsSnapshot(duplicateDraw, {
      includeBonus: true,
      period: { kind: 'preset', label: '전체' },
    });
    expect(duplicateSnapshot.numbers['1'].appearanceCount).toBe(1);
    expect(duplicateSnapshot.numbers['1'].topPairs).toEqual([
      { number: 2, count: 1 },
      { number: 3, count: 1 },
      { number: 4, count: 1 },
      { number: 5, count: 1 },
    ]);
  });

  test('memoizes the complete 1–45 snapshot by normalized filter key', () => {
    const first = buildAnalyticsSnapshot(history, allWithoutBonus);
    const second = buildAnalyticsSnapshot(history, allWithoutBonus);
    expect(second).toBe(first);
    expect(Object.keys(first.numbers)).toHaveLength(45);
  });
});
