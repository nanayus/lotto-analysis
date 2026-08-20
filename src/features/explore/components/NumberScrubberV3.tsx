/* eslint-disable react-hooks/immutability -- Reanimated shared values are mutable animation state. */
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityActionEvent,
  LayoutChangeEvent,
  Platform,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedRef,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  useTimestamp,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { colors } from '@/theme';

import { MAX_NUMBER, MIN_NUMBER } from '../constants';
import type { InteractionFocus } from '../interactionFocus';
import {
  FINAL_SNAP_DURATION,
  FOCUS_Y,
  INTERACTION_EMPHASIS_DURATION,
  NUMBER_STEP,
  PROGRAMMATIC_SCROLL_GUARD_MS,
  RAIL_X,
  RAIL_RECOVERY_CONFIG,
  SCROLL_DECELERATION_RATE,
  SCROLL_END_DEBOUNCE_MS,
  SLOW_HAPTIC_VELOCITY,
} from '../scrubberV3.constants';
import { clampNumber, randomLottoNumber, snapNumber } from '../sliderMath';
import {
  continuousNumberForOffset,
  nearestScrubberOffset,
  scrubberOffsetForNumber,
} from '../scrubberV3Math';
import MagneticRail from './MagneticRail';
import { ScrubberNumberItem } from './ScrubberNumberItem';

export type NumberScrubberV3Props = {
  interactionFocus?: InteractionFocus;
  value?: number;
  initialNumber?: number;
  onInteractionEnd?: () => void;
  onInteractionStart?: () => void;
  onValueChange?: (number: number) => void;
};

type ScrubberLayout = {
  height: number;
  width: number;
};

const webClipStyle = Platform.select<ViewStyle>({
  web: { overflow: 'clip' } as unknown as ViewStyle,
});

