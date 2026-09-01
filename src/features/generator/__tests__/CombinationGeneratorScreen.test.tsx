import { act, fireEvent, render, waitFor, within } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { router, useFocusEffect } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { CombinationDraftProvider } from '@/features/combination/CombinationDraftContext';
import type { ConsecutivePattern } from '@/domain/generator/types';
import { spacing, typography } from '@/theme';

import {
  CombinationGeneratorScreen,
  CONDITION_APPLY_MINIMUM_LOADING_MS,
} from '../CombinationGeneratorScreen';
import { patternGroups } from '../components/ConditionSheet';
import { GeneratorDraftProvider } from '../GeneratorDraftContext';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), navigate: jest.fn(), push: jest.fn(), replace: jest.fn() },
  useFocusEffect: jest.fn(),
}));

const freeAccess = {
  canApplyReferralCode: false,
  inviteCode: '',
  isPro: false,
  proExpiresAt: null,
};
let mockMonetizationState = { access: freeAccess, status: 'ready' as const };
let mockIsPro = false;
let mockIsGuest = false;
const mockOpenLogin = jest.fn();
const mockOpenPaywall = jest.fn();

jest.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => ({
    openLogin: mockOpenLogin,
    state: mockIsGuest ? { status: 'guest' } : { status: 'authenticated' },
  }),
}));

jest.mock('@/features/monetization/MonetizationContext', () => ({
  useMonetization: () => ({
    openPaywall: mockOpenPaywall,
    productAccess: {
      canCompareCombinations: mockIsPro,
      canSaveNumbers: !mockIsGuest,
      canUseBalancedPreset: !mockIsGuest,
      canUseAiExplanation: mockIsPro,
      canUseCustomPeriod: mockIsPro,
      combinationSelectionLimit: mockIsGuest ? 2 : 5,
      requiresRewardedAdForResults: !mockIsPro,
      storageMode: mockIsPro ? 'cloud' : mockIsGuest ? 'unavailable' : 'device',
      tier: mockIsPro ? 'pro' : mockIsGuest ? 'guest' : 'free',
    },
    state: mockMonetizationState,
  }),
}));

