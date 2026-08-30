/* eslint-disable react-hooks/immutability -- Reanimated shared values are mutable animation state. */
import WheelPicker, {
  type PickerItem,
  type RenderItemContainerProps,
  usePickerItemHeight,
  useScrollContentOffset,
} from '@quidone/react-native-wheel-picker';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityActionEvent,
  Animated as NativeAnimated,
  Platform,
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { type ThemeColors, typography, useAppTheme, useThemedStyles } from '@/theme';

import { MAX_NUMBER, MIN_NUMBER } from '../constants';
import type { InteractionFocus } from '../interactionFocus';
import {
  FAR_OPACITY,
  FAR_SCALE,
  FISHEYE_X_OFFSET,
  FOCUS_Y,
  INTERACTION_EMPHASIS_DURATION,
  LABEL_RAIL_SAFE_GAP,
  NEAR_OPACITY,
  NEAR_SCALE,
  NUMBER_STEP,
  RAIL_MAX_VISUAL_VELOCITY,
  RAIL_X,
  SELECTED_OPACITY,
  SELECTED_SCALE,
} from '../scrubberV3.constants';
import { clampNumber, randomLottoNumber, snapNumber } from '../sliderMath';
import MagneticRail from './MagneticRail';

export type NumberScrubberV3Props = {
  interactionFocus?: InteractionFocus;
  value?: number;
  initialNumber?: number;
  onInteractionEnd?: () => void;
  onInteractionStart?: () => void;
  onValueChange?: (number: number) => void;
};

type LottoPickerItem = PickerItem<number> & {
  label: string;
};

type PickerNumberItemProps = RenderItemContainerProps<LottoPickerItem> & {
  colors: ThemeColors;
  paneWidth: number;
  selectedNumber: number;
};

const PICKER_DATA: LottoPickerItem[] = Array.from({ length: MAX_NUMBER }, (_, index) => ({
  label: String(index + 1),
  value: index + 1,
}));

const VISIBLE_ITEM_COUNT = 11;
const DISTANCES = [-4, -3, -2, -1, 0, 1, 2, 3, 4];
const OPACITIES = [
  FAR_OPACITY,
  0.21,
  0.39,
  NEAR_OPACITY,
  SELECTED_OPACITY,
  NEAR_OPACITY,
  0.39,
  0.21,
  FAR_OPACITY,
];
const SCALES = [
  FAR_SCALE,
  0.42,
  0.5,
  NEAR_SCALE,
  SELECTED_SCALE,
  NEAR_SCALE,
  0.5,
  0.42,
  FAR_SCALE,
];
const TRANSLATE_X = [
  -FISHEYE_X_OFFSET,
  -2,
  -2,
  -1,
  0,
  -1,
  -2,
  -2,
  -FISHEYE_X_OFFSET,
];

const webClipStyle = Platform.select<ViewStyle>({
  web: { overflow: 'clip' } as unknown as ViewStyle,
});

const webFocusStyle = Platform.select<ViewStyle>({
  web: { outlineStyle: 'none' } as unknown as ViewStyle,
});

function PickerNumberItem({
  colors,
  enableScrollByTapOnItem,
  index,
  item,
  listRef,
  paneWidth,
  readOnly,
  selectedNumber,
}: PickerNumberItemProps) {
  const offset = useScrollContentOffset();
  const itemHeight = usePickerItemHeight();
  const inputRange = DISTANCES.map((distance) => (index + distance) * itemHeight);
  const animatedStyle = {
    opacity: offset.interpolate({
      extrapolate: 'clamp',
      inputRange,
      outputRange: OPACITIES,
    }),
    transform: [
      {
        translateX: offset.interpolate({
          extrapolate: 'clamp',
          inputRange,
          outputRange: TRANSLATE_X,
        }),
      },
    ],
  };
  const numberStyle = {
    transform: [
      {
        scale: offset.interpolate({
          extrapolate: 'clamp',
          inputRange,
          outputRange: SCALES,
        }),
      },
    ],
  };
  const distanceFromSelection = Math.abs(item.value - selectedNumber);
  const numberColor = distanceFromSelection === 0
    ? colors.accentPrimary
    : distanceFromSelection === 1
      ? colors.textPrimary
      : colors.textSecondary;

  const scrollToItem = () => {
    if (enableScrollByTapOnItem && !readOnly) {
      listRef.current?.scrollToIndex({ animated: true, index });
    }
  };

  return (
    <Pressable
      accessibilityLabel={`${item.value}번 선택`}
      accessibilityRole="button"
      onPress={scrollToItem}
      style={[styles.pressTarget, { height: itemHeight }, webFocusStyle]}
      testID={`scrubber-number-${item.value}`}>
      <NativeAnimated.View style={[styles.fisheyeGroup, { height: itemHeight }, animatedStyle]}>
        <NativeAnimated.Text
          style={[
            styles.number,
            { right: paneWidth * (1 - RAIL_X) + LABEL_RAIL_SAFE_GAP },
            numberStyle,
            { color: numberColor },
          ]}>
          {item.label}
        </NativeAnimated.Text>
      </NativeAnimated.View>
    </Pressable>
  );
}

