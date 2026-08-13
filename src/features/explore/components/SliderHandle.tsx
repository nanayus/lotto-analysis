import { Platform, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme';

import { HANDLE_SIZE } from '../constants';

export function SliderHandle() {
  return (
    <View style={styles.focusLayer}>
      <View style={styles.handle} testID="slider-focus-handle">
        <Text style={styles.arrow}>▲</Text>
        <Text style={styles.arrow}>▼</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  focusLayer: {
    position: 'absolute',
    top: '50%',
    right: 0,
    left: 0,
    height: HANDLE_SIZE,
    marginTop: -HANDLE_SIZE / 2,
    alignItems: 'flex-end',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 3,
  },
  handle: {
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: HANDLE_SIZE / 2,
    backgroundColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        boxShadow: `0 4px 10px ${colors.accentPrimary}33`,
      },
      default: {
        shadowColor: colors.accentPrimary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 5,
      },
    }),
  },
  arrow: {
    color: colors.surface,
    fontSize: 7,
    lineHeight: 9,
  },
});
