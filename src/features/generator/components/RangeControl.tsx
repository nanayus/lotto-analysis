import { useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { NumericRangeCondition } from '@/domain/generator/types';
import { type ThemeColors, radius, spacing, typography, useThemedStyles } from '@/theme';

import { CollapsibleConditionContent } from './CollapsibleConditionContent';
import { ConditionInfoButton } from './ConditionInfoButton';
import { ConditionToggle } from './ConditionToggle';

type RangeControlProps = {
  activationLocked?: boolean;
  decimals?: number;
  historicalPreset?: { max: number; min: number };
  limits: { max: number; min: number };
  onChange: (value: NumericRangeCondition) => void;
  onHelpPress?: () => void;
  onLockedPress?: () => void;
  step?: number;
  title: string;
  value: NumericRangeCondition;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function roundStep(value: number, step: number, decimals: number) {
  const rounded = Math.round(value / step) * step;
  return Number(rounded.toFixed(decimals));
}

export function rangeValueFromDrag({
  allowedMax,
  allowedMin,
  deltaX,
  rangeMax,
  rangeMin,
  startValue,
  step,
  trackWidth,
}: {
  allowedMax: number;
  allowedMin: number;
  deltaX: number;
  rangeMax: number;
  rangeMin: number;
  startValue: number;
  step: number;
  trackWidth: number;
}) {
  if (trackWidth <= 0) return startValue;
  const next = startValue + (deltaX / trackWidth) * (rangeMax - rangeMin);
  return roundStep(clamp(next, allowedMin, allowedMax), step, 3);
}

export function rangeValueToPercent(value: number, rangeMin: number, rangeMax: number) {
  if (rangeMax === rangeMin) return 0;
  return clamp(((value - rangeMin) / (rangeMax - rangeMin)) * 100, 0, 100);
}

type ThumbProps = {
  allowedMax: number;
  allowedMin: number;
  kind: 'min' | 'max';
  onChange: (value: number) => void;
  rangeMax: number;
  rangeMin: number;
  step: number;
  title: string;
  trackWidth: number;
  value: number;
};

function SliderThumb({
  allowedMax,
  allowedMin,
  kind,
  onChange,
  rangeMax,
  rangeMin,
  step,
  title,
  trackWidth,
  value,
}: ThumbProps) {
  const styles = useThemedStyles(createStyles);
  const allowedMaxRef = useRef(allowedMax);
  const allowedMinRef = useRef(allowedMin);
  const currentValueRef = useRef(value);
  const gestureStartValueRef = useRef(value);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    allowedMaxRef.current = allowedMax;
    allowedMinRef.current = allowedMin;
    currentValueRef.current = value;
    onChangeRef.current = onChange;
  }, [allowedMax, allowedMin, onChange, value]);

  // PanResponder stores these callbacks for gesture events; it does not read the refs while rendering.
  // eslint-disable-next-line react-hooks/refs
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      gestureStartValueRef.current = currentValueRef.current;
    },
    onPanResponderMove: (_, gesture) => {
      if (!trackWidth) return;
      onChangeRef.current(rangeValueFromDrag({
        allowedMax: allowedMaxRef.current,
        allowedMin: allowedMinRef.current,
        deltaX: gesture.dx,
        rangeMax,
        rangeMin,
        startValue: gestureStartValueRef.current,
        step,
        trackWidth,
      }));
    },
  }), [rangeMax, rangeMin, step, trackWidth]);
  const percent = rangeValueToPercent(value, rangeMin, rangeMax);
  return (
    <View
      {...responder.panHandlers}
      accessibilityLabel={`${title} ${kind === 'min' ? '최솟값' : '최댓값'} 조절`}
      accessibilityRole="adjustable"
      accessibilityValue={{ max: allowedMax, min: allowedMin, now: value }}
      style={[styles.thumbHitArea, { left: `${percent}%` }]}
      testID={`range-thumb-${title}-${kind}`}>
      <View style={styles.thumb} />
    </View>
  );
}

