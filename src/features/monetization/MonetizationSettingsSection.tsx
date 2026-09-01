import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/features/auth/AuthContext';
import { radius, spacing, typography, type ThemeColors, useThemedStyles } from '@/theme';

import { useMonetization } from './MonetizationContext';

const FREE_FEATURES = [
  { icon: 'play-circle-outline', label: '광고 후 완전한 분석 결과 공개' },
  { icon: 'options-outline', label: '한 번에 최대 5개 조합과 균형 프리셋' },
  { icon: 'phone-portrait-outline', label: '내 번호를 이 기기에 저장' },
] as const;

const GUEST_FEATURES = [
  { icon: 'play-circle-outline', label: '광고 후 완전한 분석 결과 공개' },
  { icon: 'options-outline', label: '조건을 직접 설정해 조합 생성' },
  { icon: 'layers-outline', label: '한 번에 최대 2개 조합 생성' },
] as const;

const PRO_FEATURES = [
  { icon: 'ban-outline', label: '모든 결과를 광고 없이 바로 확인' },
  { icon: 'options-outline', label: '한 번에 최대 5개 조합과 균형 프리셋' },
  { icon: 'sparkles-outline', label: 'AI 조합 해설과 추가 질문' },
  { icon: 'git-compare-outline', label: '조합 비교와 회차 직접 선택' },
  { icon: 'cloud-done-outline', label: '클라우드 저장과 기기간 동기화' },
] as const;

export function MonetizationSettingsSection() {
  const styles = useThemedStyles(createStyles);
  const { state: authState } = useAuth();
  const { openPaywall, productAccess, refresh, state } = useMonetization();
  const authenticated = authState.status === 'authenticated';
  const isPro = productAccess.tier === 'pro';
  const features = isPro ? PRO_FEATURES : authenticated ? FREE_FEATURES : GUEST_FEATURES;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>이용 플랜</Text>
      <View style={styles.card}>
        {authenticated && state.status === 'loading' ? (
          <ActivityIndicator color={styles.accent.color} style={styles.loading} />
        ) : authenticated && state.status === 'error' ? (
          <View style={styles.errorState}>
            <Text style={styles.planName}>이용 정보를 불러오지 못했어요</Text>
            <Text style={styles.planDescription}>{state.error}</Text>
            <Pressable onPress={() => void refresh()} style={styles.retryButton}>
              <Text style={styles.retryText}>다시 시도</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.planHeader}>
              <View style={styles.planCopy}>
                <View style={styles.planTitleRow}>
                  <Text style={styles.planName}>
                    {isPro ? 'Pro' : authenticated ? '무료회원' : '게스트'}
                  </Text>
                  {isPro ? <View style={styles.proBadge}><Text style={styles.proBadgeText}>PRO</Text></View> : null}
                </View>
                <Text style={styles.planDescription}>
                  {isPro
                    ? '광고 없이 더 깊게 분석하고 모든 기기에서 이어보세요.'
                    : authenticated
                      ? '광고 후 결과를 보고, 내 번호는 이 기기에 저장돼요.'
                      : '두 조합까지 선택할 수 있으며 번호는 저장되지 않아요.'}
                </Text>
              </View>
              {!isPro ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => openPaywall('settings')}
                  style={({ pressed }) => [styles.proAction, pressed && styles.pressed]}>
                  <Text style={styles.proActionText}>Pro</Text>
                </Pressable>
              ) : <Ionicons color={styles.accent.color} name="checkmark-circle" size={25} />}
            </View>

            <View style={styles.separator} />
            <View style={styles.featureList}>
              {features.map((feature) => (
                <View key={feature.label} style={styles.featureRow}>
                  <Ionicons color={styles.featureIcon.color} name={feature.icon} size={18} />
                  <Text style={styles.featureText}>{feature.label}</Text>
                </View>
              ))}
            </View>

            {!isPro ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => openPaywall('settings-benefits')}
                style={({ pressed }) => [styles.benefitAction, pressed && styles.pressed]}>
                <Text style={styles.benefitActionText}>Pro 혜택 전체 보기</Text>
                <Ionicons color={styles.accent.color} name="chevron-forward" size={15} />
              </Pressable>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  section: { marginBottom: spacing.xxl },
  sectionLabel: { marginBottom: spacing.sm, marginLeft: spacing.xs, color: colors.textSecondary, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold },
  card: { overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.divider, borderRadius: radius.lg, backgroundColor: colors.surface },
  loading: { marginVertical: spacing.xl },
  accent: { color: colors.accentPrimary },
  errorState: { padding: spacing.lg },
  planHeader: { minHeight: 88, padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  planCopy: { flex: 1 },
  planTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  planName: { color: colors.textPrimary, fontSize: typography.sizes.body, fontWeight: typography.weights.semibold },
  planDescription: { marginTop: 4, color: colors.textSecondary, fontSize: typography.sizes.caption, lineHeight: 18 },
  proBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: radius.round, backgroundColor: colors.surfaceAccent },
  proBadgeText: { color: colors.accentPrimary, fontSize: 9, fontWeight: typography.weights.bold, letterSpacing: 0.8 },
  proAction: { minWidth: 58, height: 34, borderRadius: radius.round, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentPrimary },
  proActionText: { color: '#FFFFFF', fontSize: typography.sizes.caption, fontWeight: typography.weights.bold },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: spacing.lg, backgroundColor: colors.divider },
  featureList: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.md },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  featureIcon: { color: colors.accentPrimary },
  featureText: { flex: 1, color: colors.textPrimary, fontSize: typography.sizes.small, lineHeight: 20 },
  benefitAction: { minHeight: 48, paddingHorizontal: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  benefitActionText: { color: colors.accentPrimary, fontSize: typography.sizes.small, fontWeight: typography.weights.semibold },
  retryButton: { alignSelf: 'flex-start', marginTop: spacing.md },
  retryText: { color: colors.accentPrimary, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold },
  pressed: { opacity: 0.7 },
});
