/* eslint-disable react-hooks/immutability -- Reanimated shared values are mutable animation state. */
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityActionEvent,
  LayoutChangeEvent,
  Platform,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  cancelAnimation,
  useAnimatedReaction,
  useSharedValue,
  withDecay,
  withSpring,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { colors, spacing } from '@/theme';

import {
  DECELERATION,
  FLING_VELOCITY_THRESHOLD,
  MAX_FLING_DISTANCE,
  MAX_NUMBER,
  MIN_NUMBER,
  NUMBER_STEP,
  SNAP_SPRING_CONFIG,
} from '../constants';
import { clampNumber, randomLottoNumber, snapNumber } from '../sliderMath';
import { CurvedRail } from './CurvedRail';
import { NumberScale } from './NumberScale';
import { SliderHandle } from './SliderHandle';

export type NumberSliderProps = {
  value?: number;
  initialNumber?: number;
  onValueChange?: (number: number) => void;
};

const webClipStyle = Platform.select<ViewStyle>({
  // Unlike hidden, clip can never become a programmatically scrollable box
  // when a transformed/focused number row sits beyond the viewport.
  web: { overflow: 'clip' } as unknown as ViewStyle,
});

export function NumberSliderV2({ value, initialNumber, onValueChange }: NumberSliderProps) {
  const [uncontrolledValue, setUncontrolledValue] = useState(() =>
    clampNumber(initialNumber ?? randomLottoNumber()),
  );
  const selectedNumber = clampNumber(value ?? uncontrolledValue);

  // This is the only animated scroll position. Drag, decay, rail geometry,
  // labels and ticks all derive directly from it.
  const continuousNumber = useSharedValue(selectedNumber);
  const layoutHeight = useSharedValue(0);
  const layoutWidth = useSharedValue(0);
  const isWheelMoving = useSharedValue(false);
  const lastCommittedNumber = useRef(selectedNumber);

  const commitNumber = useCallback(
    (nextValue: number) => {
      const nextNumber = snapNumber(nextValue);
      if (lastCommittedNumber.current === nextNumber) {
        return;
      }

      lastCommittedNumber.current = nextNumber;
      if (value === undefined) {
        setUncontrolledValue(nextNumber);
      }
      onValueChange?.(nextNumber);

      if (Platform.OS !== 'web') {
        void Haptics.selectionAsync();
      }
    },
    [onValueChange, value],
  );

  useEffect(() => {
    const nextNumber = clampNumber(value ?? uncontrolledValue);
    if (lastCommittedNumber.current === nextNumber) {
      return;
    }

    cancelAnimation(continuousNumber);
    isWheelMoving.value = false;
    lastCommittedNumber.current = nextNumber;
    continuousNumber.value = nextNumber;
  }, [continuousNumber, isWheelMoving, uncontrolledValue, value]);

  useAnimatedReaction(
    () => snapNumber(continuousNumber.value),
    (nextNumber, previousNumber) => {
      if (!isWheelMoving.value || previousNumber === null || nextNumber === previousNumber) {
        return;
      }

      const direction = nextNumber > previousNumber ? 1 : -1;
      for (
        let boundary = previousNumber + direction;
        direction > 0 ? boundary <= nextNumber : boundary >= nextNumber;
        boundary += direction
      ) {
        scheduleOnRN(commitNumber, boundary);
      }
    },
    [commitNumber],
  );

  const selectNumber = useCallback(
    (nextValue: number) => {
      const nextNumber = snapNumber(nextValue);
      cancelAnimation(continuousNumber);
      isWheelMoving.value = false;
      continuousNumber.value = nextNumber;
      commitNumber(nextNumber);
    },
    [commitNumber, continuousNumber, isWheelMoving],
  );

  const panGesture = Gesture.Pan()
    .activeOffsetY([-4, 4])
    .failOffsetX([-28, 28])
    .onTouchesDown(() => {
      // A new contact takes ownership before the pan activation threshold,
      // so an in-flight decay can never keep moving beneath the user's finger.
      cancelAnimation(continuousNumber);
      isWheelMoving.value = true;
    })
    .onBegin(() => {
      cancelAnimation(continuousNumber);
      isWheelMoving.value = true;
    })
    .onChange((event) => {
      // Negative finger movement throws higher numbers upward through the focus.
      continuousNumber.value = clampNumber(
        continuousNumber.value - event.changeY / NUMBER_STEP,
      );
    })
    .onEnd((event) => {
      const settleToInteger = () => {
        'worklet';
        continuousNumber.value = withSpring(
          snapNumber(continuousNumber.value),
          SNAP_SPRING_CONFIG,
          (finished) => {
            if (finished) {
              isWheelMoving.value = false;
            }
          },
        );
      };

      if (Math.abs(event.velocityY) < FLING_VELOCITY_THRESHOLD) {
        settleToInteger();
        return;
      }

      const decayStart = continuousNumber.value;
      const minimum = Math.max(MIN_NUMBER, decayStart - MAX_FLING_DISTANCE);
      const maximum = Math.min(MAX_NUMBER, decayStart + MAX_FLING_DISTANCE);

      continuousNumber.value = withDecay(
        {
          velocity: -event.velocityY / NUMBER_STEP,
          deceleration: DECELERATION,
          clamp: [minimum, maximum],
          rubberBandEffect: false,
        },
        (finished) => {
          if (finished) {
            settleToInteger();
          }
        },
      );
    })
    .onFinalize((_event, succeeded) => {
      if (!succeeded) {
        isWheelMoving.value = false;
      }
    });

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      layoutHeight.value = event.nativeEvent.layout.height;
      layoutWidth.value = event.nativeEvent.layout.width;
    },
    [layoutHeight, layoutWidth],
  );

  const onAccessibilityAction = useCallback(
    (event: AccessibilityActionEvent) => {
      if (event.nativeEvent.actionName === 'increment') {
        selectNumber(Math.min(MAX_NUMBER, selectedNumber + 1));
      }
      if (event.nativeEvent.actionName === 'decrement') {
        selectNumber(Math.max(MIN_NUMBER, selectedNumber - 1));
      }
    },
    [selectNumber, selectedNumber],
  );

  return (
    <GestureDetector gesture={panGesture}>
      <View
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        accessibilityLabel={`로또 번호 선택, 현재 ${selectedNumber}번`}
        accessibilityRole="adjustable"
        accessibilityValue={{ min: MIN_NUMBER, max: MAX_NUMBER, now: selectedNumber }}
        onAccessibilityAction={onAccessibilityAction}
        onLayout={onLayout}
        style={[styles.container, webClipStyle]}
        testID="number-slider">
        <Text style={styles.helper}>SCRUB · FLICK · SETTLE</Text>
        <CurvedRail
          continuousNumber={continuousNumber}
          layoutHeight={layoutHeight}
          layoutWidth={layoutWidth}
        />
        <NumberScale continuousNumber={continuousNumber} onNumberPress={selectNumber} />
        <SliderHandle />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 336,
    overflow: 'hidden',
    position: 'relative',
  },
  helper: {
    position: 'absolute',
    top: spacing.xs,
    left: 1,
    zIndex: 2,
    color: colors.textSecondary,
    fontSize: 8,
    letterSpacing: 1.2,
    opacity: 0.56,
  },
});
