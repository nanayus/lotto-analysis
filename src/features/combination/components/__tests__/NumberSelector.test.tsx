import { useState } from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { describe, expect, jest, test } from '@jest/globals';

import { NumberSelector } from '../NumberSelector';

function Harness({ onAnalyze }: { onAnalyze: () => void }) {
  const [numbers, setNumbers] = useState<number[]>([]);
  const [excludedNumbers, setExcludedNumbers] = useState<number[]>([]);
  const toggle = (number: number) => {
    if (numbers.includes(number)) {
      setNumbers(numbers.filter((item) => item !== number));
      setExcludedNumbers([...excludedNumbers, number]);
      return;
    }
    if (excludedNumbers.includes(number)) {
      setExcludedNumbers(excludedNumbers.filter((item) => item !== number));
      return;
    }
    if (numbers.length === 6) return;
    setNumbers([...numbers, number].sort((left, right) => left - right));
  };
  return (
    <NumberSelector
      excludedNumbers={excludedNumbers}
      onAnalyze={onAnalyze}
      onRandomFill={() => undefined}
      onToggleNumber={toggle}
      selectedNumbers={numbers}
    />
  );
}

describe('NumberSelector', () => {
  test('enables analysis only at six selections and prevents a seventh', async () => {
    const onAnalyze = jest.fn();
    const { getByTestId } = await render(<Harness onAnalyze={onAnalyze} />);

    expect(getByTestId('analyze-combination-button').props.accessibilityState.disabled).toBe(true);
    for (const number of [1, 2, 3, 4, 5, 6]) {
      await act(async () => {
        await fireEvent.press(getByTestId(`combination-number-${number}`));
      });
    }

    expect(getByTestId('analyze-combination-button').props.accessibilityState.disabled).toBe(false);
    expect(getByTestId('combination-number-7').props.accessibilityState.disabled).toBe(true);
    await act(async () => {
      await fireEvent.press(getByTestId('combination-number-7'));
    });
    expect(getByTestId('combination-number-7').props.accessibilityState.checked).toBe(false);

    await act(async () => {
      await fireEvent.press(getByTestId('analyze-combination-button'));
    });
    expect(onAnalyze).toHaveBeenCalledTimes(1);
  });

  test('cycles a number through selected, excluded, and unselected', async () => {
    const { getByTestId, queryByTestId } = await render(<Harness onAnalyze={() => undefined} />);
    await act(async () => {
      await fireEvent.press(getByTestId('combination-number-12'));
    });
    expect(getByTestId('combination-number-12').props.accessibilityState.checked).toBe(true);
    await act(async () => {
      await fireEvent.press(getByTestId('combination-number-12'));
    });
    expect(getByTestId('combination-number-12').props.accessibilityState.checked).toBe(false);
    expect(getByTestId('combination-number-12').props.accessibilityLabel).toContain('제외됨');
    expect(queryByTestId('excluded-mark-12')).toBeNull();
    await act(async () => {
      await fireEvent.press(getByTestId('combination-number-12'));
    });
    expect(getByTestId('combination-number-12').props.accessibilityLabel).toBe('12번');
    expect(queryByTestId('excluded-mark-12')).toBeNull();
  });
});
