import { useEffect } from 'react';
import {
  StyleSheet,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import NumberFlow from 'rn-number-flow';

const BALL_REVEAL_SPRING = {
  damping: 9,
  mass: 0.55,
  stiffness: 230,
} as const;

type AnimatedNumberBallProps = {
  number: number;
  revealed: boolean;
  revealedStyle?: StyleProp<ViewStyle>;
  revealedTextStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  textStyle?: StyleProp<TextStyle>;
};

export function AnimatedNumberBall({
  number,
  revealed,
  revealedStyle,
  revealedTextStyle,
  style,
  testID,
  textStyle,
}: AnimatedNumberBallProps) {
  const revealScale = useSharedValue(1);

  useEffect(() => {
    if (!revealed) {
      revealScale.set(1);
      return;
    }
    revealScale.set(0.7);
    revealScale.set(withSpring(1, BALL_REVEAL_SPRING));
  }, [revealScale, revealed]);

  const revealAnimationStyle = useAnimatedStyle(() => ({
    transform: [{ scale: revealScale.value }],
  }));

  return (
    <Animated.View style={[style, revealed && revealedStyle, revealAnimationStyle]} testID={testID}>
      <NumberFlow
        animationConfig={{
          animateOnMount: false,
          damping: 15,
          digitDelay: 18,
          mass: 0.55,
          stiffness: 180,
        }}
        style={StyleSheet.flatten([textStyle, revealed && revealedTextStyle])}
        value={String(number).padStart(2, '0')}
      />
    </Animated.View>
  );
}
