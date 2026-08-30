import { act, fireEvent, render } from '@testing-library/react-native';
import { describe, expect, jest, test } from '@jest/globals';
import { StyleSheet } from 'react-native';

import type { CombinationAnalysis } from '@/domain/combination/types';

import { CombinationResult } from '../CombinationResult';

const analysis: CombinationAnalysis = {
  activeDrawCount: 10,
  conditionMetrics: {
    acValue: 7,
    bandCounts: { '1-9': 2, '10-19': 2, '20-29': 2, '30-39': 0, '40-45': 0 },
    carryCount: 1,
    compositeCount: 3,
    consecutivePattern: '2',
    highCount: 2,
    lastDigitSum: 25,
    lowCount: 4,
    multipleCounts: { 3: 2, 4: 3, 5: 2 },
    neighborCount: 2,
    oddCount: 3,
    pastPrizeRanks: [],
    primeCount: 2,
    sameEndingPattern: '2',
    squareCount: 1,
    standardDeviation: 8.5,
    sum: 85,
  },
  filters: {
    includeBonus: false,
    period: { kind: 'preset', label: '전체' },
  },
  groupFrequency: {
    differencePct: 1.2,
    overallAverage: 4.5,
    selectedAverage: 4.6,
  },
  highestMainMatch: 3,
  individualNumbers: [
    { appearanceCount: 136, appearanceRank: 45, number: 1 },
    { appearanceCount: 179, appearanceRank: 4, number: 7 },
    { appearanceCount: 177, appearanceRank: 5, number: 12 },
    { appearanceCount: 170, appearanceRank: 15, number: 19 },
    { appearanceCount: 145, appearanceRank: 43, number: 20 },
    { appearanceCount: 144, appearanceRank: 44, number: 26 },
  ],
  matchDistribution: { 0: 2, 1: 4, 2: 4, 3: 0, 4: 0, 5: 0, 6: 0 },
  numbers: [1, 7, 12, 19, 20, 26],
  prizeCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 1 },
  qualifyingHistory: [{
    bonus: 26,
    bonusMatched: true,
    mainMatchCount: 3,
    matchedMainNumbers: [1, 7, 12],
    numbers: [1, 7, 12, 33, 40, 45],
    prizeRank: 5,
    round: 98,
  }],
  recentMeaningfulMatch: {
    bonus: 26,
    bonusMatched: true,
    mainMatchCount: 3,
    matchedMainNumbers: [1, 7, 12],
    numbers: [1, 7, 12, 33, 40, 45],
    prizeRank: 5,
    round: 98,
  },
  sameSixCount: 0,
  shape: {
    consecutiveGroups: [[19, 20]],
    evenCount: 3,
    oddCount: 3,
    sum: 85,
  },
  subCombinations: {
    2: [
      { appearanceCount: 8, latestRound: 100, numbers: [1, 7] },
      { appearanceCount: 7, latestRound: 99, numbers: [12, 19] },
      { appearanceCount: 6, latestRound: 98, numbers: [19, 20] },
      { appearanceCount: 5, latestRound: 97, numbers: [20, 26] },
      { appearanceCount: 0, latestRound: null, numbers: [1, 26] },
    ],
    3: [
      { appearanceCount: 3, latestRound: 98, numbers: [1, 7, 12] },
      { appearanceCount: 2, latestRound: 97, numbers: [7, 12, 19] },
      { appearanceCount: 1, latestRound: 96, numbers: [12, 19, 20] },
      { appearanceCount: 0, latestRound: null, numbers: [1, 20, 26] },
    ],
    4: [
      { appearanceCount: 1, latestRound: 97, numbers: [1, 7, 12, 19] },
    ],
    5: [],
    6: [],
  },
};

