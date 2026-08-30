import type { LottoHistoryDraw } from './types';

export type OverallNumberFrequency = {
  count: number;
  number: number;
};

export type OverallStatistics = {
  averageEvenCount: number;
  averageOddCount: number;
  averageSum: number;
  drawCount: number;
  firstRound: number;
  latestRound: number;
  topNumbers: OverallNumberFrequency[];
};

export function buildOverallStatistics(history: readonly LottoHistoryDraw[]): OverallStatistics {
  if (!history.length) {
    return {
      averageEvenCount: 0,
      averageOddCount: 0,
      averageSum: 0,
      drawCount: 0,
      firstRound: 0,
      latestRound: 0,
      topNumbers: [],
    };
  }

  const counts = Array.from({ length: 46 }, () => 0);
  let oddTotal = 0;
  let sumTotal = 0;
  history.forEach((draw) => {
    draw.numbers.forEach((number) => {
      counts[number] += 1;
      if (number % 2) oddTotal += 1;
      sumTotal += number;
    });
  });
  const topNumbers = counts
    .map((count, number) => ({ count, number }))
    .slice(1)
    .sort((left, right) => right.count - left.count || left.number - right.number)
    .slice(0, 6);
  const averageOddCount = oddTotal / history.length;

  return {
    averageEvenCount: 6 - averageOddCount,
    averageOddCount,
    averageSum: sumTotal / history.length,
    drawCount: history.length,
    firstRound: Math.min(...history.map((draw) => draw.round)),
    latestRound: Math.max(...history.map((draw) => draw.round)),
    topNumbers,
  };
}
