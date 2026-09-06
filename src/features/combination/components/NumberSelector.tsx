import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { SubScreenHeader } from '@/components/ui/AppTopBar';
import { type ThemeColors, radius, spacing, typography, useThemedStyles } from '@/theme';

type NumberSelectorProps = {
  analysisMessage?: string | null;
  excludedNumbers: number[];
  isAnalyzing?: boolean;
  onAnalyze: () => void;
  onBack?: () => void;
  onRandomFill?: () => void;
  onToggleNumber: (number: number) => void;
  selectedNumbers: number[];
};

const NUMBERS = Array.from({ length: 45 }, (_, index) => index + 1);
const NOOP = () => undefined;

function formatNumber(number: number) {
  return String(number);
}

export function NumberSelector({
  analysisMessage,
  excludedNumbers,
  isAnalyzing = false,
  onAnalyze,
  onBack = NOOP,
  onRandomFill,
  onToggleNumber,
  selectedNumbers,
}: NumberSelectorProps) {
  const styles = useThemedStyles(createStyles);
  const ready = selectedNumbers.length === 6;

  return (
    <View style={styles.screen}>
      <SubScreenHeader
        onBack={onBack}
        right={(
          <View style={styles.countBadge}>
            <Text accessibilityLiveRegion="polite" style={styles.countText}>
              <Text style={styles.countAccent}>{selectedNumbers.length}</Text> / 6
            </Text>
          </View>
        )}
        title="조합 분석"
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        testID="combination-selector-scroll">
      <Text style={styles.eyebrow}>LOTTO DATA EXPLORER</Text>

      <AppCard style={styles.ticketCard}>
        <View style={styles.instructionRow}>
          <Text style={styles.instruction}>1–45 번호판</Text>
          {!ready && onRandomFill ? (
            <Pressable
              accessibilityRole="button"
              onPress={onRandomFill}
              style={({ pressed }) => [styles.randomButton, pressed && styles.numberButtonPressed]}>
              <Text style={styles.randomText}>랜덤 채우기</Text>
            </Pressable>
          ) : ready ? <Text style={styles.readyLabel}>선택 완료</Text> : null}
        </View>

        <View accessibilityRole="list" style={styles.numberGrid} testID="combination-number-grid">
          {NUMBERS.map((number) => {
            const selected = selectedNumbers.includes(number);
            const excluded = excludedNumbers.includes(number) && !selected;
            const unavailable = selectedNumbers.length === 6 && !selected && !excluded;
            return (
              <Pressable
                accessibilityLabel={`${number}번${selected ? ', 선택됨' : excluded ? ', 제외됨' : ''}`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected, disabled: unavailable }}
                disabled={unavailable}
                key={number}
                onPress={() => onToggleNumber(number)}
                style={({ pressed }) => [
                  styles.numberCell,
                  pressed && styles.numberButtonPressed,
                ]}
                testID={`combination-number-${number}`}>
                <View style={[
                  styles.numberButton,
                  selected && styles.numberButtonSelected,
                  excluded && styles.numberButtonExcluded,
                  unavailable && styles.numberButtonUnavailable,
                ]}>
                  <Text style={[
                    styles.numberText,
                    selected && styles.numberTextSelected,
                    excluded && styles.numberTextExcluded,
                  ]}>
                    {number}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.selectionSection} testID="combination-selection-summary">
          <Text style={styles.sectionLabel}>선택한 번호</Text>
          <View style={styles.selectionRow}>
            {Array.from({ length: 6 }, (_, index) => {
              const number = selectedNumbers[index];
              return (
                <View key={index} style={styles.selectionCell}>
                  <View style={[styles.selectionSlot, Boolean(number) && styles.selectionSlotFilled]}>
                    <Text style={[styles.selectionText, Boolean(number) && styles.selectionTextFilled]}>
                      {number ? formatNumber(number) : ''}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </AppCard>

      <AppButton
        disabled={!ready || isAnalyzing}
        label={isAnalyzing ? '분석 확인 중…' : '분석하기'}
        onPress={onAnalyze}
        style={styles.analyzeButton}
        testID="analyze-combination-button"
      />
      {analysisMessage ? (
        <Text accessibilityLiveRegion="polite" style={styles.analysisMessage}>{analysisMessage}</Text>
      ) : null}
      <Text style={styles.disclaimer}>선택한 번호를 과거 당첨 데이터와 비교합니다.</Text>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { flex: 1 },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  eyebrow: {
    color: colors.textSecondary,
    fontSize: typography.sizes.caption,
    letterSpacing: 1.6,
    marginBottom: spacing.sm,
  },
  countBadge: {
    minWidth: 52,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
    fontVariant: ['tabular-nums'],
  },
  countAccent: {
    color: colors.accentPrimary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  instruction: {
    color: colors.textPrimary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
  },
  ticketCard: {
    marginTop: spacing.xxl,
    padding: spacing.lg,
  },
  instructionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  randomButton: {
    minHeight: 40, justifyContent: 'center', paddingHorizontal: spacing.md,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.surface,
  },
  randomText: {
    color: colors.accentPrimary, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold,
  },
  readyLabel: {
    color: colors.accentPrimary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  numberGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    rowGap: spacing.xs,
  },
  numberCell: {
    width: '14.28%',
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
  },
  numberButtonSelected: {
    borderColor: colors.accentPrimary,
    backgroundColor: colors.accentPrimary,
  },
  numberButtonExcluded: {
    borderColor: `${colors.hot}8F`,
    backgroundColor: `${colors.hot}12`,
  },
  numberButtonUnavailable: {
    opacity: 0.38,
  },
  numberButtonPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.94 }],
  },
  numberText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.medium,
    lineHeight: 18,
    textAlign: 'center',
    includeFontPadding: false,
  },
  numberTextSelected: {
    color: '#FFFFFF',
    fontWeight: typography.weights.bold,
  },
  numberTextExcluded: {
    color: colors.hot,
    opacity: 1,
  },
  selectionSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
  },
  sectionLabel: {
    color: colors.textSecondary,
    fontSize: typography.sizes.caption,
    marginBottom: spacing.md,
  },
  selectionRow: {
    flexDirection: 'row',
  },
  selectionCell: {
    width: '16.66%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionSlot: {
    width: 42,
    height: 42,
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
    backgroundColor: colors.surfaceAccent,
  },
  selectionText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.small,
    lineHeight: 18,
    textAlign: 'center',
    includeFontPadding: false,
  },
  selectionTextFilled: {
    color: colors.accentPrimary,
    fontWeight: typography.weights.semibold,
  },
  analyzeButton: {
    marginTop: spacing.xl,
  },
  analysisMessage: {
    marginTop: spacing.sm,
    color: colors.hot,
    fontSize: typography.sizes.caption,
    lineHeight: 18,
    textAlign: 'center',
  },
  disclaimer: {
    color: colors.textSecondary,
    fontSize: typography.sizes.caption,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
