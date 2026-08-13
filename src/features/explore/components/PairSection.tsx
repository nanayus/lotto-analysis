import { useState } from 'react';
import {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AnimatedValue } from '@/components/AnimatedValue';
import type { PairDatum } from '@/data/numberAnalytics.types';
import { colors, radius, spacing, typography } from '@/theme';

import { SectionHeading } from './SectionHeading';

type PairSectionProps = {
  pairs: readonly PairDatum[];
};

export function PairSection({ pairs }: PairSectionProps) {
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
    <View style={styles.section}>
      <SectionHeading title="자주 함께 나온 번호" subtitle="TOP 10" />
      <View onLayout={onLayout} style={styles.viewport}>
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
            <View key={pair.number} style={styles.item}>
              <View style={styles.numberCapsule}>
                <AnimatedValue align="center" height={18} style={styles.number} width="100%">
                  {String(pair.number).padStart(2, '0')}
                </AnimatedValue>
              </View>
              <AnimatedValue align="center" height={18} style={styles.count} width="100%">
                {`${pair.count}회`}
              </AnimatedValue>
            </View>
          ))}
        </ScrollView>
        {showLeft ? <Text pointerEvents="none" style={[styles.edgeCue, styles.leftCue]}>‹</Text> : null}
        {showRight ? <Text pointerEvents="none" style={[styles.edgeCue, styles.rightCue]}>›</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingBottom: spacing.xxl,
  },
  viewport: {
    position: 'relative',
  },
  strip: {
    gap: spacing.sm,
    paddingRight: spacing.xxl,
  },
  item: {
    width: 48,
    alignItems: 'center',
    gap: spacing.xs,
  },
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
    top: 8,
    color: colors.textSecondary,
    fontSize: 20,
    opacity: 0.72,
  },
  leftCue: {
    left: -6,
  },
  rightCue: {
    right: 0,
  },
});
