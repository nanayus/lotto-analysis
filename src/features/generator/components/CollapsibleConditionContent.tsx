import { useEffect } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const OPEN_DURATION_MS = 220;
export function CollapsibleConditionContent({
  children,
  expanded,
  style,
}: {
  children: React.ReactNode;
  expanded: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const progress = useSharedValue(expanded ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(expanded ? 1 : 0, {
      duration: OPEN_DURATION_MS,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });
  }, [expanded, progress]);

  const contentStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: -4 * (1 - progress.value) }],
  }));

  // Measuring children while their parent is height: 0 is unreliable in optimized
  // iOS builds. Mount enabled controls at their natural height so a condition can
  // never remain visually collapsed after its switch has been turned on.
  if (!expanded) return null;

  return (
    <Animated.View style={[style, contentStyle]}>
      {children}
    </Animated.View>
  );
}