const mockPush = router.push as jest.Mock;
const mockReplace = router.replace as jest.Mock;
const mockBack = router.back as jest.Mock;
const mockUseFocusEffect = useFocusEffect as jest.Mock;
let latestFocusCallback: (() => void | (() => void)) | null = null;
mockUseFocusEffect.mockImplementation((callback) => {
  latestFocusCallback = callback as () => void | (() => void);
});

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
  beforeEach(() => {
    mockMonetizationState = { access: freeAccess, status: 'ready' };
    mockIsPro = false;
    mockIsGuest = false;
    mockOpenLogin.mockClear();
    mockOpenPaywall.mockClear();
  });

  test.each(PATTERN_CASES)('expands the %s visual pattern into six grouped numbers', (pattern, expected) => {
    expect(patternGroups(pattern)).toEqual(expected);
  });

  test('keeps the condition-apply loading screen visible for about three seconds', () => {
    expect(CONDITION_APPLY_MINIMUM_LOADING_MS).toBe(3000);
  });

  test('explains that free users see results after an ad', async () => {
    const screen = await renderScreen();
    await act(async () => { fireEvent.press(screen.getByRole('button', { name: '조건 선택하기' })); });
    expect(screen.getByRole('button', { name: '3개 조건 적용, 광고 후 결과 보기' })).toBeTruthy();
    expect(screen.getByText('광고 후 결과 보기')).toBeTruthy();
  });

  test('keeps the header, access banner, and tabs outside the vertical condition scroller', async () => {
    const screen = await renderScreen();
    await act(async () => { fireEvent.press(screen.getByRole('button', { name: '조건 선택하기' })); });

    const conditionContent = screen.getByTestId('condition-content');
    expect(screen.getAllByTestId('sub-screen-header').length).toBeGreaterThan(0);
    expect(screen.getByTestId('condition-access-banner')).toBeTruthy();
    expect(screen.getByRole('tab', { name: '번호' })).toBeTruthy();
    expect(within(conditionContent).queryByRole('tab', { name: '번호' })).toBeNull();

    expect(screen.getByText('Pro에서 AI에게 물어보기')).toBeTruthy();
    await act(async () => { fireEvent.press(screen.getByText('Pro 보기')); });
    expect(mockOpenPaywall).toHaveBeenCalledWith('condition-ai-explanation');

    await act(async () => { fireEvent.press(screen.getByRole('button', { name: '회원 혜택 안내 닫기' })); });
    expect(screen.queryByTestId('condition-access-banner')).toBeNull();
    expect(screen.getByRole('tab', { name: '번호' })).toBeTruthy();
  });

  test('shows unlimited access for Pro users', async () => {
    mockIsPro = true;
    mockMonetizationState = {
      access: { ...freeAccess, isPro: true },
      status: 'ready',
    };
    const screen = await renderScreen();
    await act(async () => { fireEvent.press(screen.getByRole('button', { name: '조건 선택하기' })); });
    expect(screen.getByRole('button', { name: '3개 조건 적용, 결과 바로 보기' })).toBeTruthy();
    expect(screen.getByText('결과 바로 보기')).toBeTruthy();
  });

  test('starts with active range defaults and applies a fixed number from the condition sheet', async () => {
    mockPush.mockClear();
    const screen = await renderScreen();
    expect(screen.getByRole('button', { name: '조건 설정, 3개 적용 중' })).toBeTruthy();
    await act(async () => { fireEvent.press(screen.getByRole('button', { name: '조건 선택하기' })); });
    expect(screen.getByTestId('condition-editor')).toBeTruthy();
    expect(screen.getByText('선택하지 않은 항목은 제한 없이 적용돼요.')).toBeTruthy();
    await act(async () => { fireEvent.press(screen.getByLabelText('7번')); });
    await act(async () => { fireEvent.press(screen.getByText('4개 조건 적용')); });
    await waitFor(() => expect(screen.getByText('고정 7')).toBeTruthy());
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith({
      pathname: '/combination-analysis',
      params: {
        analyze: expect.stringMatching(/^generator-conditions-/),
        returnTo: 'draw',
        returnCount: '1',
        returnSession: 'generator',
        returnToken: expect.any(String),
      },
    }), { timeout: 4500 });
  }, 7000);

  test('closes the direct condition selector while opening analysis and restores it on return', async () => {
    mockPush.mockClear();
    const screen = await render(<DirectSessionHarness />);

    expect(screen.getByTestId('condition-editor')).toBeTruthy();
    expect(screen.queryByTestId('condition-sheet-modal')).toBeNull();
    expect(screen.queryByTestId('direct-condition-shell')).toBeNull();
    expect(screen.queryByText('조건 뽑기')).toBeNull();
    await act(async () => { fireEvent.press(screen.getByRole('button', { name: '균형 프리셋 적용 안 함' })); });
    expect(screen.getByRole('tab', { name: '번호' }).props.accessibilityState).toEqual({ selected: true });

    await act(async () => { fireEvent.press(screen.getByLabelText('7번')); });
    await act(async () => {
      fireEvent.press(screen.getByText('4개 조건 적용'));
    });
    expect(screen.getByText('조합을 만들고 있어요')).toBeTruthy();
    expect(screen.getByTestId('direct-condition-shell')).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalled();

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith({
      pathname: '/combination-analysis',
      params: {
        analyze: expect.stringMatching(/^generator-conditions-/),
        returnCount: '1',
        returnSession: 'condition-session',
        returnTo: 'combination-generator',
        returnToken: expect.any(String),
      },
    }), { timeout: 4500 });
    expect(screen.queryByTestId('condition-editor')).toBeNull();

    await act(async () => {
      latestFocusCallback?.();
    });
    expect(screen.getByTestId('condition-editor')).toBeTruthy();
    expect(screen.queryByTestId('recommendation-prompt')).toBeNull();

    await act(async () => { fireEvent.press(screen.getByLabelText('조합 선택 화면 다시 열기')); });
    await act(async () => { fireEvent.press(screen.getByRole('button', { name: '균형 프리셋 적용 안 함' })); });
    expect(screen.getByLabelText('7번, 고정수')).toBeTruthy();
  }, 7000);

  test('pops the direct condition selector from the draw stack', async () => {
    mockBack.mockClear();
    mockReplace.mockClear();
    const screen = await render(<DirectSessionHarness />);
    await act(async () => { fireEvent.press(screen.getByRole('button', { name: '균형 프리셋 적용 안 함' })); });

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: '조건 선택 취소' }));
    });

    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  test('offers the balanced preset to members on direct entry and applies it after confirmation', async () => {
    const screen = await render(<DirectSessionHarness />);

    expect(screen.getByTestId('recommendation-prompt')).toBeTruthy();
    expect(screen.getByText('균형 프리셋을 적용할까요?')).toBeTruthy();

    await act(async () => { fireEvent.press(screen.getByRole('button', { name: '균형 프리셋 적용' })); });

    expect(screen.queryByTestId('recommendation-prompt')).toBeNull();
    expect(screen.getByText('6개 조건 적용')).toBeTruthy();
    expect(screen.getByRole('button', { name: '균형 프리셋 적용됨' }).props.accessibilityState)
      .toEqual({ selected: true });
  });

  test('explains guest limits and opens login instead of applying the balanced preset', async () => {
    mockIsGuest = true;
    const screen = await render(<DirectSessionHarness />);

    expect(screen.getByText('균형 프리셋은 로그인 후 사용할 수 있어요')).toBeTruthy();
    expect(screen.getByText(/게스트도 조건을 직접 설정할 수 있고 한 번에 최대 2게임/)).toBeTruthy();
    expect(screen.getByText('로그인하고 최대 5개 조합 만들기', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText('균형 프리셋과 기기 저장도 함께 이용할 수 있어요.', { includeHiddenElements: true })).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: '균형 프리셋 사용을 위해 로그인' }));
    });

    expect(mockOpenLogin).toHaveBeenCalledWith('balanced-preset');
    expect(screen.queryByRole('button', { name: '균형 프리셋 적용됨' })).toBeNull();
  });

  test('shows the seven-column number selector in the Number tab and keeps selection state', async () => {
    const screen = await renderScreen();
    await act(async () => { fireEvent.press(screen.getByRole('button', { name: '조건 선택하기' })); });

    expect(screen.getByRole('tab', { name: '번호' }).props.accessibilityState).toEqual({ selected: true });
    expect(screen.getByTestId('number-status-grid')).toBeTruthy();
    expect(screen.getByTestId('number-grid-placeholder-3')).toBeTruthy();
    const numberChipStyle = StyleSheet.flatten(screen.getByLabelText('7번').props.style);
    const numberTextStyle = StyleSheet.flatten(within(screen.getByLabelText('7번')).getByText('7').props.style);
    expect(numberChipStyle.width).toBeLessThanOrEqual(48);
    expect(numberChipStyle.height).toBe(numberChipStyle.width);
    expect(numberTextStyle.fontSize).toBe(typography.sizes.small);
    expect(screen.queryByRole('button', { name: '번호 보기' })).toBeNull();
    expect(screen.queryByText('아래 번호판에서 바로 설정')).toBeNull();
    expect(screen.queryByText('선택 방식')).toBeNull();
    expect(screen.queryByText('방식을 고른 뒤 번호를 눌러주세요.')).toBeNull();
    expect(screen.queryByText('고정수는 최대 6개이며 고정수와 제외수는 자동으로 겹치지 않게 처리됩니다.')).toBeNull();

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

  test('fits the number grid to the measured card width on narrow screens', async () => {
    const screen = await renderScreen();
    await act(async () => { fireEvent.press(screen.getByRole('button', { name: '조건 선택하기' })); });

    await act(async () => {
      fireEvent(screen.getByTestId('fixed-excluded-content'), 'layout', {
        nativeEvent: { layout: { height: 400, width: 280, x: 0, y: 0 } },
      });
    });

    const gridStyle = StyleSheet.flatten(screen.getByTestId('number-status-grid').props.style);
    const numberChipStyle = StyleSheet.flatten(screen.getByLabelText('7번').props.style);
    expect(gridStyle.width).toBeLessThanOrEqual(280);
    expect(numberChipStyle.width).toBeCloseTo((280 - (spacing.sm * 6)) / 7);
    expect((numberChipStyle.width * 7) + (spacing.sm * 6)).toBeLessThanOrEqual(280);
  });

  test('keeps every category in one list and updates the tab while scrolling vertically', async () => {
    const screen = await renderScreen();
    await act(async () => { fireEvent.press(screen.getByRole('button', { name: '조건 선택하기' })); });

    const content = screen.getByTestId('condition-content');
    ['번호', '분포', '수 성격', '직전·연번', '번호대·과거'].forEach((label) => {
      expect(within(content).getByRole('header', { name: label })).toBeTruthy();
    });
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

  test('shows every condition switch enabled by default', async () => {
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
        .toEqual({ checked: true });
    });
  });

  test('collapses inactive filters and restores their previous selections when enabled again', async () => {
    const screen = await renderScreen();
    await act(async () => { fireEvent.press(screen.getByRole('button', { name: '조건 선택하기' })); });
    await act(async () => { fireEvent.press(screen.getByRole('tab', { name: '분포' })); });

    const balancedRatio = screen.getByRole('checkbox', { name: '홀수 3개, 짝수 3개' });
    await act(async () => { fireEvent.press(balancedRatio); });
    expect(screen.getByLabelText('홀짝 비율')).toBeTruthy();

    await act(async () => { fireEvent.press(screen.getByRole('switch', { name: '홀짝 비율 조건' })); });
    expect(screen.queryByLabelText('홀짝 비율')).toBeNull();
    expect(screen.getByText('비활성 · 제한 없이 적용')).toBeTruthy();

    await act(async () => { fireEvent.press(screen.getByRole('switch', { name: '홀짝 비율 조건' })); });
    expect(screen.getByRole('checkbox', { name: '홀수 3개, 짝수 3개' }).props.accessibilityState)
      .toEqual({ checked: true });

    await act(async () => { fireEvent.press(screen.getByRole('switch', { name: '표준편차 조건' })); });
    expect(screen.queryByLabelText('표준편차 최솟값')).toBeNull();
    await act(async () => { fireEvent.press(screen.getByRole('switch', { name: '표준편차 조건' })); });
    expect(screen.getByLabelText('표준편차 최솟값').props.defaultValue).toBe('12.0');
  });

  test('loads the broad six-condition preset without starting analysis', async () => {
    const screen = await renderScreen();
    await act(async () => { fireEvent.press(screen.getByRole('button', { name: '조건 선택하기' })); });

    expect(screen.getByText('3개 조건 적용')).toBeTruthy();
    await act(async () => { fireEvent.press(screen.getByRole('button', { name: '균형 프리셋 적용' })); });

    expect(screen.getByText('6개 조건 적용')).toBeTruthy();
    expect(screen.getByRole('button', { name: '균형 프리셋 적용됨' }).props.accessibilityState)
      .toEqual({ selected: true });
    expect(screen.getByText('표준편차 · 번호 합계 · 홀짝 · 저고 · A/C · 연번')).toBeTruthy();
    expect(screen.queryByText(/균형 조건 프리셋/)).toBeNull();
    expect(screen.queryByText('과거 형태를 넓게 포함하는 6개 조건 · 당첨 예측 아님')).toBeNull();
    expect(screen.getByRole('tab', { name: '번호' }).props.accessibilityState).toEqual({ selected: true });
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
    expect(screen.getByRole('button', { name: '균형 프리셋 적용' }).props.accessibilityState)
      .toEqual({ selected: false });
    expect(screen.getByText('5개 조건 적용')).toBeTruthy();
    expect(screen.getByText('표준편차 · 번호 합계 · 저고 · A/C · 연번')).toBeTruthy();
    expect(screen.queryByText('표준편차 · 번호 합계 · 홀짝 · 저고 · A/C · 연번')).toBeNull();
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

  test('shows historical range presets enabled, preserves edits across toggles, and resets them', async () => {
    const screen = await renderScreen();
    await act(async () => { fireEvent.press(screen.getByRole('button', { name: '조건 선택하기' })); });
    await act(async () => { fireEvent.press(screen.getByRole('tab', { name: '분포' })); });

    expect(screen.getByRole('switch', { name: '표준편차 조건' }).props.accessibilityState).toEqual({ checked: true });
    expect(screen.getByLabelText('표준편차 최솟값').props.defaultValue).toBe('12.0');
    expect(screen.getByLabelText('표준편차 최댓값').props.defaultValue).toBe('12.9');
    expect(screen.getByLabelText('번호 총합 최솟값').props.defaultValue).toBe('130');
    expect(screen.getByLabelText('끝수 총합 최솟값').props.defaultValue).toBe('25');
    expect(screen.getAllByText('과거 최다').length).toBeGreaterThanOrEqual(3);

    await act(async () => {
      fireEvent(screen.getByLabelText('표준편차 최솟값'), 'endEditing', { nativeEvent: { text: '11.0' } });
    });
    await act(async () => { fireEvent.press(screen.getByRole('switch', { name: '표준편차 조건' })); });
    await act(async () => { fireEvent.press(screen.getByRole('switch', { name: '표준편차 조건' })); });
    expect(screen.getByLabelText('표준편차 최솟값').props.defaultValue).toBe('11.0');

    await act(async () => { fireEvent.press(screen.getByLabelText('조건 초기화')); });
    expect(screen.getByRole('switch', { name: '표준편차 조건' }).props.accessibilityState).toEqual({ checked: true });
    expect(screen.getByLabelText('표준편차 최솟값').props.defaultValue).toBe('12.0');
  });

  test('renders selectable same-ending and consecutive visual cards with accessible labels', async () => {
    const screen = await renderScreen();
    await act(async () => { fireEvent.press(screen.getByRole('button', { name: '조건 선택하기' })); });
    await act(async () => { fireEvent.press(screen.getByRole('tab', { name: '분포' })); });

    const sameEnding = screen.getByTestId('pattern-sameEnding-2+2');
    expect(sameEnding.props.accessibilityState).toEqual({ checked: false });
    await act(async () => { fireEvent.press(sameEnding); });
    expect(screen.getByTestId('pattern-sameEnding-2+2').props.accessibilityState).toEqual({ checked: true });

    await act(async () => { fireEvent.press(screen.getByRole('tab', { name: '직전·연번' })); });
    expect(screen.getByLabelText('없음, 과거 최다')).toBeTruthy();
    const consecutive = screen.getByTestId('pattern-consecutive-3+2');
    await act(async () => { fireEvent.press(consecutive); });
    expect(screen.getByTestId('pattern-consecutive-3+2').props.accessibilityState).toEqual({ checked: true });
  });

  test('generates one combination and hands it to the existing analysis tab', async () => {
    mockPush.mockClear();
    const screen = await renderScreen();
    await act(async () => { fireEvent.press(screen.getByRole('button', { name: '조합 만들기' })); });
    await waitFor(() => expect(screen.getByText('생성된 번호')).toBeTruthy());
    expect(screen.getByText('다시 만들기')).toBeTruthy();
    await act(async () => { fireEvent.press(screen.getByRole('button', { name: '조합 분석하기' })); });
    expect(mockPush).toHaveBeenCalledWith(expect.objectContaining({ pathname: '/combination-analysis' }));
  });
});
