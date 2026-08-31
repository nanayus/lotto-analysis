import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedNumberBall } from '@/components/ui/AnimatedNumberBall';
import { AppButton } from '@/components/ui/AppButton';
import { CombinationNumberRow } from '@/components/ui/CombinationNumberRow';
import { SubScreenBackButton } from '@/components/ui/SubScreenBackButton';
import { COMBINATION_ANALYSIS_ROUTE } from '@/features/combination/combinationNavigation';
import { useCombinationDraft } from '@/features/combination/CombinationDraftContext';
import { fillCombinationRandomly } from '@/features/combination/randomFill';
import { useNumberLibrary } from '@/features/library/NumberLibraryContext';
import { useAutoHideTabBar } from '@/navigation/tabBarVisibility';
import {
  type ThemeColors,
  radius,
  spacing,
  typography,
  useAppTheme,
  useThemedStyles,
} from '@/theme';

const SHUFFLE_FRAME_MS = 72;
const SHUFFLE_DURATION_MS = 1_950;
const REVEAL_INTERVAL_MS = 600;
function createUniqueResults(gameCount: 1 | 3 | 5) {
  const results: number[][] = [];
  const keys = new Set<string>();
  while (results.length < gameCount) {
    const numbers = fillCombinationRandomly([]);
    const key = numbers.join('-');
    if (!keys.has(key)) {
      keys.add(key);
      results.push(numbers);
    }
  }
  return results;
}

