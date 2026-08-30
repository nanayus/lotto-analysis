import { act, fireEvent, render, waitFor, within } from '@testing-library/react-native';
import { describe, expect, jest, test } from '@jest/globals';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable } from 'react-native';

import { CombinationDraftProvider } from '@/features/combination/CombinationDraftContext';
import type { ConsecutivePattern } from '@/domain/generator/types';

import { CombinationGeneratorScreen } from '../CombinationGeneratorScreen';
import { patternGroups } from '../components/ConditionSheet';
import { GeneratorDraftProvider } from '../GeneratorDraftContext';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), navigate: jest.fn(), push: jest.fn(), replace: jest.fn() },
}));

const mockNavigate = router.navigate as jest.Mock;
const mockReplace = router.replace as jest.Mock;
const mockBack = router.back as jest.Mock;

function renderScreen() {
  return render(
    <GeneratorDraftProvider>
      <CombinationDraftProvider>
        <CombinationGeneratorScreen />
      </CombinationDraftProvider>
    </GeneratorDraftProvider>,
  );
}

function DirectSessionHarness() {
  const [routeKey, setRouteKey] = useState(0);
  return (
    <GeneratorDraftProvider>
      <CombinationDraftProvider>
        <Pressable accessibilityLabel="조합 선택 화면 다시 열기" onPress={() => setRouteKey((current) => current + 1)} />
        <CombinationGeneratorScreen
          autoOpenConditions
          conditionOnly
          key={routeKey}
          sessionToken="condition-session"
        />
      </CombinationDraftProvider>
    </GeneratorDraftProvider>
  );
}

const PATTERN_CASES: [ConsecutivePattern, number[]][] = [
  ['none', [1, 1, 1, 1, 1, 1]],
  ['2', [2, 1, 1, 1, 1]],
  ['2+2', [2, 2, 1, 1]],
  ['2+2+2', [2, 2, 2]],
  ['3', [3, 1, 1, 1]],
  ['3+2', [3, 2, 1]],
  ['3+3', [3, 3]],
  ['4', [4, 1, 1]],
  ['4+2', [4, 2]],
  ['5', [5, 1]],
  ['6', [6]],
];

