import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import NumberFlow from 'rn-number-flow';

import { MainTabHeader } from '@/components/ui/AppTopBar';
import { LottoDrawBalls } from '@/components/ui/LottoDrawBalls';
import type { LottoHistoryDraw } from '@/domain/analytics/types';
import { trackEvent } from '@/features/analytics/analyticsClient';
import { useLottoData } from '@/features/lotto-data/LottoDataContext';
import { useMonetization } from '@/features/monetization/MonetizationContext';
import { useAutoHideTabBar } from '@/navigation/tabBarVisibility';
import { type ThemeColors, radius, spacing, typography, useThemedStyles } from '@/theme';

import {
  formatDrawDate,
  formatLottoCountdown,
  getLottoCountdownParts,
  padTime,
} from './drawSchedule';
import {
  NEW_DRAW_ANNOUNCEMENT_STORAGE_KEY,
  shouldShowNewDrawAnnouncement,
} from './newDrawAnnouncement';

type GameCount = 1 | 2 | 3 | 5;
const GUEST_GAME_COUNTS: readonly GameCount[] = [1, 2];
const PRO_GAME_COUNTS: readonly GameCount[] = [1, 3, 5];

function LatestDrawInfo({
  draw,
  onRefresh,
  refreshNotice,
  refreshing,
}: {
  draw: LottoHistoryDraw;
  onRefresh: () => void;
  refreshNotice: string | null;
  refreshing: boolean;
}) {
  const styles = useThemedStyles(createStyles);
  const [now, setNow] = useState(() => new Date());
  const drawDate = formatDrawDate(draw.date);
  const countdown = formatLottoCountdown(now);
  const countdownParts = getLottoCountdownParts(now);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.drawInfo}>
      <View style={styles.drawInfoHeader}>
        <Text style={styles.drawInfoMeta}>
          제 {draw.round}회{drawDate ? ` · ${drawDate}` : ''}
        </Text>
        <Pressable
          accessibilityHint="Firestore에서 최신 회차를 다시 확인합니다"
          accessibilityLabel="최신 당첨번호 새로고침"
          accessibilityRole="button"
          accessibilityState={{ busy: refreshing, disabled: refreshing }}
          disabled={refreshing}
          hitSlop={8}
          onPress={onRefresh}
          style={({ pressed }) => [
            styles.drawRefreshButton,
            pressed && !refreshing && styles.pressed,
          ]}>
          {refreshing
            ? <ActivityIndicator color={styles.drawRefreshIcon.color} size="small" />
            : <Ionicons color={styles.drawRefreshIcon.color} name="refresh-outline" size={17} />}
        </Pressable>
      </View>
      <View
        accessibilityLabel={`최근 당첨번호, 제 ${draw.round}회, ${draw.numbers.join(', ')}, 보너스 ${draw.bonus}. 다음 추첨까지 ${countdown}`}
        accessible
        style={styles.drawInfoContent}>
        <LottoDrawBalls
          bonus={draw.bonus}
          highlightedNumbers={[]}
          numbers={draw.numbers}
          size={28}
        />
        <View style={styles.drawCountdownBlock}>
          <View style={styles.drawCountdownHeader}>
            <View style={styles.drawCountdownDot} />
            <Text style={styles.drawCountdownLabel}>다음 추첨까지</Text>
          </View>
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.drawCountdownValue}>
            <NumberFlow
              animationConfig={{
                animateOnMount: true,
                damping: 18,
                digitDelay: 28,
                mass: 0.5,
                stiffness: 210,
              }}
              style={styles.countdownNumber}
              value={String(countdownParts.days)}
            />
            <Text style={styles.countdownUnit}>일</Text>
            <NumberFlow
              animationConfig={{
                animateOnMount: true,
                damping: 18,
                digitDelay: 28,
                mass: 0.5,
                stiffness: 210,
              }}
              separatorStyle={styles.countdownSeparator}
              style={styles.countdownNumber}
              value={`${padTime(countdownParts.hours)}:${padTime(countdownParts.minutes)}`}
            />
            <Text style={styles.countdownSecondsColon}>:</Text>
            <NumberFlow
              animationConfig={{
                animateOnMount: true,
                damping: 18,
                digitDelay: 34,
                mass: 0.5,
                stiffness: 225,
              }}
              style={styles.countdownSeconds}
              value={padTime(countdownParts.seconds)}
            />
          </View>
        </View>
      </View>
      {refreshNotice ? (
        <Text accessibilityLiveRegion="polite" style={styles.drawRefreshNotice}>
          {refreshNotice}
        </Text>
      ) : null}
    </View>
  );
}

