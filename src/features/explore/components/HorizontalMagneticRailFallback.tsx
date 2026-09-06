import { StyleSheet, View } from 'react-native';

import { useAppTheme } from '@/theme';

import {
  HORIZONTAL_RAIL_ACCENT_REST_LENGTH,
  HORIZONTAL_RAIL_BOTTOM_INSET,
} from '../scrubberV3.constants';
import type { MagneticRailProps } from './MagneticRail.types';

export function HorizontalMagneticRailFallback({ height }: MagneticRailProps) {
  const { colors } = useAppTheme();
  return (
    <View
      pointerEvents="none"
      style={[styles.container, { top: height - HORIZONTAL_RAIL_BOTTOM_INSET }]}>
      <View style={[styles.base, { backgroundColor: colors.divider }]} />
      <View style={[styles.accent, { backgroundColor: colors.accentPrimary }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 0,
    left: 0,
    height: 8,
    alignItems: 'center',
  },
  base: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    height: StyleSheet.hairlineWidth,
  },
  accent: {
    position: 'absolute',
    top: 0,
    width: HORIZONTAL_RAIL_ACCENT_REST_LENGTH,
    height: 1.5,
    borderRadius: 1,
    opacity: 0.72,
  },
});
