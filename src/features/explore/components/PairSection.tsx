import { useState } from 'react';
import {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  Pressable,
  View,
} from 'react-native';

import { AnimatedValue } from '@/components/AnimatedValue';
import type { PairDatum } from '@/data/numberAnalytics.types';
import { colors, radius, spacing, typography } from '@/theme';

import { SectionHeading } from './SectionHeading';

const EDGE_OVERLAY_WIDTH = 40;
const EDGE_CONTENT_GAP = spacing.lg;

type PairSectionProps = {
  pairs: readonly PairDatum[];
  onSelectNumber: (number: number) => void;
};

export function PairSection({ onSelectNumber, pairs }: PairSectionProps) {
  const [viewportWidth, setViewportWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [scrollX, setScrollX] = useState(0);
  const canScroll = contentWidth > viewportWidth + 1;
  const showLeft = canScroll && scrollX > 4;
  const showRight = canScroll && scrollX + viewportWidth < contentWidth - 4;

  const onLayout = (event: LayoutChangeEvent) => {
    setViewportWidth(event.nativeEvent.layout.width);
  };

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrollX(event.nativeEvent.contentOffset.x);
  };

  return (
    <View style={styles.section} testID="pair-analysis-section">
      <SectionHeading title="자주 함께 나온 번호" subtitle="TOP 10" />
      <View onLayout={onLayout} style={styles.viewport} testID="pair-viewport">
        <ScrollView
          contentContainerStyle={styles.strip}
          horizontal
          nestedScrollEnabled
          onContentSizeChange={setContentWidth}
          onScroll={onScroll}
          scrollEventThrottle={32}
          showsHorizontalScrollIndicator={false}
          testID="pair-horizontal-scroll">
          {pairs.slice(0, 10).map((pair) => (
            <Pressable
              accessibilityLabel={`${pair.number}번 탐색`}
              accessibilityRole="button"
              key={pair.number}
              onPress={() => onSelectNumber(pair.number)}
              style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
              <View style={styles.numberCapsule}>
                <AnimatedValue align="center" height={18} style={styles.number} width="100%">
                  {String(pair.number).padStart(2, '0')}
                </AnimatedValue>
              </View>
              <AnimatedValue align="center" height={18} style={styles.count} width="100%">
                {`${pair.count}회`}
              </AnimatedValue>
            </Pressable>
          ))}
        </ScrollView>
        {showLeft ? (
          <View
            pointerEvents="none"
            style={[styles.edgeCue, styles.leftCue]}
            testID="pair-left-edge">
            <View style={[styles.edgeShade, styles.leftShade]} />
            <Text style={[styles.edgeCueText, styles.leftCueText]}>‹</Text>
          </View>
        ) : null}
        {showRight ? (
          <View
            pointerEvents="none"
            style={[styles.edgeCue, styles.rightCue]}
            testID="pair-right-edge">
            <View style={[styles.edgeShade, styles.rightShade]} />
            <Text style={[styles.edgeCueText, styles.rightCueText]}>›</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: spacing.xxxl,
    paddingTop: spacing.xxl,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  viewport: {
    position: 'relative',
  },
  strip: {
    gap: spacing.sm,
    paddingRight: EDGE_OVERLAY_WIDTH + EDGE_CONTENT_GAP,
  },
  item: {
    width: 48,
    alignItems: 'center',
    gap: spacing.xs,
  },
  pressed: { opacity: 0.65 },
  numberCapsule: {
    width: 36,
    height: 36,
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: {
    color: colors.textPrimary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    fontVariant: ['tabular-nums'],
  },
  count: {
    color: colors.textSecondary,
    fontSize: typography.sizes.caption,
    fontVariant: ['tabular-nums'],
  },
  edgeCue: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: EDGE_OVERLAY_WIDTH,
    overflow: 'hidden',
    backgroundColor: '#080A1270',
  },
  edgeShade: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 24,
    backgroundColor: '#080A12E6',
  },
  edgeCueText: {
    position: 'absolute',
    top: 14,
    color: colors.textSecondary,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: typography.weights.medium,
  },
  leftCue: {
    left: -2,
  },
  rightCue: {
    right: 0,
  },
  leftShade: {
    left: 0,
  },
  rightShade: {
    right: 0,
  },
  leftCueText: {
    left: spacing.xs,
  },
  rightCueText: {
    right: spacing.xs,
  },
});
