import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { SubScreenHeader } from '@/components/ui/AppTopBar';
import { type ThemeColors, radius, spacing, typography, useThemedStyles } from '@/theme';

type NumberSelectorProps = {
  analysisAvailabilityLabel?: string;
  analysisMessage?: string | null;
  excludedNumbers: number[];
  isAnalyzing?: boolean;
  onAnalyze: () => void;
  onBack?: () => void;
  onRandomFill: () => void;
  onToggleNumber: (number: number) => void;
  selectedNumbers: number[];
};

const NUMBERS = Array.from({ length: 45 }, (_, index) => index + 1);
const NOOP = () => undefined;

function formatNumber(number: number) {
  return String(number).padStart(2, '0');
}

export function NumberSelector({
  analysisAvailabilityLabel,
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
          {!ready ? (
            <Pressable
              accessibilityRole="button"
              onPress={onRandomFill}
              style={({ pressed }) => [styles.randomButton, pressed && styles.numberButtonPressed]}>
              <Text style={styles.randomText}>랜덤 채우기</Text>
            </Pressable>
          ) : <Text style={styles.readyLabel}>선택 완료</Text>}
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
                  styles.numberButton,
                  selected && styles.numberButtonSelected,
                  excluded && styles.numberButtonExcluded,
                  unavailable && styles.numberButtonUnavailable,
                  pressed && styles.numberButtonPressed,
                ]}
                testID={`combination-number-${number}`}>
                <Text style={[
                  styles.numberText,
                  selected && styles.numberTextSelected,
                  excluded && styles.numberTextExcluded,
                ]}>
                  {number}
                </Text>
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

        {!ready ? (
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
        ) : null}
      </AppCard>

      {analysisAvailabilityLabel ? (
        <View style={styles.accessSummary}>
          <Text style={styles.accessSummaryLabel}>결과 공개</Text>
          <Text style={styles.accessSummaryValue}>{analysisAvailabilityLabel}</Text>
        </View>
      ) : null}
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
    fontSize: 9,
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
  numberButtonExcluded: {
    borderColor: `${colors.hot}8F`,
    backgroundColor: `${colors.hot}12`,
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
    backgroundColor: colors.surfaceAccent,
  },
  selectionText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.small,
  },
  selectionTextFilled: {
    color: colors.accentPrimary,
    fontWeight: typography.weights.semibold,
  },
  analyzeButton: {
    marginTop: spacing.md,
  },
  accessSummary: {
    minHeight: 42,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
  },
  accessSummaryLabel: {
    color: colors.textSecondary,
    fontSize: typography.sizes.caption,
  },
  accessSummaryValue: {
    color: colors.accentPrimary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
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