describe('CombinationResult', () => {
  test('sorts number bars by appearance count and scales them from zero', async () => {
    const { getAllByTestId, getByTestId, getByText } = await render(
      <CombinationResult
        analysis={analysis}
        bonusIncluded={false}
        firstRound={1}
        latestRound={100}
        onBonusChange={() => undefined}
        onCompare={() => undefined}
        onOpenHistory={() => undefined}
        onOpenPrizeRank={() => undefined}
        onPeriodChange={() => undefined}
        onStartOver={() => undefined}
        period={{ kind: 'preset', label: '전체' }}
      />,
    );

    expect(
      getAllByTestId(/^individual-number-row-/).map((row) => row.props.testID),
    ).toEqual([
      'individual-number-row-7',
      'individual-number-row-12',
      'individual-number-row-19',
      'individual-number-row-20',
      'individual-number-row-26',
      'individual-number-row-1',
    ]);
    expect(StyleSheet.flatten(getByTestId('individual-number-bar-7').props.style).width)
      .toBe('100%');
    expect(
      Number.parseFloat(StyleSheet.flatten(
        getByTestId('individual-number-bar-1').props.style,
      ).width),
    ).toBeCloseTo((136 / 179) * 100);
    expect(getByText('179회')).toBeTruthy();
    expect(getByText('4위')).toBeTruthy();
  });

  test('shows the selected combination as one compact profile', async () => {
    const onOpenHistory = jest.fn();
    const onCompare = jest.fn();
    const { getByRole, getByTestId, getByText, queryByText } = await render(
      <CombinationResult
        analysis={analysis}
        bonusIncluded={false}
        firstRound={1}
        latestRound={100}
        onBonusChange={() => undefined}
        onCompare={onCompare}
        onOpenHistory={onOpenHistory}
        onOpenPrizeRank={() => undefined}
        onPeriodChange={() => undefined}
        onStartOver={() => undefined}
        period={{ kind: 'preset', label: '전체' }}
      />,
    );

    expect(getByText('조합 분석')).toBeTruthy();
    expect(getByText(/최근 5등/)).toBeTruthy();
    expect(getByText(/홀짝 3:3 · 합계 85/)).toBeTruthy();
    expect(getByRole('button', { name: '분석 기간 전체' })).toBeTruthy();
    expect(getByRole('switch', { name: '보너스 번호 제외' })).toBeTruthy();
    expect(StyleSheet.flatten(getByTestId('analysis-period-chip').props.style)).toMatchObject({
      backgroundColor: 'transparent',
      borderWidth: 0,
    });
    expect(getByText('과거 당첨 기록')).toBeTruthy();
    expect(queryByText('과거 일치 등급 기록')).toBeNull();
    expect(queryByText('HISTORICAL COMPARISON')).toBeNull();
    expect(queryByText('분석 결과')).toBeNull();
    expect(queryByText('분석 조건')).toBeNull();
    expect(queryByText('내 번호')).toBeNull();
    expect(queryByText('과거 최고 일치')).toBeNull();
    expect(getByText('선택 번호 출현 빈도')).toBeTruthy();
    expect(getByText('전체 회차 일치 분포')).toBeTruthy();
    expect(queryByText('과거 당첨번호와 비교한 등급 상당 기록입니다.')).toBeNull();

    await act(async () => {
      fireEvent.press(getByRole('button', { name: '비교할 조합 추가' }));
    });
    await act(async () => {
      fireEvent.press(getByRole('button', { name: '전체 기록' }));
    });

    expect(onCompare).toHaveBeenCalledTimes(1);
    expect(onOpenHistory).toHaveBeenCalledTimes(1);
  });

  test('restores match distribution and group frequency before condition statistics', async () => {
    const { getAllByTestId, getByTestId, getByText } = await render(
      <CombinationResult
        analysis={analysis}
        bonusIncluded={false}
        firstRound={1}
        latestRound={100}
        onBonusChange={() => undefined}
        onCompare={() => undefined}
        onOpenHistory={() => undefined}
        onOpenPrizeRank={() => undefined}
        onPeriodChange={() => undefined}
        onStartOver={() => undefined}
        period={{ kind: 'preset', label: '전체' }}
      />,
    );

    expect(getAllByTestId(/^result-section-/).map((section) => section.props.testID))
      .toEqual([
        'result-section-prize',
        'result-section-match-distribution',
        'result-section-group-frequency',
        'result-section-condition-statistics',
      ]);
    expect(getByTestId('match-distribution-row-2').props.accessibilityLabel)
      .toBe('2개 일치, 4회, 40.0%');
    expect(StyleSheet.flatten(getByTestId('match-distribution-bar-2').props.style).width)
      .toBe('100%');
    expect(StyleSheet.flatten(getByTestId('match-distribution-bar-0').props.style).width)
      .toBe('50%');
    expect(getByText('4.6회')).toBeTruthy();
    expect(getByText('4.5회')).toBeTruthy();
    expect(getByText('전체 평균 대비 +1.2%')).toBeTruthy();
  });

  test('shows zero percentages and zero-width bars when the active period has no draws', async () => {
    const emptyAnalysis: CombinationAnalysis = {
      ...analysis,
      activeDrawCount: 0,
      groupFrequency: {
        differencePct: 0,
        overallAverage: 0,
        selectedAverage: 0,
      },
      matchDistribution: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
    };
    const { getByTestId, getByText } = await render(
      <CombinationResult
        analysis={emptyAnalysis}
        bonusIncluded={false}
        firstRound={1}
        latestRound={100}
        onBonusChange={() => undefined}
        onCompare={() => undefined}
        onOpenHistory={() => undefined}
        onOpenPrizeRank={() => undefined}
        onPeriodChange={() => undefined}
        onStartOver={() => undefined}
        period={{ kind: 'preset', label: '전체' }}
      />,
    );

    ([6, 5, 4, 3, 2, 1, 0] as const).forEach((count) => {
      expect(getByTestId(`match-distribution-row-${count}`).props.accessibilityLabel)
        .toBe(`${count}개 일치, 0회, 0.0%`);
      expect(StyleSheet.flatten(
        getByTestId(`match-distribution-bar-${count}`).props.style,
      ).width).toBe('0%');
    });
    expect(getByText('전체 평균 대비 +0.0%')).toBeTruthy();
  });

  test('expands combinations inline and resets expansion when tabs change', async () => {
    const { getByRole, getByTestId, getByText, queryByRole, queryByText } = await render(
      <CombinationResult
        analysis={analysis}
        bonusIncluded={false}
        firstRound={1}
        latestRound={100}
        onBonusChange={() => undefined}
        onCompare={() => undefined}
        onOpenHistory={() => undefined}
        onOpenPrizeRank={() => undefined}
        onPeriodChange={() => undefined}
        onStartOver={() => undefined}
        period={{ kind: 'preset', label: '전체' }}
      />,
    );

    expect(getByText('01 · 07')).toBeTruthy();
    expect(getByTestId('combination-size-tab-2').props.accessibilityState.selected).toBe(true);
    expect(getByTestId('frequent-combination-row-2-1-7').props.children).toHaveLength(2);
    expect(getByTestId('frequent-combination-row-2-1-7').props.accessibilityLabel)
      .toBe('1, 7 조합, 8회, 최근 100회');
    expect(getByText('+ 2개 더보기')).toBeTruthy();
    expect(queryByText('20 · 26')).toBeNull();
    expect(queryByRole('button', { name: '전체 5개 보기' })).toBeNull();

    await act(async () => {
      fireEvent.press(getByRole('button', { name: '2개 조합 더보기' }));
    });

    expect(getByText('20 · 26')).toBeTruthy();
    expect(getByText('01 · 26')).toBeTruthy();
    expect(getByRole('button', { name: '조합 목록 접기' })).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByTestId('combination-size-tab-3'));
    });

    expect(queryByText('01 · 07')).toBeNull();
    expect(getByText('01 · 07 · 12')).toBeTruthy();
    expect(getByTestId('combination-size-tab-3').props.accessibilityState.selected).toBe(true);
    expect(getByText('+ 1개 더보기')).toBeTruthy();
    expect(queryByText('01 · 20 · 26')).toBeNull();

    await act(async () => {
      fireEvent.press(getByRole('button', { name: '1개 조합 더보기' }));
    });

    expect(getByText('01 · 20 · 26')).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByTestId('combination-size-tab-2'));
    });

    expect(queryByText('20 · 26')).toBeNull();
    expect(getByText('+ 2개 더보기')).toBeTruthy();
  });

  test('shows statistics using the combination-selection condition groups', async () => {
    const { getByRole, getByTestId, getByText, queryByText } = await render(
      <CombinationResult
        analysis={analysis}
        bonusIncluded={false}
        firstRound={1}
        latestRound={100}
        onBonusChange={() => undefined}
        onCompare={() => undefined}
        onOpenHistory={() => undefined}
        onOpenPrizeRank={() => undefined}
        onPeriodChange={() => undefined}
        onStartOver={() => undefined}
        period={{ kind: 'preset', label: '전체' }}
      />,
    );

    expect(getByText('조건별 통계')).toBeTruthy();
    expect(getByText('동끝수 형태')).toBeTruthy();
    expect(getByText('표준편차')).toBeTruthy();
    expect(getByText('2수 1쌍')).toBeTruthy();
    expect(queryByText('소수 개수')).toBeNull();

    await act(async () => {
      fireEvent.press(getByRole('tab', { name: '수 성격 통계' }));
    });
    expect(getByTestId('condition-stat-tab-수 성격').props.accessibilityState.selected).toBe(true);
    expect(getByText('A/C 값')).toBeTruthy();
    expect(getByText('소수 개수')).toBeTruthy();
    expect(queryByText('동끝수 형태')).toBeNull();

    await act(async () => {
      fireEvent.press(getByRole('tab', { name: '직전·연번 통계' }));
    });
    expect(getByText('이월수 개수')).toBeTruthy();
    expect(getByText('이웃수 개수')).toBeTruthy();
    expect(getByText('이월수·이웃수는 100회와 보너스 번호 제외 기준입니다.')).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByRole('tab', { name: '번호대·과거 통계' }));
    });
    expect(getByText('40-45 번호대')).toBeTruthy();
    expect(getByText('과거 1–3등 동일 이력')).toBeTruthy();
  });
});
