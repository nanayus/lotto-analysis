import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';

import lottoHistoryJson from '@/data/generated/lotto_history.json';
import type { LottoHistoryDraw } from '@/domain/analytics/types';
import {
  activeConditionCount,
  cloneGeneratorConditions,
  DEFAULT_GENERATOR_CONDITIONS,
  generateCombination,
} from '@/domain/generator/combinationGenerator';
import type { GenerationOutcome, GeneratorConditions } from '@/domain/generator/types';
import { useCombinationDraft } from '@/features/combination/CombinationDraftContext';
import {
  type ThemeColors,
  radius,
  spacing,
  typography,
  useAppTheme,
  useThemedStyles,
} from '@/theme';

import { ConditionSheet } from './components/ConditionSheet';

const lottoHistory = lottoHistoryJson as LottoHistoryDraw[];

function formatNumber(number: number) {
  return String(number).padStart(2, '0');
}

function conditionSummary(conditions: GeneratorConditions) {
  const labels: string[] = [];
  if (conditions.fixedNumbers.length) labels.push(`고정 ${conditions.fixedNumbers.join('·')}`);
  if (conditions.excludedNumbers.length) labels.push(`제외 ${conditions.excludedNumbers.length}개`);
  if (conditions.standardDeviation.enabled) labels.push(`표준편차 ${conditions.standardDeviation.min}~${conditions.standardDeviation.max}`);
  if (conditions.sum.enabled) labels.push(`합계 ${conditions.sum.min}~${conditions.sum.max}`);
  if (conditions.oddCounts.length) labels.push('홀짝');
  if (conditions.highLowCounts.length) labels.push('저고');
  if (conditions.acValues.length) labels.push(`A/C ${conditions.acValues.join('·')}`);
  if (conditions.carry.allowed.length) labels.push('이월수');
  if (conditions.neighbor.allowed.length) labels.push('이웃수');
  if (conditions.consecutivePatterns.length) labels.push('연번');
  const count = activeConditionCount(conditions);
  if (labels.length < count) labels.push(`외 ${count - labels.length}개`);
  return labels;
}

