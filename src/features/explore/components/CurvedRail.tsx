import { StyleSheet } from 'react-native';
import Animated, { SharedValue, useAnimatedProps } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { colors } from '@/theme';

import { CURVE_RADIUS, HANDLE_SIZE, RAIL_BASE_OFFSET } from '../constants';

const AnimatedPath = Animated.createAnimatedComponent(Path);

type CurvedRailProps = {
  continuousNumber: SharedValue<number>;
  layoutHeight: SharedValue<number>;
  layoutWidth: SharedValue<number>;
};

export function CurvedRail({ continuousNumber, layoutHeight, layoutWidth }: CurvedRailProps) {
  const animatedProps = useAnimatedProps(() => {
    const height = layoutHeight.value;
    const baseX = layoutWidth.value - RAIL_BASE_OFFSET;
    const handleX = layoutWidth.value - HANDLE_SIZE / 2;
    const centerY = height / 2;

    // The focus stays fixed, but the actual Bezier geometry breathes with the
    // fractional wheel position as ticks flow through the selection point.
    const phase = continuousNumber.value - Math.round(continuousNumber.value);
    const phaseStrength = Math.abs(phase) * 2;
    const upperRadius = CURVE_RADIUS * (1 + phase * 0.16);
    const lowerRadius = CURVE_RADIUS * (1 - phase * 0.16);
    const shoulderX = baseX + (handleX - baseX) * (0.57 + phaseStrength * 0.07);
    const neckX = handleX - (handleX - baseX) * phase * 0.045;
    const topY = Math.max(0, centerY - upperRadius);
    const bottomY = Math.min(height, centerY + lowerRadius);

    return {
      d: [
        `M ${baseX} 0`,
        `L ${baseX} ${topY}`,
        `C ${baseX} ${centerY - upperRadius * 0.72}, ${shoulderX} ${centerY - upperRadius * 0.54}, ${shoulderX} ${centerY - upperRadius * 0.34}`,
        `C ${shoulderX} ${centerY - upperRadius * 0.15}, ${neckX} ${centerY - upperRadius * 0.1}, ${handleX} ${centerY}`,
        `C ${neckX} ${centerY + lowerRadius * 0.1}, ${shoulderX} ${centerY + lowerRadius * 0.15}, ${shoulderX} ${centerY + lowerRadius * 0.34}`,
        `C ${shoulderX} ${centerY + lowerRadius * 0.54}, ${baseX} ${centerY + lowerRadius * 0.72}, ${baseX} ${bottomY}`,
        `L ${baseX} ${height}`,
      ].join(' '),
    };
  });

  return (
    <Svg style={styles.svg}>
      <AnimatedPath
        animatedProps={animatedProps}
        fill="none"
        stroke={colors.accentSecondary}
        strokeOpacity={0.86}
        strokeWidth={1.6}
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  svg: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    pointerEvents: 'none',
  },
});