export function NumberScrubberV3({
  interactionFocus = 'IDLE',
  value,
  initialNumber,
  onInteractionEnd,
  onInteractionStart,
  onValueChange,
}: NumberScrubberV3Props) {
  const [uncontrolledValue, setUncontrolledValue] = useState(() =>
    clampNumber(initialNumber ?? randomLottoNumber()),
  );
  const [layout, setLayout] = useState<ScrubberLayout>({ height: 0, width: 0 });
  const selectedNumber = clampNumber(value ?? uncontrolledValue);
  const [initialOffset] = useState(() => scrubberOffsetForNumber(selectedNumber));

  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const initializedRef = useRef(false);
  const webSnapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const programmaticScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCommittedNumber = useRef(selectedNumber);

  // ScrollView owns the physics. This offset is the single continuous visual source.
  const scrollOffset = useSharedValue(initialOffset);
  const scrollVelocity = useSharedValue(0);
  const previousOffset = useSharedValue(initialOffset);
  const previousTimestamp = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const isMomentum = useSharedValue(false);
  const isReady = useSharedValue(false);
  const interactionReported = useSharedValue(false);
  const activeEmphasis = useSharedValue(0);
  const isProgrammaticScroll = useSharedValue(false);
  const programmaticTargetOffset = useSharedValue(-1);
  const frameTimestamp = useTimestamp();
  const reducedMotion = useReducedMotion();
  const continuousValue = useDerivedValue(() => continuousNumberForOffset(scrollOffset.value));
  const visualVelocity = useDerivedValue(() =>
    reducedMotion ? scrollVelocity.value * 0.18 : scrollVelocity.value,
  );

  const focusTickStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      activeEmphasis.value,
      [-1, 0, 1],
      [0.68, 0.84, 1],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        scaleX: interpolate(
          activeEmphasis.value,
          [-1, 0, 1],
          [0.92, 1, 1.04],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  useEffect(() => {
    const target = interactionFocus === 'LEFT' ? 1 : interactionFocus === 'RIGHT' ? -1 : 0;
    activeEmphasis.value = withTiming(target, { duration: INTERACTION_EMPHASIS_DURATION });
  }, [activeEmphasis, interactionFocus]);

  const notifyInteractionStart = useCallback(() => {
    onInteractionStart?.();
  }, [onInteractionStart]);

  const notifyInteractionEnd = useCallback(() => {
    onInteractionEnd?.();
  }, [onInteractionEnd]);

  const emitSelectionHaptic = useCallback(() => {
    if (Platform.OS !== 'web') {
      void Haptics.selectionAsync();
    }
  }, []);

  const commitNumber = useCallback(
    (nextValue: number, allowHaptic = false) => {
      const nextNumber = snapNumber(nextValue);
      if (lastCommittedNumber.current === nextNumber) {
        return;
      }

      lastCommittedNumber.current = nextNumber;
      if (value === undefined) {
        setUncontrolledValue(nextNumber);
      }
      onValueChange?.(nextNumber);

      if (allowHaptic) {
        emitSelectionHaptic();
      }
    },
    [emitSelectionHaptic, onValueChange, value],
  );

  const finishWebScroll = useCallback(
    (offset: number) => {
      const target = nearestScrubberOffset(offset);

      if (Math.abs(target - offset) < 0.5) {
        scrollVelocity.value = withSpring(0, RAIL_RECOVERY_CONFIG);
        interactionReported.value = false;
        isProgrammaticScroll.value = false;
        notifyInteractionEnd();
        return;
      }

      isProgrammaticScroll.value = true;
      scrollRef.current?.scrollTo({ animated: true, y: target });
      setTimeout(() => {
        scrollVelocity.value = withSpring(0, RAIL_RECOVERY_CONFIG);
        interactionReported.value = false;
        isProgrammaticScroll.value = false;
        notifyInteractionEnd();
      }, FINAL_SNAP_DURATION);
    },
    [
      interactionReported,
      isProgrammaticScroll,
      notifyInteractionEnd,
      scrollRef,
      scrollVelocity,
    ],
  );

  const queueWebSnap = useCallback(
    (offset: number) => {
      if (Platform.OS !== 'web') {
        return;
      }

      if (webSnapTimerRef.current) {
        clearTimeout(webSnapTimerRef.current);
      }
      webSnapTimerRef.current = setTimeout(
        () => finishWebScroll(offset),
        SCROLL_END_DEBOUNCE_MS,
      );
    },
    [finishWebScroll],
  );

  useEffect(
    () => () => {
      if (webSnapTimerRef.current) {
        clearTimeout(webSnapTimerRef.current);
      }
      if (programmaticScrollTimerRef.current) {
        clearTimeout(programmaticScrollTimerRef.current);
      }
    },
    [],
  );

  const animateToOffset = useCallback(
    (offset: number) => {
      if (programmaticScrollTimerRef.current) {
        clearTimeout(programmaticScrollTimerRef.current);
      }

      programmaticTargetOffset.value = offset;
      isProgrammaticScroll.value = true;
      scrollRef.current?.scrollTo({ animated: true, y: offset });

      // Native and web normally release the guard when onScroll reaches the target.
      // This fallback settles exactly at the requested number if smooth scrolling is interrupted.
      programmaticScrollTimerRef.current = setTimeout(() => {
        if (programmaticTargetOffset.value !== offset) {
          return;
        }
        scrollOffset.value = offset;
        previousOffset.value = offset;
        scrollVelocity.value = 0;
        scrollRef.current?.scrollTo({ animated: false, y: offset });
        programmaticTargetOffset.value = -1;
        isProgrammaticScroll.value = false;
      }, PROGRAMMATIC_SCROLL_GUARD_MS);
    }, [
      isProgrammaticScroll,
      previousOffset,
      programmaticTargetOffset,
      scrollOffset,
      scrollRef,
      scrollVelocity,
    ],
  );

  useEffect(() => {
    if (!layout.height || initializedRef.current) {
      return;
    }

    initializedRef.current = true;
    const offset = scrubberOffsetForNumber(selectedNumber);
    scrollOffset.value = offset;
    previousOffset.value = offset;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ animated: false, y: offset });
      requestAnimationFrame(() => {
        isReady.value = true;
      });
    });
  }, [isReady, layout.height, previousOffset, scrollOffset, scrollRef, selectedNumber]);

  useEffect(() => {
    if (value === undefined || value === lastCommittedNumber.current) {
      return;
    }

    const nextNumber = clampNumber(value);
    lastCommittedNumber.current = nextNumber;
    const offset = scrubberOffsetForNumber(nextNumber);
    animateToOffset(offset);
  }, [animateToOffset, value]);

  useAnimatedReaction(
    () => snapNumber(continuousValue.value),
    (nextNumber, previousNumber) => {
      if (
        !isReady.value ||
        isProgrammaticScroll.value ||
        previousNumber === null ||
        nextNumber === previousNumber
      ) {
        return;
      }

      const slowDirectDrag =
        isDragging.value &&
        !isMomentum.value &&
        Math.abs(scrollVelocity.value) < SLOW_HAPTIC_VELOCITY;
      scheduleOnRN(commitNumber, nextNumber, slowDirectDrag);
    },
    [commitNumber, scrollRef],
  );

  const scrollHandler = useAnimatedScrollHandler({
    onBeginDrag: (event) => {
      isDragging.value = true;
      isMomentum.value = false;
      if (!interactionReported.value) {
        interactionReported.value = true;
        scheduleOnRN(notifyInteractionStart);
      }
      previousOffset.value = event.contentOffset.y;
      previousTimestamp.value = frameTimestamp.value;
    },
    onScroll: (event) => {
      const rawOffset = Math.max(
        0,
        Math.min((MAX_NUMBER - 1) * NUMBER_STEP, event.contentOffset.y),
      );
      const elapsed = frameTimestamp.value - previousTimestamp.value;
      const deltaTime = Math.max(
        8,
        Math.min(32, elapsed),
      );
      const movement = rawOffset - previousOffset.value;
      const rawVelocity = (movement / deltaTime) * 1000;

      scrollOffset.value = rawOffset;
      scrollVelocity.value = scrollVelocity.value * 0.72 + rawVelocity * 0.28;
      previousOffset.value = rawOffset;
      previousTimestamp.value = frameTimestamp.value;

      if (
        isProgrammaticScroll.value &&
        programmaticTargetOffset.value >= 0 &&
        Math.abs(rawOffset - programmaticTargetOffset.value) < 0.5
      ) {
        programmaticTargetOffset.value = -1;
        isProgrammaticScroll.value = false;
        scrollVelocity.value = withSpring(0, RAIL_RECOVERY_CONFIG);
      }

      if (
        !isProgrammaticScroll.value &&
        !interactionReported.value &&
        Math.abs(movement) > 0.01
      ) {
        interactionReported.value = true;
        scheduleOnRN(notifyInteractionStart);
      }

      if (Platform.OS === 'web' && !isProgrammaticScroll.value) {
        scheduleOnRN(queueWebSnap, rawOffset);
      }
    },
    onEndDrag: () => {
      isDragging.value = false;
      scrollVelocity.value = withTiming(0, { duration: 240 });
      interactionReported.value = false;
      scheduleOnRN(notifyInteractionEnd);
    },
    onMomentumBegin: () => {
      isMomentum.value = true;
      if (!interactionReported.value) {
        interactionReported.value = true;
        scheduleOnRN(notifyInteractionStart);
      }
    },
    onMomentumEnd: () => {
      isMomentum.value = false;
      scrollVelocity.value = withSpring(0, RAIL_RECOVERY_CONFIG);
      interactionReported.value = false;
      scheduleOnRN(emitSelectionHaptic);
      scheduleOnRN(notifyInteractionEnd);
    },
  });

  const scrollToNumber = useCallback(
    (nextValue: number, animated = true) => {
      const nextNumber = snapNumber(nextValue);
      const offset = scrubberOffsetForNumber(nextNumber);
      if (animated) {
        animateToOffset(offset);
      } else {
        programmaticTargetOffset.value = offset;
        isProgrammaticScroll.value = true;
        scrollOffset.value = offset;
        previousOffset.value = offset;
        scrollVelocity.value = 0;
        scrollRef.current?.scrollTo({ animated: false, y: offset });
        programmaticTargetOffset.value = -1;
        isProgrammaticScroll.value = false;
      }
      commitNumber(nextNumber, false);
    },
    [
      animateToOffset,
      commitNumber,
      isProgrammaticScroll,
      previousOffset,
      programmaticTargetOffset,
      scrollOffset,
      scrollRef,
      scrollVelocity,
    ],
  );

  const onAccessibilityAction = useCallback(
    (event: AccessibilityActionEvent) => {
      if (event.nativeEvent.actionName === 'increment') {
        scrollToNumber(Math.min(MAX_NUMBER, selectedNumber + 1));
      }
      if (event.nativeEvent.actionName === 'decrement') {
        scrollToNumber(Math.max(MIN_NUMBER, selectedNumber - 1));
      }
    },
    [scrollToNumber, selectedNumber],
  );

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { height, width } = event.nativeEvent.layout;
    setLayout({ height, width });
  }, []);

  const focusY = layout.height * FOCUS_Y;
  const paddingTop = Math.max(0, focusY - NUMBER_STEP / 2);
  const paddingBottom = Math.max(0, layout.height - focusY - NUMBER_STEP / 2);

  return (
    <View
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      accessibilityLabel={`로또 번호 탐색, 현재 ${selectedNumber}번`}
      accessibilityRole="adjustable"
      accessibilityValue={{ min: MIN_NUMBER, max: MAX_NUMBER, now: selectedNumber }}
      onAccessibilityAction={onAccessibilityAction}
      onLayout={onLayout}
      style={[styles.container, webClipStyle]}
      testID="number-scrubber-v3">
      <Animated.ScrollView
        bounces={false}
        contentOffset={{ x: 0, y: initialOffset }}
        contentContainerStyle={{ paddingBottom, paddingTop }}
        decelerationRate={SCROLL_DECELERATION_RATE}
        directionalLockEnabled
        nestedScrollEnabled
        onScroll={scrollHandler}
        overScrollMode="never"
        ref={scrollRef}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        snapToAlignment="start"
        snapToInterval={Platform.OS === 'web' ? undefined : NUMBER_STEP}
        style={styles.scrollView}
        testID="number-scrubber-scroll">
        {Array.from({ length: MAX_NUMBER }, (_, index) => {
          const number = index + 1;
          return (
            <ScrubberNumberItem
              activeEmphasis={activeEmphasis}
              key={number}
              number={number}
              onPress={scrollToNumber}
              paneWidth={layout.width}
              scrollOffset={scrollOffset}
              scrollVelocity={visualVelocity}
            />
          );
        })}
      </Animated.ScrollView>

      {layout.height > 0 && layout.width > 0 ? (
        <MagneticRail
          activeEmphasis={activeEmphasis}
          continuousValue={continuousValue}
          height={layout.height}
          scrollVelocity={visualVelocity}
          width={layout.width}
        />
      ) : null}

      {layout.height > 0 && layout.width > 0 ? (
        <Animated.View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[
            styles.focusTick,
            {
              left: layout.width * RAIL_X - 27,
              top: focusY - 0.75,
            },
            focusTickStyle,
          ]}
          testID="scrubber-focus-tick"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 336,
    overflow: 'hidden',
    position: 'relative',
  },
  scrollView: {
    flex: 1,
    zIndex: 1,
  },
  focusTick: {
    position: 'absolute',
    width: 27,
    height: 1.5,
    borderRadius: 2,
    backgroundColor: colors.accentPrimary,
    pointerEvents: 'none',
    transformOrigin: 'right center',
    zIndex: 4,
  },
});
