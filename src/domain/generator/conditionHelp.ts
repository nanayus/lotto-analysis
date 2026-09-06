import type { LottoHistoryDraw } from '@/domain/analytics/types';

import {
  buildGeneratorRangePresets,
  calculateCombinationMetrics,
  cloneGeneratorConditions,
  CONSECUTIVE_LABELS,
  SAME_ENDING_LABELS,
} from './combinationGenerator';
import type {
  ConsecutivePattern,
  CountValue,
  GeneratorConditions,
  GeneratorSectionKey,
  NumberBandKey,
  SameEndingPattern,
} from './types';

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
  suggestion: ConditionHelpSuggestion | null;
  title: string;
};

export type ConditionHelpSuggestion =
  | { kind: 'fixedNumber'; number: number }
  | { field: 'standardDeviation' | 'sum' | 'lastDigitSum'; kind: 'range'; max: number; min: number }
  | {
    field: 'sameEndingPatterns' | 'consecutivePatterns' | 'oddCounts' | 'highLowCounts' | 'acValues'
      | 'primeCounts' | 'squareCounts' | 'compositeCounts';
    kind: 'singleValue';
    section: GeneratorSectionKey;
    value: number | SameEndingPattern | ConsecutivePattern;
  }
  | { kind: 'multipleCount'; multiple: 3 | 4 | 5; section: GeneratorSectionKey; value: CountValue }
  | { band: NumberBandKey; kind: 'bandCount'; section: GeneratorSectionKey; value: CountValue }
  | { field: 'carry' | 'neighbor'; kind: 'recentCount'; section: GeneratorSectionKey; withBonus: CountValue; withoutBonus: CountValue };

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

