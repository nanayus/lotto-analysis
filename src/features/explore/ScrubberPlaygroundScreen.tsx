import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, typography } from '@/theme';

import { NumberScrubberV3 } from './components/NumberScrubberV3';
import { randomLottoNumber } from './sliderMath';

export function ScrubberPlaygroundScreen() {
  const [selectedNumber, setSelectedNumber] = useState(() => randomLottoNumber());

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.shell}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>INTERACTION PLAYGROUND</Text>
          <Text style={styles.title}>Magnetic Fisheye Scrubber</Text>
          <Text style={styles.value}>현재 {selectedNumber}번</Text>
        </View>
        <View style={styles.scrubber}>
          <NumberScrubberV3 value={selectedNumber} onValueChange={setSelectedNumber} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  shell: {
    flex: 1,
    width: '100%',
    maxWidth: 500,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  header: {
    paddingBottom: spacing.lg,
  },
  eyebrow: {
    color: colors.accentPrimary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
    letterSpacing: 1.2,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.sizes.section,
    fontWeight: typography.weights.semibold,
    marginTop: spacing.sm,
  },
  value: {
    color: colors.textSecondary,
    fontSize: typography.sizes.body,
    marginTop: spacing.xs,
  },
  scrubber: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
    borderRadius: 20,
    overflow: 'hidden',
    paddingHorizontal: spacing.lg,
  },
});
