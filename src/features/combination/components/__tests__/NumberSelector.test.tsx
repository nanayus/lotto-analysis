import { useState } from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { describe, expect, jest, test } from '@jest/globals';

import { NumberSelector } from '../NumberSelector';

function Harness({ onAnalyze }: { onAnalyze: () => void }) {
  const [numbers, setNumbers] = useState<number[]>([]);
  const toggle = (number: number) => {
    setNumbers((current) => {
      if (current.includes(number)) return current.filter((item) => item !== number);
      if (current.length === 6) return current;
      return [...current, number].sort((left, right) => left - right);
    });
  };
  return (
    <NumberSelector
      onAnalyze={onAnalyze}
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
        fireEvent.press(getByTestId(`combination-number-${number}`));
      });
    }

    expect(getByTestId('analyze-combination-button').props.accessibilityState.disabled).toBe(false);
    expect(getByTestId('combination-number-7').props.accessibilityState.disabled).toBe(true);
    await act(async () => {
      fireEvent.press(getByTestId('combination-number-7'));
    });
    expect(getByTestId('combination-number-7').props.accessibilityState.checked).toBe(false);

    await act(async () => {
      fireEvent.press(getByTestId('analyze-combination-button'));
    });
    expect(onAnalyze).toHaveBeenCalledTimes(1);
  });

  test('allows a selected number to be removed', async () => {
    const { getByTestId } = await render(<Harness onAnalyze={() => undefined} />);
    await act(async () => {
      fireEvent.press(getByTestId('combination-number-12'));
    });
    expect(getByTestId('combination-number-12').props.accessibilityState.checked).toBe(true);
    await act(async () => {
      fireEvent.press(getByTestId('combination-number-12'));
    });
    expect(getByTestId('combination-number-12').props.accessibilityState.checked).toBe(false);
  });
});