describe('CombinationGeneratorScreen', () => {
  test.each(PATTERN_CASES)('expands the %s visual pattern into six grouped numbers', (pattern, expected) => {
    expect(patternGroups(pattern)).toEqual(expected);
  });

  test('starts unlimited and applies a fixed number from the condition sheet', async () => {
    mockNavigate.mockClear();
    const screen = await renderScreen();
    expect(screen.getByText('무제한')).toBeTruthy();
    await act(async () => { fireEvent.press(screen.getByRole('button', { name: '조건 선택하기' })); });
    expect(screen.getByTestId('condition-editor')).toBeTruthy();
    expect(screen.getByText('선택하지 않은 항목은 제한 없이 적용돼요.')).toBeTruthy();
    await act(async () => { fireEvent.press(screen.getByRole('switch', { name: '고정수 · 제외수 조건' })); });
    await act(async () => { fireEvent.press(screen.getByLabelText('7번')); });
    await act(async () => { fireEvent.press(screen.getByText('1개 조건 적용')); });
    await waitFor(() => expect(screen.getByText('고정 7')).toBeTruthy());
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith({
      pathname: '/(tabs)/draw/combination',
      params: {
        analyze: expect.stringMatching(/^generator-conditions-/),
        returnTo: 'draw',
        returnCount: '1',
        returnSession: 'generator',
        returnToken: expect.any(String),
      },
    }));
  });

  test('restores direct condition selections for the same generator session', async () => {
    mockReplace.mockClear();
    const screen = await render(<DirectSessionHarness />);

    expect(screen.getByTestId('condition-editor')).toBeTruthy();
    expect(screen.queryByText('AI 뽑기')).toBeNull();
    expect(screen.getByRole('tab', { name: '번호' }).props.accessibilityState).toEqual({ selected: true });

    await act(async () => { fireEvent.press(screen.getByRole('switch', { name: '고정수 · 제외수 조건' })); });
    await act(async () => { fireEvent.press(screen.getByLabelText('7번')); });
    await act(async () => {
      fireEvent.press(screen.getByText('1개 조건 적용'));
    });

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/(tabs)/draw/combination',
      params: {
        analyze: expect.stringMatching(/^generator-conditions-/),
        returnCount: '1',
        returnSession: 'condition-session',
        returnTo: 'combination-generator',
        returnToken: expect.any(String),
      },
    }));

    await act(async () => { fireEvent.press(screen.getByLabelText('조합 선택 화면 다시 열기')); });
    expect(screen.getByLabelText('7번, 고정수')).toBeTruthy();
    expect(screen.getByText('고정 7')).toBeTruthy();
  });

  test('pops the direct condition selector from the draw stack', async () => {
    mockBack.mockClear();
    mockReplace.mockClear();
    const screen = await render(<DirectSessionHarness />);

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: '조건 선택 취소' }));
    });

    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  test('shows the seven-column number selector in the Number tab and keeps selection state', async () => {
    const screen = await renderScreen();
    await act(async () => { fireEvent.press(screen.getByRole('button', { name: '조건 선택하기' })); });

    expect(screen.getByRole('tab', { name: '번호' }).props.accessibilityState).toEqual({ selected: true });
    expect(screen.getByTestId('number-status-grid')).toBeTruthy();
    expect(screen.getByTestId('number-grid-placeholder-3')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '번호 보기' })).toBeNull();

    await act(async () => { fireEvent.press(screen.getByRole('switch', { name: '고정수 · 제외수 조건' })); });
    await act(async () => { fireEvent.press(screen.getByLabelText('7번')); });
    expect(screen.getByLabelText('7번, 고정수')).toBeTruthy();
    await act(async () => { fireEvent.press(screen.getByRole('button', { name: '제외수' })); });
    await act(async () => { fireEvent.press(screen.getByLabelText('8번')); });
    expect(screen.getByLabelText('8번, 제외수')).toBeTruthy();

    await act(async () => { fireEvent.press(screen.getByRole('tab', { name: '분포' })); });
    await act(async () => { fireEvent.press(screen.getByRole('tab', { name: '번호' })); });
    expect(screen.getByLabelText('7번, 고정수')).toBeTruthy();
    expect(screen.getByLabelText('8번, 제외수')).toBeTruthy();
  });

  test('keeps every category in one list and updates the tab while scrolling vertically', async () => {
    const screen = await renderScreen();
    await act(async () => { fireEvent.press(screen.getByRole('button', { name: '조건 선택하기' })); });

    const content = screen.getByTestId('condition-content');
    expect(within(content).getByText('고정수 · 제외수')).toBeTruthy();
    expect(within(content).getByText('동끝수 형태')).toBeTruthy();
    expect(within(content).getByText('A/C 값')).toBeTruthy();
    expect(within(content).getByText('이월수 개수')).toBeTruthy();
    expect(within(content).getByText('과거 등수 조합 제외')).toBeTruthy();
    expect(screen.getByRole('tab', { name: '번호' }).props.accessibilityState).toEqual({ selected: true });

    await act(async () => {
      [0, 1000, 2000, 3000, 4000].forEach((y, index) => {
        fireEvent(screen.getByTestId(`condition-group-${index}`), 'layout', {
          nativeEvent: { layout: { height: 800, width: 390, x: 0, y } },
        });
      });
      fireEvent.scroll(content, {
        nativeEvent: {
          contentOffset: { x: 0, y: 1050 },
          layoutMeasurement: { height: 500, width: 390 },
        },
      });
    });

    expect(screen.getByRole('tab', { name: '번호' }).props.accessibilityState).toEqual({ selected: false });
    expect(screen.getByRole('tab', { name: '분포' }).props.accessibilityState).toEqual({ selected: true });
  });

  test('keeps carry and neighbor bonus toggles in their section headers', async () => {
    const screen = await renderScreen();
    await act(async () => { fireEvent.press(screen.getByRole('button', { name: '조건 선택하기' })); });
    await act(async () => { fireEvent.press(screen.getByRole('tab', { name: '직전·연번' })); });

    expect(screen.getByTestId('carry-bonus-toggle')).toBeTruthy();
    expect(screen.getByTestId('neighbor-bonus-toggle')).toBeTruthy();
    expect(screen.getByText('직전 번호와 같은 수')).toBeTruthy();
    expect(screen.getByText('직전 번호의 앞·뒤 수')).toBeTruthy();
    expect(screen.getByText('위 번호 중 조합에 다시 포함할 개수')).toBeTruthy();
    expect(screen.getByText('선택 후보 중 조합에 포함할 개수')).toBeTruthy();
  });

  test('labels ratio direction and shows number-trait examples', async () => {
    const screen = await renderScreen();
    await act(async () => { fireEvent.press(screen.getByRole('button', { name: '조건 선택하기' })); });
    await act(async () => { fireEvent.press(screen.getByRole('tab', { name: '분포' })); });

    expect(screen.getByLabelText('홀수 대 짝수 순서')).toBeTruthy();
    expect(screen.getByLabelText('저번호 1–22 대 고번호 23–45 순서')).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: '홀수 3개, 짝수 3개' })).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: '저번호 1–22 4개, 고번호 23–45 2개' })).toBeTruthy();
    expect(within(screen.getByLabelText('홀짝 비율')).getAllByRole('checkbox').map(
      (option) => option.props.accessibilityLabel,
    )).toEqual([
      '홀수 6개, 짝수 0개', '홀수 5개, 짝수 1개', '홀수 4개, 짝수 2개',
      '홀수 3개, 짝수 3개', '홀수 2개, 짝수 4개', '홀수 1개, 짝수 5개',
      '홀수 0개, 짝수 6개',
    ]);
    expect(within(screen.getByLabelText('저고 비율')).getAllByRole('checkbox').map(
      (option) => option.props.accessibilityLabel,
    )).toEqual([
      '저번호 1–22 6개, 고번호 23–45 0개', '저번호 1–22 5개, 고번호 23–45 1개',
      '저번호 1–22 4개, 고번호 23–45 2개', '저번호 1–22 3개, 고번호 23–45 3개',
      '저번호 1–22 2개, 고번호 23–45 4개', '저번호 1–22 1개, 고번호 23–45 5개',
      '저번호 1–22 0개, 고번호 23–45 6개',
    ]);

    await act(async () => { fireEvent.press(screen.getByRole('tab', { name: '수 성격' })); });
    expect(screen.getByLabelText('해당 번호: 2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43')).toBeTruthy();
    expect(screen.getByLabelText('해당 번호: 4, 9, 16, 25, 36')).toBeTruthy();
  });

  test('shows the same condition switch on every condition card', async () => {
    const screen = await renderScreen();
    await act(async () => { fireEvent.press(screen.getByRole('button', { name: '조건 선택하기' })); });

    const conditionTitles = [
      '고정수 · 제외수', '동끝수 형태', '표준편차', '번호 총합', '끝수 총합', '홀짝 비율', '저고 비율',
      'A/C 값', '소수 개수', '완전제곱수 개수', '합성수 개수', '3의 배수', '4의 배수', '5의 배수',
      '이월수 개수', '이웃수 개수', '연번 형태', '1-9 번호대', '10-19 번호대', '20-29 번호대',
      '30-39 번호대', '40-45 번호대', '과거 등수 조합 제외',
    ];

    conditionTitles.forEach((title) => {
      expect(screen.getByRole('switch', { name: `${title} 조건` }).props.accessibilityState)
        .toEqual({ checked: false });
    });
  });

  test('loads the broad six-condition preset without starting analysis', async () => {
    const screen = await renderScreen();
    await act(async () => { fireEvent.press(screen.getByRole('button', { name: '조건 선택하기' })); });

    expect(screen.getByText('0개 조건 적용')).toBeTruthy();
    await act(async () => { fireEvent.press(screen.getByRole('button', { name: '추천 조건 적용' })); });

    expect(screen.getByText('6개 조건 적용')).toBeTruthy();
    expect(screen.getByRole('button', { name: '추천 조건 적용됨' }).props.accessibilityState)
      .toEqual({ selected: true });
    expect(screen.getByText('표준편차 · 합계 · 홀짝 · 저고 · A/C · 연번')).toBeTruthy();
    expect(screen.getByRole('tab', { name: '수 성격' }).props.accessibilityState).toEqual({ selected: true });
    expect(screen.getByRole('switch', { name: '표준편차 조건' }).props.accessibilityState).toEqual({ checked: true });
    expect(screen.getByRole('switch', { name: '번호 총합 조건' }).props.accessibilityState).toEqual({ checked: true });
    expect(screen.getByRole('switch', { name: '홀짝 비율 조건' }).props.accessibilityState).toEqual({ checked: true });
    expect(screen.getByRole('switch', { name: '저고 비율 조건' }).props.accessibilityState).toEqual({ checked: true });
    expect(screen.getByRole('switch', { name: 'A/C 값 조건' }).props.accessibilityState).toEqual({ checked: true });
    expect(screen.getByRole('switch', { name: '연번 형태 조건' }).props.accessibilityState).toEqual({ checked: true });
    expect(screen.getByLabelText('표준편차 최솟값').props.defaultValue).toBe('8.0');
    expect(screen.getByLabelText('표준편차 최댓값').props.defaultValue).toBe('16.0');
    expect(screen.getByLabelText('번호 총합 최솟값').props.defaultValue).toBe('100');
    expect(screen.getByLabelText('번호 총합 최댓값').props.defaultValue).toBe('180');
    expect(screen.getByRole('switch', { name: '고정수 · 제외수 조건' }).props.accessibilityState).toEqual({ checked: false });
    expect(screen.getByTestId('condition-editor')).toBeTruthy();

    await act(async () => { fireEvent.press(screen.getByRole('switch', { name: '홀짝 비율 조건' })); });
    expect(screen.getByRole('button', { name: '추천 조건 적용' }).props.accessibilityState)
      .toEqual({ selected: false });
    expect(screen.getByText('5개 조건 적용')).toBeTruthy();
  });

  test('shows definitions, examples, and historical frequencies from distribution help buttons', async () => {
    const screen = await renderScreen();
    await act(async () => { fireEvent.press(screen.getByRole('button', { name: '조건 선택하기' })); });
    await act(async () => { fireEvent.press(screen.getByRole('tab', { name: '분포' })); });

    expect(screen.getByRole('button', { name: '동끝수 형태 설명 보기' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '표준편차 설명 보기' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '번호 총합 설명 보기' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '끝수 총합 설명 보기' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '홀짝 비율 설명 보기' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '저고 비율 설명 보기' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '고정수 · 제외수 설명 보기' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'A/C 값 설명 보기' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '소수 개수 설명 보기' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '5의 배수 설명 보기' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '이월수 개수 설명 보기' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '연번 형태 설명 보기' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '40-45 번호대 설명 보기' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '과거 등수 조합 제외 설명 보기' })).toBeTruthy();

    await act(async () => { fireEvent.press(screen.getByRole('button', { name: '동끝수 형태 설명 보기' })); });
    expect(screen.getByTestId('condition-help-dialog')).toBeTruthy();
    expect(screen.getByText('예: 3, 13, 22, 32, 41, 45 → 2수 2쌍 (3·13 / 22·32)')).toBeTruthy();
    expect(screen.getByTestId('condition-help-historical-value').props.children).toBe('2수 1쌍');
    expect(screen.getByText('593회 · 47.9%')).toBeTruthy();
    expect(screen.getByText(/다음 회차의 당첨 가능성이나 추천을 의미하지 않습니다/)).toBeTruthy();

    await act(async () => { fireEvent.press(screen.getByRole('button', { name: '확인' })); });
    expect(screen.queryByTestId('condition-help-dialog')).toBeNull();
  });

  test('shows historical range presets disabled, preserves edits across toggles, and resets them', async () => {
    const screen = await renderScreen();
    await act(async () => { fireEvent.press(screen.getByRole('button', { name: '조건 선택하기' })); });
    await act(async () => { fireEvent.press(screen.getByRole('tab', { name: '분포' })); });

    expect(screen.getByRole('switch', { name: '표준편차 조건' }).props.accessibilityState).toEqual({ checked: false });
    expect(screen.getByLabelText('표준편차 최솟값').props.defaultValue).toBe('12.0');
    expect(screen.getByLabelText('표준편차 최댓값').props.defaultValue).toBe('12.9');
    expect(screen.getByLabelText('번호 총합 최솟값').props.defaultValue).toBe('130');
    expect(screen.getByLabelText('끝수 총합 최솟값').props.defaultValue).toBe('25');
    expect(screen.getAllByText('과거 최다').length).toBeGreaterThanOrEqual(3);

    await act(async () => { fireEvent.press(screen.getByRole('switch', { name: '표준편차 조건' })); });
    await act(async () => {
      fireEvent(screen.getByLabelText('표준편차 최솟값'), 'endEditing', { nativeEvent: { text: '11.0' } });
    });
    await act(async () => { fireEvent.press(screen.getByRole('switch', { name: '표준편차 조건' })); });
    await act(async () => { fireEvent.press(screen.getByRole('switch', { name: '표준편차 조건' })); });
    expect(screen.getByLabelText('표준편차 최솟값').props.defaultValue).toBe('11.0');

    await act(async () => { fireEvent.press(screen.getByText('초기화')); });
    expect(screen.getByRole('switch', { name: '표준편차 조건' }).props.accessibilityState).toEqual({ checked: false });
    expect(screen.getByLabelText('표준편차 최솟값').props.defaultValue).toBe('12.0');
  });

  test('renders selectable same-ending and consecutive visual cards with accessible labels', async () => {
    const screen = await renderScreen();
    await act(async () => { fireEvent.press(screen.getByRole('button', { name: '조건 선택하기' })); });
    await act(async () => { fireEvent.press(screen.getByRole('tab', { name: '분포' })); });

    const sameEnding = screen.getByTestId('pattern-sameEnding-2+2');
    expect(sameEnding.props.accessibilityState).toEqual({ checked: false });
    await act(async () => { fireEvent.press(screen.getByRole('switch', { name: '동끝수 형태 조건' })); });
    await act(async () => { fireEvent.press(sameEnding); });
    expect(screen.getByTestId('pattern-sameEnding-2+2').props.accessibilityState).toEqual({ checked: true });

    await act(async () => { fireEvent.press(screen.getByRole('tab', { name: '직전·연번' })); });
    expect(screen.getByLabelText('없음, 과거 최다')).toBeTruthy();
    const consecutive = screen.getByTestId('pattern-consecutive-3+2');
    await act(async () => { fireEvent.press(screen.getByRole('switch', { name: '연번 형태 조건' })); });
    await act(async () => { fireEvent.press(consecutive); });
    expect(screen.getByTestId('pattern-consecutive-3+2').props.accessibilityState).toEqual({ checked: true });
  });

  test('generates one combination and hands it to the existing analysis tab', async () => {
    mockNavigate.mockClear();
    const screen = await renderScreen();
    await act(async () => { fireEvent.press(screen.getByRole('button', { name: '조합 만들기' })); });
    await waitFor(() => expect(screen.getByText('생성된 번호')).toBeTruthy());
    expect(screen.getByText('다시 만들기')).toBeTruthy();
    await act(async () => { fireEvent.press(screen.getByRole('button', { name: '조합 분석하기' })); });
    expect(mockNavigate).toHaveBeenCalledWith(expect.objectContaining({ pathname: '/(tabs)/draw/combination' }));
  });
});
