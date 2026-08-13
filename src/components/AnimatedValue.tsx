import { DimensionValue, StyleProp, StyleSheet, TextStyle, View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';

type AnimatedValueProps = {
  align?: 'left' | 'center' | 'right';
  children: string | number;
  height: number;
  style?: StyleProp<TextStyle>;
  width: DimensionValue;
};

export function AnimatedValue({
  align = 'left',
  children,
  height,
  style,
  width,
}: AnimatedValueProps) {
  return (
    <View style={[styles.slot, { height, width }]}>
      <Animated.Text
        entering={FadeInDown.duration(150)}
        exiting={FadeOutUp.duration(100)}
        key={String(children)}
        style={[styles.value, { textAlign: align }, style]}>
        {children}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    position: 'relative',
    overflow: 'hidden',
  },
  value: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
  },
});
