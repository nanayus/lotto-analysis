import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { useMemo, useState } from 'react';

import { useAuth } from '@/features/auth/AuthContext';
import { radius, spacing, typography, type ThemeColors, useThemedStyles } from '@/theme';

import { useMonetization } from './MonetizationContext';

function resetLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '다음 주';
  return new Intl.DateTimeFormat('ko-KR', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'long',
    timeZone: 'Asia/Seoul',
  }).format(date);
}

export function MonetizationSettingsSection() {
  const styles = useThemedStyles(createStyles);
  const { state: authState } = useAuth();
  const { applyReferral, openPaywall, refresh, state } = useMonetization();
  const [referralCode, setReferralCode] = useState('');
  const [referralMessage, setReferralMessage] = useState<string | null>(null);
  const [isApplying, setApplying] = useState(false);
  const access = state.status === 'ready' ? state.access : null;
  const availableCount = useMemo(() => access
    ? access.bonusAnalysisCredits + (access.weeklyFreeAvailable ? 1 : 0)
    : 0, [access]);

  const shareInvite = () => {
    if (!access?.inviteCode) return;
    void Share.share({
      message: `Lotto Insight에서 과거 조합을 분석해 보세요. 초대 코드 ${access.inviteCode}\nhttps://lotto.wondly.net/?ref=${access.inviteCode}`,
      title: 'Lotto Insight 친구 초대',
    }).catch(() => setReferralMessage(`초대 코드 ${access.inviteCode}를 친구에게 알려주세요.`));
  };

  const submitReferral = async () => {
    if (!referralCode.trim()) return;
    setApplying(true);
    setReferralMessage(null);
    try {
      await applyReferral(referralCode);
      setReferralCode('');
      setReferralMessage('초대 코드가 적용됐어요. 첫 분석을 완료하면 보상이 지급됩니다.');
    } catch (error) {
      setReferralMessage((error as Error).message);
    } finally {
      setApplying(false);
    }
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>이용 플랜</Text>
      <View style={styles.card}>
        {authState.status !== 'authenticated' ? (
          <View style={styles.emptyState}>
            <Text style={styles.rowLabel}>무료 플랜</Text>
            <Text style={styles.rowDescription}>로그인하면 웰컴 분석 3회와 이용 현황을 확인할 수 있어요.</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => openPaywall('settings-guest')}
              style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}>
              <Text style={styles.secondaryActionText}>Pro 살펴보기</Text>
            </Pressable>
          </View>
        ) : state.status === 'loading' ? (
          <ActivityIndicator color="#2997FF" style={styles.loading} />
        ) : state.status === 'error' ? (
          <View style={styles.emptyState}>
            <Text style={styles.rowLabel}>이용 정보를 불러오지 못했어요</Text>
            <Text style={styles.rowDescription}>{state.error}</Text>
            <Pressable onPress={() => void refresh()} style={styles.retryButton}>
              <Text style={styles.retryText}>다시 시도</Text>
            </Pressable>
          </View>
        ) : access ? (
          <>
            <View style={styles.planRow}>
              <View style={styles.planCopy}>
                <View style={styles.planTitleRow}>
                  <Text style={styles.rowLabel}>{access.isPro ? 'Pro' : '무료 플랜'}</Text>
                  {access.isPro ? <View style={styles.proBadge}><Text style={styles.proBadgeText}>PRO</Text></View> : null}
                </View>
                <Text style={styles.rowDescription}>
                  {access.isPro ? '조합 분석을 제한 없이 이용 중이에요.' : `지금 분석 ${availableCount}회 가능`}
                </Text>
              </View>
              {!access.isPro ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => openPaywall('settings')}
                  style={({ pressed }) => [styles.proAction, pressed && styles.pressed]}>
                  <Text style={styles.proActionText}>Pro</Text>
                </Pressable>
              ) : <Ionicons color="#2997FF" name="checkmark-circle" size={25} />}
            </View>
            {!access.isPro ? (
              <>
                <View style={styles.separator} />
                <View style={styles.allowanceRow}>
                  <View><Text style={styles.allowanceLabel}>주간 무료 분석</Text><Text style={styles.allowanceHint}>{resetLabel(access.nextWeeklyResetAt)} 갱신</Text></View>
                  <Text style={styles.allowanceValue}>{access.weeklyFreeAvailable ? '1회' : '사용 완료'}</Text>
                </View>
                <View style={styles.separator} />
                <View style={styles.allowanceRow}>
                  <Text style={styles.allowanceLabel}>보너스 분석권</Text>
                  <Text style={styles.allowanceValue}>{access.bonusAnalysisCredits}회</Text>
                </View>
              </>
            ) : null}
          </>
        ) : null}
      </View>

      {access ? (
        <View style={styles.inviteCard}>
          <View style={styles.inviteHeader}>
            <View style={styles.inviteIcon}><Ionicons color="#2997FF" name="people-outline" size={21} /></View>
            <View style={styles.inviteCopy}>
              <Text style={styles.rowLabel}>친구 초대</Text>
              <Text style={styles.rowDescription}>친구가 첫 분석을 마치면 친구 +1회, 나 +2회</Text>
            </View>
          </View>
          <View style={styles.codeRow}>
            <View style={styles.codeBox}><Text selectable style={styles.codeText}>{access.inviteCode}</Text></View>
            <Pressable
              accessibilityRole="button"
              onPress={shareInvite}
              style={({ pressed }) => [styles.shareButton, pressed && styles.pressed]}>
              <Ionicons color="#FFFFFF" name="share-outline" size={17} />
              <Text style={styles.shareButtonText}>초대하기</Text>
            </Pressable>
          </View>
          <View style={styles.applyRow}>
            <TextInput
              accessibilityLabel="친구 초대 코드"
              autoCapitalize="characters"
              maxLength={8}
              onChangeText={setReferralCode}
              placeholder="받은 초대 코드"
              placeholderTextColor={styles.placeholder.color}
              style={styles.codeInput}
              value={referralCode}
            />
            <Pressable
              accessibilityRole="button"
              disabled={isApplying || referralCode.trim().length !== 8}
              onPress={() => void submitReferral()}
              style={({ pressed }) => [
                styles.applyButton,
                (isApplying || referralCode.trim().length !== 8) && styles.applyButtonDisabled,
                pressed && styles.pressed,
              ]}>
              {isApplying ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.applyButtonText}>적용</Text>}
            </Pressable>
          </View>
          {referralMessage ? (
            <Text accessibilityLiveRegion="polite" style={styles.referralMessage}>{referralMessage}</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  section: { marginBottom: spacing.xxl },
  sectionLabel: { marginBottom: spacing.sm, marginLeft: spacing.xs, color: colors.textSecondary, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold },
  card: { overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.divider, borderRadius: radius.lg, backgroundColor: colors.surface },
  emptyState: { padding: spacing.lg },
  loading: { marginVertical: spacing.xl },
  rowLabel: { color: colors.textPrimary, fontSize: typography.sizes.body, fontWeight: typography.weights.semibold },
  rowDescription: { marginTop: 3, color: colors.textSecondary, fontSize: typography.sizes.caption, lineHeight: 18 },
  secondaryAction: { alignSelf: 'flex-start', marginTop: spacing.md, minHeight: 38, paddingHorizontal: spacing.md, borderRadius: radius.round, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAccent },
  secondaryActionText: { color: colors.accentPrimary, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold },
  retryButton: { alignSelf: 'flex-start', marginTop: spacing.md },
  retryText: { color: colors.accentPrimary, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold },
  planRow: { minHeight: 74, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  planCopy: { flex: 1 },
  planTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  proBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: radius.round, backgroundColor: colors.surfaceAccent },
  proBadgeText: { color: colors.accentPrimary, fontSize: 9, fontWeight: typography.weights.bold },
  proAction: { minWidth: 58, height: 34, borderRadius: radius.round, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentPrimary },
  proActionText: { color: '#FFFFFF', fontSize: typography.sizes.caption, fontWeight: typography.weights.bold },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: spacing.lg, backgroundColor: colors.divider },
  allowanceRow: { minHeight: 58, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  allowanceLabel: { color: colors.textPrimary, fontSize: typography.sizes.small, fontWeight: typography.weights.medium },
  allowanceHint: { marginTop: 2, color: colors.textTertiary, fontSize: 10 },
  allowanceValue: { color: colors.accentPrimary, fontSize: typography.sizes.small, fontWeight: typography.weights.semibold },
  inviteCard: { marginTop: spacing.md, padding: spacing.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.divider, borderRadius: radius.lg, backgroundColor: colors.surface },
  inviteHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  inviteIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAccent },
  inviteCopy: { flex: 1 },
  codeRow: { marginTop: spacing.lg, flexDirection: 'row', gap: spacing.sm },
  codeBox: { flex: 1, height: 42, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceElevated },
  codeText: { color: colors.textPrimary, fontSize: typography.sizes.body, fontWeight: typography.weights.bold, letterSpacing: 2 },
  shareButton: { height: 42, paddingHorizontal: spacing.md, borderRadius: radius.round, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, backgroundColor: colors.accentPrimary },
  shareButtonText: { color: '#FFFFFF', fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold },
  applyRow: { marginTop: spacing.sm, flexDirection: 'row', gap: spacing.sm },
  codeInput: { flex: 1, height: 42, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.divider, borderRadius: radius.md, color: colors.textPrimary, backgroundColor: colors.background },
  placeholder: { color: colors.textTertiary },
  applyButton: { width: 62, height: 42, borderRadius: radius.round, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentPrimary },
  applyButtonDisabled: { backgroundColor: colors.accentDisabled },
  applyButtonText: { color: '#FFFFFF', fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold },
  referralMessage: { marginTop: spacing.sm, color: colors.textSecondary, fontSize: typography.sizes.caption, lineHeight: 18 },
  pressed: { opacity: 0.72 },
});
