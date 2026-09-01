import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, spacing, typography, type ThemeColors, useThemedStyles } from '@/theme';

import { useMonetization } from './MonetizationContext';

const GUEST_FEATURES = [
  { icon: 'play-circle-outline', label: '광고 후 분석 결과 확인' },
  { icon: 'options-outline', label: '조건 2개 · 조합 2개' },
  { icon: 'phone-portrait-outline', label: '내 번호 기기 저장' },
] as const;

const PRO_FEATURES = [
  { icon: 'ban-outline', label: '광고 없이 결과 확인' },
  { icon: 'options-outline', label: '조건 무제한 · 균형 프리셋' },
  { icon: 'sparkles-outline', label: 'AI 해설 · 조합 비교 · Custom' },
  { icon: 'cloud-done-outline', label: '클라우드 저장 · 기기간 동기화' },
] as const;

export function MonetizationSettingsSection() {
  const styles = useThemedStyles(createStyles);
  const { openPaywall, productAccess } = useMonetization();
  const isPro = productAccess.tier === 'pro';
  const features = isPro ? PRO_FEATURES : GUEST_FEATURES;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>이용 플랜</Text>
      <View style={styles.card}>
        <>
            <View style={styles.planHeader}>
              <View style={styles.planCopy}>
                <View style={styles.planTitleRow}>
                  <Text style={styles.planName}>
                    {isPro ? 'Pro' : '게스트'}
                  </Text>
                  {isPro ? <View style={styles.proBadge}><Text style={styles.proBadgeText}>PRO</Text></View> : null}
                </View>
                <Text style={styles.planDescription}>
                  {isPro
                    ? '광고 없이 모든 기기에서 이어봐요.'
                    : '광고 후 결과를 확인해요.'}
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
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  section: { marginBottom: spacing.xxl },
  sectionLabel: { marginBottom: spacing.sm, marginLeft: spacing.xs, color: colors.textSecondary, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold },
  card: { overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.divider, borderRadius: radius.lg, backgroundColor: colors.surface },
  accent: { color: colors.accentPrimary },
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
  pressed: { opacity: 0.7 },
});
