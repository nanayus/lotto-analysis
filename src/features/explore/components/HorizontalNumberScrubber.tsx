/* eslint-disable react-hooks/immutability -- animated values and scroll refs are mutable interaction state. */
import * as Haptics from 'expo-haptics';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityActionEvent,
  Animated,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { useSharedValue, withTiming } from 'react-native-reanimated';

import { type ThemeColors, typography, useThemedStyles } from '@/theme';

import { MAX_NUMBER, MIN_NUMBER } from '../constants';
import type { InteractionFocus } from '../interactionFocus';
import {
  HORIZONTAL_FISHEYE_OPACITIES,
  HORIZONTAL_FISHEYE_SCALES,
  HORIZONTAL_ITEM_HEIGHT,
  HORIZONTAL_NUMBER_STEP,
  HORIZONTAL_SCRUBBER_HEIGHT,
  INTERACTION_EMPHASIS_DURATION,
  MAX_FLING_ITEMS,
  RAIL_MAX_VISUAL_VELOCITY,
  SELECTED_OPACITY,
} from '../scrubberV3.constants';
import { nearestScrubberOffset, scrubberOffsetForNumber } from '../scrubberV3Math';
import { clampNumber, randomLottoNumber, snapNumber } from '../sliderMath';
import HorizontalMagneticRail from './HorizontalMagneticRail';

export type HorizontalNumberScrubberProps = {
  interactionFocus?: InteractionFocus;
  value?: number;
  initialNumber?: number;
  onInteractionEnd?: () => void;
  onInteractionStart?: () => void;
  onValueChange?: (number: number) => void;
};

const NUMBERS = Array.from({ length: MAX_NUMBER }, (_, index) => index + MIN_NUMBER);
const MAX_OFFSET = (MAX_NUMBER - MIN_NUMBER) * HORIZONTAL_NUMBER_STEP;
const WHEEL_END_DELAY = 420;
const WHEEL_GESTURE_GAP = 90;
const WHEEL_REENGAGE_DELTA_RATIO = 1.45;
const WHEEL_REENGAGE_MIN_DELTA = HORIZONTAL_NUMBER_STEP * 0.12;
const WHEEL_FRAME_EASING = 0.32;
const WHEEL_MAX_FRAME_TRAVEL = HORIZONTAL_NUMBER_STEP * 0.72;
const WEB_EVENT_DELTA_LIMIT = HORIZONTAL_NUMBER_STEP * 2.2;
const WEB_BURST_TRAVEL_LIMIT = HORIZONTAL_NUMBER_STEP * MAX_FLING_ITEMS;

export function nextWheelAnimationOffset(currentOffset: number, targetOffset: number) {
  const remaining = targetOffset - currentOffset;
  if (Math.abs(remaining) < 0.35) return targetOffset;
  const easedTravel = remaining * WHEEL_FRAME_EASING;
  const frameTravel = Math.max(
    -WHEEL_MAX_FRAME_TRAVEL,
    Math.min(WHEEL_MAX_FRAME_TRAVEL, easedTravel),
  );
  return currentOffset + frameTravel;
}

export function shouldStartNewWheelBurst({
  currentDelta,
  currentTimestamp,
  interactionActive,
  limitReached,
  previousDelta,
  previousTimestamp,
}: {
  currentDelta: number;
  currentTimestamp: number;
  interactionActive: boolean;
  limitReached: boolean;
  previousDelta: number;
  previousTimestamp: number;
}) {
  const directionChanged = previousDelta !== 0
    && Math.sign(previousDelta) !== Math.sign(currentDelta);
  const gestureGapElapsed = previousTimestamp > 0
    && currentTimestamp - previousTimestamp > WHEEL_GESTURE_GAP;
  const renewedImpulse = limitReached
    && Math.sign(previousDelta) === Math.sign(currentDelta)
    && Math.abs(currentDelta) >= WHEEL_REENGAGE_MIN_DELTA
    && Math.abs(currentDelta) > Math.abs(previousDelta) * WHEEL_REENGAGE_DELTA_RATIO;

  return !interactionActive || directionChanged || gestureGapElapsed || renewedImpulse;
}

