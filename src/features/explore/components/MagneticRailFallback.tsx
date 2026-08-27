import { StyleSheet, View } from 'react-native';

import { type ThemeColors, useThemedStyles } from '@/theme';

import { FOCUS_Y, RAIL_ACCENT_REST_LENGTH, RAIL_X } from '../scrubberV3.constants';
import type { MagneticRailProps } from './MagneticRail.types';

export function MagneticRailFallback({ height, width }: MagneticRailProps) {
  const styles = useThemedStyles(createStyles);
  const railX = width * RAIL_X;
  const centerY = height * FOCUS_Y;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, styles.overlay]}>
      <View style={[styles.rail, { left: railX }]} />
      <View
        style={[
          styles.focus,
          {
            height: RAIL_ACCENT_REST_LENGTH,
            left: railX,
            top: centerY - RAIL_ACCENT_REST_LENGTH / 2,
          },
        ]}
      />
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  overlay: {
    pointerEvents: 'none',
  },
  rail: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: colors.divider,
  },
  focus: {
    position: 'absolute',
    width: 1.25,
    borderRadius: 1,
    backgroundColor: colors.accentPrimary,
    opacity: 0.62,
  },
});
