import { Canvas, LinearGradient, Path, vec } from '@shopify/react-native-skia';
import { StyleSheet } from 'react-native';
import { useDerivedValue } from 'react-native-reanimated';

import { useAppTheme } from '@/theme';

import {
  HORIZONTAL_RAIL_ACCENT_MAX_LENGTH,
  HORIZONTAL_RAIL_ACCENT_REST_LENGTH,
  HORIZONTAL_RAIL_BOTTOM_INSET,
  VELOCITY_FOR_MAX_DEFORMATION,
} from '../scrubberV3.constants';
import type { MagneticRailProps } from './MagneticRail.types';

export default function HorizontalMagneticRailSkia({
  activeEmphasis,
  height,
  scrollVelocity,
  width,
}: MagneticRailProps) {
  const { colors } = useAppTheme();
  const railY = height - HORIZONTAL_RAIL_BOTTOM_INSET;
  const centerX = width / 2;
  const curveHalfWidth = Math.min(50, width * 0.14);
  const path = [
    `M 0 ${railY}`,
    `L ${centerX - curveHalfWidth} ${railY}`,
    `C ${centerX - 24} ${railY} ${centerX - 22} ${railY + 7} ${centerX} ${railY + 7}`,
    `C ${centerX + 22} ${railY + 7} ${centerX + 24} ${railY} ${centerX + curveHalfWidth} ${railY}`,
    `L ${width} ${railY}`,
  ].join(' ');

  const accentPositions = useDerivedValue(() => {
    const velocityRatio = Math.min(
      1,
      Math.abs(scrollVelocity.value) / VELOCITY_FOR_MAX_DEFORMATION,
    );
    const accentLength =
      HORIZONTAL_RAIL_ACCENT_REST_LENGTH
      + (HORIZONTAL_RAIL_ACCENT_MAX_LENGTH - HORIZONTAL_RAIL_ACCENT_REST_LENGTH) * velocityRatio
      + activeEmphasis.value * 8;
    const halfLengthRatio = accentLength / 2 / Math.max(width, 1);
    return [0, Math.max(0, 0.5 - halfLengthRatio), 0.5, Math.min(1, 0.5 + halfLengthRatio), 1];
  });

  const accentOpacity = useDerivedValue(() => (
    Math.max(0.52, Math.min(1, 0.72 + activeEmphasis.value * 0.12))
  ));

  return (
    <Canvas pointerEvents="none" style={styles.canvas}>
      <Path
        path={path}
        color={colors.divider}
        strokeCap="round"
        strokeJoin="round"
        strokeWidth={1}
        style="stroke"
      />
      <Path
        opacity={accentOpacity}
        path={path}
        strokeCap="round"
        strokeJoin="round"
        strokeWidth={1.5}
        style="stroke">
        <LinearGradient
          colors={[colors.divider, colors.divider, colors.accentPrimary, colors.divider, colors.divider]}
          positions={accentPositions}
          start={vec(0, railY)}
          end={vec(width, railY)}
        />
      </Path>
    </Canvas>
  );
}

const styles = StyleSheet.create({
  canvas: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
});
