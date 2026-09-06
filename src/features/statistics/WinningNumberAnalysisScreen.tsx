import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import { AppCard } from '@/components/ui/AppCard';
import { SubScreenHeader } from '@/components/ui/AppTopBar';
import { LottoDrawBalls } from '@/components/ui/LottoDrawBalls';
import type { AnalysisFilters, AnalysisPeriod, LottoHistoryDraw } from '@/domain/analytics/types';
import { analyzeCombination } from '@/domain/combination/analyzeCombination';
import type { PrizeRank } from '@/domain/combination/types';
import { CombinationDetail } from '@/features/combination/components/CombinationDetail';
import { CombinationResult } from '@/features/combination/components/CombinationResult';
import { useLottoData } from '@/features/lotto-data/LottoDataContext';
import { type ThemeColors, radius, spacing, typography, useAppTheme, useThemedStyles } from '@/theme';

const DEFAULT_FILTERS: AnalysisFilters = {
  includeBonus: false,
  period: { kind: 'preset', label: '전체' },
};

type ScreenMode =
  | { kind: 'select' }
  | { kind: 'result' }
  | { kind: 'history' }
  | { kind: 'prizeRank'; rank: PrizeRank };

function findDraw(history: readonly LottoHistoryDraw[], round: number) {
  return history.find((draw) => draw.round === round) ?? history.at(-1)!;
}

export function drawsBeforeRound(history: readonly LottoHistoryDraw[], round: number) {
  return history.filter((draw) => draw.round < round);
}

function filtersWithinRound(
  filters: AnalysisFilters,
  round: number,
  firstRound: number,
): AnalysisFilters {
  if (filters.period.kind !== 'custom') return filters;
  const latestAvailableRound = round - 1;
  if (latestAvailableRound < firstRound) {
    return { ...filters, period: { kind: 'preset', label: '전체' } };
  }
  const startRound = Math.min(filters.period.startRound, latestAvailableRound);
  const endRound = Math.min(filters.period.endRound, latestAvailableRound);
  return {
    ...filters,
    period: {
      kind: 'custom',
      startRound: Math.min(startRound, endRound),
      endRound: Math.max(startRound, endRound),
    },
  };
}

function closeScreen() {
  if (router.canGoBack()) router.back();
  else router.replace('/(tabs)/statistics');
}

