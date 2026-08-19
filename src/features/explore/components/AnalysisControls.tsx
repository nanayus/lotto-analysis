import { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';
import type { AnalysisPeriod } from '@/domain/analytics/types';

export type { AnalysisPeriod } from '@/domain/analytics/types';

type AnalysisControlsProps = {
  bonusIncluded: boolean;
  compact?: boolean;
  firstRound: number;
  latestRound: number;
  onBonusChange: (included: boolean) => void;
  onPeriodChange: (period: AnalysisPeriod) => void;
  period: AnalysisPeriod;
};

const presetLabels = ['최근 3회', '최근 5회', '최근 10회', '최근 52회', '전체'] as const;

function periodLabel(period: AnalysisPeriod) {
  return period.kind === 'preset'
    ? period.label
    : `${period.startRound}~${period.endRound}회`;
}

export function AnalysisControls({
  bonusIncluded,
  compact = false,
  firstRound,
  latestRound,
  onBonusChange,
  onPeriodChange,
  period,
}: AnalysisControlsProps) {
  const [selectorVisible, setSelectorVisible] = useState(false);
  const [customVisible, setCustomVisible] = useState(false);
  const [startRound, setStartRound] = useState(String(firstRound));
  const [endRound, setEndRound] = useState(String(latestRound));

  const choosePreset = (label: (typeof presetLabels)[number]) => {
    onPeriodChange({ kind: 'preset', label });
    setSelectorVisible(false);
  };

  const openCustom = () => {
    if (period.kind === 'custom') {
      setStartRound(String(period.startRound));
      setEndRound(String(period.endRound));
    }
    setCustomVisible(true);
  };

  const applyCustom = () => {
    const rawStart = Number.parseInt(startRound, 10);
    const rawEnd = Number.parseInt(endRound, 10);
    const boundedStart = Math.max(firstRound, Math.min(latestRound, rawStart || firstRound));
    const boundedEnd = Math.max(firstRound, Math.min(latestRound, rawEnd || latestRound));
    onPeriodChange({
      kind: 'custom',
      startRound: Math.min(boundedStart, boundedEnd),
      endRound: Math.max(boundedStart, boundedEnd),
    });
    setCustomVisible(false);
    setSelectorVisible(false);
  };

  return (
    <View style={[styles.controls, compact && styles.controlsCompact]}>
      <Pressable
        accessibilityLabel={`분석 기간 ${periodLabel(period)}`}
        accessibilityRole="button"
        onPress={() => setSelectorVisible(true)}
        style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
        testID="analysis-period-chip">
        <Text style={styles.chipLabel}>기간</Text>
        <Text numberOfLines={1} style={styles.chipText}>{periodLabel(period)}</Text>
        <Text style={styles.chevron}>⌄</Text>
      </Pressable>
      <Pressable
        accessibilityLabel={`보너스 번호 ${bonusIncluded ? '포함' : '제외'}`}
        accessibilityRole="switch"
        accessibilityState={{ checked: bonusIncluded }}
        onPress={() => onBonusChange(!bonusIncluded)}
        style={({ pressed }) => [
          styles.chip,
          styles.bonusChip,
          bonusIncluded && styles.bonusChipIncluded,
          pressed && styles.chipPressed,
        ]}
        testID="analysis-bonus-chip">
        <Text style={styles.chipLabel}>보너스</Text>
        <Text style={[styles.stateText, bonusIncluded && styles.stateTextIncluded]}>
          {bonusIncluded ? '포함' : '제외'}
        </Text>
      </Pressable>

      <Modal
        animationType="fade"
        onRequestClose={() => setSelectorVisible(false)}
        transparent
        visible={selectorVisible}>
        <Pressable onPress={() => setSelectorVisible(false)} style={styles.backdrop}>
          <Pressable onPress={() => undefined} style={styles.sheet}>
            <Text style={styles.sheetTitle}>분석 기간</Text>
            {presetLabels.map((label) => (
              <Pressable
                key={label}
                onPress={() => choosePreset(label)}
                style={styles.option}>
                <Text style={styles.optionText}>{label}</Text>
                {period.kind === 'preset' && period.label === label ? (
                  <Text style={styles.check}>✓</Text>
                ) : null}
              </Pressable>
            ))}
            <Pressable onPress={openCustom} style={styles.option}>
              <Text style={styles.optionText}>직접 선택</Text>
              <Text style={styles.optionHint}>회차 범위</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={() => setCustomVisible(false)}
        transparent
        visible={customVisible}>
        <View style={styles.backdrop}>
          <View style={styles.customSheet}>
            <Text style={styles.sheetTitle}>회차 직접 선택</Text>
            <View style={styles.rangeRow}>
              <TextInput
                accessibilityLabel="시작 회차"
                keyboardType="number-pad"
                onChangeText={setStartRound}
                selectTextOnFocus
                style={styles.input}
                value={startRound}
              />
              <Text style={styles.rangeSeparator}>~</Text>
              <TextInput
                accessibilityLabel="종료 회차"
                keyboardType="number-pad"
                onChangeText={setEndRound}
                selectTextOnFocus
                style={styles.input}
                value={endRound}
              />
            </View>
            <View style={styles.actions}>
              <Pressable onPress={() => setCustomVisible(false)} style={styles.actionButton}>
                <Text style={styles.cancelText}>취소</Text>
              </Pressable>
              <Pressable onPress={applyCustom} style={[styles.actionButton, styles.applyButton]}>
                <Text style={styles.applyText}>적용</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  controls: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    paddingTop: spacing.lg,
  },
  controlsCompact: {
    paddingTop: 0,
  },
  chip: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  bonusChip: {
    minWidth: 88,
    justifyContent: 'center',
  },
  bonusChipIncluded: {
    borderColor: colors.accentPrimary,
    backgroundColor: '#1B2140',
  },
  chipPressed: {
    opacity: 0.72,
  },
  chipText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.medium,
  },
  chipLabel: {
    color: colors.textSecondary,
    fontSize: typography.sizes.caption,
  },
  stateText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.medium,
  },
  stateTextIncluded: {
    color: colors.highlight,
  },
  chevron: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: -2,
  },
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    backgroundColor: '#00000080',
  },
  sheet: {
    width: '100%',
    maxWidth: 320,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.background,
  },
  customSheet: {
    width: '100%',
    maxWidth: 320,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.background,
  },
  sheetTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing.sm,
  },
  option: {
    minHeight: 42,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.sm,
  },
  optionText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.small,
  },
  optionHint: {
    color: colors.textSecondary,
    fontSize: typography.sizes.caption,
  },
  check: {
    color: colors.accentPrimary,
    fontSize: typography.sizes.small,
  },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    height: 42,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    fontSize: typography.sizes.small,
    textAlign: 'center',
  },
  rangeSeparator: {
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  actionButton: {
    minWidth: 62,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  applyButton: {
    backgroundColor: colors.accentPrimary,
  },
  cancelText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.small,
  },
  applyText: {
    color: colors.background,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
  },
});
