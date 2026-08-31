import { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeInDown, FadeOut } from 'react-native-reanimated';

import { radius, spacing, typography, type ThemeColors, useThemedStyles } from '@/theme';

const NUMBER_COUNT = 6;
const MAX_LOTTO_NUMBER = 45;
const SHUFFLE_STEP_MS = 110;

const NUMBER_ENTERING = FadeInDown
  .duration(220)
  .easing(Easing.out(Easing.cubic))
  .withInitialValues({ opacity: 0, transform: [{ translateY: 5 }] });

const NUMBER_EXITING = FadeOut
  .duration(160)
  .easing(Easing.out(Easing.cubic));

function makeInitialNumbers() {
  return [4, 11, 18, 27, 34, 42];
}

function nextUniqueNumber(numbers: readonly number[], index: number) {
  const occupied = new Set(numbers.filter((_, numberIndex) => numberIndex !== index));
  const current = numbers[index];
  let candidate = current;

  while (candidate === current || occupied.has(candidate)) {
    candidate = Math.floor(Math.random() * MAX_LOTTO_NUMBER) + 1;
  }

  return candidate;
}

type AnalysisNumberShuffleProps = {
  testID: string;
};

export function AnalysisNumberShuffle({ testID }: AnalysisNumberShuffleProps) {
  const styles = useThemedStyles(createStyles);
  const [reduceMotion, setReduceMotion] = useState(true);
  const [numbers, setNumbers] = useState(makeInitialNumbers);

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) return;

    let index = 0;
    const interval = setInterval(() => {
      setNumbers((current) => current.map((number, numberIndex) => (
        numberIndex === index ? nextUniqueNumber(current, index) : number
      )));
      index = (index + 1) % NUMBER_COUNT;
    }, SHUFFLE_STEP_MS);

    return () => clearInterval(interval);
  }, [reduceMotion]);

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.numberPills}
      testID={testID}>
      {numbers.map((number, index) => (
        <View key={index} style={styles.numberPill} testID={`${testID}-number-${index}`}>
          {reduceMotion ? (
            <Text style={styles.numberPillText}>—</Text>
          ) : (
            <Animated.Text
              entering={NUMBER_ENTERING}
              exiting={NUMBER_EXITING}
              key={number}
              style={styles.numberPillText}>
              {String(number).padStart(2, '0')}
            </Animated.Text>
          )}
        </View>
      ))}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  numberPills: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    width: '100%',
  },
  numberPill: {
    width: '13%',
    maxWidth: 48,
    aspectRatio: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surfaceElevated,
  },
  numberPillText: {
    position: 'absolute',
    color: colors.textTertiary,
    fontSize: 18,
    fontWeight: typography.weights.semibold,
  },
});