export function RangeControl({
  activationLocked = false,
  decimals = 0,
  historicalPreset,
  limits,
  onChange,
  onHelpPress,
  onLockedPress,
  step = 1,
  title,
  value,
}: RangeControlProps) {
  const styles = useThemedStyles(createStyles);
  const [trackWidth, setTrackWidth] = useState(0);
  const format = (number: number) => number.toFixed(decimals);
  const [minDraftText, setMinDraftText] = useState<string | null>(null);
  const [maxDraftText, setMaxDraftText] = useState<string | null>(null);
  const minText = minDraftText ?? format(value.min);
  const maxText = maxDraftText ?? format(value.max);

  const commitText = (kind: 'min' | 'max', text: string) => {
    const parsed = Number(text);
    if (text.trim() === '' || !Number.isFinite(parsed)) {
      if (kind === 'min') setMinDraftText(null);
      else setMaxDraftText(null);
      return;
    }
    const nextValue = kind === 'min'
      ? { ...value, min: roundStep(clamp(parsed, limits.min, value.max), step, decimals) }
      : { ...value, max: roundStep(clamp(parsed, value.min, limits.max), step, decimals) };
    if (kind === 'min') setMinDraftText(null);
    else setMaxDraftText(null);
    onChange(nextValue);
  };
  const parsedMin = minDraftText?.trim() ? Number(minDraftText) : Number.NaN;
  const parsedMax = maxDraftText?.trim() ? Number(maxDraftText) : Number.NaN;
  const previewMin = minDraftText !== null && Number.isFinite(parsedMin)
    ? roundStep(clamp(parsedMin, limits.min, value.max), step, decimals)
    : value.min;
  const previewMax = maxDraftText !== null && Number.isFinite(parsedMax)
    ? roundStep(clamp(parsedMax, value.min, limits.max), step, decimals)
    : value.max;
  const onTrackLayout = (event: LayoutChangeEvent) => setTrackWidth(event.nativeEvent.layout.width);
  const startPercent = rangeValueToPercent(previewMin, limits.min, limits.max);
  const endPercent = rangeValueToPercent(previewMax, limits.min, limits.max);

  return (
    <View style={[styles.container, value.enabled && styles.containerEnabled]}>
      <View style={styles.header}>
        <View style={styles.headingCopy}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{title}</Text>
            {onHelpPress ? <ConditionInfoButton onPress={onHelpPress} title={title} /> : null}
          </View>
        </View>
        <ConditionToggle
          enabled={value.enabled}
          locked={activationLocked && !value.enabled}
          onChange={(enabled) => onChange({ ...value, enabled })}
          onLockedPress={onLockedPress}
          title={title}
        />
      </View>
      <CollapsibleConditionContent expanded={value.enabled}>
        {historicalPreset ? (
          <View
            accessibilityLabel={`전체 과거 본번호 기준 과거 최다 구간 ${format(historicalPreset.min)}에서 ${format(historicalPreset.max)}`}
            style={styles.presetRow}>
            <Text style={styles.presetBadge}>과거 최다</Text>
            <Text style={styles.presetValue}>{format(historicalPreset.min)}~{format(historicalPreset.max)}</Text>
            <Text style={styles.presetSource}>전체 과거 본번호 기준</Text>
          </View>
        ) : null}
        <View>
          <View onLayout={onTrackLayout} style={styles.track} testID={`range-track-${title}`}>
            <View style={styles.trackRail} testID={`range-base-track-${title}`} />
            <View
              style={[
                styles.activeTrack,
                { left: `${startPercent}%`, width: `${Math.max(0, endPercent - startPercent)}%` },
              ]}
              testID={`range-active-track-${title}`}
            />
            <SliderThumb
              allowedMax={previewMax}
              allowedMin={limits.min}
              kind="min"
              onChange={(min) => {
                setMinDraftText(null);
                onChange({ ...value, min });
              }}
              rangeMax={limits.max}
              rangeMin={limits.min}
              step={step}
              title={title}
              trackWidth={trackWidth}
              value={previewMin}
            />
            <SliderThumb
              allowedMax={limits.max}
              allowedMin={previewMin}
              kind="max"
              onChange={(max) => {
                setMaxDraftText(null);
                onChange({ ...value, max });
              }}
              rangeMax={limits.max}
              rangeMin={limits.min}
              step={step}
              title={title}
              trackWidth={trackWidth}
              value={previewMax}
            />
          </View>
          <View style={styles.inputs} testID={`range-inputs-${title}`}>
            <TextInput
              accessibilityLabel={`${title} 최솟값`}
              keyboardType="decimal-pad"
              onChangeText={setMinDraftText}
              onEndEditing={(event) => commitText('min', event.nativeEvent.text)}
              selectTextOnFocus
              style={styles.input}
              value={minText}
            />
            <Text style={styles.separator}>~</Text>
            <TextInput
              accessibilityLabel={`${title} 최댓값`}
              keyboardType="decimal-pad"
              onChangeText={setMaxDraftText}
              onEndEditing={(event) => commitText('max', event.nativeEvent.text)}
              selectTextOnFocus
              style={styles.input}
              value={maxText}
            />
          </View>
        </View>
      </CollapsibleConditionContent>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    overflow: 'hidden',
    padding: spacing.md,
  },
  containerEnabled: { borderColor: colors.accentBorder },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  headingCopy: { flex: 1, minWidth: 0, paddingRight: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  title: { color: colors.textPrimary, fontSize: typography.sizes.small, fontWeight: typography.weights.semibold },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
  presetBadge: {
    color: colors.accentSecondary, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold,
    borderRadius: radius.round, borderWidth: 1, borderColor: colors.accentSecondary,
    backgroundColor: colors.surfaceSuccess, paddingHorizontal: spacing.sm, paddingVertical: 3,
  },
  presetValue: { color: colors.textPrimary, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold },
  presetSource: { color: colors.textSecondary, fontSize: typography.sizes.caption },
  track: { height: 36, marginHorizontal: 10, marginTop: spacing.md, justifyContent: 'center' },
  trackRail: {
    position: 'absolute', left: 0, right: 0, height: 4,
    borderRadius: 2, backgroundColor: colors.borderStrong,
  },
  activeTrack: { position: 'absolute', height: 4, borderRadius: 2, backgroundColor: colors.accentPrimary },
  thumbHitArea: {
    position: 'absolute', width: 44, height: 44, marginLeft: -22,
    alignItems: 'center', justifyContent: 'center', zIndex: 2,
  },
  thumb: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
    borderColor: colors.highlight, backgroundColor: colors.accentPrimary,
  },
  inputs: {
    width: '100%', minWidth: 0,
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
  },
  input: {
    flex: 1, flexBasis: 0, minWidth: 0, height: 40,
    borderRadius: radius.sm, borderWidth: 1,
    borderColor: colors.divider, backgroundColor: colors.surface,
    color: colors.textPrimary, textAlign: 'center', fontSize: typography.sizes.small,
    paddingHorizontal: spacing.sm,
  },
  separator: { flexShrink: 0, color: colors.textSecondary },
});
