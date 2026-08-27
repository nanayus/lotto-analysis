import { Platform, Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';

import { type ThemeColors, typography, useAppTheme, useThemedStyles } from '@/theme';

import { MAX_NUMBER, NUMBER_STEP, RAIL_BASE_OFFSET } from '../constants';
import { numberOffsetFromSelection } from '../sliderMath';

const webFocusStyle = Platform.select<ViewStyle>({
  web: { outlineStyle: 'none' } as unknown as ViewStyle,
});

type NumberScaleProps = {
  continuousNumber: SharedValue<number>;
  onNumberPress: (number: number) => void;
};

type NumberRowProps = NumberScaleProps & {
  number: number;
};

function NumberRow({ continuousNumber, number, onNumberPress }: NumberRowProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const rowStyle = useAnimatedStyle(() => {
    const signedDistance = number - continuousNumber.value;
    const distance = Math.abs(signedDistance);

    return {
      opacity: interpolate(distance, [0, 1, 2.3, 4.6, 6], [1, 0.78, 0.48, 0.15, 0], Extrapolation.CLAMP),
      transform: [
        { translateY: numberOffsetFromSelection(number, continuousNumber.value) },
        {
          translateX: interpolate(
            distance,
            [0, 1.2, 3.5, 6],
            [8, 3, -1, -4],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  const labelStyle = useAnimatedStyle(() => {
    const distance = Math.abs(number - continuousNumber.value);

    return {
      color: interpolateColor(
        distance,
        [0, 0.58, 2.5],
        [colors.accentPrimary, colors.textPrimary, colors.textSecondary],
      ),
      transform: [
        {
          scale: interpolate(
            distance,
            [0, 1, 2.5, 5],
            [1.18, 1, 0.88, 0.76],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  const tickStyle = useAnimatedStyle(() => {
    const distance = Math.abs(number - continuousNumber.value);

    return {
      opacity: interpolate(distance, [0, 1.2, 3.5, 6], [1, 0.76, 0.38, 0], Extrapolation.CLAMP),
      width: interpolate(distance, [0, 1, 3, 6], [31, 19, 11, 6], Extrapolation.CLAMP),
      transform: [
        {
          translateX: interpolate(
            distance,
            [0, 1.4, 4],
            [7, 3, 0],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  return (
    <Animated.View style={[styles.row, rowStyle]}>
      <Pressable
        accessibilityLabel={`${number}번 선택`}
        accessibilityRole="button"
        onPress={() => onNumberPress(number)}
        style={[styles.pressTarget, webFocusStyle]}
        testID={`number-option-${number}`}>
        <Animated.Text style={[styles.number, labelStyle]}>{number}</Animated.Text>
        <Animated.View style={[styles.tick, tickStyle]} />
      </Pressable>
    </Animated.View>
  );
}

export function NumberScale(props: NumberScaleProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={[StyleSheet.absoluteFill, styles.scaleLayer]}>
      {Array.from({ length: MAX_NUMBER }, (_, index) => (
        <NumberRow key={index + 1} number={index + 1} {...props} />
      ))}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  scaleLayer: {
    pointerEvents: 'box-none',
  },
  row: {
    position: 'absolute',
    top: '50%',
    right: 0,
    left: 0,
    height: NUMBER_STEP,
    marginTop: -NUMBER_STEP / 2,
    justifyContent: 'center',
  },
  pressTarget: {
    height: NUMBER_STEP,
    justifyContent: 'center',
  },
  number: {
    position: 'absolute',
    right: RAIL_BASE_OFFSET + 34,
    minWidth: 31,
    textAlign: 'right',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: typography.weights.semibold,
    fontVariant: ['tabular-nums'],
    transformOrigin: 'right center',
  },
  tick: {
    position: 'absolute',
    right: RAIL_BASE_OFFSET,
    height: 1.5,
    borderRadius: 2,
    backgroundColor: colors.accentSecondary,
    transformOrigin: 'right center',
  },
});