function NewDrawAnnouncement({
  draw,
  onClose,
  onOpen,
  visible,
}: {
  draw: LottoHistoryDraw;
  onClose: () => void;
  onOpen: () => void;
  visible: boolean;
}) {
  const styles = useThemedStyles(createStyles);
  const drawDate = formatDrawDate(draw.date);
  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}>
      <View style={styles.announcementBackdrop}>
        <Pressable
          accessibilityLabel="새 당첨 결과 안내 닫기"
          accessibilityRole="button"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View accessibilityViewIsModal style={styles.announcementSheet}>
          <View style={styles.announcementHandle} />
          <Text style={styles.announcementEyebrow}>NEW DRAW</Text>
          <Text style={styles.announcementTitle}>제 {draw.round}회 당첨 결과가 반영됐어요</Text>
          <Text style={styles.announcementDescription}>
            {drawDate ? `${drawDate} 추첨 · ` : ''}출처 동행복권
          </Text>
          <View style={styles.announcementNumbers}>
            <LottoDrawBalls
              bonus={draw.bonus}
              highlightedNumbers={[]}
              numbers={draw.numbers}
              size={28}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={onOpen}
            style={({ pressed }) => [styles.announcementPrimary, pressed && styles.pressed]}>
            <Text style={styles.announcementPrimaryText}>이번 회차 분석하기</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => [styles.announcementSecondary, pressed && styles.pressed]}>
            <Text style={styles.announcementSecondaryText}>닫기</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export function DrawHomeScreen() {
  const styles = useThemedStyles(createStyles);
  const tabBarScrollProps = useAutoHideTabBar();
  const { isReady: lottoDataReady, latestDraw, refresh: refreshLottoData } = useLottoData();
  const { productAccess, proPlanEnabled = true } = useMonetization();
  const hasFullGenerationAccess = productAccess.combinationSelectionLimit >= 5;
  const gameCounts = useMemo(
    () => hasFullGenerationAccess ? PRO_GAME_COUNTS : GUEST_GAME_COUNTS,
    [hasFullGenerationAccess],
  );
  const [gameCount, setGameCount] = useState<GameCount>(1);
  const [announcementVisible, setAnnouncementVisible] = useState(false);
  const [refreshNotice, setRefreshNotice] = useState<string | null>(null);
  const [refreshingDraw, setRefreshingDraw] = useState(false);
  const checkedAnnouncementRoundRef = useRef<number | null>(null);
  const refreshNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedGameCount = gameCounts.includes(gameCount) ? gameCount : 1;

  useEffect(() => () => {
    if (refreshNoticeTimerRef.current) clearTimeout(refreshNoticeTimerRef.current);
  }, []);

  const openConditionDraw = useCallback(() => {
    router.navigate({
      pathname: '/combination-generator',
      params: { count: '1', openConditions: String(Date.now()) },
    });
  }, []);

  const openRandomDraw = useCallback(() => {
    router.navigate({
      pathname: '/(tabs)/draw/random-draw',
      params: { count: String(selectedGameCount), draw: String(Date.now()) },
    });
  }, [selectedGameCount]);

  useEffect(() => {
    if (!lottoDataReady || checkedAnnouncementRoundRef.current === latestDraw.round) return;
    checkedAnnouncementRoundRef.current = latestDraw.round;
    let active = true;
    void AsyncStorage.getItem(NEW_DRAW_ANNOUNCEMENT_STORAGE_KEY)
      .then(async (value) => {
        const seenRound = Number.parseInt(value ?? '0', 10) || 0;
        if (!active || !shouldShowNewDrawAnnouncement(latestDraw, seenRound)) return;
        await AsyncStorage.setItem(
          NEW_DRAW_ANNOUNCEMENT_STORAGE_KEY,
          String(latestDraw.round),
        );
        if (!active) return;
        setAnnouncementVisible(true);
        trackEvent('new_draw_announcement_viewed', { round: latestDraw.round });
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [latestDraw, lottoDataReady]);

  const closeAnnouncement = useCallback(() => {
    setAnnouncementVisible(false);
    trackEvent('new_draw_announcement_closed', { round: latestDraw.round });
  }, [latestDraw.round]);

  const openLatestDrawAnalysis = useCallback(() => {
    setAnnouncementVisible(false);
    trackEvent('new_draw_announcement_opened', { round: latestDraw.round });
    router.navigate('/statistics/winning-number-analysis');
  }, [latestDraw.round]);

  const refreshLatestDraw = useCallback(async () => {
    if (refreshingDraw) return;
    setRefreshingDraw(true);
    setRefreshNotice(null);
    if (refreshNoticeTimerRef.current) clearTimeout(refreshNoticeTimerRef.current);
    const result = await refreshLottoData(true);
    trackEvent('lotto_data_manual_refresh', {
      latest_round: result.latestRound,
      result: result.status,
    });
    const notice = result.status === 'updated'
      ? '새 회차를 반영했어요.'
      : result.status === 'unchanged' || result.status === 'skipped'
        ? '이미 최신 회차예요.'
        : '최신 정보를 확인하지 못했어요.';
    setRefreshNotice(notice);
    setRefreshingDraw(false);
    refreshNoticeTimerRef.current = setTimeout(() => setRefreshNotice(null), 2_400);
  }, [refreshLottoData, refreshingDraw]);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.container}>
        <MainTabHeader />
        <ScrollView
          {...tabBarScrollProps}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          <Pressable
            accessibilityLabel="조건 뽑기, 조합 선택하기"
            accessibilityHint="조건을 선택해 번호를 생성합니다"
            accessibilityRole="button"
            onPress={openConditionDraw}
            style={({ pressed }) => [styles.aiCard, pressed && styles.cardPressed]}>
            <View style={styles.aiGlowLarge} />
            <View style={styles.aiGlowSmall} />
            <View style={styles.aiTopRow}>
              <View style={styles.aiIcon}>
                <Text style={styles.aiIconText}>✦</Text>
              </View>
            </View>
            <View style={styles.aiCopy}>
              <Text style={styles.aiEyebrow}>CONDITION DRAW</Text>
              <Text style={styles.aiTitle}>조건 뽑기</Text>
              <Text style={styles.aiDescription}>원하는 조건을 직접 정하고{`\n`}하나의 조합을 만들어보세요.</Text>
              <Text style={styles.aiPolicy}>
                {proPlanEnabled
                  ? productAccess.tier === 'guest'
                    ? `게스트 · 조건 ${productAccess.conditionSelectionLimit}개`
                    : 'Pro · 조건 무제한 · 추천 조건'
                  : '조건 무제한 · 추천 조건'}
              </Text>
            </View>
            <View style={styles.aiAction}>
              <Text style={styles.aiActionText}>조합 선택하기</Text>
              <Text style={styles.aiActionArrow}>→</Text>
            </View>
          </Pressable>

          <LatestDrawInfo
            draw={latestDraw}
            onRefresh={() => { void refreshLatestDraw(); }}
            refreshNotice={refreshNotice}
            refreshing={refreshingDraw}
          />

          <View style={styles.randomCard}>
            <View style={styles.randomHeader}>
              <View style={styles.randomIcon}>
                <Text style={styles.randomIconText}>⇄</Text>
              </View>
              <View style={styles.randomCopy}>
                <Text style={styles.randomTitle}>랜덤조합</Text>
                <Text style={styles.randomDescription}>조건 없이 번호를 바로 만들어요.</Text>
              </View>
              {proPlanEnabled ? (
                <View accessibilityLabel="무료 기능" style={styles.freeBadge}>
                  <Text style={styles.freeBadgeText}>FREE</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.randomCountSection}>
              <Text style={styles.randomCountLabel}>게임 수</Text>
              <View accessibilityLabel="랜덤조합 게임 수" accessibilityRole="radiogroup" style={styles.countOptions}>
                {gameCounts.map((count) => {
                  const selected = count === selectedGameCount;
                  return (
                    <Pressable
                      accessibilityLabel={`${count}게임`}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      key={count}
                      onPress={() => setGameCount(count)}
                      style={({ pressed }) => [
                        styles.countChip,
                        selected && styles.countChipSelected,
                        pressed && styles.pressed,
                      ]}>
                      <Text style={[styles.countChipText, selected && styles.countChipTextSelected]}>
                        {count}게임
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <Text style={styles.countPolicy}>
              {proPlanEnabled
                ? productAccess.tier === 'guest'
                  ? '게스트 · 최대 2게임'
                  : 'Pro · 최대 5게임'
                : '최대 5게임'}
            </Text>

            <Pressable
              accessibilityHint="조건 없이 번호를 바로 생성합니다"
              accessibilityLabel={`랜덤으로 ${selectedGameCount}게임 뽑기`}
              accessibilityRole="button"
              onPress={openRandomDraw}
              style={({ pressed }) => [styles.randomAction, pressed && styles.randomActionPressed]}>
              <Text style={styles.randomActionText}>{selectedGameCount}게임 바로 뽑기</Text>
              <Text style={styles.randomActionArrow}>→</Text>
            </Pressable>
          </View>

          <Text style={styles.disclaimer}>생성 번호는 당첨 예측이나 추천을 의미하지 않습니다.</Text>
        </ScrollView>
        <NewDrawAnnouncement
          draw={latestDraw}
          onClose={closeAnnouncement}
          onOpen={openLatestDrawAnalysis}
          visible={announcementVisible}
        />
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safeArea: { flex: 1, alignItems: 'center', backgroundColor: colors.background },
  container: { flex: 1, width: '100%', maxWidth: 500, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.xxl, paddingBottom: spacing.huge },
  countOptions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  countChip: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.round, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface },
  countChipSelected: { borderColor: colors.accentPrimary, backgroundColor: colors.surfaceAccent },
  countChipText: { color: colors.textSecondary, fontSize: typography.sizes.small, fontWeight: typography.weights.regular },
  countChipTextSelected: { color: colors.accentPrimary, fontWeight: typography.weights.semibold },
  aiCard: { minHeight: 268, padding: spacing.xl, overflow: 'hidden', borderRadius: radius.xl, borderWidth: 1, borderColor: colors.accentBorder, backgroundColor: colors.accentActive, boxShadow: '0 14px 32px rgba(0, 102, 204, 0.18)', elevation: 6 },
  aiGlowLarge: { position: 'absolute', width: 230, height: 230, right: -82, top: -92, borderRadius: 115, backgroundColor: '#FFFFFF12' },
  aiGlowSmall: { position: 'absolute', width: 190, height: 190, left: -118, bottom: -124, borderRadius: 95, backgroundColor: '#00000012' },
  aiTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  aiIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: '#FFFFFF38', backgroundColor: '#FFFFFF1A' },
  aiIconText: { color: '#FFFFFF', fontSize: 23, lineHeight: 26 },
  primaryBadge: { minHeight: 32, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, borderRadius: radius.round, backgroundColor: '#FFFFFF1A' },
  primaryBadgeText: { color: '#FFFFFF', fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold, letterSpacing: 0.8 },
  ticketBadge: { backgroundColor: '#FFFFFF59' },
  ticketBadgeText: { fontSize: typography.sizes.small },
  aiCopy: { flex: 1, justifyContent: 'center', paddingVertical: 10 },
  aiEyebrow: { color: '#FFFFFFB8', fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold, letterSpacing: 1.2 },
  aiTitle: { color: '#FFFFFF', fontSize: 34, lineHeight: 38, fontWeight: typography.weights.semibold, letterSpacing: -0.28, marginTop: 6 },
  aiDescription: { color: '#FFFFFFD9', fontSize: typography.sizes.small, lineHeight: 21, letterSpacing: -0.25, marginTop: spacing.sm },
  aiPolicy: { color: '#FFFFFFA8', fontSize: 10, lineHeight: 14, marginTop: spacing.xs },
  aiAction: { minHeight: 46, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: radius.md, borderWidth: 1, borderColor: '#FFFFFF38', backgroundColor: '#FFFFFF18' },
  aiActionText: { color: '#FFFFFF', fontSize: typography.sizes.small, fontWeight: typography.weights.semibold },
  aiActionArrow: { color: '#FFFFFF', fontSize: 22, lineHeight: 24 },
  randomCard: { marginTop: spacing.xl, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface, boxShadow: 'none', elevation: 0 },
  randomHeader: { flexDirection: 'row', alignItems: 'center' },
  randomIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.surfaceAccent },
  randomIconText: { color: colors.accentPrimary, fontSize: 24, lineHeight: 26 },
  randomCopy: { flex: 1, marginLeft: spacing.lg },
  randomTitle: { color: colors.textPrimary, fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, letterSpacing: -0.37 },
  randomDescription: { color: colors.textSecondary, fontSize: typography.sizes.small, lineHeight: 20, marginTop: spacing.xs },
  freeBadge: { alignSelf: 'flex-start', paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.round, backgroundColor: colors.surfaceAccent },
  freeBadgeText: { color: colors.accentPrimary, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold, letterSpacing: 0.8 },
  randomCountSection: { marginTop: spacing.lg, paddingTop: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
  randomCountLabel: { color: colors.textSecondary, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold },
  countPolicy: { marginTop: spacing.sm, color: colors.textTertiary, fontSize: 10, lineHeight: 16 },
  randomAction: { minHeight: 48, marginTop: spacing.lg, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: radius.md, backgroundColor: colors.surfaceAccent },
  randomActionPressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
  randomActionText: { color: colors.accentPrimary, fontSize: typography.sizes.small, fontWeight: typography.weights.semibold },
  randomActionArrow: { color: colors.accentPrimary, fontSize: 21, lineHeight: 23 },
  drawInfo: { marginTop: spacing.xl, padding: spacing.lg, overflow: 'hidden', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surfaceElevated },
  drawInfoHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  drawInfoMeta: { color: colors.textPrimary, fontSize: typography.sizes.small, fontWeight: typography.weights.semibold, fontVariant: ['tabular-nums'] },
  drawInfoContent: { marginTop: spacing.md, minHeight: 24, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: spacing.sm, rowGap: spacing.md },
  drawCountdownBlock: { minWidth: 120, marginLeft: 'auto', alignItems: 'flex-end', gap: 2 },
  drawCountdownHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  drawCountdownDot: { width: 5, height: 5, borderRadius: radius.round, backgroundColor: colors.accentPrimary },
  drawCountdownLabel: { color: colors.textTertiary, fontSize: typography.sizes.caption },
  drawRefreshButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: radius.round, backgroundColor: colors.surfaceAccent },
  drawRefreshIcon: { color: colors.accentPrimary },
  drawRefreshNotice: { marginTop: spacing.sm, color: colors.textSecondary, fontSize: typography.sizes.caption, lineHeight: 17, textAlign: 'right' },
  drawCountdownValue: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'flex-end', gap: 2 },
  countdownNumber: { color: colors.textPrimary, fontSize: typography.sizes.body, lineHeight: 22, fontWeight: typography.weights.semibold, fontVariant: ['tabular-nums'] },
  countdownSeparator: { color: colors.textTertiary },
  countdownUnit: { color: colors.textSecondary, fontSize: typography.sizes.caption, lineHeight: 18, marginRight: 2 },
  countdownSecondsColon: { color: colors.accentPrimary, fontSize: typography.sizes.body, lineHeight: 22, fontWeight: typography.weights.semibold },
  countdownSeconds: { color: colors.accentPrimary, fontSize: typography.sizes.body, lineHeight: 22, fontWeight: typography.weights.semibold, fontVariant: ['tabular-nums'] },
  disclaimer: { color: colors.textTertiary, fontSize: typography.sizes.caption, lineHeight: 17, textAlign: 'center', marginTop: spacing.xxxl },
  pressed: { opacity: 0.72 },
  cardPressed: { opacity: 0.94, transform: [{ scale: 0.985 }] },
  announcementBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', padding: spacing.md, backgroundColor: colors.backdropStrong },
  announcementSheet: { width: '100%', maxWidth: 468, paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.xl, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surfaceElevated },
  announcementHandle: { alignSelf: 'center', width: 34, height: 4, marginBottom: spacing.xl, borderRadius: radius.round, backgroundColor: colors.borderStrong },
  announcementEyebrow: { color: colors.accentPrimary, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold, letterSpacing: 1.1 },
  announcementTitle: { marginTop: spacing.sm, color: colors.textPrimary, fontSize: 24, lineHeight: 31, fontWeight: typography.weights.semibold, letterSpacing: -0.5 },
  announcementDescription: { marginTop: spacing.sm, color: colors.textTertiary, fontSize: typography.sizes.caption, lineHeight: 18 },
  announcementNumbers: { marginTop: spacing.xl, paddingVertical: spacing.lg, alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.divider },
  announcementPrimary: { minHeight: 50, marginTop: spacing.xl, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.accentPrimary },
  announcementPrimaryText: { color: '#FFFFFF', fontSize: typography.sizes.small, fontWeight: typography.weights.semibold },
  announcementSecondary: { minHeight: 44, marginTop: spacing.xs, alignItems: 'center', justifyContent: 'center' },
  announcementSecondaryText: { color: colors.textSecondary, fontSize: typography.sizes.small, fontWeight: typography.weights.medium },
});
