import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import type { DrawHit } from '@/data/numberAnalytics.types';
import { colors, radius, spacing, typography } from '@/theme';

import { SectionHeading } from './SectionHeading';

const TOOLTIP_DURATION = 1500;
const PRESS_SCALE = 1.14;
const PRESS_PHASE_DURATION = 85;

type RecentTimelineProps = {
  hitCount: number;
  periodLabel: string;
  values: readonly DrawHit[];
};

type TimelineCellProps = {
  isLatest: boolean;
  item: DrawHit;
  onHoverChange: (round: number | null) => void;
  onSelect: (round: number) => void;
  showTooltip: boolean;
};

function TimelineCell({
  isLatest,
  item,
  onHoverChange,
  onSelect,
  showTooltip,
}: TimelineCellProps) {
  const [scale] = useState(() => new Animated.Value(1));

  const select = () => {
    scale.stopAnimation();
    scale.setValue(1);
    Animated.sequence([
      Animated.timing(scale, {
        duration: PRESS_PHASE_DURATION,
        toValue: PRESS_SCALE,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        duration: PRESS_PHASE_DURATION,
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();
    onSelect(item.round);
  };

  return (
    <Pressable
      accessibilityLabel={`${item.round}회, ${item.hit ? '출현' : '미출현'}${isLatest ? ', 최신 회차' : ''}`}
      accessibilityRole="button"
      onHoverIn={() => onHoverChange(item.round)}
      onHoverOut={() => onHoverChange(null)}
      onPress={select}
      style={[styles.cellTarget, showTooltip && styles.cellTargetActive]}
      testID={`recent52-cell-${item.round}`}>
      {showTooltip ? (
        <View
          pointerEvents="none"
          style={[styles.tooltip, isLatest && styles.latestTooltip]}
          testID="recent52-tooltip">
          <Text numberOfLines={1} style={styles.tooltipText}>{`${item.round}회`}</Text>
          <View style={[styles.tooltipPointer, isLatest && styles.latestTooltipPointer]} />
        </View>
      ) : null}
      <Animated.View
        style={[
          styles.latestRing,
          isLatest && styles.latestRingVisible,
          { transform: [{ scale }] },
        ]}>
        <View style={[styles.cell, item.hit && styles.cellActive]} />
      </Animated.View>
    </Pressable>
  );
}

export function RecentTimeline({ hitCount, periodLabel, values }: RecentTimelineProps) {
  const [activeRound, setActiveRound] = useState<number | null>(null);
  const [hoveredRound, setHoveredRound] = useState<number | null>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipRound = hoveredRound ?? activeRound;
  const displayValues = [...values].reverse();

  const selectRound = (round: number) => {
    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current);
    }
    setActiveRound(round);
    dismissTimer.current = setTimeout(() => {
      setActiveRound(null);
      dismissTimer.current = null;
    }, TOOLTIP_DURATION);
  };

  useEffect(
    () => () => {
      if (dismissTimer.current) {
        clearTimeout(dismissTimer.current);
      }
    },
    [],
  );

  return (
    <View style={styles.section}>
      <SectionHeading title="최근 흐름" subtitle={`${periodLabel} · ${hitCount}회`} />
      <View accessibilityLabel={`${periodLabel} 출현 흐름`} style={styles.timeline}>
        {displayValues.map((item, index) => (
          <TimelineCell
            isLatest={index === 0}
            item={item}
            key={item.round}
            onHoverChange={setHoveredRound}
            onSelect={selectRound}
            showTooltip={tooltipRound === item.round}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingVertical: spacing.xxl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  timeline: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 1,
  },
  cellTarget: {
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cellTargetActive: {
    zIndex: 10,
  },
  latestRing: {
    width: 12,
    height: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  latestRingVisible: {
    borderColor: colors.accentPrimary,
  },
  cell: {
    width: 8,
    height: 8,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
  },
  cellActive: {
    borderColor: colors.accentPrimary,
    backgroundColor: colors.accentPrimary,
  },
  tooltip: {
    position: 'absolute',
    bottom: 17,
    left: -26,
    width: 64,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    alignItems: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
  },
  latestTooltip: {
    left: -2,
    right: 'auto',
  },
  tooltipText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.medium,
    fontVariant: ['tabular-nums'],
  },
  tooltipPointer: {
    position: 'absolute',
    bottom: -4,
    left: 29,
    width: 7,
    height: 7,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
    transform: [{ rotate: '45deg' }],
  },
  latestTooltipPointer: {
    left: 4,
    right: 'auto',
  },
});