export function RandomDrawScreen({
  autoDrawToken,
  gameCount,
}: {
  autoDrawToken?: string;
  gameCount: 1 | 3 | 5;
}) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const tabBarScrollProps = useAutoHideTabBar();
  const { setNumbers } = useCombinationDraft();
  const { addCombination } = useNumberLibrary();
  const [displayNumbers, setDisplayNumbers] = useState(() => fillCombinationRandomly([]));
  const [results, setResults] = useState<number[][]>([]);
  const [isRolling, setIsRolling] = useState(false);
  const [revealedCount, setRevealedCount] = useState(0);
  const drawSequence = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const revealTimerRefs = useRef<ReturnType<typeof setTimeout>[]>([]);
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rollingMotion = useSharedValue(0);

  const clearTimers = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    revealTimerRefs.current.forEach(clearTimeout);
    if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    intervalRef.current = null;
    revealTimerRefs.current = [];
    autoTimerRef.current = null;
  }, []);

  const rollingStyle = useAnimatedStyle(() => ({
    opacity: interpolate(rollingMotion.value, [0, 1], [1, 0.58]),
    transform: [{ translateY: interpolate(rollingMotion.value, [0, 1], [0, -7]) }],
  }));

  const runDraw = useCallback(() => {
    drawSequence.current += 1;
    const sequence = drawSequence.current;
    clearTimers();
    setResults([]);
    setIsRolling(true);
    setRevealedCount(0);
    setDisplayNumbers(fillCombinationRandomly([]));
    rollingMotion.set(0);
    rollingMotion.set(withRepeat(withTiming(1, { duration: 150 }), -1, true));

    const finalResults = createUniqueResults(gameCount);
    intervalRef.current = setInterval(() => {
      if (drawSequence.current === sequence) setDisplayNumbers(fillCombinationRandomly([]));
    }, SHUFFLE_FRAME_MS);

    const shuffleTimer = setTimeout(() => {
      if (drawSequence.current !== sequence) return;
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      cancelAnimation(rollingMotion);
      rollingMotion.set(withTiming(0, { duration: 180 }));

      finalResults[0].forEach((number, index) => {
        const revealTimer = setTimeout(() => {
          if (drawSequence.current !== sequence) return;
          setDisplayNumbers((current) => current.map((value, currentIndex) => (
            currentIndex === index ? number : value
          )));
          setRevealedCount(index + 1);

          if (index === finalResults[0].length - 1) {
            setResults(finalResults);
            setIsRolling(false);
            finalResults.forEach((numbers) => addCombination(numbers, 'random'));
            if (Platform.OS !== 'web') {
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          }
        }, index * REVEAL_INTERVAL_MS);
        revealTimerRefs.current.push(revealTimer);
      });
    }, SHUFFLE_DURATION_MS);
    revealTimerRefs.current.push(shuffleTimer);
  }, [addCombination, clearTimers, gameCount, rollingMotion]);

  useEffect(() => {
    autoTimerRef.current = setTimeout(runDraw, 220);
    return () => {
      drawSequence.current += 1;
      clearTimers();
      cancelAnimation(rollingMotion);
    };
  }, [autoDrawToken, clearTimers, rollingMotion, runDraw]);

  const analyze = useCallback((numbers: readonly number[]) => {
    setNumbers(numbers);
    router.push({
      pathname: COMBINATION_ANALYSIS_ROUTE,
      params: {
        analyze: `random-draw-${Date.now()}`,
        returnCount: String(gameCount),
        returnTo: 'random-draw',
        returnToken: autoDrawToken ?? '',
      },
    });
  }, [autoDrawToken, gameCount, setNumbers]);

  const firstResult = results[0];
  const sum = firstResult?.reduce((total, number) => total + number, 0) ?? 0;
  const oddCount = firstResult?.filter((number) => number % 2 === 1).length ?? 0;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView
          {...tabBarScrollProps}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <SubScreenBackButton
              accessibilityLabel="번호뽑기로 돌아가기"
              onPress={() => router.back()}
            />
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>PURE RANDOM DRAW</Text>
              <Text style={styles.title}>랜덤조합</Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{gameCount}게임</Text>
            </View>
          </View>

          <Text style={styles.description}>조건 없이 1–45 안에서 서로 다른 6개 번호를 무작위로 뽑아요.</Text>

          <View style={[styles.drawCard, firstResult && styles.drawCardReady]}>
            <View style={styles.drawCardHeader}>
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, isRolling && styles.statusDotRolling]} />
                <Text accessibilityLiveRegion="polite" style={styles.statusLabel}>
                  {isRolling
                    ? revealedCount > 0 ? '번호를 확인하는 중' : '번호를 섞는 중'
                    : firstResult ? '추첨 완료' : '추첨 준비'}
                </Text>
              </View>
              <Ionicons color={colors.accentPrimary} name={isRolling ? 'sync' : 'shuffle'} size={19} />
            </View>

            <Animated.View
              accessibilityLabel={`${isRolling
                ? revealedCount > 0 ? '확정 중인 번호' : '섞는 중인 번호'
                : '생성 번호'} ${displayNumbers.join(', ')}`}
              style={[styles.rollingNumbers, rollingStyle]}>
              {displayNumbers.map((number, index) => (
                <AnimatedNumberBall
                  key={index}
                  number={number}
                  revealed={revealedCount > index}
                  revealedStyle={styles.numberBallReady}
                  revealedTextStyle={styles.numberTextReady}
                  style={styles.numberBall}
                  textStyle={styles.numberText}
                />
              ))}
            </Animated.View>

            {isRolling ? (
              <View style={styles.rollingGuide}>
                <View style={styles.rollingLine} />
                <Text style={styles.rollingText}>
                  {revealedCount > 0 ? 'REVEALING' : 'RANDOMIZING'}
                </Text>
                <View style={styles.rollingLine} />
              </View>
            ) : firstResult ? (
              <>
                <View style={styles.metricDivider} />
                <View style={styles.metrics}>
                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>번호 합</Text>
                    <Text style={styles.metricValue}>{sum}</Text>
                  </View>
                  <View style={styles.metricDividerVertical} />
                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>홀짝</Text>
                    <Text style={styles.metricValue}>{oddCount} : {6 - oddCount}</Text>
                  </View>
                </View>
                <AppButton
                  iconAfter={<Ionicons color="#FFFFFF" name="arrow-forward" size={18} />}
                  label="이 조합 분석하기"
                  onPress={() => analyze(firstResult)}
                  style={styles.analyzeButton}
                />
              </>
            ) : null}
          </View>

          {results.length > 1 ? (
            <View style={styles.moreSection}>
              <Text style={styles.sectionTitle}>함께 뽑은 조합</Text>
              <Text style={styles.sectionDescription}>각 조합을 누르면 과거 당첨 데이터로 분석해요.</Text>
              <View style={styles.resultList}>
                {results.slice(1).map((numbers, index) => (
                  <Pressable
                    accessibilityLabel={`${index + 2}게임 ${numbers.join(', ')}, 분석하기`}
                    accessibilityRole="button"
                    key={`${numbers.join('-')}-${index}`}
                    onPress={() => analyze(numbers)}
                    style={({ pressed }) => [styles.resultRow, pressed && styles.pressed]}>
                    <Text style={styles.gameIndex}>{String(index + 2).padStart(2, '0')}</Text>
                    <CombinationNumberRow numbers={numbers} size="small" style={styles.resultNumbers} />
                    <Ionicons color={colors.accentPrimary} name="chevron-forward" size={18} />
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          <AppButton
            disabled={isRolling}
            iconAfter={isRolling ? <ActivityIndicator color="#FFFFFF" size="small" /> : undefined}
            label={isRolling ? '번호를 섞고 있어요' : '다시 뽑기'}
            onPress={runDraw}
            style={styles.redrawButton}
            variant={results.length ? 'secondary' : 'primary'}
          />
          <Text style={styles.disclaimer}>모든 조합은 동일한 방식으로 무작위 생성됩니다.</Text>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safeArea: { flex: 1, alignItems: 'center', backgroundColor: colors.background },
  container: { flex: 1, width: '100%', maxWidth: 500, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.huge },
  header: { flexDirection: 'row', alignItems: 'center' },
  headerCopy: { flex: 1, marginLeft: spacing.md },
  eyebrow: { color: colors.accentPrimary, fontSize: 9, fontWeight: typography.weights.bold, letterSpacing: 1.5, marginBottom: spacing.xs },
  title: { color: colors.textPrimary, fontSize: 24, fontWeight: typography.weights.bold, letterSpacing: -0.7 },
  countBadge: { minHeight: 34, paddingHorizontal: spacing.md, alignItems: 'center', justifyContent: 'center', borderRadius: radius.round, backgroundColor: colors.surfaceAccent },
  countBadgeText: { color: colors.accentPrimary, fontSize: typography.sizes.caption, fontWeight: typography.weights.bold },
  description: { maxWidth: 350, color: colors.textSecondary, fontSize: typography.sizes.small, lineHeight: 20, marginTop: spacing.xxl },
  drawCard: { marginTop: spacing.xl, padding: spacing.xl, overflow: 'hidden', borderRadius: radius.xl, borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.surface, boxShadow: colors.cardShadow, elevation: 3 },
  drawCardReady: { borderColor: colors.accentBorder },
  drawCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusDot: { width: 7, height: 7, borderRadius: radius.round, backgroundColor: colors.accentSecondary },
  statusDotRolling: { backgroundColor: colors.accentPrimary },
  statusLabel: { color: colors.textSecondary, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold },
  rollingNumbers: { flexDirection: 'row', justifyContent: 'space-between', gap: 6, marginTop: spacing.xxxl },
  numberBall: { flex: 1, maxWidth: 52, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: radius.round, borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.surfaceElevated },
  numberBallReady: { borderColor: colors.accentBorder, backgroundColor: colors.surfaceAccent },
  numberText: { color: colors.textSecondary, fontSize: typography.sizes.body, fontWeight: typography.weights.bold, fontVariant: ['tabular-nums'] },
  numberTextReady: { color: colors.textPrimary },
  rollingGuide: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xxxl },
  rollingLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.divider },
  rollingText: { color: colors.accentPrimary, fontSize: 8, fontWeight: typography.weights.bold, letterSpacing: 1.5 },
  metricDivider: { height: StyleSheet.hairlineWidth, marginTop: spacing.xxl, backgroundColor: colors.divider },
  metrics: { height: 68, flexDirection: 'row', alignItems: 'center' },
  metric: { flex: 1, alignItems: 'center', gap: spacing.xs },
  metricDividerVertical: { width: StyleSheet.hairlineWidth, height: 34, backgroundColor: colors.divider },
  metricLabel: { color: colors.textSecondary, fontSize: typography.sizes.caption },
  metricValue: { color: colors.textPrimary, fontSize: typography.sizes.section, fontWeight: typography.weights.bold, fontVariant: ['tabular-nums'] },
  analyzeButton: { marginTop: spacing.sm },
  moreSection: { marginTop: spacing.xxxl },
  sectionTitle: { color: colors.textPrimary, fontSize: typography.sizes.section, fontWeight: typography.weights.bold },
  sectionDescription: { color: colors.textSecondary, fontSize: typography.sizes.caption, marginTop: spacing.xs },
  resultList: { marginTop: spacing.lg, overflow: 'hidden', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.surface },
  resultRow: { minHeight: 62, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
  gameIndex: { width: 28, color: colors.textSecondary, fontSize: 10, fontWeight: typography.weights.bold },
  resultNumbers: { flex: 1, gap: 4 },
  redrawButton: { marginTop: spacing.xxl },
  disclaimer: { color: colors.textSecondary, fontSize: typography.sizes.caption, textAlign: 'center', lineHeight: 17, marginTop: spacing.md },
  pressed: { opacity: 0.68 },
});
