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
import { router, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';

import lottoHistoryJson from '@/data/generated/lotto_history.json';
import type { LottoHistoryDraw } from '@/domain/analytics/types';
import {
  activeConditionCount,
  buildGeneratorConditionDefaults,
  generateCombination,
  generatorSectionEnabled,
} from '@/domain/generator/combinationGenerator';
import type { GenerationOutcome, GeneratorConditions } from '@/domain/generator/types';
import { describeGeneratorConditions } from '@/domain/generator/describeGeneratorConditions';
import { COMBINATION_ANALYSIS_ROUTE } from '@/features/combination/combinationNavigation';
import { useCombinationDraft } from '@/features/combination/CombinationDraftContext';
import { useNumberLibrary } from '@/features/library/NumberLibraryContext';
import { useMonetization } from '@/features/monetization/MonetizationContext';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import {
  type ThemeColors,
  radius,
  spacing,
  typography,
  useAppTheme,
  useThemedStyles,
} from '@/theme';

import { ConditionSheet } from './components/ConditionSheet';
import { useGeneratorDraft } from './GeneratorDraftContext';

const lottoHistory = lottoHistoryJson as LottoHistoryDraw[];
export const CONDITION_APPLY_MINIMUM_LOADING_MS = 3000;

function waitFor(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

function formatNumber(number: number) {
  return String(number).padStart(2, '0');
}

function conditionSummary(conditions: GeneratorConditions) {
  const labels: string[] = [];
  if (generatorSectionEnabled(conditions, 'fixedExcluded') && conditions.fixedNumbers.length) labels.push(`고정 ${conditions.fixedNumbers.join('·')}`);
  if (generatorSectionEnabled(conditions, 'fixedExcluded') && conditions.excludedNumbers.length) labels.push(`제외 ${conditions.excludedNumbers.length}개`);
  if (conditions.standardDeviation.enabled) labels.push(`표준편차 ${conditions.standardDeviation.min}~${conditions.standardDeviation.max}`);
  if (conditions.sum.enabled) labels.push(`합계 ${conditions.sum.min}~${conditions.sum.max}`);
  if (generatorSectionEnabled(conditions, 'oddEven') && conditions.oddCounts.length) labels.push('홀짝');
  if (generatorSectionEnabled(conditions, 'lowHigh') && conditions.highLowCounts.length) labels.push('저고');
  if (generatorSectionEnabled(conditions, 'acValue') && conditions.acValues.length) labels.push(`A/C ${conditions.acValues.join('·')}`);
  if (generatorSectionEnabled(conditions, 'carryCount') && conditions.carry.allowed.length) labels.push('이월수');
  if (generatorSectionEnabled(conditions, 'neighborCount') && conditions.neighbor.allowed.length) labels.push('이웃수');
  if (generatorSectionEnabled(conditions, 'consecutivePattern') && conditions.consecutivePatterns.length) labels.push('연번');
  const count = activeConditionCount(conditions);
  if (labels.length < count) labels.push(`외 ${count - labels.length}개`);
  return labels;
}

export function CombinationGeneratorScreen({
  autoOpenConditions = false,
  conditionOnly = false,
  gameCount = 1,
  sessionToken,
}: {
  autoOpenConditions?: boolean;
  conditionOnly?: boolean;
  gameCount?: 1 | 3 | 5;
  sessionToken?: string;
}) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { setNumbers } = useCombinationDraft();
  const { addCombination } = useNumberLibrary();
  const { state: monetizationState } = useMonetization();
  const { restoreConditions, saveConditions } = useGeneratorDraft();
  const [conditions, setConditions] = useState(
    () => restoreConditions(sessionToken) ?? buildGeneratorConditionDefaults(lottoHistory),
  );
  const [outcomes, setOutcomes] = useState<GenerationOutcome[]>([]);
  const outcome = outcomes[0] ?? null;
  const [sheetVisible, setSheetVisible] = useState(autoOpenConditions);
  const [recommendationPromptVisible, setRecommendationPromptVisible] = useState(conditionOnly);
  const [generating, setGenerating] = useState(false);
  const [searchedCandidates, setSearchedCandidates] = useState(0);
  const [nearestNoticeVisible, setNearestNoticeVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const generationToken = useRef(0);
  const summary = useMemo(() => conditionSummary(conditions), [conditions]);
  const conditionCount = activeConditionCount(conditions);
  const conditionApplyAccess = monetizationState.status === 'ready'
    ? monetizationState.access.isPro
      ? 'pro'
      : monetizationState.access.weeklyFreeAvailable
        || monetizationState.access.bonusAnalysisCredits > 0
        ? 'ticket'
        : 'ticket-required'
    : monetizationState.status === 'guest'
      ? 'guest'
      : 'checking';

  useEffect(() => () => { generationToken.current += 1; }, []);

  useFocusEffect(useCallback(() => {
    if (!conditionOnly) return undefined;
    setSheetVisible(true);
    return () => setSheetVisible(false);
  }, [conditionOnly]));

  const cancelGeneration = useCallback(() => {
    generationToken.current += 1;
    setGenerating(false);
    setSearchedCandidates(0);
  }, []);

  const leaveDirectConditionSelection = useCallback(() => {
    cancelGeneration();
    router.back();
  }, [cancelGeneration]);

  const generateOutcomes = useCallback(async (
    nextConditions: GeneratorConditions,
    token: number,
  ) => {
    const nextOutcomes: GenerationOutcome[] = [];
    for (let index = 0; index < gameCount; index += 1) {
      const previousSearched = nextOutcomes.reduce(
        (total, item) => total + item.searchedCandidates,
        0,
      );
      const nextOutcome = await generateCombination(nextConditions, {
        history: lottoHistory,
        isCancelled: () => generationToken.current !== token,
        onProgress: (count) => {
          if (generationToken.current === token) {
            setSearchedCandidates(previousSearched + count);
          }
        },
      });
      nextOutcomes.push(nextOutcome);
    }
    return nextOutcomes;
  }, [gameCount]);

  const handleGenerate = useCallback(async () => {
    generationToken.current += 1;
    const token = generationToken.current;
    setGenerating(true);
    setSearchedCandidates(0);
    setErrorMessage(null);
    try {
      const nextOutcomes = await generateOutcomes(conditions, token);
      if (generationToken.current !== token) return;
      setOutcomes(nextOutcomes);
      const generationConditions = describeGeneratorConditions(conditions);
      nextOutcomes.forEach((item) => addCombination(item.numbers, 'ai', {
        generationConditions,
        generatorConditions: conditions,
      }));
      if (nextOutcomes.some((item) => item.mode === 'nearest')) setNearestNoticeVisible(true);
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
  }, [addCombination, conditions, generateOutcomes]);

  const applyConditions = useCallback(async (next: GeneratorConditions) => {
    generationToken.current += 1;
    const token = generationToken.current;
    setConditions(next);
    saveConditions(sessionToken, next);
    setOutcomes([]);
    setErrorMessage(null);
    setSheetVisible(false);
    if (conditionApplyAccess === 'ticket-required') {
      router.push({
        pathname: COMBINATION_ANALYSIS_ROUTE,
        params: {
          returnCount: String(gameCount),
          returnSession: sessionToken ?? 'generator',
          returnTo: conditionOnly ? 'combination-generator' : 'draw',
          returnToken: String(Date.now()),
        },
      });
      return;
    }
    setGenerating(true);
    setSearchedCandidates(0);
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    await waitFor(0);
    if (generationToken.current !== token) return;
    const minimumLoading = waitFor(CONDITION_APPLY_MINIMUM_LOADING_MS);
    try {
      const nextOutcomes = await generateOutcomes(next, token);
      if (generationToken.current !== token) return;
      await minimumLoading;
      if (generationToken.current !== token) return;

      setOutcomes(nextOutcomes);
      const generationConditions = describeGeneratorConditions(next);
      nextOutcomes.forEach((item) => addCombination(item.numbers, 'ai', {
        generationConditions,
        generatorConditions: next,
      }));
      if (nextOutcomes.some((item) => item.mode === 'nearest')) {
        setNearestNoticeVisible(true);
      }

      const firstOutcome = nextOutcomes[0];
      if (!firstOutcome) return;
      setNumbers(firstOutcome.numbers);
      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      const destination = {
        pathname: COMBINATION_ANALYSIS_ROUTE,
        params: {
          analyze: `generator-conditions-${Date.now()}`,
          returnCount: String(gameCount),
          returnSession: sessionToken ?? 'generator',
          returnTo: conditionOnly ? 'combination-generator' : 'draw',
          returnToken: String(Date.now()),
        },
      } as const;
      router.push(destination);
    } catch (error) {
      if (generationToken.current !== token || (error as Error).message === 'GENERATION_CANCELLED') return;
      await minimumLoading;
      if (generationToken.current !== token) return;
      setErrorMessage((error as Error).message);
      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      if (generationToken.current === token) {
        setGenerating(false);
        setSearchedCandidates(0);
      }
    }
  }, [addCombination, conditionApplyAccess, conditionOnly, gameCount, generateOutcomes, saveConditions, sessionToken, setNumbers]);

  const analyzeOutcome = useCallback((selectedOutcome: GenerationOutcome | null) => {
    if (!selectedOutcome) return;
    setNumbers(selectedOutcome.numbers);
    router.push({
      pathname: COMBINATION_ANALYSIS_ROUTE,
      params: {
        analyze: `generator-${Date.now()}`,
        returnTo: 'draw',
      },
    });
  }, [setNumbers]);

  if (conditionOnly) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <View style={styles.directConditionState}>
          {generating ? (
            <>
              <ActivityIndicator color={colors.accentPrimary} size="large" />
              <Text style={styles.directConditionTitle}>조합을 만들고 있어요</Text>
              <Text style={styles.directConditionDescription}>
                선택한 조건 안에서 {gameCount}개 조합을 확인하고 있습니다.
              </Text>
              {searchedCandidates ? (
                <Text style={styles.directConditionProgress}>
                  {searchedCandidates.toLocaleString()}개 조합 확인
                </Text>
              ) : null}
              <Pressable
                accessibilityRole="button"
                onPress={leaveDirectConditionSelection}
                style={styles.directConditionCancel}>
                <Text style={styles.directConditionCancelText}>취소</Text>
              </Pressable>
            </>
          ) : errorMessage ? (
            <>
              <Text accessibilityRole="alert" style={styles.directConditionTitle}>
                조합을 만들지 못했어요
              </Text>
              <Text style={styles.directConditionDescription}>{errorMessage}</Text>
              <AppButton label="조건 다시 선택" onPress={() => setSheetVisible(true)} />
              <AppButton label="번호뽑기로 돌아가기" onPress={leaveDirectConditionSelection} variant="secondary" />
            </>
          ) : null}
        </View>

        {sheetVisible ? (
          <ConditionSheet
            applyAccess={conditionApplyAccess}
            conditions={conditions}
            history={lottoHistory}
            onApply={applyConditions}
            onClose={leaveDirectConditionSelection}
            onRecommendationPromptDismiss={() => setRecommendationPromptVisible(false)}
            recommendationPromptVisible={recommendationPromptVisible}
            visible
          />
        ) : null}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>CONDITION RANDOMIZER</Text>
              <Text style={styles.title}>AI 뽑기</Text>
            </View>
            <View style={[styles.conditionBadge, conditionCount > 0 && styles.conditionBadgeActive]}>
              <Text style={[styles.conditionBadgeText, conditionCount > 0 && styles.conditionBadgeTextActive]}>
                {conditionCount ? `${conditionCount} 조건` : '무제한'}
              </Text>
            </View>
          </View>

          <Text style={styles.intro}>
            원하는 기준을 고르면 그 조건 안에서 {gameCount}개 조합을 무작위로 만들어요.
          </Text>

          <AppCard style={[styles.heroCard, outcome && styles.heroCardReady]}>
            <View style={styles.heroTopRow}>
              <Text style={styles.heroLabel}>{outcome ? `생성된 번호${gameCount > 1 ? ` · ${gameCount}게임` : ''}` : 'YOUR NUMBERS'}</Text>
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
            {outcome ? (
              <>
                <View style={styles.heroDivider} />
                <View style={styles.metricRow}>
                  <View style={styles.metric}><Text style={styles.metricLabel}>총합</Text><Text style={styles.metricValue}>{outcome.metrics.sum}</Text></View>
                  <View style={styles.metric}><Text style={styles.metricLabel}>표준편차</Text><Text style={styles.metricValue}>{outcome.metrics.standardDeviation.toFixed(1)}</Text></View>
                  <View style={[styles.metric, styles.metricLast]}><Text style={styles.metricLabel}>A/C</Text><Text style={styles.metricValue}>{outcome.metrics.acValue}</Text></View>
                </View>
                <AppButton
                  disabled={generating}
                  iconAfter={<Ionicons color="#FFFFFF" name="arrow-forward" size={18} />}
                  label="조합 분석하기"
                  onPress={() => analyzeOutcome(outcome)}
                  style={styles.analysisButton}
                />
              </>
            ) : (
              <View style={styles.emptyAction}>
                <Text style={styles.emptyHint}>조건 없이 바로 만들거나, 세부 기준을 먼저 선택할 수 있어요.</Text>
                <AppButton
                  disabled={generating}
                  iconAfter={generating ? <ActivityIndicator color="#FFFFFF" size="small" /> : undefined}
                  label={generating ? '조합을 만들고 있어요' : '조합 만들기'}
                  onPress={handleGenerate}
                  style={styles.heroCreateButton}
                />
              </View>
            )}
          </AppCard>

          {outcomes.length > 1 ? (
            <View style={styles.additionalResults}>
              {outcomes.slice(1).map((item, index) => (
                <Pressable
                  accessibilityLabel={`${index + 2}게임 ${item.numbers.join(', ')}, 분석하기`}
                  accessibilityRole="button"
                  key={`${item.numbers.join('-')}-${index}`}
                  onPress={() => analyzeOutcome(item)}
                  style={({ pressed }) => [styles.additionalResult, pressed && styles.pressed]}>
                  <Text style={styles.additionalIndex}>{String(index + 2).padStart(2, '0')}</Text>
                  <View style={styles.additionalNumberRow}>
                    {item.numbers.map((number) => (
                      <View key={number} style={styles.additionalNumber}><Text style={styles.additionalNumberText}>{formatNumber(number)}</Text></View>
                    ))}
                  </View>
                  <Ionicons color={colors.accentPrimary} name="chevron-forward" size={18} />
                </Pressable>
              ))}
            </View>
          ) : null}

          <View style={styles.conditionSection}>
            <View style={styles.conditionHeading}>
              <Text style={styles.sectionTitle}>적용 조건</Text>
              <Pressable
                accessibilityLabel="조건 선택하기"
                accessibilityRole="button"
                onPress={() => setSheetVisible(true)}
                hitSlop={8}>
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

          {outcome ? (
            <View style={styles.actions}>
              <AppButton
                disabled={generating}
                iconAfter={generating ? <ActivityIndicator color={colors.textPrimary} size="small" /> : undefined}
                label={generating ? '다시 만들고 있어요' : '다시 만들기'}
                onPress={handleGenerate}
                variant="secondary"
              />
              {generating ? (
                <Pressable accessibilityRole="button" onPress={cancelGeneration} style={styles.cancelButton}>
                  <Text style={styles.cancelText}>취소{searchedCandidates ? ` · ${searchedCandidates.toLocaleString()}개 확인` : ''}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : generating ? (
            <Pressable accessibilityRole="button" onPress={cancelGeneration} style={styles.cancelButton}>
              <Text style={styles.cancelText}>취소{searchedCandidates ? ` · ${searchedCandidates.toLocaleString()}개 확인` : ''}</Text>
            </Pressable>
          ) : null}
          <Text style={styles.disclaimer}>번호 생성은 과거 통계에 따른 예측이나 당첨 추천이 아닙니다.</Text>
        </ScrollView>
      </View>

      {sheetVisible ? (
        <ConditionSheet
          applyAccess={conditionApplyAccess}
          conditions={conditions}
          history={lottoHistory}
          onApply={applyConditions}
          onClose={() => setSheetVisible(false)}
          visible
        />
      ) : null}

      <Modal animationType="fade" onRequestClose={() => setNearestNoticeVisible(false)} transparent visible={nearestNoticeVisible}>
        <View style={styles.noticeBackdrop}>
          <AppCard style={styles.noticeCard}>
            <View style={styles.noticeIcon}><Text style={styles.noticeIconText}>!</Text></View>
            <Text style={styles.noticeTitle}>가까운 조합을 만들었어요</Text>
            <Text style={styles.noticeBody}>조건에 맞는 조합이 없어 가장 가까운 조합을 제시했어요.</Text>
            <Pressable onPress={() => setNearestNoticeVisible(false)} style={styles.noticeButton}>
              <Text style={styles.noticeButtonText}>확인</Text>
            </Pressable>
          </AppCard>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safeArea: { flex: 1, alignItems: 'center', backgroundColor: colors.background },
  container: { flex: 1, width: '100%', maxWidth: 500, backgroundColor: colors.background },
  directConditionState: { flex: 1, width: '100%', maxWidth: 500, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xxl, gap: spacing.md },
  directConditionTitle: { color: colors.textPrimary, fontSize: typography.sizes.section, fontWeight: typography.weights.semibold, textAlign: 'center' },
  directConditionDescription: { color: colors.textSecondary, fontSize: typography.sizes.small, lineHeight: 20, textAlign: 'center' },
  directConditionProgress: { color: colors.accentPrimary, fontSize: typography.sizes.caption, fontVariant: ['tabular-nums'] },
  directConditionCancel: { minHeight: 44, paddingHorizontal: spacing.xl, alignItems: 'center', justifyContent: 'center' },
  directConditionCancelText: { color: colors.textSecondary, fontSize: typography.sizes.small, fontWeight: typography.weights.semibold },
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
  emptyAction: { marginTop: spacing.lg, paddingTop: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
  emptyHint: { color: colors.textSecondary, fontSize: typography.sizes.caption, lineHeight: 17, textAlign: 'center' },
  heroCreateButton: { marginTop: spacing.lg },
  additionalResults: { marginTop: spacing.md, overflow: 'hidden', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.surface },
  additionalResult: { minHeight: 60, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
  additionalIndex: { width: 28, color: colors.textSecondary, fontSize: 10, fontWeight: typography.weights.bold },
  additionalNumberRow: { flex: 1, flexDirection: 'row', gap: 4 },
  additionalNumber: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: radius.round, borderWidth: 1, borderColor: colors.accentBorder, backgroundColor: colors.surfaceAccent },
  additionalNumberText: { color: colors.highlight, fontSize: typography.sizes.caption, fontWeight: typography.weights.bold, fontVariant: ['tabular-nums'] },
  metricRow: { flexDirection: 'row' },
  metric: { flex: 1, alignItems: 'center', borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: colors.divider },
  metricLast: { borderRightWidth: 0 },
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
  analysisButton: { marginTop: spacing.lg },
  analysisText: { color: colors.background, fontSize: typography.sizes.body, fontWeight: typography.weights.bold },
  analysisArrow: { color: colors.background, fontSize: typography.sizes.section, fontWeight: typography.weights.medium },
  cancelButton: { minHeight: 44, marginTop: spacing.md, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: colors.textSecondary, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold },
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