export function NumberScrubberV3({
  interactionFocus = 'IDLE',
  value,
  initialNumber,
  onInteractionEnd,
  onInteractionStart,
  onValueChange,
}: NumberScrubberV3Props) {
  const { colors } = useAppTheme();
  const themedStyles = useThemedStyles(createStyles);
  const [uncontrolledValue, setUncontrolledValue] = useState(() =>
    clampNumber(initialNumber ?? randomLottoNumber()),
  );
  const [layout, setLayout] = useState({ height: 0, width: 0 });
  const selectedNumber = clampNumber(value ?? uncontrolledValue);
  const lastCommittedNumber = useRef(selectedNumber);
  const lastMovement = useRef({ number: selectedNumber, timestamp: 0 });
  const interactionChanged = useRef(false);
  const activeEmphasis = useSharedValue(0);
  const scrollVelocity = useSharedValue(0);
  const continuousValue = useSharedValue(selectedNumber);
  const visualVelocity = useDerivedValue(() => scrollVelocity.value);

  useEffect(() => {
    const target = interactionFocus === 'LEFT' ? 1 : interactionFocus === 'RIGHT' ? -1 : 0;
    activeEmphasis.value = withTiming(target, { duration: INTERACTION_EMPHASIS_DURATION });
  }, [activeEmphasis, interactionFocus]);

  useEffect(() => {
    const nextNumber = clampNumber(value ?? uncontrolledValue);
    continuousValue.value = nextNumber;
    lastCommittedNumber.current = nextNumber;
  }, [continuousValue, uncontrolledValue, value]);

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

  const commitNumber = useCallback((nextValue: number) => {
    const nextNumber = snapNumber(nextValue);
    if (lastCommittedNumber.current === nextNumber) {
      return;
    }
    lastCommittedNumber.current = nextNumber;
    interactionChanged.current = true;
    continuousValue.value = nextNumber;
    if (value === undefined) {
      setUncontrolledValue(nextNumber);
    }
    onValueChange?.(nextNumber);
  }, [continuousValue, onValueChange, value]);

  const handleValueChanging = useCallback(({ item }: { item: LottoPickerItem }) => {
    const now = Date.now();
    const elapsed = now - lastMovement.current.timestamp;
    if (lastMovement.current.timestamp > 0 && elapsed > 0) {
      const rawVelocity = ((item.value - lastMovement.current.number) * NUMBER_STEP * 1000) / elapsed;
      scrollVelocity.value = Math.max(
        -RAIL_MAX_VISUAL_VELOCITY,
        Math.min(RAIL_MAX_VISUAL_VELOCITY, rawVelocity),
      );
    }
    lastMovement.current = { number: item.value, timestamp: now };
    commitNumber(item.value);
  }, [commitNumber, scrollVelocity]);

  const handleInteractionStart = useCallback(() => {
    interactionChanged.current = false;
    lastMovement.current = { number: selectedNumber, timestamp: Date.now() };
    onInteractionStart?.();
  }, [onInteractionStart, selectedNumber]);

  const handleInteractionEnd = useCallback(() => {
    scrollVelocity.value = withTiming(0, { duration: 240 });
    if (interactionChanged.current && Platform.OS !== 'web') {
      void Haptics.selectionAsync();
    }
    interactionChanged.current = false;
    onInteractionEnd?.();
  }, [onInteractionEnd, scrollVelocity]);

  const selectNumber = useCallback((nextValue: number) => {
    commitNumber(nextValue);
  }, [commitNumber]);

  const onAccessibilityAction = useCallback((event: AccessibilityActionEvent) => {
    if (event.nativeEvent.actionName === 'increment') {
      selectNumber(Math.min(MAX_NUMBER, selectedNumber + 1));
    }
    if (event.nativeEvent.actionName === 'decrement') {
      selectNumber(Math.max(MIN_NUMBER, selectedNumber - 1));
    }
  }, [selectNumber, selectedNumber]);

  const renderItemContainer = useCallback(
    (props: RenderItemContainerProps<LottoPickerItem>) => (
      <PickerNumberItem
        {...props}
        colors={colors}
        key={props.key}
        paneWidth={layout.width}
        selectedNumber={selectedNumber}
      />
    ),
    [colors, layout.width, selectedNumber],
  );

  const focusY = layout.height * FOCUS_Y;

  return (
    <View
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      accessibilityLabel={`로또 번호 탐색, 현재 ${selectedNumber}번`}
      accessibilityRole="adjustable"
      accessibilityValue={{ min: MIN_NUMBER, max: MAX_NUMBER, now: selectedNumber }}
      onAccessibilityAction={onAccessibilityAction}
      onLayout={(event) => setLayout(event.nativeEvent.layout)}
      style={[themedStyles.container, webClipStyle]}
      testID="number-scrubber-v3">
      {layout.height > 0 && layout.width > 0 ? (
        <WheelPicker<LottoPickerItem>
          _onScrollEnd={handleInteractionEnd}
          _onScrollStart={handleInteractionStart}
          data={PICKER_DATA}
          enableScrollByTapOnItem
          itemHeight={NUMBER_STEP}
          onValueChanged={({ item }) => commitNumber(item.value)}
          onValueChanging={handleValueChanging}
          renderItemContainer={renderItemContainer}
          renderOverlay={null}
          scrollEventThrottle={16}
          style={themedStyles.wheel}
          testID="number-scrubber-scroll"
          value={selectedNumber}
          visibleItemCount={VISIBLE_ITEM_COUNT}
          width="100%"
        />
      ) : null}

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
            themedStyles.focusTick,
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
  pressTarget: {
    justifyContent: 'center',
  },
  fisheyeGroup: {
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

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 336,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
  },
  wheel: {
    zIndex: 1,
    backgroundColor: 'transparent',
  },
  focusTick: {
    position: 'absolute',
    width: 27,
    height: 1.5,
    borderRadius: 1,
    backgroundColor: colors.highlight,
    zIndex: 3,
    pointerEvents: 'none',
  },
});
