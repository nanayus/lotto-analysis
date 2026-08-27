import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { describe, expect, jest, test } from '@jest/globals';
import { router } from 'expo-router';

import { CombinationDraftProvider } from '@/features/combination/CombinationDraftContext';

import { CombinationGeneratorScreen } from '../CombinationGeneratorScreen';
import { pageIndexFromHorizontalSwipe } from '../components/ConditionSheet';

jest.mock('expo-router', () => ({
  router: { navigate: jest.fn() },
}));

const mockNavigate = router.navigate as jest.Mock;

function renderScreen() {
  return render(
    <CombinationDraftProvider>
      <CombinationGeneratorScreen />
    </CombinationDraftProvider>,
  );
}

describe('CombinationGeneratorScreen', () => {
  test('moves exactly one page for a Safari-style horizontal touch swipe', () => {
    expect(pageIndexFromHorizontalSwipe({ deltaX: -120, deltaY: 10, page: 0 })).toBe(1);
    expect(pageIndexFromHorizontalSwipe({ deltaX: 120, deltaY: 10, page: 1 })).toBe(0);
    expect(pageIndexFromHorizontalSwipe({ deltaX: -30, deltaY: 0, page: 0 })).toBe(0);
    expect(pageIndexFromHorizontalSwipe({ deltaX: -45, deltaY: 100, page: 0 })).toBe(0);
    expect(pageIndexFromHorizontalSwipe({ deltaX: -120, deltaY: 10, page: 4 })).toBe(4);
  });

  test('starts unlimited and applies a fixed number from the condition sheet', async () => {
    const screen = await renderScreen();
    expect(screen.getByText('무제한')).toBeTruthy();
    await act(async () => { fireEvent.press(screen.getByRole('button', { name: '조건 선택하기' })); });
    expect(screen.getByText('선택 안 함은 제한 없음으로 적용돼요.')).toBeTruthy();
    await act(async () => { fireEvent.press(screen.getByLabelText('7번')); });
    await act(async () => { fireEvent.press(screen.getByText('1개 조건 적용')); });
    await waitFor(() => expect(screen.getByText('고정 7')).toBeTruthy());
  });

  test('expands the number status rail into a seven-column grid and keeps selection state', async () => {
    const screen = await renderScreen();
    await act(async () => { fireEvent.press(screen.getByRole('button', { name: '조건 선택하기' })); });

    expect(screen.getByTestId('number-status-rail')).toBeTruthy();
    expect(screen.queryByTestId('number-status-grid')).toBeNull();
    expect(screen.getByRole('button', { name: '번호 전체 펼치기' }).props.accessibilityState).toEqual({ expanded: false });

    await act(async () => { fireEvent.press(screen.getByRole('button', { name: '번호 전체 펼치기' })); });

    expect(screen.queryByTestId('number-status-rail')).toBeNull();
    expect(screen.getByTestId('number-status-grid')).toBeTruthy();
    expect(screen.getByTestId('number-grid-placeholder-3')).toBeTruthy();
    expect(screen.getByRole('button', { name: '번호 접기' }).props.accessibilityState).toEqual({ expanded: true });

    await act(async () => { fireEvent.press(screen.getByLabelText('7번')); });
    expect(screen.getByLabelText('7번, 고정수')).toBeTruthy();

    await act(async () => { fireEvent.press(screen.getByRole('tab', { name: '분포' })); });
    expect(screen.getByTestId('number-status-grid')).toBeTruthy();

    await act(async () => { fireEvent.press(screen.getByRole('button', { name: '번호 접기' })); });
    expect(screen.getByTestId('number-status-rail')).toBeTruthy();
    expect(screen.getByRole('button', { name: '번호 전체 펼치기' }).props.accessibilityState).toEqual({ expanded: false });
  });

  test('updates the selected category tab while swiping condition pages', async () => {
    const screen = await renderScreen();
    await act(async () => { fireEvent.press(screen.getByRole('button', { name: '조건 선택하기' })); });

    expect(screen.getByRole('tab', { name: '번호' }).props.accessibilityState).toEqual({ selected: true });

    await act(async () => {
      fireEvent.scroll(screen.getByTestId('condition-pages'), {
        nativeEvent: {
          contentOffset: { x: 390, y: 0 },
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

  test('generates one combination and hands it to the existing analysis tab', async () => {
    mockNavigate.mockClear();
    const screen = await renderScreen();
    await act(async () => { fireEvent.press(screen.getByText('번호 만들기')); });
    await waitFor(() => expect(screen.getByText('생성된 번호')).toBeTruthy());
    expect(screen.getByText('다시 만들기')).toBeTruthy();
    await act(async () => { fireEvent.press(screen.getByText('이 조합 분석하기 →')); });
    expect(mockNavigate).toHaveBeenCalledWith(expect.objectContaining({ pathname: '/(tabs)/combination' }));
  });
});
