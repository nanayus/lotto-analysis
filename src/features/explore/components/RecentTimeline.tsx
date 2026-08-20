import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import type { DrawHit } from '@/data/numberAnalytics.types';
import { colors, radius, spacing, typography } from '@/theme';

const TOOLTIP_DURATION = 1500;
const PRESS_SCALE = 1.14;
const PRESS_PHASE_DURATION = 85;

type RecentTimelineProps = {
  hitCount: number;
  values: readonly DrawHit[];
  onOpenHistory?: () => void;
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
          styles.cellScale,
          isLatest && styles.latestRing,
          { transform: [{ scale }] },
        ]}
        testID={isLatest ? 'recent52-latest-ring' : undefined}>
        <View style={[styles.cell, item.hit && styles.cellActive]} />
      </Animated.View>
    </Pressable>
  );
}

export function RecentTimeline({ hitCount, onOpenHistory, values }: RecentTimelineProps) {
  const [activeRound, setActiveRound] = useState<number | null>(null);
  const [hoveredRound, setHoveredRound] = useState<number | null>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipRound = hoveredRound ?? activeRound;
  const displayValues = [...values].reverse();
  const rows = [
    displayValues.slice(0, 18),
    displayValues.slice(18, 35),
    displayValues.slice(35, 52),
  ].filter((row) => row.length > 0);

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
      <View style={styles.headingRow}>
        <Text style={styles.title}>최근 52회 중 {hitCount}회 등장</Text>
        {onOpenHistory ? (
          <Pressable
            accessibilityLabel="번호 등장 상세보기"
            accessibilityRole="button"
            hitSlop={6}
            onPress={onOpenHistory}
            style={({ pressed }) => [styles.openButton, pressed && styles.pressed]}>
            <Text style={styles.openText}>상세보기</Text>
            <Text style={styles.openChevron}>›</Text>
          </Pressable>
        ) : null}
      </View>
      <View accessibilityLabel="최근 52회 출현 패턴" style={styles.timeline}>
        {rows.map((row, rowIndex) => (
          <View key={row[0].round} style={styles.timelineRow} testID={`recent52-row-${rowIndex + 1}`}>
            {row.map((item, index) => (
              <TimelineCell
                isLatest={rowIndex === 0 && index === 0}
                item={item}
                key={item.round}
                onHoverChange={setHoveredRound}
                onSelect={selectRound}
                showTooltip={tooltipRound === item.round}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingBottom: spacing.xxl,
  },
  timeline: {
    gap: 3,
  },
  timelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headingRow: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  title: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: typography.weights.semibold,
  },
  openButton: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  openText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: typography.weights.medium,
  },
  openChevron: {
    color: colors.textSecondary,
    fontSize: typography.sizes.body,
    marginLeft: 2,
  },
  pressed: {
    opacity: 0.68,
  },
  cellTarget: {
    flex: 1,
    maxWidth: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cellTargetActive: {
    zIndex: 10,
  },
  cellScale: {
    width: '100%',
    maxWidth: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  latestRing: {
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.accentPrimary,
  },
  cell: {
    width: '86%',
    maxWidth: 12,
    aspectRatio: 1,
    borderRadius: 3,
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
