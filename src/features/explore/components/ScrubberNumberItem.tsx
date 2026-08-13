import { Platform, Pressable, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';

import { colors, typography } from '@/theme';

import {
  FAR_OPACITY,
  FAR_SCALE,
  FISHEYE_X_OFFSET,
  LABEL_RAIL_SAFE_GAP,
  NEAR_OPACITY,
  NEAR_SCALE,
  NUMBER_STEP,
  RAIL_X,
  SELECTED_OPACITY,
  SELECTED_SCALE,
  VELOCITY_FOR_MAX_DEFORMATION,
} from '../scrubberV3.constants';

const webFocusStyle = Platform.select<ViewStyle>({
  web: { outlineStyle: 'none' } as unknown as ViewStyle,
});

type ScrubberNumberItemProps = {
  activeEmphasis: SharedValue<number>;
  number: number;
  paneWidth: number;
  scrollOffset: SharedValue<number>;
  scrollVelocity: SharedValue<number>;
  onPress: (number: number) => void;
};

export function ScrubberNumberItem({
  activeEmphasis,
  number,
  paneWidth,
  scrollOffset,
  scrollVelocity,
  onPress,
}: ScrubberNumberItemProps) {
  const rowStyle = useAnimatedStyle(() => {
    const continuousValue = scrollOffset.value / NUMBER_STEP + 1;
    const distance = Math.abs(number - continuousValue);
    const speed = Math.min(
      1,
      Math.abs(scrollVelocity.value) / VELOCITY_FOR_MAX_DEFORMATION,
    );
    const anchorLift = number % 5 === 0 ? 0.025 : 0;
    const proximity = interpolate(distance, [0, 1, 2], [1, 0.28, 0], Extrapolation.CLAMP);
    const emphasisOpacity = interpolate(
      activeEmphasis.value,
      [-1, 0, 1],
      [-0.1, 0, 0.04],
      Extrapolation.CLAMP,
    );

    return {
      opacity: Math.min(
        SELECTED_OPACITY,
        interpolate(
          distance,
          [0, 1, 2, 3, 4],
          [SELECTED_OPACITY, NEAR_OPACITY, 0.39, 0.21, FAR_OPACITY + anchorLift],
          Extrapolation.CLAMP,
        ) - speed * 0.045 + emphasisOpacity * proximity,
      ),
      transform: [
        {
          translateX: interpolate(
            distance,
            [0, 1, 2, 4],
            [0, -1, -2, -FISHEYE_X_OFFSET],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  const numberStyle = useAnimatedStyle(() => {
    const continuousValue = scrollOffset.value / NUMBER_STEP + 1;
    const distance = Math.abs(number - continuousValue);
    const proximity = interpolate(distance, [0, 1, 2], [1, 0.25, 0], Extrapolation.CLAMP);
    const focusScale = interpolate(
      activeEmphasis.value,
      [-1, 0, 1],
      [0.98, 1, 1.03],
      Extrapolation.CLAMP,
    );
    const baseScale = interpolate(
      distance,
      [0, 1, 2, 3, 4],
      [SELECTED_SCALE, NEAR_SCALE, 0.5, 0.42, FAR_SCALE],
      Extrapolation.CLAMP,
    );

    return {
      color: interpolateColor(
        distance,
        [0, 0.58, 2.4],
        [colors.accentPrimary, colors.textPrimary, colors.textSecondary],
      ),
      transform: [
        {
          scale: baseScale * (1 + (focusScale - 1) * proximity),
        },
      ],
    };
  });

  return (
    <Pressable
      accessibilityLabel={`${number}번 선택`}
      accessibilityRole="button"
      onPress={() => onPress(number)}
      style={[styles.pressTarget, webFocusStyle]}
      testID={`scrubber-number-${number}`}>
      <Animated.View style={[styles.fisheyeGroup, rowStyle]}>
        <Animated.Text
          style={[
            styles.number,
            { right: paneWidth * (1 - RAIL_X) + LABEL_RAIL_SAFE_GAP },
            numberStyle,
          ]}>
          {number}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressTarget: {
    height: NUMBER_STEP,
    justifyContent: 'center',
  },
  fisheyeGroup: {
    height: NUMBER_STEP,
    justifyContent: 'center',
  },
  number: {
    position: 'absolute',
    width: 64,
    textAlign: 'right',
    fontSize: 36,
    lineHeight: 40,
    fontWeight: typography.weights.semibold,
    fontVariant: ['tabular-nums'],
    transformOrigin: 'right center',
  },
});