function countValue(value: number) {
  return Math.max(0, Math.min(6, value)) as CountValue;
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
    suggestion = null,
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
    suggestion?: ConditionHelpSuggestion | null;
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
      suggestion,
      title,
    };
  };

  const countItem = (
    title: string,
    description: string,
    example: string,
    top: [number, number] | undefined,
    suggestion: ConditionHelpSuggestion | null,
  ) => item({
    description,
    example,
    historicalCount: top?.[1] ?? 0,
    historicalLabel: top ? `${top[0]}개` : '데이터 없음',
    suggestion: top ? suggestion : null,
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
      suggestion: topNumber ? { kind: 'fixedNumber', number: topNumber[0] } : null,
    }),
    sameEnding: item({
      title: '동끝수 형태',
      description: '6개 번호를 일의자리별로 묶어, 같은 끝자리가 몇 개씩 겹치는지 나타냅니다. 선택한 형태와 정확히 일치하는 조합만 허용해요.',
      example: '예: 3, 13, 22, 32, 41, 45 → 2수 2쌍 (3·13 / 22·32)',
      historicalLabel: sameEnding ? SAME_ENDING_LABELS[sameEnding[0]] : '데이터 없음',
      historicalCount: sameEnding?.[1] ?? 0,
      suggestion: sameEnding ? { field: 'sameEndingPatterns', kind: 'singleValue', section: 'sameEnding', value: sameEnding[0] } : null,
    }),
    standardDeviation: item({
      title: '표준편차',
      description: '6개 번호가 평균에서 얼마나 퍼져 있는지를 모집단 표준편차로 계산합니다. 값이 작으면 번호가 모여 있고, 크면 넓게 퍼져 있어요.',
      example: '예: 10.0~15.0을 선택하면 원래 계산값이 양끝을 포함해 이 범위인 조합만 허용합니다.',
      historicalLabel: history.length ? `${rangePresets.standardDeviation.min.toFixed(1)}~${rangePresets.standardDeviation.max.toFixed(1)}` : '데이터 없음',
      historicalCount: rangePresets.standardDeviation.count,
      suggestion: history.length ? { field: 'standardDeviation', kind: 'range', min: rangePresets.standardDeviation.min, max: rangePresets.standardDeviation.max } : null,
    }),
    sum: item({
      title: '번호 총합',
      description: '선택된 6개 번호를 모두 더한 값입니다. 설정한 최솟값과 최댓값을 모두 포함해 판정해요.',
      example: '예: 3, 7, 12, 19, 34, 45의 번호 총합은 120입니다.',
      historicalLabel: history.length ? `${rangePresets.sum.min}~${rangePresets.sum.max}` : '데이터 없음',
      historicalCount: rangePresets.sum.count,
      suggestion: history.length ? { field: 'sum', kind: 'range', min: rangePresets.sum.min, max: rangePresets.sum.max } : null,
    }),
    lastDigitSum: item({
      title: '끝수 총합',
      description: '각 번호의 일의자리만 더한 값입니다. 10, 20, 30, 40의 끝수는 모두 0으로 계산해요.',
      example: '예: 3, 7, 12, 19, 34, 45 → 3+7+2+9+4+5 = 30',
      historicalLabel: history.length ? `${rangePresets.lastDigitSum.min}~${rangePresets.lastDigitSum.max}` : '데이터 없음',
      historicalCount: rangePresets.lastDigitSum.count,
      suggestion: history.length ? { field: 'lastDigitSum', kind: 'range', min: rangePresets.lastDigitSum.min, max: rangePresets.lastDigitSum.max } : null,
    }),
    oddEven: item({
      title: '홀짝 비율',
      description: '6개 번호 중 홀수와 짝수가 각각 몇 개인지를 홀수:짝수 순서로 표시합니다. 여러 비율을 선택하면 그중 하나만 만족해도 돼요.',
      example: '예: 3:3은 홀수 3개와 짝수 3개를 의미합니다.',
      historicalLabel: odd ? `${odd[0]}:${6 - odd[0]}` : '데이터 없음',
      historicalCount: odd?.[1] ?? 0,
      suggestion: odd ? { field: 'oddCounts', kind: 'singleValue', section: 'oddEven', value: odd[0] } : null,
    }),
    lowHigh: item({
      title: '저고 비율',
      description: '1~22를 저번호, 23~45를 고번호로 나눠 저번호:고번호 순서로 표시합니다. 여러 비율을 함께 선택할 수 있어요.',
      example: '예: 4:2는 저번호 4개와 고번호 2개를 의미합니다.',
      historicalLabel: low ? `${low[0]}:${6 - low[0]}` : '데이터 없음',
      historicalCount: low?.[1] ?? 0,
      suggestion: low ? { field: 'highLowCounts', kind: 'singleValue', section: 'lowHigh', value: low[0] } : null,
    }),
    acValue: item({
      title: 'A/C 값',
      description: '6개 번호의 모든 두 수 차이 15개에서 중복을 제거한 차이값 개수에 5를 뺀 값입니다. 값이 클수록 차이 간격이 더 다양해요.',
      example: '계산식: A/C = 서로 다른 차이값 개수 - 5. 여러 값을 선택하면 그중 하나만 만족해도 됩니다.',
      historicalLabel: acValue ? String(acValue[0]) : '데이터 없음',
      historicalCount: acValue?.[1] ?? 0,
      suggestion: acValue ? { field: 'acValues', kind: 'singleValue', section: 'acValue', value: acValue[0] } : null,
    }),
    primeCount: countItem(
      '소수 개수',
      '1과 자기 자신으로만 나누어지는 소수가 6개 번호에 몇 개 포함되는지를 셉니다. 1은 소수가 아니에요.',
      '1~45의 소수: 2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43',
      primeCount,
      primeCount ? { field: 'primeCounts', kind: 'singleValue', section: 'primeCount', value: primeCount[0] } : null,
    ),
    squareCount: countItem(
      '완전제곱수 개수',
      '자연수 n의 제곱인 번호가 몇 개 포함되는지를 셉니다.',
      '1~45에서 사용하는 완전제곱수: 4, 9, 16, 25, 36',
      squareCount,
      squareCount ? { field: 'squareCounts', kind: 'singleValue', section: 'squareCount', value: squareCount[0] } : null,
    ),
    compositeCount: countItem(
      '합성수 개수',
      '1보다 크면서 소수가 아닌 번호가 몇 개 포함되는지를 셉니다. 1은 소수와 합성수 어느 쪽에도 포함되지 않아요.',
      '예: 4, 6, 8, 9, 10은 합성수이며 완전제곱수·배수 조건과 중복 집계될 수 있습니다.',
      compositeCount,
      compositeCount ? { field: 'compositeCounts', kind: 'singleValue', section: 'compositeCount', value: compositeCount[0] } : null,
    ),
    multiple3: countItem('3의 배수', '3으로 나누어떨어지는 번호의 개수를 셉니다.', '예: 3, 6, 9, 12, 15 … 45', multiple3, multiple3 ? { kind: 'multipleCount', multiple: 3, section: 'multiple3', value: countValue(multiple3[0]) } : null),
    multiple4: countItem('4의 배수', '4로 나누어떨어지는 번호의 개수를 셉니다.', '예: 4, 8, 12, 16, 20 … 44', multiple4, multiple4 ? { kind: 'multipleCount', multiple: 4, section: 'multiple4', value: countValue(multiple4[0]) } : null),
    multiple5: countItem('5의 배수', '5로 나누어떨어지는 번호의 개수를 셉니다.', '예: 5, 10, 15, 20, 25 … 45', multiple5, multiple5 ? { kind: 'multipleCount', multiple: 5, section: 'multiple5', value: countValue(multiple5[0]) } : null),
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
      suggestion: previousMain.carry && previousWithBonus.carry ? {
        field: 'carry', kind: 'recentCount', section: 'carryCount',
        withBonus: countValue(previousWithBonus.carry[0]), withoutBonus: countValue(previousMain.carry[0]),
      } : null,
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
      suggestion: previousMain.neighbor && previousWithBonus.neighbor ? {
        field: 'neighbor', kind: 'recentCount', section: 'neighborCount',
        withBonus: countValue(previousWithBonus.neighbor[0]), withoutBonus: countValue(previousMain.neighbor[0]),
      } : null,
    }),
    consecutivePattern: item({
      title: '연번 형태',
      description: '숫자가 1씩 이어지는 연속 그룹을 최대 그룹 단위로 분류합니다. 서로 떨어진 연속 그룹은 혼합 형태로 표시해요.',
      example: '예: 5, 6, 12, 13, 22, 40 → 2연번 2회. 5, 6, 7, 20, 21, 40 → 3연번 1회 + 2연번 1회',
      historicalLabel: consecutive ? CONSECUTIVE_LABELS[consecutive[0]] : '데이터 없음',
      historicalCount: consecutive?.[1] ?? 0,
      suggestion: consecutive ? { field: 'consecutivePatterns', kind: 'singleValue', section: 'consecutivePattern', value: consecutive[0] } : null,
    }),
    band1To9: countItem('1-9 번호대', '1부터 9까지의 번호가 조합에 몇 개 포함될지 설정합니다.', '해당 번호: 1, 2, 3, 4, 5, 6, 7, 8, 9', band1To9, band1To9 ? { band: '1-9', kind: 'bandCount', section: 'band1To9', value: countValue(band1To9[0]) } : null),
    band10To19: countItem('10-19 번호대', '10부터 19까지의 번호가 조합에 몇 개 포함될지 설정합니다.', '해당 번호: 10~19', band10To19, band10To19 ? { band: '10-19', kind: 'bandCount', section: 'band10To19', value: countValue(band10To19[0]) } : null),
    band20To29: countItem('20-29 번호대', '20부터 29까지의 번호가 조합에 몇 개 포함될지 설정합니다.', '해당 번호: 20~29', band20To29, band20To29 ? { band: '20-29', kind: 'bandCount', section: 'band20To29', value: countValue(band20To29[0]) } : null),
    band30To39: countItem('30-39 번호대', '30부터 39까지의 번호가 조합에 몇 개 포함될지 설정합니다.', '해당 번호: 30~39', band30To39, band30To39 ? { band: '30-39', kind: 'bandCount', section: 'band30To39', value: countValue(band30To39[0]) } : null),
    band40To45: countItem('40-45 번호대', '40부터 45까지의 번호가 조합에 몇 개 포함될지 설정합니다.', '해당 번호: 40, 41, 42, 43, 44, 45', band40To45, band40To45 ? { band: '40-45', kind: 'bandCount', section: 'band40To45', value: countValue(band40To45[0]) } : null),
    pastRanks: item({
      title: '과거 등수 조합 제외',
      description: '과거 전체 회차에서 1등·2등·3등 기록과 같은 후보 조합을 생성 대상에서 제외합니다.',
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

export function describeConditionHelpSuggestion(
  content: ConditionHelpContent,
  conditions: GeneratorConditions,
) {
  const suggestion = content.suggestion;
  if (!suggestion) return null;
  if (suggestion.kind === 'fixedNumber') {
    return `${suggestion.number}번을 고정수로 반영합니다.`;
  }
  if (suggestion.kind === 'recentCount') {
    const current = conditions[suggestion.field];
    const value = current.includeBonus ? suggestion.withBonus : suggestion.withoutBonus;
    return `현재 보너스 ${current.includeBonus ? '포함' : '제외'} 기준 ${value}개를 ${content.title} 조건에 반영합니다.`;
  }
  return `과거 최다값 “${content.historicalLabel}”으로 ${content.title} 조건을 설정합니다.`;
}

export function applyConditionHelpSuggestion(
  conditions: GeneratorConditions,
  suggestion: ConditionHelpSuggestion,
) {
  const next = cloneGeneratorConditions(conditions);
  if (suggestion.kind === 'fixedNumber') {
    next.enabledSections = { ...next.enabledSections, fixedExcluded: true };
    next.excludedNumbers = next.excludedNumbers.filter((number) => number !== suggestion.number);
    if (!next.fixedNumbers.includes(suggestion.number) && next.fixedNumbers.length < 6) {
      next.fixedNumbers = [...next.fixedNumbers, suggestion.number].sort((left, right) => left - right);
    }
    return next;
  }
  if (suggestion.kind === 'range') {
    next[suggestion.field] = { enabled: true, min: suggestion.min, max: suggestion.max };
    return next;
  }

  next.enabledSections = { ...next.enabledSections, [suggestion.section]: true };
  if (suggestion.kind === 'singleValue') {
    switch (suggestion.field) {
      case 'sameEndingPatterns': next.sameEndingPatterns = [suggestion.value as SameEndingPattern]; break;
      case 'consecutivePatterns': next.consecutivePatterns = [suggestion.value as ConsecutivePattern]; break;
      case 'oddCounts': next.oddCounts = [suggestion.value as CountValue]; break;
      case 'highLowCounts': next.highLowCounts = [suggestion.value as CountValue]; break;
      case 'acValues': next.acValues = [suggestion.value as number]; break;
      case 'primeCounts': next.primeCounts = [suggestion.value as CountValue]; break;
      case 'squareCounts': next.squareCounts = [suggestion.value as CountValue]; break;
      case 'compositeCounts': next.compositeCounts = [suggestion.value as CountValue]; break;
    }
  } else if (suggestion.kind === 'multipleCount') {
    next.multipleCounts[suggestion.multiple] = [suggestion.value];
  } else if (suggestion.kind === 'bandCount') {
    next.bandCounts[suggestion.band] = [suggestion.value];
  } else {
    const current = next[suggestion.field];
    next[suggestion.field] = {
      ...current,
      allowed: [current.includeBonus ? suggestion.withBonus : suggestion.withoutBonus],
    };
  }
  return next;
}
