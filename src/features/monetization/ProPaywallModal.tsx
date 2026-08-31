import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, spacing, typography, type ThemeColors, useThemedStyles } from '@/theme';

const BENEFITS = [
  '조합 분석 무제한',
  'AI 조합 해설과 후속 질문',
  '두 조합 비교와 Custom 기간',
  '새 회차 자동 재분석',
  '최대 200개 저장과 클라우드 동기화',
  '리워드 광고 없음',
] as const;

export function ProPaywallModal({
  onClose,
  source,
  visible,
}: {
  onClose: () => void;
  source?: string | null;
  visible: boolean;
}) {
  const styles = useThemedStyles(createStyles);
  const isAiExplanation = source === 'ai-combination-explanation';

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.root}>
        <Pressable accessibilityLabel="Pro 안내 닫기" onPress={onClose} style={styles.backdrop} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.badge}><Text style={styles.badgeText}>PRO</Text></View>
          <Text style={styles.title}>
            {isAiExplanation ? 'AI 조합 해설은 Pro 기능이에요' : '조합을 제한 없이 비교하고 관리하세요'}
          </Text>
          {isAiExplanation ? (
            <Text style={styles.description}>
              계산된 통계를 AI가 알기 쉽게 해설하고, 궁금한 내용을 이어서 질문할 수 있습니다.
            </Text>
          ) : null}
          <View style={styles.benefits}>
            {BENEFITS.map((benefit) => (
              <View key={benefit} style={styles.benefitRow}>
                <Ionicons color="#2997FF" name="checkmark-circle" size={20} />
                <Text style={styles.benefitText}>{benefit}</Text>
              </View>
            ))}
          </View>
          <View style={styles.plans}>
            <View style={[styles.plan, styles.planRecommended]}>
              <View><Text style={styles.planName}>연간</Text><Text style={styles.planHint}>약 34% 할인</Text></View>
              <Text style={styles.planPrice}>₩39,000</Text>
            </View>
            <View style={styles.plan}>
              <Text style={styles.planName}>월간</Text>
              <Text style={styles.planPrice}>₩4,900</Text>
            </View>
          </View>
          <View accessibilityRole="button" accessibilityState={{ disabled: true }} style={styles.disabledButton}>
            <Text style={styles.disabledButtonText}>스토어 결제 연결 준비 중</Text>
          </View>
          <Text style={styles.notice}>
            실제 결제는 App Store·Google Play 상품과 RevenueCat 연결 후 활성화됩니다.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: colors.backdropStrong },
  sheet: { width: '100%', maxWidth: 500, alignSelf: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.huge, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, borderWidth: StyleSheet.hairlineWidth, borderBottomWidth: 0, borderColor: colors.divider, backgroundColor: colors.surface },
  handle: { width: 36, height: 4, alignSelf: 'center', marginBottom: spacing.xl, borderRadius: 2, backgroundColor: colors.divider },
  badge: { alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 5, borderRadius: radius.round, backgroundColor: colors.surfaceAccent },
  badgeText: { color: colors.accentPrimary, fontSize: typography.sizes.caption, fontWeight: typography.weights.bold, letterSpacing: 1.2 },
  title: { marginTop: spacing.md, color: colors.textPrimary, fontSize: 25, lineHeight: 32, fontWeight: typography.weights.bold, letterSpacing: -0.5 },
  description: { marginTop: spacing.sm, color: colors.textSecondary, fontSize: typography.sizes.small, lineHeight: 20 },
  benefits: { marginTop: spacing.xl, gap: spacing.md },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  benefitText: { flex: 1, color: colors.textPrimary, fontSize: typography.sizes.body },
  plans: { marginTop: spacing.xl, gap: spacing.sm },
  plan: { minHeight: 62, paddingHorizontal: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.divider, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surfaceElevated },
  planRecommended: { borderColor: colors.accentPrimary, backgroundColor: colors.surfaceAccent },
  planName: { color: colors.textPrimary, fontSize: typography.sizes.body, fontWeight: typography.weights.semibold },
  planHint: { marginTop: 2, color: colors.accentPrimary, fontSize: typography.sizes.caption },
  planPrice: { color: colors.textPrimary, fontSize: typography.sizes.section, fontWeight: typography.weights.bold },
  disabledButton: { height: 48, marginTop: spacing.lg, borderRadius: radius.round, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentDisabled },
  disabledButtonText: { color: colors.textSecondary, fontSize: typography.sizes.body, fontWeight: typography.weights.semibold },
  notice: { marginTop: spacing.md, color: colors.textTertiary, fontSize: 10, lineHeight: 15, textAlign: 'center' },
});
