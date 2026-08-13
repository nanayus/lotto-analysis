import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { describe, expect, jest, test } from '@jest/globals';

import { NumberSlider } from '../NumberSlider';

describe('NumberSlider', () => {
  test('uses the provided initial selected number', async () => {
    const { getByTestId } = await render(<NumberSlider initialNumber={17} />);

    expect(getByTestId('number-slider').props.accessibilityValue.now).toBe(17);
  });

  test('does not move below the lower bound', async () => {
    const onValueChange = jest.fn();
    const { getByTestId } = await render(
      <NumberSlider initialNumber={1} onValueChange={onValueChange} />,
    );

    fireEvent(getByTestId('number-slider'), 'accessibilityAction', {
      nativeEvent: { actionName: 'decrement' },
    });

    expect(getByTestId('number-slider').props.accessibilityValue.now).toBe(1);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  test('does not move above the upper bound', async () => {
    const onValueChange = jest.fn();
    const { getByTestId } = await render(
      <NumberSlider initialNumber={45} onValueChange={onValueChange} />,
    );

    fireEvent(getByTestId('number-slider'), 'accessibilityAction', {
      nativeEvent: { actionName: 'increment' },
    });

    expect(getByTestId('number-slider').props.accessibilityValue.now).toBe(45);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  test('selects a visible number directly and calls the callback once', async () => {
    const onValueChange = jest.fn();
    const { getByTestId } = await render(
      <NumberSlider initialNumber={17} onValueChange={onValueChange} />,
    );

    fireEvent.press(getByTestId('number-option-19'));

    await waitFor(() => {
      expect(getByTestId('number-slider').props.accessibilityValue.now).toBe(19);
    });
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith(19);
  });

  test('does not repeat the callback for the current number', async () => {
    const onValueChange = jest.fn();
    const { getByTestId } = await render(
      <NumberSlider initialNumber={17} onValueChange={onValueChange} />,
    );

    fireEvent.press(getByTestId('number-option-17'));

    expect(onValueChange).not.toHaveBeenCalled();
  });
});
