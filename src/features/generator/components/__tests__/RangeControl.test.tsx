import { render } from '@testing-library/react-native';
import { describe, expect, jest, test } from '@jest/globals';
import { StyleSheet } from 'react-native';

import {
  RangeControl,
  rangeValueFromDrag,
  rangeValueToPercent,
} from '../RangeControl';

describe('RangeControl', () => {
  test('positions both thumbs and the active track on the same full-range scale', async () => {
    const screen = await render(
      <RangeControl
        limits={{ min: 1.7, max: 21.1 }}
        onChange={jest.fn()}
        step={0.1}
        title="표준편차"
        value={{ enabled: true, min: 10, max: 13.8 }}
      />,
    );

    const minPercent = rangeValueToPercent(10, 1.7, 21.1);
    const maxPercent = rangeValueToPercent(13.8, 1.7, 21.1);
    const minStyle = StyleSheet.flatten(screen.getByTestId('range-thumb-표준편차-min').props.style);
    const maxStyle = StyleSheet.flatten(screen.getByTestId('range-thumb-표준편차-max').props.style);
    const activeStyle = StyleSheet.flatten(screen.getByTestId('range-active-track-표준편차').props.style);

    expect(minStyle.left).toBe(`${minPercent}%`);
    expect(maxStyle.left).toBe(`${maxPercent}%`);
    expect(activeStyle.left).toBe(`${minPercent}%`);
    expect(activeStyle.width).toBe(`${maxPercent - minPercent}%`);
  });

  test('uses the gesture start value with total drag distance without compounding moves', () => {
    const common = {
      allowedMax: 21.1,
      allowedMin: 1.7,
      rangeMax: 21.1,
      rangeMin: 1.7,
      startValue: 10,
      step: 0.1,
      trackWidth: 200,
    };

    expect(rangeValueFromDrag({ ...common, deltaX: 20 })).toBe(11.9);
    expect(rangeValueFromDrag({ ...common, deltaX: 40 })).toBe(13.9);
    expect(rangeValueFromDrag({ ...common, deltaX: -500 })).toBe(1.7);
    expect(rangeValueFromDrag({ ...common, deltaX: 500 })).toBe(21.1);
  });
});
