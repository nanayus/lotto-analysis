import { describe, expect, test } from '@jest/globals';

import type { LottoHistoryDraw } from '@/domain/analytics/types';
import historyJson from '@/data/generated/lotto_history.json';

import { buildDistributionHelp } from '../distributionHelp';

const history = historyJson as LottoHistoryDraw[];

describe('buildDistributionHelp', () => {
  test('summarizes the most frequent distribution values from bundled main numbers', () => {
    const help = buildDistributionHelp(history);

    expect(help.sameEnding).toMatchObject({
      historicalLabel: '2수 1쌍',
      historicalCount: 593,
      historicalPercentage: 47.9,
    });
    expect(help.standardDeviation).toMatchObject({
      historicalLabel: '12.0~12.9',
      historicalCount: 195,
      historicalPercentage: 15.7,
    });
    expect(help.sum).toMatchObject({ historicalLabel: '130~139', historicalCount: 167 });
    expect(help.lastDigitSum).toMatchObject({ historicalLabel: '25~29', historicalCount: 360 });
    expect(help.oddEven).toMatchObject({ historicalLabel: '3:3', historicalCount: 414 });
    expect(help.lowHigh).toMatchObject({ historicalLabel: '3:3', historicalCount: 409 });
    expect(help.fixedExcluded).toMatchObject({ historicalLabel: '34번', historicalCount: 186 });
    expect(help.acValue).toMatchObject({ historicalLabel: '8', historicalCount: 432 });
    expect(help.primeCount).toMatchObject({ historicalLabel: '2개', historicalCount: 446 });
    expect(help.squareCount).toMatchObject({ historicalLabel: '0개', historicalCount: 621 });
    expect(help.multiple5).toMatchObject({ historicalLabel: '1개', historicalCount: 525 });
    expect(help.multiples).toMatchObject({
      title: '3·4·5의 배수',
      historicalHeading: '과거 1등번호에서 가장 자주 나온 배수 구성',
    });
    expect(help.carryCount).toMatchObject({ historicalLabel: '1개', historicalCount: 524 });
    expect(help.neighborCount).toMatchObject({
      historicalLabel: '제외 1개 · 포함 2개',
      historicalCount: 489,
    });
    expect(help.consecutivePattern).toMatchObject({ historicalLabel: '없음', historicalCount: 599 });
    expect(help.band40To45).toMatchObject({ historicalLabel: '1개', historicalCount: 526 });
    expect(help.numberBands).toMatchObject({
      title: '번호대별 개수',
      historicalHeading: '과거 1등번호에서 가장 자주 나온 번호대 구성',
    });
    expect(help.pastRanks.historicalHeading).toBe('비교 기준');
    expect(help.sameEnding.sourceLabel).toBe('1~1,239회 본번호 · 1,239개 조합');
  });
});
