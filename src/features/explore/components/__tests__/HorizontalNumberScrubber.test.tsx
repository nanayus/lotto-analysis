import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { describe, expect, jest, test } from '@jest/globals';
import { StyleSheet } from 'react-native';

import {
  HORIZONTAL_FISHEYE_OPACITIES,
  HORIZONTAL_FISHEYE_SCALES,
  HORIZONTAL_NUMBER_STEP,
  HORIZONTAL_SCRUBBER_HEIGHT,
} from '../../scrubberV3.constants';
import {
  HorizontalNumberScrubber,
  nextWheelAnimationOffset,
  shouldStartNewWheelBurst,
} from '../HorizontalNumberScrubber';
import { NumberScrubber } from '../NumberScrubber';

jest.mock('../HorizontalMagneticRail', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('../NumberScrubberV3', () => ({
  NumberScrubberV3: () => null,
}));

describe('HorizontalNumberScrubber', () => {
  test('uses the same adjustable selection contract as the vertical scrubber', async () => {
    const onValueChange = jest.fn();
    const screen = await render(
      <HorizontalNumberScrubber initialNumber={17} onValueChange={onValueChange} />,
    );

    expect(screen.getByTestId('horizontal-number-scrubber').props.accessibilityValue.now).toBe(17);
    expect(StyleSheet.flatten(screen.getByTestId('horizontal-number-scrubber').props.style).height)
      .toBe(HORIZONTAL_SCRUBBER_HEIGHT);

    fireEvent(screen.getByTestId('horizontal-number-scrubber'), 'accessibilityAction', {
      nativeEvent: { actionName: 'increment' },
    });

    await waitFor(() => {
      expect(screen.getByTestId('horizontal-number-scrubber').props.accessibilityValue.now).toBe(18);
    });
    expect(onValueChange).toHaveBeenCalledWith(18);
  });

  test('selects a number directly and supports the shared orientation wrapper', async () => {
    const onValueChange = jest.fn();
    const screen = await render(
      <NumberScrubber
        initialNumber={17}
        onValueChange={onValueChange}
        orientation="horizontal"
      />,
    );

    fireEvent.press(screen.getByTestId('horizontal-scrubber-number-19'));

    await waitFor(() => {
      expect(screen.getByTestId('horizontal-number-scrubber').props.accessibilityValue.now).toBe(19);
    });
    expect(onValueChange).toHaveBeenCalledWith(19);

    fireEvent.press(screen.getByTestId('horizontal-scrubber-number-21'));

    await waitFor(() => {
      expect(screen.getByTestId('horizontal-number-scrubber').props.accessibilityValue.now).toBe(21);
    });
    expect(onValueChange).toHaveBeenCalledWith(21);
  });

  test('updates the selected number from horizontal scroll position', async () => {
    const onValueChange = jest.fn();
    const screen = await render(
      <HorizontalNumberScrubber initialNumber={17} onValueChange={onValueChange} />,
    );

    fireEvent.scroll(screen.getByTestId('horizontal-number-scroll'), {
      nativeEvent: {
        contentOffset: { x: 19 * HORIZONTAL_NUMBER_STEP, y: 0 },
        velocity: { x: 0, y: 0 },
      },
    });

    await waitFor(() => expect(onValueChange).toHaveBeenCalledWith(20));
  });

  test('lets an immediate same-direction drag interrupt the previous momentum', async () => {
    const onValueChange = jest.fn();
    const screen = await render(
      <HorizontalNumberScrubber initialNumber={17} onValueChange={onValueChange} />,
    );
    const scrollView = screen.getByTestId('horizontal-number-scroll');

    expect(scrollView.props.contentOffset).toBeUndefined();

    fireEvent(scrollView, 'scrollBeginDrag');
    fireEvent.scroll(scrollView, {
      nativeEvent: {
        contentOffset: { x: 17 * HORIZONTAL_NUMBER_STEP, y: 0 },
        velocity: { x: 0, y: 0 },
      },
    });
    fireEvent(scrollView, 'scrollEndDrag', {
      nativeEvent: { velocity: { x: 1, y: 0 } },
    });
    fireEvent(scrollView, 'momentumScrollBegin');

    fireEvent(scrollView, 'scrollBeginDrag');
    fireEvent(scrollView, 'momentumScrollEnd');
    fireEvent.scroll(scrollView, {
      nativeEvent: {
        contentOffset: { x: 18 * HORIZONTAL_NUMBER_STEP, y: 0 },
        velocity: { x: 0, y: 0 },
      },
    });
    fireEvent(scrollView, 'scrollEndDrag', {
      nativeEvent: { velocity: { x: 0, y: 0 } },
    });

    await waitFor(() => {
      expect(onValueChange).toHaveBeenCalledWith(18);
      expect(onValueChange).toHaveBeenCalledWith(19);
    });
  });

  test('starts a fresh wheel burst for a renewed same-direction impulse', () => {
    expect(shouldStartNewWheelBurst({
      currentDelta: 64,
      currentTimestamp: 1_010,
      interactionActive: true,
      limitReached: true,
      previousDelta: 4,
      previousTimestamp: 1_000,
    })).toBe(true);

    expect(shouldStartNewWheelBurst({
      currentDelta: 64,
      currentTimestamp: 1_010,
      interactionActive: true,
      limitReached: true,
      previousDelta: 64,
      previousTimestamp: 1_000,
    })).toBe(false);
  });

  test('advances a fast wheel gesture through visible intermediate frames', () => {
    const currentOffset = 16 * HORIZONTAL_NUMBER_STEP;
    const targetOffset = 25 * HORIZONTAL_NUMBER_STEP;
    const nextOffset = nextWheelAnimationOffset(currentOffset, targetOffset);

    expect(nextOffset).toBeGreaterThan(currentOffset);
    expect(nextOffset - currentOffset).toBeLessThan(HORIZONTAL_NUMBER_STEP);
    expect(nextOffset).toBeLessThan(targetOffset);
  });

  test('keeps the center size and reduces adjacent-number emphasis', () => {
    expect(HORIZONTAL_FISHEYE_SCALES[4]).toBeGreaterThan(1);
    expect(HORIZONTAL_FISHEYE_SCALES[3]).toBeLessThanOrEqual(0.6);
    expect(HORIZONTAL_FISHEYE_SCALES[2]).toBeLessThanOrEqual(0.43);
    expect(HORIZONTAL_FISHEYE_OPACITIES[3]).toBeLessThanOrEqual(0.46);
  });
});
