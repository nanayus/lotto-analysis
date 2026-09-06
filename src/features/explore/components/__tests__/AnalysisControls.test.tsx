import { act, fireEvent, render } from '@testing-library/react-native';
import { describe, expect, jest, test } from '@jest/globals';
import { StyleSheet } from 'react-native';

import { AnalysisControls } from '../AnalysisControls';

describe('AnalysisControls', () => {
  test('expands custom range inputs inside the period selector without a nested modal', async () => {
    const onPeriodChange = jest.fn();
    const screen = await render(
      <AnalysisControls
        bonusIncluded={false}
        firstRound={1}
        latestRound={1239}
        onBonusChange={() => undefined}
        onPeriodChange={onPeriodChange}
        period={{ kind: 'preset', label: '전체' }}
      />,
    );

    await act(async () => {
      fireEvent.press(screen.getByTestId('analysis-period-chip'));
    });
    await act(async () => {
      fireEvent.press(screen.getByText('직접 선택'));
    });

    expect(screen.getByTestId('analysis-custom-range')).toBeTruthy();
    expect(screen.queryByText('회차 직접 선택')).toBeNull();

    const startInput = screen.getByLabelText('시작 회차');
    const endInput = screen.getByLabelText('종료 회차');
    expect(StyleSheet.flatten(startInput.props.style)).toMatchObject({
      flex: 1,
      flexBasis: 0,
      minWidth: 0,
    });
    expect(StyleSheet.flatten(endInput.props.style)).toMatchObject({
      flex: 1,
      flexBasis: 0,
      minWidth: 0,
    });

    await act(async () => fireEvent.changeText(startInput, '1200'));
    await act(async () => fireEvent.changeText(endInput, '1210'));
    await act(async () => fireEvent.press(screen.getByLabelText('직접 선택 적용')));

    expect(onPeriodChange).toHaveBeenCalledWith({
      endRound: 1210,
      kind: 'custom',
      startRound: 1200,
    });
    expect(screen.queryByTestId('analysis-custom-range')).toBeNull();
  });
});