function RoundPickerModal({
  firstRound,
  history,
  latestRound,
  onClose,
  onSelect,
  selectedRound,
}: {
  firstRound: number;
  history: LottoHistoryDraw[];
  latestRound: number;
  onClose: () => void;
  onSelect: (round: number) => void;
  selectedRound: number;
}) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [roundInput, setRoundInput] = useState(String(selectedRound));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const recentDraws = useMemo(() => history.slice(-8).reverse(), [history]);

  const applyRound = () => {
    const nextRound = Number.parseInt(roundInput, 10);
    const draw = history.find((item) => item.round === nextRound);
    if (!draw) {
      setErrorMessage(`${firstRound}회부터 ${latestRound}회 사이의 회차를 입력해 주세요.`);
      return;
    }
    onSelect(draw.round);
    onClose();
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible>
      <View style={styles.modalBackdrop}>
        <Pressable
          accessibilityLabel="회차 선택 닫기"
          accessibilityRole="button"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.pickerSheet}>
          <View style={styles.pickerHandle} />
          <Text style={styles.pickerTitle}>당첨 회차 선택</Text>
          <Text style={styles.pickerDescription}>회차 번호로 바로 이동하거나 최근 회차에서 골라보세요.</Text>

          <View style={styles.roundInputRow}>
            <TextInput
              accessibilityLabel="분석할 회차"
              keyboardType="number-pad"
              onChangeText={(value) => {
                setRoundInput(value.replace(/[^0-9]/g, ''));
                setErrorMessage(null);
              }}
              onSubmitEditing={applyRound}
              placeholder={`${latestRound}`}
              placeholderTextColor={colors.textTertiary}
              selectTextOnFocus
              style={styles.roundInput}
              value={roundInput}
            />
            <Text style={styles.roundUnit}>회</Text>
            <Pressable
              accessibilityLabel="입력한 회차로 이동"
              accessibilityRole="button"
              onPress={applyRound}
              style={({ pressed }) => [styles.roundApplyButton, pressed && styles.pressed]}>
              <Text style={styles.roundApplyText}>이동</Text>
            </Pressable>
          </View>
          {errorMessage ? <Text style={styles.inputError}>{errorMessage}</Text> : null}

          <Text style={styles.recentTitle}>최근 회차</Text>
          <ScrollView style={styles.recentList} showsVerticalScrollIndicator={false}>
            {recentDraws.map((draw) => {
              const selected = draw.round === selectedRound;
              return (
                <Pressable
                  accessibilityLabel={`${draw.round}회 당첨번호 선택`}
                  accessibilityRole="button"
                  key={draw.round}
                  onPress={() => {
                    onSelect(draw.round);
                    onClose();
                  }}
                  style={({ pressed }) => [
                    styles.recentRow,
                    selected && styles.recentRowSelected,
                    pressed && styles.pressed,
                  ]}>
                  <Text style={[styles.recentRound, selected && styles.recentRoundSelected]}>
                    {draw.round}회
                  </Text>
                  <LottoDrawBalls
                    bonus={draw.bonus}
                    highlightedNumbers={[]}
                    numbers={draw.numbers}
                    size={22}
                  />
                  {selected ? <Ionicons color={colors.accentPrimary} name="checkmark" size={18} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function RoundStepper({
  onNext,
  onOpenPicker,
  onPrevious,
  round,
}: {
  onNext?: () => void;
  onOpenPicker: () => void;
  onPrevious?: () => void;
  round: number;
}) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.stepper}>
      <Pressable
        accessibilityLabel="이전 회차"
        accessibilityRole="button"
        accessibilityState={{ disabled: !onPrevious }}
        disabled={!onPrevious}
        onPress={onPrevious}
        style={({ pressed }) => [styles.stepperArrow, !onPrevious && styles.stepperArrowDisabled, pressed && styles.pressed]}>
        <Ionicons color={onPrevious ? colors.textPrimary : colors.textTertiary} name="chevron-back" size={19} />
      </Pressable>
      <Pressable
        accessibilityLabel={`현재 ${round}회, 다른 당첨 회차 선택`}
        accessibilityRole="button"
        onPress={onOpenPicker}
        style={({ pressed }) => [styles.stepperCenter, pressed && styles.pressed]}>
        <Text style={styles.stepperEyebrow}>당첨 회차</Text>
        <View style={styles.stepperLabelRow}>
          <Text style={styles.stepperLabel}>제 {round}회</Text>
          <Ionicons color={colors.textSecondary} name="chevron-down" size={16} />
        </View>
      </Pressable>
      <Pressable
        accessibilityLabel="다음 회차"
        accessibilityRole="button"
        accessibilityState={{ disabled: !onNext }}
        disabled={!onNext}
        onPress={onNext}
        style={({ pressed }) => [styles.stepperArrow, !onNext && styles.stepperArrowDisabled, pressed && styles.pressed]}>
        <Ionicons color={onNext ? colors.textPrimary : colors.textTertiary} name="chevron-forward" size={19} />
      </Pressable>
    </View>
  );
}

export function WinningNumberAnalysisScreen() {
  const styles = useThemedStyles(createStyles);
  const { history: unsortedHistory } = useLottoData();
  const lottoHistory = useMemo(
    () => [...unsortedHistory].sort((left, right) => left.round - right.round),
    [unsortedHistory],
  );
  const firstRound = lottoHistory[0]?.round ?? 1;
  const latestRound = lottoHistory.at(-1)?.round ?? firstRound;
  const [mode, setMode] = useState<ScreenMode>({ kind: 'select' });
  const [selectedRound, setSelectedRound] = useState(latestRound);
  const previousLatestRoundRef = useRef(latestRound);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [pickerVisible, setPickerVisible] = useState(false);
  const selectedDraw = findDraw(lottoHistory, selectedRound);
  const analysisHistory = useMemo(
    () => drawsBeforeRound(lottoHistory, selectedRound),
    [lottoHistory, selectedRound],
  );
  const latestAnalysisRound = selectedRound - 1;
  const hasPriorDraws = analysisHistory.length > 0;
  const selectedIndex = lottoHistory.findIndex((draw) => draw.round === selectedRound);
  const previousDraw = selectedIndex > 0 ? lottoHistory[selectedIndex - 1] : undefined;
  const nextDraw = selectedIndex < lottoHistory.length - 1 ? lottoHistory[selectedIndex + 1] : undefined;
  const analysis = useMemo(
    () => analyzeCombination(analysisHistory, selectedDraw.numbers, filters),
    [analysisHistory, filters, selectedDraw.numbers],
  );
  useEffect(() => {
    const previousLatestRound = previousLatestRoundRef.current;
    previousLatestRoundRef.current = latestRound;
    if (selectedRound === previousLatestRound && latestRound > previousLatestRound) {
      setSelectedRound(latestRound);
    }
  }, [latestRound, selectedRound]);
  const selectRound = (round: number) => {
    setSelectedRound(round);
    setFilters((current) => filtersWithinRound(current, round, firstRound));
  };
  const roundStepper = (
    <RoundStepper
      onNext={nextDraw ? () => selectRound(nextDraw.round) : undefined}
      onOpenPicker={() => setPickerVisible(true)}
      onPrevious={previousDraw ? () => selectRound(previousDraw.round) : undefined}
      round={selectedRound}
    />
  );

  return (
    <SafeAreaView edges={['top', 'right', 'bottom', 'left']} style={styles.safeArea}>
      <View style={styles.container}>
        {mode.kind === 'select' ? (
          <View style={styles.screen}>
            <SubScreenHeader onBack={closeScreen} title="당첨번호 분석" />
            <ScrollView contentContainerStyle={styles.selectionContent} showsVerticalScrollIndicator={false}>
              <View style={styles.selectionIntro}>
                <Text style={styles.selectionEyebrow}>당첨 당시의 기록으로 보기</Text>
                <Text style={styles.selectionTitle}>
                  {selectedRound.toLocaleString()}회 번호는{`\n`}그전에 어떻게 보였을까요?
                </Text>
                <Text style={styles.selectionDescription}>
                  {hasPriorDraws
                    ? `${selectedRound.toLocaleString()}회 당첨번호 6개를 ${firstRound.toLocaleString()}–${latestAnalysisRound.toLocaleString()}회 기록만으로 분석합니다.\n이후 회차는 포함하지 않습니다.`
                    : '1회는 이전 당첨 기록이 없어 당시 기준 분석을 제공할 수 없습니다.'}
                </Text>
              </View>

              <AppCard style={styles.drawCard}>
                {roundStepper}
                <View style={styles.drawDivider} />
                <LottoDrawBalls
                  bonus={selectedDraw.bonus}
                  highlightedNumbers={selectedDraw.numbers}
                  numbers={selectedDraw.numbers}
                  size={28}
                  style={styles.drawBalls}
                />
                <Text style={styles.bonusGuide}>
                  오른쪽 숫자는 보너스 번호입니다.
                </Text>
              </AppCard>

              <AppButton
                accessibilityLabel={`${selectedRound}회, 이전 기록으로 분석`}
                disabled={!hasPriorDraws}
                iconAfter={hasPriorDraws ? <Ionicons color="#FFFFFF" name="arrow-forward" size={18} /> : undefined}
                label={`${selectedRound.toLocaleString()}회, 이전 기록으로 분석`}
                onPress={() => setMode({ kind: 'result' })}
                style={styles.analysisButton}
              />
              <Text style={styles.disclaimer}>
                과거 기록을 설명하는 통계이며 미래 추첨 결과를 예측하지 않습니다.
              </Text>
            </ScrollView>
          </View>
        ) : mode.kind === 'result' ? (
          <CombinationResult
            key={selectedRound}
            analysis={analysis}
            bonusIncluded={filters.includeBonus}
            firstRound={firstRound}
            headerActionAccessibilityLabel="다른 당첨 회차 선택"
            headerTitle="당첨번호 분석"
            heroContext={(
              <>
                {roundStepper}
              </>
            )}
            latestRound={latestAnalysisRound}
            onBack={closeScreen}
            onBonusChange={(includeBonus) => setFilters((current) => ({ ...current, includeBonus }))}
            onOpenHistory={() => setMode({ kind: 'history' })}
            onOpenPrizeRank={(rank) => setMode({ kind: 'prizeRank', rank })}
            onPeriodChange={(period: AnalysisPeriod) => setFilters((current) => ({ ...current, period }))}
            onStartOver={() => setPickerVisible(true)}
            period={filters.period}
            showAiExplanation={false}
            showLibraryActions={false}
            startOverAccessibilityLabel="다른 당첨 회차 선택"
            startOverLabel="다른 회차 보기"
          />
        ) : (
          <CombinationDetail
            analysis={analysis}
            mode={mode}
            onBack={() => setMode({ kind: 'result' })}
          />
        )}
        {pickerVisible ? (
          <RoundPickerModal
            firstRound={firstRound}
            history={lottoHistory}
            latestRound={latestRound}
            onClose={() => setPickerVisible(false)}
            onSelect={(round) => {
              selectRound(round);
              if (mode.kind !== 'select') setMode({ kind: 'result' });
            }}
            selectedRound={selectedRound}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safeArea: { flex: 1, alignItems: 'center', backgroundColor: colors.background },
  container: { flex: 1, width: '100%', maxWidth: 500, backgroundColor: colors.background },
  screen: { flex: 1 },
  selectionContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.huge,
    paddingBottom: spacing.xxxl,
  },
  selectionIntro: { alignItems: 'center', paddingHorizontal: spacing.md },
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
  drawCard: {
    marginTop: spacing.xxxl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    borderRadius: radius.lg,
  },
  stepper: { flexDirection: 'row', alignItems: 'center' },
  stepperArrow: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
    backgroundColor: colors.surfaceElevated,
  },
  stepperArrowDisabled: { opacity: 0.42 },
  stepperCenter: { flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center' },
  stepperEyebrow: { color: colors.textSecondary, fontSize: typography.sizes.caption },
  stepperLabelRow: { marginTop: 2, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  stepperLabel: {
    color: colors.textPrimary,
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.bold,
    fontVariant: ['tabular-nums'],
  },
  drawDivider: { height: StyleSheet.hairlineWidth, marginVertical: spacing.xl, backgroundColor: colors.divider },
  drawBalls: { alignSelf: 'center' },
  bonusGuide: { marginTop: spacing.md, color: colors.textTertiary, fontSize: typography.sizes.caption, textAlign: 'center' },
  analysisButton: { marginTop: spacing.xl },
  disclaimer: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    color: colors.textTertiary,
    fontSize: typography.sizes.caption,
    lineHeight: 18,
    textAlign: 'center',
  },
  modalBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', backgroundColor: colors.backdropStrong },
  pickerSheet: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '84%',
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
  pickerTitle: { marginTop: spacing.xl, color: colors.textPrimary, fontSize: typography.sizes.title, fontWeight: typography.weights.bold },
  pickerDescription: { marginTop: spacing.sm, color: colors.textSecondary, fontSize: typography.sizes.small, lineHeight: 20 },
  roundInputRow: { marginTop: spacing.xl, flexDirection: 'row', alignItems: 'center' },
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
  roundApplyButton: {
    minWidth: 68,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.accentPrimary,
  },
  roundApplyText: { color: '#FFFFFF', fontSize: typography.sizes.small, fontWeight: typography.weights.semibold },
  inputError: { marginTop: spacing.sm, color: colors.hot, fontSize: typography.sizes.caption },
  recentTitle: { marginTop: spacing.xxl, marginBottom: spacing.sm, color: colors.textSecondary, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold },
  recentList: { maxHeight: 344 },
  recentRow: {
    minHeight: 48,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  recentRowSelected: { borderRadius: radius.md, borderBottomColor: 'transparent', backgroundColor: colors.surfaceAccent },
  recentRound: { width: 54, color: colors.textSecondary, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold, fontVariant: ['tabular-nums'] },
  recentRoundSelected: { color: colors.accentPrimary },
  pressed: { opacity: 0.72 },
});
