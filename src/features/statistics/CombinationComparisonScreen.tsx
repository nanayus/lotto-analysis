import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/AppButton';
import { SubScreenHeader } from '@/components/ui/AppTopBar';
import { LottoDrawBalls } from '@/components/ui/LottoDrawBalls';
import type { AnalysisFilters, AnalysisPeriod, LottoHistoryDraw } from '@/domain/analytics/types';
import { analyzeCombination } from '@/domain/combination/analyzeCombination';
import { CombinationComparison } from '@/features/combination/components/CombinationComparison';
import { CombinationNumberPills } from '@/features/combination/components/CombinationNumberPills';
import {
  type CombinationSource,
  type SavedCombination,
  useNumberLibrary,
} from '@/features/library/NumberLibraryContext';
import { useLottoData } from '@/features/lotto-data/LottoDataContext';
import { type ThemeColors, radius, spacing, typography, useAppTheme, useThemedStyles } from '@/theme';

const DEFAULT_FILTERS: AnalysisFilters = {
  includeBonus: false,
  period: { kind: 'preset', label: '전체' },
};

type ComparisonCandidate = {
  detail: string;
  id: string;
  kind: 'saved' | 'winning';
  label: string;
  numbers: number[];
};

type PickerSource = 'saved' | 'winning';
type PickerTarget = 'A' | 'B';

function closeScreen() {
  if (router.canGoBack()) router.back();
  else router.replace('/(tabs)/statistics');
}

function normalizeNumbers(numbers: readonly number[]) {
  return [...numbers].sort((left, right) => left - right);
}

function numberKey(numbers: readonly number[]) {
  return normalizeNumbers(numbers).join('-');
}

function sourceLabel(source: CombinationSource) {
  if (source === 'ai') return '조건 뽑기';
  if (source === 'manual') return '직접 선택';
  return '랜덤 조합';
}

function formatSavedDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '저장 조합';
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function savedCandidate(item: SavedCombination): ComparisonCandidate {
  return {
    detail: `${formatSavedDate(item.createdAt)}${item.favorite ? ' · 즐겨찾기' : ''}${item.purchased ? ' · 구매번호' : ''}`,
    id: `saved:${item.id}`,
    kind: 'saved',
    label: sourceLabel(item.source),
    numbers: normalizeNumbers(item.numbers),
  };
}

function drawCandidate(draw: LottoHistoryDraw): ComparisonCandidate {
  return {
    detail: `보너스 ${String(draw.bonus).padStart(2, '0')}`,
    id: `winning:${draw.round}`,
    kind: 'winning',
    label: `${draw.round}회 당첨번호`,
    numbers: normalizeNumbers(draw.numbers),
  };
}

function SelectionSlot({
  candidate,
  label,
  onPress,
}: {
  candidate: ComparisonCandidate | null;
  label: PickerTarget;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      accessibilityLabel={candidate ? `${label} 조합 변경` : `${label} 조합 선택`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.slot, candidate && styles.slotFilled, pressed && styles.pressed]}>
      <View style={styles.slotHeader}>
        <View style={[styles.slotBadge, label === 'B' && styles.slotBadgeB]}>
          <Text style={[styles.slotBadgeText, label === 'B' && styles.slotBadgeTextB]}>{label}</Text>
        </View>
        <View style={styles.slotHeadingCopy}>
          <Text style={styles.slotTitle}>{candidate?.label ?? `${label} 조합 선택`}</Text>
          <Text style={styles.slotDetail}>{candidate?.detail ?? '내 조합 또는 당첨 회차'}</Text>
        </View>
        <View style={styles.slotAction}>
          <Text style={styles.slotActionText}>{candidate ? '변경' : '선택'}</Text>
          <Ionicons color={colors.textSecondary} name="chevron-forward" size={16} />
        </View>
      </View>
      {candidate ? (
        <View style={styles.slotNumbers}>
          <CombinationNumberPills
            accessibilityLabel={`${label} 번호 ${candidate.numbers.join(', ')}`}
            compact
            numbers={candidate.numbers}
          />
        </View>
      ) : (
        <View style={styles.emptyGuide}>
          <Ionicons color={colors.textTertiary} name="add" size={18} />
          <Text style={styles.emptyGuideText}>비교할 번호 6개를 불러오세요</Text>
        </View>
      )}
    </Pressable>
  );
}

