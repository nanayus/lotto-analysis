import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { colors, spacing, typography } from '@/theme';

const FADE_IN_DURATION = 360;
const SPLASH_HOLD_DURATION = 560;
const FADE_OUT_DURATION = 300;

export function BrandSplash() {
  const [visible, setVisible] = useState(true);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withSequence(
      withTiming(1, { duration: FADE_IN_DURATION, easing: Easing.out(Easing.cubic) }),
      withDelay(
        SPLASH_HOLD_DURATION,
        withTiming(
          0,
          { duration: FADE_OUT_DURATION, easing: Easing.inOut(Easing.quad) },
          (finished) => {
            if (finished) {
              scheduleOnRN(setVisible, false);
            }
          },
        ),
      ),
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.overlay, animatedStyle]}>
      <View style={styles.copyBlock}>
        <Text style={styles.copy}>번호는 무작위.</Text>
        <Text style={styles.copy}>
          보는 방식은 <Text style={styles.accent}>다르게.</Text>
        </Text>
      </View>
      <View style={styles.brandBlock}>
        <View style={styles.brandMark}>
          <View style={styles.brandLineShort} />
          <View style={styles.brandLineTall} />
          <View style={styles.brandLineShort} />
        </View>
        <Text style={styles.brand}>LOTTO INSIGHT</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 100,
    pointerEvents: 'none',
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyBlock: {
    marginTop: spacing.huge,
    alignItems: 'center',
  },
  copy: {
    color: colors.textPrimary,
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.semibold,
    lineHeight: 40,
    letterSpacing: -0.8,
  },
  accent: {
    color: colors.accentPrimary,
  },
  brandBlock: {
    position: 'absolute',
    bottom: '15%',
    alignItems: 'center',
    gap: spacing.md,
  },
  brandMark: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
    height: 24,
  },
  brandLineShort: {
    width: 2,
    height: 13,
    borderRadius: 1,
    backgroundColor: colors.accentPrimary,
  },
  brandLineTall: {
    width: 2,
    height: 22,
    borderRadius: 1,
    backgroundColor: colors.highlight,
  },
  brand: {
    color: colors.textSecondary,
    fontSize: 9,
    letterSpacing: 5,
  },
});
