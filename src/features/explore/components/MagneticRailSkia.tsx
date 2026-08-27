import { Canvas, LinearGradient, Path, vec } from '@shopify/react-native-skia';
import { StyleSheet } from 'react-native';
import { useDerivedValue } from 'react-native-reanimated';

import { useAppTheme } from '@/theme';

import {
  FOCUS_Y,
  RAIL_ACCENT_MAX_LENGTH,
  RAIL_ACCENT_REST_LENGTH,
  RAIL_X,
  VELOCITY_FOR_MAX_DEFORMATION,
} from '../scrubberV3.constants';
import type { MagneticRailProps } from './MagneticRail.types';

export default function MagneticRailSkia({
  activeEmphasis,
  height,
  scrollVelocity,
  width,
}: MagneticRailProps) {
  const { colors } = useAppTheme();
  const railX = width * RAIL_X;
  const path = `M ${railX} 0 L ${railX} ${height}`;

  const accentPositions = useDerivedValue(() => {
    const velocityRatio = Math.min(
      1,
      Math.abs(scrollVelocity.value) / VELOCITY_FOR_MAX_DEFORMATION,
    );
    const centerY = height * FOCUS_Y;
    const accentLength =
      RAIL_ACCENT_REST_LENGTH +
      (RAIL_ACCENT_MAX_LENGTH - RAIL_ACCENT_REST_LENGTH) * velocityRatio +
      Math.max(-8, activeEmphasis.value * 10);
    const start = Math.max(0.02, (centerY - accentLength / 2) / height);
    const center = Math.max(start, Math.min(0.98, centerY / height));
    const end = Math.min(0.98, (centerY + accentLength / 2) / height);

    return [0, start, center, end, 1];
  });

  const accentOpacity = useDerivedValue(() =>
    Math.max(0.42, Math.min(0.9, 0.66 + activeEmphasis.value * 0.14)),
  );

  const accentWidth = useDerivedValue(() => {
    const velocityRatio = Math.min(
      1,
      Math.abs(scrollVelocity.value) / VELOCITY_FOR_MAX_DEFORMATION,
    );
    return 1.15 + velocityRatio * 0.2 + Math.max(-0.08, activeEmphasis.value * 0.12);
  });

  return (
    <Canvas
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.canvas}>
      <Path
        color={colors.divider}
        path={path}
        style="stroke"
        strokeCap="round"
        strokeJoin="round"
        strokeWidth={0.85}
      />
      <Path
        opacity={accentOpacity}
        path={path}
        style="stroke"
        strokeCap="round"
        strokeJoin="round"
        strokeWidth={accentWidth}>
        <LinearGradient
          colors={[
            `${colors.accentPrimary}00`,
            `${colors.accentPrimary}00`,
            `${colors.accentPrimary}D6`,
            `${colors.accentPrimary}00`,
            `${colors.accentPrimary}00`,
          ]}
          end={vec(0, height)}
          positions={accentPositions}
          start={vec(0, 0)}
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
    pointerEvents: 'none',
  },
});