const webClipStyle = Platform.select<ViewStyle>({
  web: { overflow: 'clip' } as unknown as ViewStyle,
});

function horizontalOffsetForNumber(number: number) {
  return scrubberOffsetForNumber(number, HORIZONTAL_NUMBER_STEP);
}

function nearestHorizontalOffset(offset: number) {
  return nearestScrubberOffset(offset, HORIZONTAL_NUMBER_STEP);
}

function numberForHorizontalOffset(offset: number) {
  return snapNumber(offset / HORIZONTAL_NUMBER_STEP + MIN_NUMBER);
}

function continuousNumberForHorizontalOffset(offset: number) {
  return offset / HORIZONTAL_NUMBER_STEP + MIN_NUMBER;
}

const HorizontalNumberItem = memo(function HorizontalNumberItem({
  number,
  onPress,
  scrollX,
  selected,
}: {
  number: number;
  onPress: (number: number) => void;
  scrollX: Animated.Value;
  selected: boolean;
}) {
  const styles = useThemedStyles(createStyles);
  const itemOffset = (number - MIN_NUMBER) * HORIZONTAL_NUMBER_STEP;
  const inputRange = [-4, -3, -2, -1, 0, 1, 2, 3, 4]
    .map((distance) => itemOffset + distance * HORIZONTAL_NUMBER_STEP);
  const opacity = scrollX.interpolate({
    extrapolate: 'clamp',
    inputRange,
    outputRange: HORIZONTAL_FISHEYE_OPACITIES.map((opacity) => (
      opacity === 1 ? SELECTED_OPACITY : opacity
    )),
  });
  const scale = scrollX.interpolate({
    extrapolate: 'clamp',
    inputRange,
    outputRange: [...HORIZONTAL_FISHEYE_SCALES],
  });
  const translateY = scrollX.interpolate({
    extrapolate: 'clamp',
    inputRange,
    outputRange: [10, 8, 7, 4, 0, 4, 7, 8, 10],
  });

  return (
    <Pressable
      accessibilityLabel={`${number}번 선택`}
      accessibilityRole="button"
      onPress={() => onPress(number)}
      style={styles.itemTarget}
      testID={`horizontal-scrubber-number-${number}`}>
      <Animated.Text
        style={[
          styles.number,
          selected && styles.numberSelected,
          { opacity, transform: [{ translateY }, { scale }] },
        ]}>
        {number}
      </Animated.Text>
    </Pressable>
  );
});