export function CombinationGeneratorScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { setNumbers } = useCombinationDraft();
  const [conditions, setConditions] = useState(() => cloneGeneratorConditions(DEFAULT_GENERATOR_CONDITIONS));
  const [outcome, setOutcome] = useState<GenerationOutcome | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [searchedCandidates, setSearchedCandidates] = useState(0);
  const [nearestNoticeVisible, setNearestNoticeVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const generationToken = useRef(0);
  const summary = useMemo(() => conditionSummary(conditions), [conditions]);
  const conditionCount = activeConditionCount(conditions);

  useEffect(() => () => { generationToken.current += 1; }, []);

  const cancelGeneration = useCallback(() => {
    generationToken.current += 1;
    setGenerating(false);
    setSearchedCandidates(0);
  }, []);

  const handleGenerate = useCallback(async () => {
    generationToken.current += 1;
    const token = generationToken.current;
    setGenerating(true);
    setSearchedCandidates(0);
    setErrorMessage(null);
    try {
      const nextOutcome = await generateCombination(conditions, {
        history: lottoHistory,
        isCancelled: () => generationToken.current !== token,
        onProgress: (count) => {
          if (generationToken.current === token) setSearchedCandidates(count);
        },
      });
      if (generationToken.current !== token) return;
      setOutcome(nextOutcome);
      if (nextOutcome.mode === 'nearest') setNearestNoticeVisible(true);
      if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      if (generationToken.current !== token || (error as Error).message === 'GENERATION_CANCELLED') return;
      setErrorMessage((error as Error).message);
      if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      if (generationToken.current === token) {
        setGenerating(false);
        setSearchedCandidates(0);
      }
    }
  }, [conditions]);

  const applyConditions = useCallback((next: GeneratorConditions) => {
    generationToken.current += 1;
    setConditions(next);
    setOutcome(null);
    setErrorMessage(null);
    setSheetVisible(false);
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
  }, []);

  const analyzeOutcome = useCallback(() => {
    if (!outcome) return;
    setNumbers(outcome.numbers);
    router.navigate({
      pathname: '/(tabs)/combination',
      params: { analyze: `generator-${Date.now()}` },
    });
  }, [outcome, setNumbers]);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>CONDITION RANDOMIZER</Text>
              <Text style={styles.title}>조합 만들기 (2)</Text>
            </View>
            <View style={[styles.conditionBadge, conditionCount > 0 && styles.conditionBadgeActive]}>
              <Text style={[styles.conditionBadgeText, conditionCount > 0 && styles.conditionBadgeTextActive]}>
                {conditionCount ? `${conditionCount} 조건` : '무제한'}
              </Text>
            </View>
          </View>

          <Text style={styles.intro}>
            원하는 기준을 고르면 그 조건 안에서 한 조합을 무작위로 만들어요.
          </Text>

          <View style={[styles.heroCard, outcome && styles.heroCardReady]}>
            <View style={styles.heroTopRow}>
              <Text style={styles.heroLabel}>{outcome ? '생성된 번호' : 'YOUR NUMBERS'}</Text>
              {outcome?.mode === 'nearest' ? <Text style={styles.nearestBadge}>가까운 조합</Text> : null}
            </View>
            <View accessibilityLabel={outcome ? `생성 번호 ${outcome.numbers.join(', ')}` : '생성 번호 없음'} style={styles.numberRow}>
              {Array.from({ length: 6 }, (_, index) => {
                const number = outcome?.numbers[index];
                return (
                  <View key={index} style={[styles.numberSlot, Boolean(number) && styles.numberSlotFilled]}>
                    <Text style={[styles.numberSlotText, Boolean(number) && styles.numberSlotTextFilled]}>
                      {number ? formatNumber(number) : '—'}
                    </Text>
                  </View>
                );
              })}
            </View>
            <View style={styles.heroDivider} />
            {outcome ? (
              <View style={styles.metricRow}>
                <View style={styles.metric}><Text style={styles.metricLabel}>총합</Text><Text style={styles.metricValue}>{outcome.metrics.sum}</Text></View>
                <View style={styles.metric}><Text style={styles.metricLabel}>표준편차</Text><Text style={styles.metricValue}>{outcome.metrics.standardDeviation.toFixed(1)}</Text></View>
                <View style={styles.metric}><Text style={styles.metricLabel}>A/C</Text><Text style={styles.metricValue}>{outcome.metrics.acValue}</Text></View>
              </View>
            ) : (
              <Text style={styles.emptyHint}>조건 없이 바로 만들거나, 세부 기준을 먼저 선택할 수 있어요.</Text>
            )}
          </View>

          <View style={styles.conditionSection}>
            <View style={styles.conditionHeading}>
              <Text style={styles.sectionTitle}>적용 조건</Text>
              <Pressable accessibilityRole="button" onPress={() => setSheetVisible(true)} hitSlop={8}>
                <Text style={styles.editLink}>{conditionCount ? '수정하기' : '선택하기'} ›</Text>
              </Pressable>
            </View>
            {summary.length ? (
              <View style={styles.summaryChips}>
                {summary.map((label) => <View key={label} style={styles.summaryChip}><Text style={styles.summaryChipText}>{label}</Text></View>)}
              </View>
            ) : (
              <Text style={styles.noCondition}>선택된 조건이 없습니다. 1~45 전체에서 생성합니다.</Text>
            )}
          </View>

          {outcome?.mode === 'nearest' ? (
            <View style={styles.violationCard}>
              <Text style={styles.violationTitle}>충족하지 못한 조건</Text>
              {outcome.violations.map((violation) => (
                <View key={violation.key} style={styles.violationRow}>
                  <Text style={styles.violationLabel}>{violation.label}</Text>
                  <Text style={styles.violationValue}>{violation.actual} · 기준 {violation.expected}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {errorMessage ? <Text accessibilityRole="alert" style={styles.errorText}>{errorMessage}</Text> : null}

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              disabled={generating}
              onPress={handleGenerate}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, generating && styles.buttonDisabled]}>
              {generating ? (
                <View style={styles.generatingRow}>
                  <ActivityIndicator color={colors.background} size="small" />
                  <Text style={styles.primaryText}>조건을 확인하고 있어요</Text>
                </View>
              ) : (
                <Text style={styles.primaryText}>{outcome ? '다시 만들기' : '번호 만들기'}</Text>
              )}
            </Pressable>
            {generating ? (
              <Pressable accessibilityRole="button" onPress={cancelGeneration} style={styles.secondaryButton}>
                <Text style={styles.secondaryText}>취소{searchedCandidates ? ` · ${searchedCandidates.toLocaleString()}개 확인` : ''}</Text>
              </Pressable>
            ) : (
              <Pressable accessibilityRole="button" onPress={() => setSheetVisible(true)} style={styles.secondaryButton}>
                <Text style={styles.secondaryText}>조건 선택하기</Text>
              </Pressable>
            )}
            {outcome && !generating ? (
              <Pressable accessibilityRole="button" onPress={analyzeOutcome} style={styles.analysisButton}>
                <Text style={styles.analysisText}>이 조합 분석하기 →</Text>
              </Pressable>
            ) : null}
          </View>
          <Text style={styles.disclaimer}>번호 생성은 과거 통계에 따른 예측이나 당첨 추천이 아닙니다.</Text>
        </ScrollView>
      </View>

      {sheetVisible ? (
        <ConditionSheet
          conditions={conditions}
          history={lottoHistory}
          onApply={applyConditions}
          onClose={() => setSheetVisible(false)}
          visible
        />
      ) : null}

      <Modal animationType="fade" onRequestClose={() => setNearestNoticeVisible(false)} transparent visible={nearestNoticeVisible}>
        <View style={styles.noticeBackdrop}>
          <View accessibilityRole="alert" style={styles.noticeCard}>
            <View style={styles.noticeIcon}><Text style={styles.noticeIconText}>!</Text></View>
            <Text style={styles.noticeTitle}>가까운 조합을 만들었어요</Text>
            <Text style={styles.noticeBody}>조건에 맞는 조합이 없어 가장 가까운 조합을 제시했어요.</Text>
            <Pressable onPress={() => setNearestNoticeVisible(false)} style={styles.noticeButton}>
              <Text style={styles.noticeButtonText}>확인</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safeArea: { flex: 1, alignItems: 'center', backgroundColor: colors.background },
  container: { flex: 1, width: '100%', maxWidth: 500, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.huge },
  header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  eyebrow: { color: colors.textSecondary, fontSize: 9, letterSpacing: 1.6, marginBottom: spacing.sm },
  title: { color: colors.textPrimary, fontSize: typography.sizes.title, fontWeight: typography.weights.semibold, letterSpacing: -0.7 },
  conditionBadge: { minHeight: 32, paddingHorizontal: spacing.md, borderRadius: radius.round, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.divider, alignItems: 'center', justifyContent: 'center' },
  conditionBadgeActive: { borderColor: colors.accentPrimary, backgroundColor: colors.surfaceAccent },
  conditionBadgeText: { color: colors.textSecondary, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold },
  conditionBadgeTextActive: { color: colors.highlight },
  intro: { color: colors.textSecondary, fontSize: typography.sizes.small, lineHeight: 20, marginTop: spacing.xxl, maxWidth: 330 },
  heroCard: { marginTop: spacing.xl, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.surface },
  heroCardReady: { borderColor: colors.accentBorder },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroLabel: { color: colors.textSecondary, fontSize: typography.sizes.caption, letterSpacing: 1 },
  nearestBadge: { color: colors.hot, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold },
  numberRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.lg, gap: spacing.sm },
  numberSlot: { flex: 1, maxWidth: 52, aspectRatio: 1, borderRadius: radius.round, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.neutral, alignItems: 'center', justifyContent: 'center' },
  numberSlotFilled: { borderStyle: 'solid', borderColor: colors.accentPrimary, backgroundColor: colors.surfaceAccent },
  numberSlotText: { color: colors.textSecondary, fontSize: typography.sizes.small },
  numberSlotTextFilled: { color: colors.highlight, fontSize: typography.sizes.body, fontWeight: typography.weights.bold, fontVariant: ['tabular-nums'] },
  heroDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.divider, marginVertical: spacing.lg },
  emptyHint: { color: colors.textSecondary, fontSize: typography.sizes.caption, lineHeight: 17, textAlign: 'center' },
  metricRow: { flexDirection: 'row' },
  metric: { flex: 1, alignItems: 'center', borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: colors.divider },
  metricLabel: { color: colors.textSecondary, fontSize: typography.sizes.caption },
  metricValue: { color: colors.textPrimary, fontSize: typography.sizes.section, fontWeight: typography.weights.semibold, marginTop: spacing.xs },
  conditionSection: { marginTop: spacing.xxl, paddingTop: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
  conditionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: colors.textPrimary, fontSize: typography.sizes.body, fontWeight: typography.weights.semibold },
  editLink: { color: colors.accentPrimary, fontSize: typography.sizes.small, fontWeight: typography.weights.medium },
  noCondition: { color: colors.textSecondary, fontSize: typography.sizes.caption, marginTop: spacing.md },
  summaryChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  summaryChip: { minHeight: 32, justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: radius.round, borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.surface },
  summaryChipText: { color: colors.highlight, fontSize: typography.sizes.caption },
  violationCard: { marginTop: spacing.lg, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.hot, backgroundColor: colors.surfaceDanger, gap: spacing.sm },
  violationTitle: { color: colors.hot, fontSize: typography.sizes.small, fontWeight: typography.weights.semibold },
  violationRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  violationLabel: { color: colors.textPrimary, fontSize: typography.sizes.caption },
  violationValue: { flex: 1, color: colors.textSecondary, fontSize: typography.sizes.caption, textAlign: 'right' },
  errorText: { color: colors.hot, fontSize: typography.sizes.small, textAlign: 'center', marginTop: spacing.lg },
  actions: { gap: spacing.sm, marginTop: spacing.xxl },
  primaryButton: { minHeight: 52, borderRadius: radius.md, backgroundColor: colors.accentPrimary, alignItems: 'center', justifyContent: 'center' },
  buttonDisabled: { opacity: 0.72 },
  primaryText: { color: colors.background, fontSize: typography.sizes.body, fontWeight: typography.weights.bold },
  generatingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  secondaryButton: { minHeight: 48, borderRadius: radius.md, borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: colors.textPrimary, fontSize: typography.sizes.small, fontWeight: typography.weights.semibold },
  analysisButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  analysisText: { color: colors.accentSecondary, fontSize: typography.sizes.small, fontWeight: typography.weights.semibold },
  pressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
  disclaimer: { color: colors.textSecondary, fontSize: typography.sizes.caption, textAlign: 'center', lineHeight: 17, marginTop: spacing.lg },
  noticeBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, backgroundColor: colors.backdropStrong },
  noticeCard: { width: '100%', maxWidth: 340, padding: spacing.xl, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.surface, alignItems: 'center' },
  noticeIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surfaceDanger, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  noticeIconText: { color: colors.hot, fontSize: typography.sizes.section, fontWeight: typography.weights.bold },
  noticeTitle: { color: colors.textPrimary, fontSize: typography.sizes.section, fontWeight: typography.weights.semibold },
  noticeBody: { color: colors.textSecondary, fontSize: typography.sizes.small, lineHeight: 20, textAlign: 'center', marginTop: spacing.sm },
  noticeButton: { width: '100%', minHeight: 46, borderRadius: radius.md, backgroundColor: colors.accentPrimary, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xl },
  noticeButtonText: { color: colors.background, fontSize: typography.sizes.small, fontWeight: typography.weights.bold },
});
