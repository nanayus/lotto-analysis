import type { LottoHistoryDraw } from '@/domain/analytics/types';

import {
  buildGeneratorRangePresets,
  calculateCombinationMetrics,
  CONSECUTIVE_LABELS,
  SAME_ENDING_LABELS,
} from './combinationGenerator';

export type ConditionHelpKey =
  | 'fixedExcluded'
  | 'sameEnding'
  | 'standardDeviation'
  | 'sum'
  | 'lastDigitSum'
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

export type ConditionHelpContent = {
  description: string;
  example: string;
  historicalCount: number;
  historicalDetail: string;
  historicalHeading: string;
  historicalLabel: string;
  historicalPercentage: number;
  sourceLabel: string;
  title: string;
};

export type ConditionHelpMap = Record<ConditionHelpKey, ConditionHelpContent>;

const helpCache = new WeakMap<readonly LottoHistoryDraw[], ConditionHelpMap>();

function mostFrequent<T extends string | number>(values: readonly T[]) {
  const counts = new Map<T, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()].sort((left, right) => (
    right[1] - left[1] || String(left[0]).localeCompare(String(right[0]), 'ko', { numeric: true })
  ))[0];
}

function percentage(count: number, total: number) {
  return total ? Number(((count / total) * 100).toFixed(1)) : 0;
}