export function HorizontalNumberScrubber({
  interactionFocus = 'IDLE',
  value,
  initialNumber,
  onInteractionEnd,
  onInteractionStart,
  onValueChange,
}: HorizontalNumberScrubberProps) {
  const styles = useThemedStyles(createStyles);
  const [layoutWidth, setLayoutWidth] = useState(0);
  const [uncontrolledValue, setUncontrolledValue] = useState(() => (
    clampNumber(initialNumber ?? randomLottoNumber())
  ));
  const selectedNumber = clampNumber(value ?? uncontrolledValue);
  const initialOffset = horizontalOffsetForNumber(selectedNumber);
  const scrollRef = useRef<ScrollView>(null);
  const [scrollX] = useState(() => new Animated.Value(initialOffset));
  const scrollOffsetRef = useRef(initialOffset);
  const lastCommittedNumber = useRef(selectedNumber);
  const lastMovement = useRef({ offset: initialOffset, timestamp: 0 });
  const interactionChanged = useRef(false);
  const interactionActive = useRef(false);
  const dragActiveRef = useRef(false);
  const wheelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wheelFrameRef = useRef<number | null>(null);
  const wheelBurstStartRef = useRef(initialOffset);
  const wheelTargetOffsetRef = useRef(initialOffset);
  const wheelLimitReachedRef = useRef(false);
  const lastWheelSampleRef = useRef({ delta: 0, timestamp: 0 });
  const activeEmphasis = useSharedValue(0);
  const continuousValue = useSharedValue(selectedNumber);
  const visualVelocity = useSharedValue(0);

  useEffect(() => {
    activeEmphasis.value = withTiming(
      interactionFocus === 'LEFT' ? 1 : interactionFocus === 'RIGHT' ? -0.4 : 0,
      { duration: INTERACTION_EMPHASIS_DURATION },
    );
  }, [activeEmphasis, interactionFocus]);

  const commitNumber = useCallback((nextValue: number) => {
    const nextNumber = clampNumber(snapNumber(nextValue));
    if (lastCommittedNumber.current === nextNumber) return;
    lastCommittedNumber.current = nextNumber;
    interactionChanged.current = true;
    if (value === undefined) setUncontrolledValue(nextNumber);
    onValueChange?.(nextNumber);
  }, [onValueChange, value]);

  const cancelWheelAnimation = useCallback(() => {
    if (wheelFrameRef.current === null) return;
    cancelAnimationFrame(wheelFrameRef.current);
    wheelFrameRef.current = null;
  }, []);

  const applyWheelOffset = useCallback((offset: number) => {
    scrollRef.current?.scrollTo({ animated: false, x: offset, y: 0 });
    scrollOffsetRef.current = offset;
    scrollX.setValue(offset);
    continuousValue.value = continuousNumberForHorizontalOffset(offset);
    commitNumber(numberForHorizontalOffset(offset));
  }, [commitNumber, continuousValue, scrollX]);

  const startWheelAnimation = useCallback(() => {
    if (wheelFrameRef.current !== null) return;

    const advance = () => {
      const nextOffset = nextWheelAnimationOffset(
        scrollOffsetRef.current,
        wheelTargetOffsetRef.current,
      );
      applyWheelOffset(nextOffset);
      if (nextOffset === wheelTargetOffsetRef.current) {
        wheelFrameRef.current = null;
        return;
      }
      wheelFrameRef.current = requestAnimationFrame(advance);
    };

    wheelFrameRef.current = requestAnimationFrame(advance);
  }, [applyWheelOffset]);

  const beginInteraction = useCallback((restart = false) => {
    if (interactionActive.current && !restart) return;
    interactionActive.current = true;
    interactionChanged.current = false;
    lastMovement.current = { offset: scrollOffsetRef.current, timestamp: Date.now() };
    onInteractionStart?.();
  }, [onInteractionStart]);

  const finishInteraction = useCallback(() => {
    if (!interactionActive.current) return;
    cancelWheelAnimation();
    if (wheelTimerRef.current) {
      clearTimeout(wheelTimerRef.current);
      wheelTimerRef.current = null;
    }
    const targetOffset = nearestHorizontalOffset(scrollOffsetRef.current);
    scrollRef.current?.scrollTo({ animated: true, x: targetOffset, y: 0 });
    scrollOffsetRef.current = targetOffset;
    scrollX.setValue(targetOffset);
    visualVelocity.value = withTiming(0, { duration: 220 });
    if (interactionChanged.current && Platform.OS !== 'web') void Haptics.selectionAsync();
    interactionChanged.current = false;
    interactionActive.current = false;
    onInteractionEnd?.();
  }, [cancelWheelAnimation, onInteractionEnd, scrollX, visualVelocity]);

  const handleDragBegin = useCallback(() => {
    if (wheelTimerRef.current) {
      clearTimeout(wheelTimerRef.current);
      wheelTimerRef.current = null;
    }
    cancelWheelAnimation();
    dragActiveRef.current = true;
    wheelTargetOffsetRef.current = scrollOffsetRef.current;
    wheelLimitReachedRef.current = false;
    lastWheelSampleRef.current = { delta: 0, timestamp: 0 };
    beginInteraction(true);
  }, [beginInteraction, cancelWheelAnimation]);

  const handleDragEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    dragActiveRef.current = false;
    if (Math.abs(event.nativeEvent.velocity?.x ?? 0) < 0.05) finishInteraction();
  }, [finishInteraction]);

  const handleMomentumEnd = useCallback(() => {
    // An interrupted fling can report its end after the next drag has already begun.
    // Let the new gesture own the scroller instead of snapping underneath it.
    if (dragActiveRef.current) return;
    finishInteraction();
  }, [finishInteraction]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (wheelFrameRef.current !== null && Platform.OS === 'web') return;
    const offset = Math.max(0, Math.min(MAX_OFFSET, event.nativeEvent.contentOffset.x));
    const now = Date.now();
    const elapsed = now - lastMovement.current.timestamp;
    if (lastMovement.current.timestamp > 0 && elapsed > 0) {
      const rawVelocity = ((offset - lastMovement.current.offset) * 1000) / elapsed;
      visualVelocity.value = Math.max(
        -RAIL_MAX_VISUAL_VELOCITY,
        Math.min(RAIL_MAX_VISUAL_VELOCITY, rawVelocity),
      );
    }
    lastMovement.current = { offset, timestamp: now };
    scrollOffsetRef.current = offset;
    scrollX.setValue(offset);
    continuousValue.value = continuousNumberForHorizontalOffset(offset);
    commitNumber(numberForHorizontalOffset(offset));
  }, [commitNumber, continuousValue, scrollX, visualVelocity]);

  const selectNumber = useCallback((nextValue: number) => {
    const nextNumber = clampNumber(nextValue);
    beginInteraction();
    const targetOffset = horizontalOffsetForNumber(nextNumber);
    scrollRef.current?.scrollTo({ animated: true, x: targetOffset, y: 0 });
    scrollOffsetRef.current = targetOffset;
    wheelTargetOffsetRef.current = targetOffset;
    scrollX.setValue(targetOffset);
    continuousValue.value = nextNumber;
    commitNumber(nextNumber);
    finishInteraction();
  }, [beginInteraction, commitNumber, continuousValue, finishInteraction, scrollX]);

  useEffect(() => {
    const nextNumber = clampNumber(value ?? uncontrolledValue);
    lastCommittedNumber.current = nextNumber;
    if (interactionActive.current || layoutWidth === 0) return;
    const nextOffset = horizontalOffsetForNumber(nextNumber);
    scrollOffsetRef.current = nextOffset;
    wheelTargetOffsetRef.current = nextOffset;
    scrollX.setValue(nextOffset);
    continuousValue.value = nextNumber;
    scrollRef.current?.scrollTo({ animated: false, x: nextOffset, y: 0 });
  }, [continuousValue, layoutWidth, scrollX, uncontrolledValue, value]);

  useEffect(() => () => {
    if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
    cancelWheelAnimation();
  }, [cancelWheelAnimation]);

  const handleWheel = useCallback((event: {
    deltaX?: number;
    deltaY?: number;
    nativeEvent?: { deltaX?: number; deltaY?: number };
    preventDefault?: () => void;
    stopPropagation?: () => void;
  }) => {
    const nativeEvent = event.nativeEvent ?? event;
    const rawDelta = Math.abs(nativeEvent.deltaX ?? 0) > Math.abs(nativeEvent.deltaY ?? 0)
      ? nativeEvent.deltaX ?? 0
      : nativeEvent.deltaY ?? 0;
    if (!rawDelta) return;
    event.preventDefault?.();
    event.stopPropagation?.();
    const now = Date.now();
    const previousSample = lastWheelSampleRef.current;
    const startsNewBurst = shouldStartNewWheelBurst({
      currentDelta: rawDelta,
      currentTimestamp: now,
      interactionActive: interactionActive.current,
      limitReached: wheelLimitReachedRef.current,
      previousDelta: previousSample.delta,
      previousTimestamp: previousSample.timestamp,
    });

    if (startsNewBurst) {
      wheelBurstStartRef.current = scrollOffsetRef.current;
      wheelTargetOffsetRef.current = scrollOffsetRef.current;
      wheelLimitReachedRef.current = false;
      beginInteraction(interactionActive.current);
    }
    const eventDelta = Math.max(-WEB_EVENT_DELTA_LIMIT, Math.min(WEB_EVENT_DELTA_LIMIT, rawDelta));
    const burstStart = wheelBurstStartRef.current;
    const targetOffset = Math.max(
      0,
      Math.min(
        MAX_OFFSET,
        burstStart + Math.max(
          -WEB_BURST_TRAVEL_LIMIT,
          Math.min(
            WEB_BURST_TRAVEL_LIMIT,
            wheelTargetOffsetRef.current + eventDelta - burstStart,
          ),
        ),
      ),
    );
    const reachedTravelLimit = Math.abs(targetOffset - burstStart) >= WEB_BURST_TRAVEL_LIMIT - 0.5;
    wheelLimitReachedRef.current = reachedTravelLimit && targetOffset > 0 && targetOffset < MAX_OFFSET;
    lastWheelSampleRef.current = { delta: rawDelta, timestamp: now };
    wheelTargetOffsetRef.current = targetOffset;
    startWheelAnimation();
    if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
    wheelTimerRef.current = setTimeout(finishInteraction, WHEEL_END_DELAY);
  }, [beginInteraction, finishInteraction, startWheelAnimation]);

  const onAccessibilityAction = useCallback((event: AccessibilityActionEvent) => {
    if (event.nativeEvent.actionName === 'increment') selectNumber(Math.min(MAX_NUMBER, selectedNumber + 1));
    if (event.nativeEvent.actionName === 'decrement') selectNumber(Math.max(MIN_NUMBER, selectedNumber - 1));
  }, [selectNumber, selectedNumber]);

  const webWheelProps = useMemo(
    () => Platform.OS === 'web' ? { onWheel: handleWheel } : {},
    [handleWheel],
  );
  const sidePadding = Math.max(0, (layoutWidth - HORIZONTAL_NUMBER_STEP) / 2);

  return (
    <View
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      accessibilityLabel={`로또 번호 탐색, 현재 ${selectedNumber}번`}
      accessibilityRole="adjustable"
      accessibilityValue={{ min: MIN_NUMBER, max: MAX_NUMBER, now: selectedNumber }}
      onAccessibilityAction={onAccessibilityAction}
      onLayout={(event) => setLayoutWidth(event.nativeEvent.layout.width)}
      style={[styles.container, webClipStyle]}
      testID="horizontal-number-scrubber">
      <Animated.ScrollView
        {...webWheelProps}
        bounces={false}
        contentContainerStyle={{ paddingHorizontal: sidePadding }}
        decelerationRate="fast"
        disableIntervalMomentum={false}
        horizontal
        onMomentumScrollBegin={() => beginInteraction()}
        onMomentumScrollEnd={handleMomentumEnd}
        onScroll={handleScroll}
        onScrollBeginDrag={handleDragBegin}
        onScrollEndDrag={handleDragEnd}
        ref={scrollRef}
        scrollEventThrottle={16}
        showsHorizontalScrollIndicator={false}
        snapToAlignment={Platform.OS === 'web' ? undefined : 'start'}
        snapToInterval={Platform.OS === 'web' ? undefined : HORIZONTAL_NUMBER_STEP}
        style={styles.scroller}
        testID="horizontal-number-scroll">
        {NUMBERS.map((number) => (
          <HorizontalNumberItem
            key={number}
            number={number}
            onPress={selectNumber}
            scrollX={scrollX}
            selected={number === selectedNumber}
          />
        ))}
      </Animated.ScrollView>

      {layoutWidth > 0 ? (
        <HorizontalMagneticRail
          activeEmphasis={activeEmphasis}
          continuousValue={continuousValue}
          height={HORIZONTAL_SCRUBBER_HEIGHT}
          scrollVelocity={visualVelocity}
          width={layoutWidth}
        />
      ) : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    height: HORIZONTAL_SCRUBBER_HEIGHT,
    overflow: 'hidden',
    position: 'relative',
  },
  scroller: {
    height: HORIZONTAL_ITEM_HEIGHT,
    zIndex: 2,
  },
  itemTarget: {
    width: HORIZONTAL_NUMBER_STEP,
    height: HORIZONTAL_ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: {
    width: HORIZONTAL_NUMBER_STEP,
    color: colors.textSecondary,
    fontSize: 36,
    lineHeight: 42,
    fontWeight: typography.weights.semibold,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  numberSelected: {
    color: colors.textPrimary,
  },
});