function CandidatePicker({
  combinations,
  firstRound,
  history,
  latestRound,
  onClose,
  onSelect,
  otherCandidate,
  target,
}: {
  combinations: SavedCombination[];
  firstRound: number;
  history: LottoHistoryDraw[];
  latestRound: number;
  onClose: () => void;
  onSelect: (candidate: ComparisonCandidate) => void;
  otherCandidate: ComparisonCandidate | null;
  target: PickerTarget;
}) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [source, setSource] = useState<PickerSource>(combinations.length ? 'saved' : 'winning');
  const [roundInput, setRoundInput] = useState(String(latestRound));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const recentDraws = useMemo(() => history.slice(-10).reverse(), [history]);
  const otherNumberKey = otherCandidate ? numberKey(otherCandidate.numbers) : null;

  const isDuplicate = (candidate: ComparisonCandidate) =>
    otherNumberKey === numberKey(candidate.numbers);

  const choose = (candidate: ComparisonCandidate) => {
    if (isDuplicate(candidate)) return;
    onSelect(candidate);
    onClose();
  };

  const applyRound = () => {
    const round = Number.parseInt(roundInput, 10);
    const draw = history.find((item) => item.round === round);
    if (!draw) {
      setErrorMessage(`${firstRound}회부터 ${latestRound}회 사이의 회차를 입력해 주세요.`);
      return;
    }
    const candidate = drawCandidate(draw);
    if (isDuplicate(candidate)) {
      setErrorMessage('다른 조합과 번호 6개가 모두 같아요. 비교할 다른 회차를 선택해 주세요.');
      return;
    }
    choose(candidate);
  };

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible>
      <View style={styles.modalBackdrop}>
        <Pressable
          accessibilityLabel="조합 선택 닫기"
          accessibilityRole="button"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.pickerSheet}>
          <View style={styles.pickerHandle} />
          <View style={styles.pickerHeading}>
            <View style={[styles.slotBadge, target === 'B' && styles.slotBadgeB]}>
              <Text style={[styles.slotBadgeText, target === 'B' && styles.slotBadgeTextB]}>{target}</Text>
            </View>
            <View>
              <Text style={styles.pickerTitle}>{target} 조합 선택</Text>
              <Text style={styles.pickerDescription}>저장한 번호나 과거 당첨번호를 불러오세요.</Text>
            </View>
          </View>

          <View accessibilityRole="tablist" style={styles.sourceTabs}>
            {([
              { label: '내 조합', value: 'saved' },
              { label: '당첨 회차', value: 'winning' },
            ] as const).map((item) => {
              const selected = source === item.value;
              return (
                <Pressable
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  key={item.value}
                  onPress={() => {
                    setSource(item.value);
                    setErrorMessage(null);
                  }}
                  style={[styles.sourceTab, selected && styles.sourceTabSelected]}>
                  <Text style={[styles.sourceTabText, selected && styles.sourceTabTextSelected]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {source === 'saved' ? (
            combinations.length ? (
              <ScrollView contentContainerStyle={styles.candidateList} showsVerticalScrollIndicator={false}>
                {combinations.map((item) => {
                  const candidate = savedCandidate(item);
                  const duplicate = isDuplicate(candidate);
                  return (
                    <Pressable
                      accessibilityLabel={`${candidate.label} ${candidate.numbers.join(', ')}를 ${target}로 선택`}
                      accessibilityRole="button"
                      accessibilityState={{ disabled: duplicate }}
                      disabled={duplicate}
                      key={candidate.id}
                      onPress={() => choose(candidate)}
                      style={({ pressed }) => [
                        styles.candidateRow,
                        duplicate && styles.candidateDisabled,
                        pressed && styles.pressed,
                      ]}>
                      <View style={styles.candidateCopy}>
                        <View style={styles.candidateMeta}>
                          <Text style={styles.candidateLabel}>{candidate.label}</Text>
                          <Text style={styles.candidateDetail}>{duplicate ? '이미 반대쪽에 선택됨' : candidate.detail}</Text>
                        </View>
                        <Text adjustsFontSizeToFit numberOfLines={1} style={styles.candidateNumbers}>
                          {candidate.numbers.map((number) => String(number).padStart(2, '0')).join(' · ')}
                        </Text>
                      </View>
                      <Ionicons color={duplicate ? colors.textTertiary : colors.textSecondary} name="chevron-forward" size={18} />
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons color={colors.textTertiary} name="albums-outline" size={28} />
                <Text style={styles.emptyStateTitle}>저장된 조합이 없어요</Text>
                <Text style={styles.emptyStateDescription}>당첨 회차 탭에서 과거 당첨번호를 선택할 수 있어요.</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setSource('winning')}
                  style={({ pressed }) => [styles.emptyStateAction, pressed && styles.pressed]}>
                  <Text style={styles.emptyStateActionText}>당첨 회차 보기</Text>
                </Pressable>
              </View>
            )
          ) : (
            <>
              <View style={styles.roundInputRow}>
                <TextInput
                  accessibilityLabel={`${target}에 넣을 당첨 회차`}
                  keyboardType="number-pad"
                  onChangeText={(value) => {
                    setRoundInput(value.replace(/[^0-9]/g, ''));
                    setErrorMessage(null);
                  }}
                  onSubmitEditing={applyRound}
                  placeholder={String(latestRound)}
                  placeholderTextColor={colors.textTertiary}
                  selectTextOnFocus
                  style={styles.roundInput}
                  value={roundInput}
                />
                <Text style={styles.roundUnit}>회</Text>
                <Pressable
                  accessibilityLabel={`입력한 회차를 ${target}로 선택`}
                  accessibilityRole="button"
                  onPress={applyRound}
                  style={({ pressed }) => [styles.roundApplyButton, pressed && styles.pressed]}>
                  <Text style={styles.roundApplyText}>선택</Text>
                </Pressable>
              </View>
              {errorMessage ? <Text style={styles.inputError}>{errorMessage}</Text> : null}
              <Text style={styles.recentTitle}>최근 회차</Text>
              <ScrollView contentContainerStyle={styles.recentList} showsVerticalScrollIndicator={false}>
                {recentDraws.map((draw) => {
                  const candidate = drawCandidate(draw);
                  const duplicate = isDuplicate(candidate);
                  return (
                    <Pressable
                      accessibilityLabel={`${draw.round}회 당첨번호를 ${target}로 선택`}
                      accessibilityRole="button"
                      accessibilityState={{ disabled: duplicate }}
                      disabled={duplicate}
                      key={draw.round}
                      onPress={() => choose(candidate)}
                      style={({ pressed }) => [
                        styles.recentRow,
                        duplicate && styles.candidateDisabled,
                        pressed && styles.pressed,
                      ]}>
                      <Text style={styles.recentRound}>{draw.round}회</Text>
                      <View style={styles.recentBalls}>
                        <LottoDrawBalls
                          bonus={draw.bonus}
                          highlightedNumbers={[]}
                          numbers={draw.numbers}
                          size={22}
                        />
                      </View>
                      {duplicate ? (
                        <Ionicons color={colors.textTertiary} name="checkmark" size={17} />
                      ) : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

export function CombinationComparisonScreen() {
  const { history: unsortedHistory } = useLottoData();
  const lottoHistory = useMemo(
    () => [...unsortedHistory].sort((left, right) => left.round - right.round),
    [unsortedHistory],
  );
  const firstRound = lottoHistory[0]?.round ?? 1;
  const latestRound = lottoHistory.at(-1)?.round ?? firstRound;
  const { combinations, isReady } = useNumberLibrary();
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [a, setA] = useState<ComparisonCandidate | null>(null);
  const [b, setB] = useState<ComparisonCandidate | null>(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [showResult, setShowResult] = useState(false);
  const selectedCount = Number(Boolean(a)) + Number(Boolean(b));
  const aAnalysis = useMemo(
    () => a ? analyzeCombination(lottoHistory, a.numbers, filters) : null,
    [a, filters, lottoHistory],
  );
  const bAnalysis = useMemo(
    () => b ? analyzeCombination(lottoHistory, b.numbers, filters) : null,
    [b, filters, lottoHistory],
  );

  if (showResult && a && b && aAnalysis && bAnalysis) {
    return (
      <SafeAreaView edges={['top', 'right', 'bottom', 'left']} style={styles.safeArea}>
        <View style={styles.container}>
          <CombinationComparison
            a={aAnalysis}
            aLabel={a.label}
            b={bAnalysis}
            bLabel={b.label}
            bonusIncluded={filters.includeBonus}
            firstRound={firstRound}
            latestRound={latestRound}
            onBack={() => setShowResult(false)}
            onBonusChange={(includeBonus) => setFilters((current) => ({ ...current, includeBonus }))}
            onPeriodChange={(period: AnalysisPeriod) => setFilters((current) => ({ ...current, period }))}
            period={filters.period}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'right', 'bottom', 'left']} style={styles.safeArea}>
      <View style={styles.container}>
        <SubScreenHeader backAccessibilityLabel="통계 메뉴로 돌아가기" onBack={closeScreen} title="조합 비교" />
        <ScrollView contentContainerStyle={styles.selectionContent} showsVerticalScrollIndicator={false}>
          <View style={styles.selectionIntro}>
            <Text style={styles.selectionEyebrow}>{selectedCount} / 2 선택</Text>
            <Text style={styles.selectionTitle}>두 조합을 같은 기준으로{`\n`}나란히 살펴보세요</Text>
            <Text style={styles.selectionDescription}>
              저장한 조합과 과거 당첨번호를 자유롭게 조합해 비교할 수 있어요.
            </Text>
          </View>

          <View style={styles.slots}>
            <SelectionSlot candidate={a} label="A" onPress={() => setPickerTarget('A')} />
            <View style={styles.slotBridge}>
              {a && b ? (
                <Pressable
                  accessibilityLabel="A와 B 순서 바꾸기"
                  accessibilityRole="button"
                  onPress={() => {
                    setA(b);
                    setB(a);
                  }}
                  style={({ pressed }) => [styles.swapButton, pressed && styles.pressed]}>
                  <Ionicons color="#FFFFFF" name="swap-vertical" size={17} />
                </Pressable>
              ) : <View style={styles.bridgeLine} />}
            </View>
            <SelectionSlot candidate={b} label="B" onPress={() => setPickerTarget('B')} />
          </View>

          <View style={styles.selectionSummary}>
            <Ionicons color={colors.textTertiary} name="options-outline" size={16} />
            <Text style={styles.selectionSummaryText}>기간과 보너스 조건은 비교 결과에서 함께 적용됩니다.</Text>
          </View>

          <AppButton
            disabled={!a || !b}
            label="비교하기"
            onPress={() => setShowResult(true)}
            style={styles.compareButton}
            testID="start-comparison-button"
          />
          {!isReady ? <Text style={styles.loadingText}>저장된 조합을 불러오고 있어요.</Text> : null}

          <Text style={styles.disclaimer}>
            비교는 과거 기록의 차이를 설명하며 어느 조합이 더 유리하거나{`\n`}
            당첨 가능성이 높다는 뜻이 아닙니다.
          </Text>
        </ScrollView>

        {pickerTarget ? (
          <CandidatePicker
            combinations={combinations}
            firstRound={firstRound}
            history={lottoHistory}
            latestRound={latestRound}
            onClose={() => setPickerTarget(null)}
            onSelect={(candidate) => {
              if (pickerTarget === 'A') setA(candidate);
              else setB(candidate);
            }}
            otherCandidate={pickerTarget === 'A' ? b : a}
            target={pickerTarget}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safeArea: { flex: 1, alignItems: 'center', backgroundColor: colors.background },
  container: { flex: 1, width: '100%', maxWidth: 500, backgroundColor: colors.background },
  selectionContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.huge,
  },
  selectionIntro: { alignItems: 'center', paddingHorizontal: spacing.sm },
  selectionEyebrow: {
    color: colors.accentPrimary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  selectionTitle: {
    marginTop: spacing.sm,
    color: colors.textPrimary,
    fontSize: 27,
    lineHeight: 34,
    fontWeight: typography.weights.bold,
    letterSpacing: -0.6,
    textAlign: 'center',
  },
  selectionDescription: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    fontSize: typography.sizes.small,
    lineHeight: 21,
    textAlign: 'center',
  },
  slots: { marginTop: spacing.xxxl },
  slot: {
    minHeight: 132,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  slotFilled: { borderColor: colors.accentBorder },
  slotHeader: { flexDirection: 'row', alignItems: 'center' },
  slotBadge: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
    backgroundColor: colors.accentPrimary,
  },
  slotBadgeB: { borderWidth: 1, borderColor: colors.accentPrimary, backgroundColor: colors.surfaceAccent },
  slotBadgeText: { color: '#FFFFFF', fontSize: typography.sizes.small, fontWeight: typography.weights.bold },
  slotBadgeTextB: { color: colors.accentPrimary },
  slotHeadingCopy: { flex: 1, minWidth: 0, marginLeft: spacing.md },
  slotTitle: { color: colors.textPrimary, fontSize: typography.sizes.small, fontWeight: typography.weights.semibold },
  slotDetail: { marginTop: 3, color: colors.textSecondary, fontSize: typography.sizes.caption },
  slotAction: { marginLeft: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 2 },
  slotActionText: { color: colors.textSecondary, fontSize: typography.sizes.caption },
  slotNumbers: { marginTop: spacing.lg, alignItems: 'center' },
  emptyGuide: {
    minHeight: 48,
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
  },
  emptyGuideText: { color: colors.textTertiary, fontSize: typography.sizes.caption },
  slotBridge: { height: 36, alignItems: 'center', justifyContent: 'center' },
  bridgeLine: { width: 1, height: 16, backgroundColor: colors.divider },
  swapButton: {
    width: 30,
    height: 30,
    marginVertical: 3,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
    backgroundColor: colors.accentPrimary,
  },
  selectionSummary: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  selectionSummaryText: { color: colors.textTertiary, fontSize: typography.sizes.caption, lineHeight: 18 },
  compareButton: { marginTop: spacing.xl },
  loadingText: { marginTop: spacing.sm, color: colors.textTertiary, fontSize: typography.sizes.caption, textAlign: 'center' },
  disclaimer: {
    marginTop: spacing.xl,
    color: colors.textTertiary,
    fontSize: typography.sizes.caption,
    lineHeight: 19,
    textAlign: 'center',
  },
  modalBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', backgroundColor: colors.backdropStrong },
  pickerSheet: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '88%',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxxl,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  pickerHandle: { alignSelf: 'center', width: 36, height: 4, borderRadius: radius.round, backgroundColor: colors.borderStrong },
  pickerHeading: { marginTop: spacing.xl, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  pickerTitle: { color: colors.textPrimary, fontSize: typography.sizes.section, fontWeight: typography.weights.bold },
  pickerDescription: { marginTop: 2, color: colors.textSecondary, fontSize: typography.sizes.caption },
  sourceTabs: { marginTop: spacing.xl, padding: 3, flexDirection: 'row', borderRadius: radius.md, backgroundColor: colors.surfaceElevated },
  sourceTab: { flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  sourceTabSelected: { backgroundColor: colors.surface },
  sourceTabText: { color: colors.textSecondary, fontSize: typography.sizes.small },
  sourceTabTextSelected: { color: colors.textPrimary, fontWeight: typography.weights.semibold },
  candidateList: { paddingTop: spacing.sm, paddingBottom: spacing.md },
  candidateRow: {
    minHeight: 74,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  candidateDisabled: { opacity: 0.38 },
  candidateCopy: { flex: 1, minWidth: 0, paddingRight: spacing.sm },
  candidateMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  candidateLabel: { color: colors.textSecondary, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold },
  candidateDetail: { flexShrink: 1, color: colors.textTertiary, fontSize: 11, textAlign: 'right' },
  candidateNumbers: {
    marginTop: spacing.sm,
    color: colors.textPrimary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    fontVariant: ['tabular-nums'],
  },
  emptyState: { minHeight: 290, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  emptyStateTitle: { marginTop: spacing.md, color: colors.textPrimary, fontSize: typography.sizes.small, fontWeight: typography.weights.semibold },
  emptyStateDescription: { marginTop: spacing.sm, color: colors.textSecondary, fontSize: typography.sizes.caption, lineHeight: 18, textAlign: 'center' },
  emptyStateAction: { marginTop: spacing.xl, minHeight: 40, paddingHorizontal: spacing.lg, alignItems: 'center', justifyContent: 'center', borderRadius: radius.round, backgroundColor: colors.surfaceAccent },
  emptyStateActionText: { color: colors.accentPrimary, fontSize: typography.sizes.small, fontWeight: typography.weights.semibold },
  roundInputRow: { marginTop: spacing.lg, flexDirection: 'row', alignItems: 'center' },
  roundInput: {
    flex: 1,
    height: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceElevated,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    fontVariant: ['tabular-nums'],
  },
  roundUnit: { marginLeft: -34, marginRight: spacing.lg, color: colors.textSecondary, fontSize: typography.sizes.small },
  roundApplyButton: { minWidth: 68, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.accentPrimary },
  roundApplyText: { color: '#FFFFFF', fontSize: typography.sizes.small, fontWeight: typography.weights.semibold },
  inputError: { marginTop: spacing.sm, color: colors.hot, fontSize: typography.sizes.caption, lineHeight: 17 },
  recentTitle: { marginTop: spacing.xl, color: colors.textSecondary, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold },
  recentList: { paddingTop: spacing.sm, paddingBottom: spacing.md },
  recentRow: {
    minHeight: 50,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  recentRound: { width: 54, color: colors.textSecondary, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold, fontVariant: ['tabular-nums'] },
  recentBalls: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.72 },
});
