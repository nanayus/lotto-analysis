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
    carryNumbers: [7],
    compositeCount: 3,
    compositeNumbers: [12, 20, 26],
    consecutivePattern: '2',
    highCount: 2,
    lastDigitSum: 25,
    lowCount: 4,
    multipleCounts: { 3: 2, 4: 3, 5: 2 },
    multipleNumbers: { 3: [12], 4: [12, 20], 5: [20] },
    neighborCount: 2,
    neighborNumbers: [12, 19],
    oddCount: 3,
    pastPrizeRanks: [],
    previousBonus: 25,
    previousNumbers: [7, 11, 18, 28, 33, 40],
    previousRound: 100,
    primeCount: 2,
    primeNumbers: [7, 19],
    sameEndingPattern: '2',
    squareCount: 1,
    squareNumbers: [],
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
    { appearanceCount: 136, appearanceRank: 45, averageGap: 6.8, currentGap: 7, number: 1 },
    { appearanceCount: 179, appearanceRank: 4, averageGap: 5.9, currentGap: 1, number: 7 },
    { appearanceCount: 177, appearanceRank: 5, averageGap: 6.1, currentGap: 0, number: 12 },
    { appearanceCount: 170, appearanceRank: 15, averageGap: 6.3, currentGap: 2, number: 19 },
    { appearanceCount: 145, appearanceRank: 43, averageGap: 6.5, currentGap: 5, number: 20 },
    { appearanceCount: 144, appearanceRank: 44, averageGap: 6.4, currentGap: 11, number: 26 },
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
  test('sorts number insight cards and shows appearance gaps', async () => {
    const { getAllByTestId, getByTestId, getByText } = await render(
      <CombinationResult
        analysis={analysis}
        bonusIncluded={false}
        firstRound={1}
        latestRound={100}
        onBonusChange={() => undefined}
        onRegenerate={() => undefined}
        onOpenHistory={() => undefined}
        onOpenPrizeRank={() => undefined}
        onPeriodChange={() => undefined}
        onStartOver={() => undefined}
        period={{ kind: 'preset', label: '전체' }}
      />,
    );

    expect(
      getAllByTestId(/^individual-number-card-/).map((row) => row.props.testID),
    ).toEqual([
      'individual-number-card-7',
      'individual-number-card-12',
      'individual-number-card-19',
      'individual-number-card-20',
      'individual-number-card-26',
      'individual-number-card-1',
    ]);
    expect(getByTestId('individual-number-card-7').props.accessibilityLabel)
      .toBe('7번, 출현 179회, 전체 4위, 평균 출현 간격 5.9회, 현재 1회째 미출현');
    expect(getByText('179회')).toBeTruthy();
    expect(getByText('전체 4위')).toBeTruthy();
    expect(getByText('5.9회')).toBeTruthy();
  });

  test('shows the selected combination as one compact profile', async () => {
    const onOpenHistory = jest.fn();
    const onRegenerate = jest.fn();
    const onResultInteraction = jest.fn();
    const onToggleFavorite = jest.fn();
    const onTogglePurchased = jest.fn();
    const { getByRole, getByTestId, getByText, queryByText } = await render(
      <CombinationResult
        analysis={analysis}
        bonusIncluded={false}
        canRegenerate
        firstRound={1}
        latestRound={100}
        onBonusChange={() => undefined}
        onRegenerate={onRegenerate}
        onResultInteraction={onResultInteraction}
        onOpenHistory={onOpenHistory}
        onOpenPrizeRank={() => undefined}
        onPeriodChange={() => undefined}
        onStartOver={() => undefined}
        onToggleFavorite={onToggleFavorite}
        onTogglePurchased={onTogglePurchased}
        period={{ kind: 'preset', label: '전체' }}
      />,
    );

    expect(getByText('조합 분석')).toBeTruthy();
    expect(getByTestId('combination-headline-card')).toBeTruthy();
    expect(queryByText('한줄평')).toBeNull();
    expect(getByText('과거 기록에서 선택 번호 4개가 함께 나온 회차가 있어요.')).toBeTruthy();
    expect(getByText('선택 번호 4개 동시 출현 · 1회')).toBeTruthy();
    expect(getByTestId('combination-headline').props.accessibilityLabel)
      .toBe('조합 요약, 과거 기록에서 선택 번호 4개가 함께 나온 회차가 있어요., 근거 지표 선택 번호 4개 동시 출현 · 1회');
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
    expect(getByTestId('combination-result-footer')).toBeTruthy();
    expect(getByRole('button', { name: '새 조합 분석하기' })).toBeTruthy();
    expect(queryByText('과거 당첨번호와 비교한 등급 상당 기록입니다.')).toBeNull();
    expect(getByTestId('result-card-actions')).toBeTruthy();
    expect(getByRole('button', { name: '구매한 번호로 표시' }).props.accessibilityState)
      .toEqual({ selected: false });
    expect(getByRole('button', { name: '즐겨찾기에 추가' }).props.accessibilityState)
      .toEqual({ selected: false });

    await act(async () => {
      fireEvent.press(getByRole('button', { name: '같은 조건으로 다시 뽑기, Pro 전용' }));
      fireEvent.press(getByRole('button', { name: '구매한 번호로 표시' }));
    });
    expect(getByTestId('library-action-toast')).toBeTruthy();
    expect(getByText('구매번호로 등록되었습니다.')).toBeTruthy();
    expect(getByRole('button', { name: '구매 표시 해제' }).props.accessibilityState)
      .toEqual({ selected: true });

    await act(async () => {
      fireEvent.press(getByRole('button', { name: '즐겨찾기에 추가' }));
    });
    expect(getByText('즐겨찾기에 등록되었습니다.')).toBeTruthy();
    expect(getByRole('button', { name: '즐겨찾기 해제' }).props.accessibilityState)
      .toEqual({ selected: true });
    await act(async () => {
      fireEvent.press(getByRole('button', { name: '전체 기록' }));
    });

    expect(onRegenerate).toHaveBeenCalledTimes(1);
    expect(onTogglePurchased).toHaveBeenCalledTimes(1);
    expect(onToggleFavorite).toHaveBeenCalledTimes(1);
    expect(onOpenHistory).toHaveBeenCalledTimes(1);
    expect(onResultInteraction).toHaveBeenCalledWith('headline', 'regenerate');
    expect(onResultInteraction).toHaveBeenCalledWith('headline', 'toggle_purchased', 'on');
    expect(onResultInteraction).toHaveBeenCalledWith('headline', 'toggle_favorite', 'on');
    expect(onResultInteraction).toHaveBeenCalledWith('prize_history', 'open_all_history');
  });

  test('pins only the selected numbers after their original row scrolls away', async () => {
    const { getByTestId, queryByTestId } = await render(
      <CombinationResult
        analysis={analysis}
        bonusIncluded={false}
        firstRound={1}
        latestRound={100}
        onBonusChange={() => undefined}
        onOpenHistory={() => undefined}
        onOpenPrizeRank={() => undefined}
        onPeriodChange={() => undefined}
        onStartOver={() => undefined}
        period={{ kind: 'preset', label: '전체' }}
      />,
    );

    await act(async () => {
      getByTestId('result-selected-profile').props.onLayout({
        nativeEvent: { layout: { height: 180, width: 340, x: 0, y: 16 } },
      });
      getByTestId('result-selected-numbers-anchor').props.onLayout({
        nativeEvent: { layout: { height: 48, width: 300, x: 20, y: 24 } },
      });
    });
    expect(queryByTestId('result-sticky-numbers')).toBeNull();

    await act(async () => {
      getByTestId('combination-result-scroll').props.onScroll({
        nativeEvent: { contentOffset: { x: 0, y: 88 } },
      });
    });
    expect(getByTestId('result-sticky-numbers').props.accessibilityLabel)
      .toBe('선택 번호 1, 7, 12, 19, 20, 26');

    await act(async () => {
      getByTestId('combination-result-scroll').props.onScroll({
        nativeEvent: { contentOffset: { x: 0, y: 40 } },
      });
    });
    expect(queryByTestId('result-sticky-numbers')).toBeNull();
  });

  test('records a result section only after meaningful visibility', async () => {
    jest.useFakeTimers();
    const onSectionViewed = jest.fn();
    const { getByTestId, unmount } = await render(
      <CombinationResult
        analysis={analysis}
        bonusIncluded={false}
        firstRound={1}
        latestRound={100}
        onBonusChange={() => undefined}
        onOpenHistory={() => undefined}
        onOpenPrizeRank={() => undefined}
        onPeriodChange={() => undefined}
        onSectionViewed={onSectionViewed}
        onStartOver={() => undefined}
        period={{ kind: 'preset', label: '전체' }}
      />,
    );

    await act(async () => {
      getByTestId('combination-result-scroll').props.onLayout({
        nativeEvent: { layout: { height: 400, width: 340, x: 0, y: 0 } },
      });
      getByTestId('result-selected-profile').props.onLayout({
        nativeEvent: { layout: { height: 200, width: 340, x: 0, y: 0 } },
      });
      jest.advanceTimersByTime(799);
    });
    expect(onSectionViewed).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(onSectionViewed).toHaveBeenCalledWith('headline');

    unmount();
    jest.useRealTimers();
  });

  test('shows the locked AI explanation as a quiet explanatory entry point', async () => {
    const { getByRole, getByTestId, getByText } = await render(
      <CombinationResult
        analysis={analysis}
        bonusIncluded={false}
        firstRound={1}
        isPro={false}
        latestRound={100}
        onBonusChange={() => undefined}
        onRegenerate={() => undefined}
        onOpenHistory={() => undefined}
        onOpenPrizeRank={() => undefined}
        onPeriodChange={() => undefined}
        onStartOver={() => undefined}
        period={{ kind: 'preset', label: '전체' }}
      />,
    );

    expect(StyleSheet.flatten(getByTestId('ai-combination-explanation-card').props.style))
      .toMatchObject({
        backgroundColor: '#102A43',
        borderColor: '#2997FF',
      });
    expect(getByText('AI로 쉽게 보기')).toBeTruthy();
    expect(getByText('이 결과를 쉬운 말로 풀어드려요.')).toBeTruthy();
    expect(getByText('설명 보기')).toBeTruthy();
    expect(getByRole('button', { name: 'AI로 쉽게 보기, 설명 보기, Pro 전용' })).toBeTruthy();
  });

  test('hides the AI explanation entry point while the Pro plan is paused', async () => {
    const { queryByTestId, queryByText } = await render(
      <CombinationResult
        analysis={analysis}
        bonusIncluded={false}
        firstRound={1}
        latestRound={100}
        onBonusChange={() => undefined}
        onOpenHistory={() => undefined}
        onOpenPrizeRank={() => undefined}
        onPeriodChange={() => undefined}
        onStartOver={() => undefined}
        period={{ kind: 'preset', label: '전체' }}
        showAiExplanation={false}
      />,
    );

    expect(queryByTestId('ai-combination-explanation-card')).toBeNull();
    expect(queryByText('AI로 쉽게 보기')).toBeNull();
  });

  test('restores match distribution and group frequency before condition statistics', async () => {
    const { getAllByTestId, getByTestId, getByText } = await render(
      <CombinationResult
        analysis={analysis}
        bonusIncluded={false}
        firstRound={1}
        latestRound={100}
        onBonusChange={() => undefined}
        onRegenerate={() => undefined}
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
        onRegenerate={() => undefined}
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
    const onResultInteraction = jest.fn();
    const { getByRole, getByTestId, getByText, queryByRole, queryByText } = await render(
      <CombinationResult
        analysis={analysis}
        bonusIncluded={false}
        firstRound={1}
        latestRound={100}
        onBonusChange={() => undefined}
        onRegenerate={() => undefined}
        onResultInteraction={onResultInteraction}
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
    expect(onResultInteraction).toHaveBeenCalledWith(
      'frequent_combinations',
      'expand_combinations',
      '2',
    );
    expect(onResultInteraction).toHaveBeenCalledWith(
      'frequent_combinations',
      'change_combination_size',
      '3',
    );
  });

  test('shows statistics using the combination-selection condition groups', async () => {
    const onResultInteraction = jest.fn();
    const { getByRole, getByTestId, getByText, queryByText } = await render(
      <CombinationResult
        analysis={analysis}
        bonusIncluded={false}
        firstRound={1}
        latestRound={100}
        onBonusChange={() => undefined}
        onRegenerate={() => undefined}
        onResultInteraction={onResultInteraction}
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
    expect(getByTestId('condition-distribution-profile')).toBeTruthy();
    expect(getByTestId('condition-same-ending-profile')).toBeTruthy();
    expect(getByTestId('condition-meter-standard-deviation').props.accessibilityValue).toEqual({
      max: 21.1,
      min: 1.7,
      now: 8.5,
      text: '8.5',
    });
    expect(getByTestId('condition-ratio-odd-even').props.accessibilityLabel)
      .toBe('홀짝 비율, 홀 3, 짝 3');
    expect(getByTestId('condition-ratio-low-high').props.accessibilityLabel)
      .toBe('저고 비율, 저 4, 고 2');
    expect(queryByText('소수 개수')).toBeNull();

    await act(async () => {
      fireEvent.press(getByRole('tab', { name: '수 성격 통계' }));
    });
    expect(getByTestId('condition-stat-tab-수 성격').props.accessibilityState.selected).toBe(true);
    expect(getByText('A/C 값')).toBeTruthy();
    expect(getByTestId('condition-number-character-profile')).toBeTruthy();
    expect(getByTestId('condition-ac-profile').props.accessibilityValue).toEqual({
      max: 10,
      min: 0,
      now: 7,
      text: '7',
    });
    expect(getByText('수의 종류')).toBeTruthy();
    expect(getByTestId('condition-prime-profile-number-7')).toBeTruthy();
    expect(getByTestId('condition-prime-profile-number-19')).toBeTruthy();
    expect(getByTestId('condition-composite-profile-number-12')).toBeTruthy();
    expect(getByText('배수 포함')).toBeTruthy();
    expect(getByTestId('condition-multiple-4-profile-number-20')).toBeTruthy();
    expect(queryByText('동끝수 형태')).toBeNull();

    await act(async () => {
      fireEvent.press(getByRole('tab', { name: '직전·연번 통계' }));
    });
    expect(getByText('직전 회차 번호')).toBeTruthy();
    expect(getByText('100회 당첨 번호')).toBeTruthy();
    expect(getByText('보너스 제외')).toBeTruthy();
    expect(getByTestId('condition-previous-number-7')).toBeTruthy();
    expect(getByText('이월수')).toBeTruthy();
    expect(getByText('직전 회차와 같은 번호')).toBeTruthy();
    expect(getByTestId('condition-carry-number-7')).toBeTruthy();
    expect(getByText('이웃수')).toBeTruthy();
    expect(getByText('직전 번호의 앞·뒤(±1)')).toBeTruthy();
    expect(getByTestId('condition-neighbor-number-12')).toBeTruthy();
    expect(getByTestId('condition-neighbor-number-19')).toBeTruthy();
    expect(getByText('현재 조합 안의 연속 번호')).toBeTruthy();
    expect(getByText('현재 조합과의 관계')).toBeTruthy();
    expect(getByText('카드를 눌러 직전 번호를 확인하세요.')).toBeTruthy();
    expect(getByTestId('condition-previous-number-7').props.accessibilityState.selected).toBe(false);

    await act(async () => {
      fireEvent.press(getByTestId('condition-relation-carry'));
    });
    expect(getByTestId('condition-relation-carry').props.accessibilityState.selected).toBe(true);
    expect(getByTestId('condition-previous-number-7').props.accessibilityState.selected).toBe(true);
    expect(getByText('이월수의 기준 번호를 강조했어요.')).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByTestId('condition-relation-neighbor'));
    });
    expect(getByTestId('condition-relation-carry').props.accessibilityState.selected).toBe(false);
    expect(getByTestId('condition-relation-neighbor').props.accessibilityState.selected).toBe(true);
    expect(getByTestId('condition-previous-number-7').props.accessibilityState.selected).toBe(false);
    expect(getByTestId('condition-previous-number-11').props.accessibilityState.selected).toBe(true);
    expect(getByTestId('condition-previous-number-18').props.accessibilityState.selected).toBe(true);
    expect(getByText('이웃수의 기준 번호를 강조했어요.')).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByRole('tab', { name: '번호대·과거 통계' }));
    });
    expect(getByTestId('condition-band-chart')).toBeTruthy();
    expect(getByTestId('condition-band-chart').props.accessibilityLabel).toContain('40–45 0개');
    expect(queryByText('과거 1–3등 동일 이력')).toBeNull();
    expect(queryByText('전체 회차와 비교한 결과')).toBeNull();
    expect(queryByText('과거 등수 이력은 전체 회차의 본번호와 보너스 번호를 기준으로 확인합니다.')).toBeNull();
    expect(onResultInteraction).toHaveBeenCalledWith(
      'condition_statistics',
      'change_condition_tab',
      'number_character',
    );
    expect(onResultInteraction).toHaveBeenCalledWith(
      'condition_statistics',
      'change_condition_tab',
      'recent_consecutive',
    );
  });
});
