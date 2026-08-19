import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

type NumberSelectorProps = {
  onAnalyze: () => void;
  onRandomFill: () => void;
  onToggleNumber: (number: number) => void;
  selectedNumbers: number[];
};

const NUMBERS = Array.from({ length: 45 }, (_, index) => index + 1);

function formatNumber(number: number) {
  return String(number).padStart(2, '0');
}

export function NumberSelector({ onAnalyze, onRandomFill, onToggleNumber, selectedNumbers }: NumberSelectorProps) {
  const ready = selectedNumbers.length === 6;

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      testID="combination-selector-scroll">
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>LOTTO DATA EXPLORER</Text>
          <Text style={styles.title}>조합 만들기</Text>
        </View>
        <View style={styles.countBadge}>
          <Text accessibilityLiveRegion="polite" style={styles.countText}>
            <Text style={styles.countAccent}>{selectedNumbers.length}</Text> / 6
          </Text>
        </View>
      </View>

      <View style={styles.instructionRow}>
        <Text style={styles.instruction}>분석할 번호 6개를 선택하세요.</Text>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: ready }} disabled={ready}
          onPress={onRandomFill} style={({ pressed }) => [styles.randomButton, ready && styles.randomDisabled, pressed && styles.numberButtonPressed]}>
          <Text style={styles.randomText}>랜덤 채우기</Text>
        </Pressable>
      </View>

      <View accessibilityRole="list" style={styles.numberGrid} testID="combination-number-grid">
        {NUMBERS.map((number) => {
          const selected = selectedNumbers.includes(number);
          const unavailable = selectedNumbers.length === 6 && !selected;
          return (
            <Pressable
              accessibilityLabel={`${number}번${selected ? ', 선택됨' : ''}`}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected, disabled: unavailable }}
              disabled={unavailable}
              key={number}
              onPress={() => onToggleNumber(number)}
              style={({ pressed }) => [
                styles.numberButton,
                selected && styles.numberButtonSelected,
                unavailable && styles.numberButtonUnavailable,
                pressed && styles.numberButtonPressed,
              ]}
              testID={`combination-number-${number}`}>
              <Text style={[styles.numberText, selected && styles.numberTextSelected]}>{number}</Text>
            </Pressable>
          );
        })}
        {Array.from({ length: 4 }, (_, index) => (
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            key={`placeholder-${index}`}
            style={styles.numberPlaceholder}
          />
        ))}
      </View>

      <View style={styles.selectionSection}>
        <Text style={styles.sectionLabel}>선택한 번호</Text>
        <View style={styles.selectionRow}>
          {Array.from({ length: 6 }, (_, index) => {
            const number = selectedNumbers[index];
            return (
              <View key={index} style={[styles.selectionSlot, Boolean(number) && styles.selectionSlotFilled]}>
                <Text style={[styles.selectionText, Boolean(number) && styles.selectionTextFilled]}>
                  {number ? formatNumber(number) : ''}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !ready }}
        disabled={!ready}
        onPress={onAnalyze}
        style={({ pressed }) => [
          styles.analyzeButton,
          ready && styles.analyzeButtonReady,
          pressed && ready && styles.analyzeButtonPressed,
        ]}
        testID="analyze-combination-button">
        <Text style={[styles.analyzeText, ready && styles.analyzeTextReady]}>분석하기</Text>
      </Pressable>
      <Text style={styles.disclaimer}>선택한 번호를 과거 당첨 데이터와 비교합니다.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  eyebrow: {
    color: colors.textSecondary,
    fontSize: 9,
    letterSpacing: 1.6,
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.semibold,
    letterSpacing: -0.7,
  },
  countBadge: {
    minWidth: 70,
    alignItems: 'flex-end',
  },
  countText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.section,
    fontWeight: typography.weights.medium,
  },
  countAccent: {
    color: colors.accentPrimary,
    fontSize: 28,
    fontWeight: typography.weights.semibold,
  },
  instruction: {
    color: colors.textSecondary,
    fontSize: typography.sizes.small,
    marginTop: spacing.xxl,
  },
  instructionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: spacing.xxl, marginBottom: spacing.lg,
  },
  randomButton: {
    minHeight: 40, justifyContent: 'center', paddingHorizontal: spacing.md,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.surface,
  },
  randomDisabled: { opacity: 0.38 },
  randomText: {
    color: colors.accentPrimary, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold,
  },
  numberGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.sm,
  },
  numberButton: {
    width: '12.6%',
    minWidth: 44,
    aspectRatio: 1,
    maxHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
  },
  numberPlaceholder: {
    width: '12.6%',
    minWidth: 44,
    aspectRatio: 1,
    maxHeight: 50,
  },
  numberButtonSelected: {
    borderColor: colors.accentPrimary,
    backgroundColor: colors.accentPrimary,
  },
  numberButtonUnavailable: {
    opacity: 0.38,
  },
  numberButtonPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.96 }],
  },
  numberText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.medium,
  },
  numberTextSelected: {
    color: colors.background,
    fontWeight: typography.weights.bold,
  },
  selectionSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
  },
  sectionLabel: {
    color: colors.textSecondary,
    fontSize: typography.sizes.caption,
    marginBottom: spacing.md,
  },
  selectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  selectionSlot: {
    width: 46,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.textSecondary,
  },
  selectionSlotFilled: {
    borderStyle: 'solid',
    borderColor: colors.accentPrimary,
    backgroundColor: '#252E6D',
  },
  selectionText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.small,
  },
  selectionTextFilled: {
    color: colors.highlight,
    fontWeight: typography.weights.semibold,
  },
  analyzeButton: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
    marginTop: spacing.xl,
  },
  analyzeButtonReady: {
    borderColor: colors.accentPrimary,
    backgroundColor: colors.accentPrimary,
  },
  analyzeButtonPressed: {
    opacity: 0.82,
  },
  analyzeText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
  },
  analyzeTextReady: {
    color: colors.background,
  },
  disclaimer: {
    color: colors.textSecondary,
    fontSize: typography.sizes.caption,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