export function buildConditionHelp(history: readonly LottoHistoryDraw[]): ConditionHelpMap {
  const cached = helpCache.get(history);
  if (cached) return cached;

  const sortedHistory = [...history].sort((left, right) => left.round - right.round);
  const metrics = history.map((draw) => calculateCombinationMetrics(draw.numbers, history, undefined, false));
  const rounds = history.map((draw) => draw.round);
  const sourceLabel = history.length
    ? `${Math.min(...rounds).toLocaleString('ko-KR')}~${Math.max(...rounds).toLocaleString('ko-KR')}회 본번호 · ${history.length.toLocaleString('ko-KR')}개 조합`
    : '과거 본번호 데이터 없음';
  const previousSourceLabel = sortedHistory.length > 1
    ? `${sortedHistory[1].round.toLocaleString('ko-KR')}~${sortedHistory.at(-1)!.round.toLocaleString('ko-KR')}회 · 직전 회차와 ${Math.max(0, sortedHistory.length - 1).toLocaleString('ko-KR')}번 비교`
    : '직전 회차 비교 데이터 없음';

  const topNumber = mostFrequent(history.flatMap((draw) => draw.numbers));
  const sameEnding = mostFrequent(metrics.map((metric) => metric.sameEndingPattern));
  const rangePresets = buildGeneratorRangePresets(history);
  const odd = mostFrequent(metrics.map((metric) => metric.oddCount));
  const low = mostFrequent(metrics.map((metric) => metric.lowCount));
  const acValue = mostFrequent(metrics.map((metric) => metric.acValue));
  const primeCount = mostFrequent(metrics.map((metric) => metric.primeCount));
  const squareCount = mostFrequent(metrics.map((metric) => metric.squareCount));
  const compositeCount = mostFrequent(metrics.map((metric) => metric.compositeCount));
  const multiple3 = mostFrequent(metrics.map((metric) => metric.multipleCounts[3]));
  const multiple4 = mostFrequent(metrics.map((metric) => metric.multipleCounts[4]));
  const multiple5 = mostFrequent(metrics.map((metric) => metric.multipleCounts[5]));
  const consecutive = mostFrequent(metrics.map((metric) => metric.consecutivePattern));
  const band1To9 = mostFrequent(metrics.map((metric) => metric.bandCounts['1-9']));
  const band10To19 = mostFrequent(metrics.map((metric) => metric.bandCounts['10-19']));
  const band20To29 = mostFrequent(metrics.map((metric) => metric.bandCounts['20-29']));
  const band30To39 = mostFrequent(metrics.map((metric) => metric.bandCounts['30-39']));
  const band40To45 = mostFrequent(metrics.map((metric) => metric.bandCounts['40-45']));

  const previousCounts = (includeBonus: boolean) => {
    const carry: number[] = [];
    const neighbor: number[] = [];
    for (let index = 1; index < sortedHistory.length; index += 1) {
      const previous = sortedHistory[index - 1];
      const current = sortedHistory[index];
      const base = [...previous.numbers, ...(includeBonus ? [previous.bonus] : [])];
      const carrySet = new Set(base);
      const neighborSet = new Set<number>();
      base.forEach((number) => {
        if (number > 1) neighborSet.add(number - 1);
        if (number < 45) neighborSet.add(number + 1);
      });
      carry.push(current.numbers.filter((number) => carrySet.has(number)).length);
      neighbor.push(current.numbers.filter((number) => neighborSet.has(number)).length);
    }
    return { carry: mostFrequent(carry), neighbor: mostFrequent(neighbor), total: carry.length };
  };
  const previousMain = previousCounts(false);
  const previousWithBonus = previousCounts(true);

  const item = ({
    description,
    denominator = history.length,
    example,
    historicalCount,
    historicalDetail,
    historicalHeading = '과거 1등번호에서 가장 자주 나온 값',
    historicalLabel,
    itemSourceLabel = sourceLabel,
    title,
  }: {
    denominator?: number;
    description: string;
    example: string;
    historicalCount: number;
    historicalDetail?: string;
    historicalHeading?: string;
    historicalLabel: string;
    itemSourceLabel?: string;
    title: string;
  }): ConditionHelpContent => {
    const historicalPercentage = percentage(historicalCount, denominator);
    return {
      description,
      example,
      historicalCount,
      historicalDetail: historicalDetail ?? `${historicalCount.toLocaleString('ko-KR')}회 · ${historicalPercentage.toFixed(1)}%`,
      historicalHeading,
      historicalLabel,
      historicalPercentage,
      sourceLabel: itemSourceLabel,
      title,
    };
  };

  const countItem = (
    title: string,
    description: string,
    example: string,
    top: [number, number] | undefined,
  ) => item({
    description,
    example,
    historicalCount: top?.[1] ?? 0,
    historicalLabel: top ? `${top[0]}개` : '데이터 없음',
    title,
  });

  const result: ConditionHelpMap = {
    fixedExcluded: item({
      title: '고정수 · 제외수',
      description: '고정수는 생성되는 모든 조합에 반드시 포함되고, 제외수는 어떤 경우에도 포함되지 않습니다. 같은 번호를 양쪽에 동시에 둘 수 없으며 고정수는 최대 6개예요.',
      example: '예: 7을 고정하고 12를 제외하면 모든 결과에 7이 들어가고 12는 나오지 않습니다.',
      historicalLabel: topNumber ? `${topNumber[0]}번` : '데이터 없음',
      historicalCount: topNumber?.[1] ?? 0,
      historicalHeading: '과거 1등 본번호에서 가장 자주 나온 번호',
    }),
    sameEnding: item({
      title: '동끝수 형태',
      description: '6개 번호를 일의자리별로 묶어, 같은 끝자리가 몇 개씩 겹치는지 나타냅니다. 선택한 형태와 정확히 일치하는 조합만 허용해요.',
      example: '예: 3, 13, 22, 32, 41, 45 → 2수 2쌍 (3·13 / 22·32)',
      historicalLabel: sameEnding ? SAME_ENDING_LABELS[sameEnding[0]] : '데이터 없음',
      historicalCount: sameEnding?.[1] ?? 0,
    }),
    standardDeviation: item({
      title: '표준편차',
      description: '6개 번호가 평균에서 얼마나 퍼져 있는지를 모집단 표준편차로 계산합니다. 값이 작으면 번호가 모여 있고, 크면 넓게 퍼져 있어요.',
      example: '예: 10.0~15.0을 선택하면 원래 계산값이 양끝을 포함해 이 범위인 조합만 허용합니다.',
      historicalLabel: history.length ? `${rangePresets.standardDeviation.min.toFixed(1)}~${rangePresets.standardDeviation.max.toFixed(1)}` : '데이터 없음',
      historicalCount: rangePresets.standardDeviation.count,
    }),
    sum: item({
      title: '번호 총합',
      description: '선택된 6개 번호를 모두 더한 값입니다. 설정한 최솟값과 최댓값을 모두 포함해 판정해요.',
      example: '예: 3, 7, 12, 19, 34, 45의 번호 총합은 120입니다.',
      historicalLabel: history.length ? `${rangePresets.sum.min}~${rangePresets.sum.max}` : '데이터 없음',
      historicalCount: rangePresets.sum.count,
    }),
    lastDigitSum: item({
      title: '끝수 총합',
      description: '각 번호의 일의자리만 더한 값입니다. 10, 20, 30, 40의 끝수는 모두 0으로 계산해요.',
      example: '예: 3, 7, 12, 19, 34, 45 → 3+7+2+9+4+5 = 30',
      historicalLabel: history.length ? `${rangePresets.lastDigitSum.min}~${rangePresets.lastDigitSum.max}` : '데이터 없음',
      historicalCount: rangePresets.lastDigitSum.count,
    }),
    oddEven: item({
      title: '홀짝 비율',
      description: '6개 번호 중 홀수와 짝수가 각각 몇 개인지를 홀수:짝수 순서로 표시합니다. 여러 비율을 선택하면 그중 하나만 만족해도 돼요.',
      example: '예: 3:3은 홀수 3개와 짝수 3개를 의미합니다.',
      historicalLabel: odd ? `${odd[0]}:${6 - odd[0]}` : '데이터 없음',
      historicalCount: odd?.[1] ?? 0,
    }),
    lowHigh: item({
      title: '저고 비율',
      description: '1~22를 저번호, 23~45를 고번호로 나눠 저번호:고번호 순서로 표시합니다. 여러 비율을 함께 선택할 수 있어요.',
      example: '예: 4:2는 저번호 4개와 고번호 2개를 의미합니다.',
      historicalLabel: low ? `${low[0]}:${6 - low[0]}` : '데이터 없음',
      historicalCount: low?.[1] ?? 0,
    }),
    acValue: item({
      title: 'A/C 값',
      description: '6개 번호의 모든 두 수 차이 15개에서 중복을 제거한 차이값 개수에 5를 뺀 값입니다. 값이 클수록 차이 간격이 더 다양해요.',
      example: '계산식: A/C = 서로 다른 차이값 개수 - 5. 여러 값을 선택하면 그중 하나만 만족해도 됩니다.',
      historicalLabel: acValue ? String(acValue[0]) : '데이터 없음',
      historicalCount: acValue?.[1] ?? 0,
    }),
    primeCount: countItem(
      '소수 개수',
      '1과 자기 자신으로만 나누어지는 소수가 6개 번호에 몇 개 포함되는지를 셉니다. 1은 소수가 아니에요.',
      '1~45의 소수: 2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43',
      primeCount,
    ),
    squareCount: countItem(
      '완전제곱수 개수',
      '자연수 n의 제곱인 번호가 몇 개 포함되는지를 셉니다.',
      '1~45에서 사용하는 완전제곱수: 4, 9, 16, 25, 36',
      squareCount,
    ),
    compositeCount: countItem(
      '합성수 개수',
      '1보다 크면서 소수가 아닌 번호가 몇 개 포함되는지를 셉니다. 1은 소수와 합성수 어느 쪽에도 포함되지 않아요.',
      '예: 4, 6, 8, 9, 10은 합성수이며 완전제곱수·배수 조건과 중복 집계될 수 있습니다.',
      compositeCount,
    ),
    multiple3: countItem('3의 배수', '3으로 나누어떨어지는 번호의 개수를 셉니다.', '예: 3, 6, 9, 12, 15 … 45', multiple3),
    multiple4: countItem('4의 배수', '4로 나누어떨어지는 번호의 개수를 셉니다.', '예: 4, 8, 12, 16, 20 … 44', multiple4),
    multiple5: countItem('5의 배수', '5로 나누어떨어지는 번호의 개수를 셉니다.', '예: 5, 10, 15, 20, 25 … 45', multiple5),
    carryCount: item({
      title: '이월수 개수',
      description: '직전 회차 번호와 이번 후보 조합에 공통으로 들어 있는 번호의 개수입니다. 보너스 포함을 켜면 직전 보너스도 비교 집합에 추가해요.',
      example: '직전 본번호가 3, 7, 12, 19, 34, 45이고 후보에 7과 34가 있으면 이월수는 2개입니다.',
      historicalLabel: previousMain.carry ? `${previousMain.carry[0]}개` : '데이터 없음',
      historicalCount: previousMain.carry?.[1] ?? 0,
      denominator: previousMain.total,
      historicalDetail: previousMain.carry && previousWithBonus.carry
        ? `보너스 제외 ${previousMain.carry[1].toLocaleString('ko-KR')}회 · ${percentage(previousMain.carry[1], previousMain.total).toFixed(1)}% / 포함 ${previousWithBonus.carry[1].toLocaleString('ko-KR')}회 · ${percentage(previousWithBonus.carry[1], previousWithBonus.total).toFixed(1)}%`
        : undefined,
      historicalHeading: '직전 회차와 비교했을 때 가장 자주 나온 개수',
      itemSourceLabel: previousSourceLabel,
    }),
    neighborCount: item({
      title: '이웃수 개수',
      description: '직전 회차 기준 번호의 앞뒤 번호(±1) 중 후보 조합에 포함된 개수입니다. 1~45만 사용하고 겹치는 이웃수는 한 번만 셉니다.',
      example: '직전 번호 10의 이웃수는 9와 11입니다. 보너스 포함 여부는 이월수와 별도로 설정해요.',
      historicalLabel: previousMain.neighbor && previousWithBonus.neighbor
        ? `제외 ${previousMain.neighbor[0]}개 · 포함 ${previousWithBonus.neighbor[0]}개`
        : '데이터 없음',
      historicalCount: previousMain.neighbor?.[1] ?? 0,
      denominator: previousMain.total,
      historicalDetail: previousMain.neighbor && previousWithBonus.neighbor
        ? `보너스 제외 ${previousMain.neighbor[1].toLocaleString('ko-KR')}회 · ${percentage(previousMain.neighbor[1], previousMain.total).toFixed(1)}% / 포함 ${previousWithBonus.neighbor[1].toLocaleString('ko-KR')}회 · ${percentage(previousWithBonus.neighbor[1], previousWithBonus.total).toFixed(1)}%`
        : undefined,
      historicalHeading: '직전 회차와 비교했을 때 가장 자주 나온 개수',
      itemSourceLabel: previousSourceLabel,
    }),
    consecutivePattern: item({
      title: '연번 형태',
      description: '숫자가 1씩 이어지는 연속 그룹을 최대 그룹 단위로 분류합니다. 서로 떨어진 연속 그룹은 혼합 형태로 표시해요.',
      example: '예: 5, 6, 12, 13, 22, 40 → 2연번 2회. 5, 6, 7, 20, 21, 40 → 3연번 1회 + 2연번 1회',
      historicalLabel: consecutive ? CONSECUTIVE_LABELS[consecutive[0]] : '데이터 없음',
      historicalCount: consecutive?.[1] ?? 0,
    }),
    band1To9: countItem('1-9 번호대', '1부터 9까지의 번호가 조합에 몇 개 포함될지 설정합니다.', '해당 번호: 1, 2, 3, 4, 5, 6, 7, 8, 9', band1To9),
    band10To19: countItem('10-19 번호대', '10부터 19까지의 번호가 조합에 몇 개 포함될지 설정합니다.', '해당 번호: 10~19', band10To19),
    band20To29: countItem('20-29 번호대', '20부터 29까지의 번호가 조합에 몇 개 포함될지 설정합니다.', '해당 번호: 20~29', band20To29),
    band30To39: countItem('30-39 번호대', '30부터 39까지의 번호가 조합에 몇 개 포함될지 설정합니다.', '해당 번호: 30~39', band30To39),
    band40To45: countItem('40-45 번호대', '40부터 45까지의 번호가 조합에 몇 개 포함될지 설정합니다.', '해당 번호: 40, 41, 42, 43, 44, 45', band40To45),
    pastRanks: item({
      title: '과거 등수 조합 제외',
      description: '과거 전체 회차와 비교해 1등·2등·3등 상당으로 이미 등장한 후보 조합을 생성 대상에서 제외합니다.',
      example: '1등은 본번호 6개 일치, 2등은 본번호 5개와 보너스 일치, 3등은 본번호 5개 일치로 판정합니다.',
      historicalLabel: `${history.length.toLocaleString('ko-KR')}개 회차와 비교`,
      historicalCount: history.length,
      historicalDetail: '선택한 등수의 과거 일치 조합을 생성 후보에서 제외',
      historicalHeading: '비교 기준',
    }),
  };

  helpCache.set(history, result);
  return result;
}
