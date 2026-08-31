import { useEffect } from 'react';
import {
  type LayoutChangeEvent,
  type StyleProp,
  StyleSheet,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const OPEN_DURATION_MS = 220;
const CLOSE_DURATION_MS = 170;

export function CollapsibleConditionContent({
  children,
  expanded,
  style,
}: {
  children: React.ReactNode;
  expanded: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const contentHeight = useSharedValue(0);
  const progress = useSharedValue(expanded ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(expanded ? 1 : 0, {
      duration: expanded ? OPEN_DURATION_MS : CLOSE_DURATION_MS,
      easing: expanded ? Easing.out(Easing.cubic) : Easing.inOut(Easing.quad),
      reduceMotion: ReduceMotion.System,
    });
  }, [expanded, progress]);

  const clipStyle = useAnimatedStyle(() => ({
    height: contentHeight.value > 0
      ? contentHeight.value * progress.value
      : expanded ? undefined : 0,
    opacity: progress.value,
  }), [expanded]);

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -4 * (1 - progress.value) }],
  }));

  const measureContent = (event: LayoutChangeEvent) => {
    const nextHeight = event.nativeEvent.layout.height;
    if (nextHeight > 0 && nextHeight !== contentHeight.value) {
      contentHeight.value = nextHeight;
    }
  };

  return (
    <Animated.View
      accessibilityElementsHidden={!expanded}
      importantForAccessibility={expanded ? 'auto' : 'no-hide-descendants'}
      pointerEvents={expanded ? 'auto' : 'none'}
      style={[styles.clip, clipStyle]}>
      <Animated.View onLayout={measureContent} style={[style, contentStyle]}>
        {children}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
});
