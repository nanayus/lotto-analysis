import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, spacing, typography, type ThemeColors, useThemedStyles } from '@/theme';
import type { RevenueCatPackage } from './revenueCatClient';

const BENEFITS = [
  '모든 분석 결과를 광고 없이 바로 확인',
  'AI 조합 해설과 후속 질문',
  '같은 조건 다시 뽑기와 회차 범위 직접 선택',
  '스토어 계정으로 언제든 구매 복원',
] as const;

const SOURCE_TITLES: Record<string, string> = {
  'ai-combination-explanation': 'AI가 조합 통계를 쉽게 풀어드려요',
  'condition-ai-explanation': '만든 조합을 AI에게 물어보세요',
  'custom-period': '원하는 회차만 골라서 분석하세요',
  'library-cloud': '내 번호를 모든 기기에서 이어보세요',
  'same-condition-regeneration': '마음에 든 조건으로 새 조합을 뽑아보세요',
};

export function ProPaywallModal({
  error,
  isConfigured,
  isWorking,
  onClose,
  onPurchase,
  onRestore,
  packages,
  source,
  visible,
}: {
  error: string | null;
  isConfigured: boolean;
  isWorking: boolean;
  onClose: () => void;
  onPurchase: (identifier: string) => Promise<boolean>;
  onRestore: () => Promise<boolean>;
  packages: RevenueCatPackage[];
  source?: string | null;
  visible: boolean;
}) {
  const styles = useThemedStyles(createStyles);
  const isAiExplanation = source === 'ai-combination-explanation';
  const title = source ? SOURCE_TITLES[source] : undefined;
  const sortedPackages = useMemo(() => [...packages].sort((left, right) => {
    const order = { annual: 0, monthly: 1, other: 2 } as const;
    return order[left.kind] - order[right.kind];
  }), [packages]);
  const [selectedIdentifier, setSelectedIdentifier] = useState<string | null>(null);
  const selectedPackage = sortedPackages.find((item) => item.identifier === selectedIdentifier)
    ?? sortedPackages[0];

  const packageLabel = (item: RevenueCatPackage) => {
    if (item.kind === 'annual') return '연간';
    if (item.kind === 'monthly') return '월간';
    return item.title;
  };

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.root}>
        <Pressable accessibilityLabel="Pro 안내 닫기" onPress={onClose} style={styles.backdrop} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.badge}><Text style={styles.badgeText}>PRO</Text></View>
          <Text style={styles.title}>
            {title ?? '광고 없이 더 깊게 분석하세요'}
          </Text>
          <Text style={styles.description}>
            {isAiExplanation
              ? '계산된 통계를 AI가 알기 쉽게 해설하고, 궁금한 내용을 이어서 질문할 수 있어요.'
              : '무료 기능의 결과는 그대로 유지하면서, 기다림 없이 더 깊은 분석 도구를 사용할 수 있어요.'}
          </Text>
          <View style={styles.benefits}>
            {BENEFITS.map((benefit) => (
              <View key={benefit} style={styles.benefitRow}>
                <Ionicons color="#2997FF" name="checkmark-circle" size={20} />
                <Text style={styles.benefitText}>{benefit}</Text>
              </View>
            ))}
          </View>
          <View style={styles.plans}>
            {sortedPackages.map((item) => {
              const selected = item.identifier === selectedPackage?.identifier;
              return (
                <Pressable
                  accessibilityLabel={`${packageLabel(item)} ${item.priceString}`}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  key={item.identifier}
                  onPress={() => setSelectedIdentifier(item.identifier)}
                  style={({ pressed }) => [
                    styles.plan,
                    selected && styles.planRecommended,
                    pressed && styles.pressed,
                  ]}>
                  <View>
                    <Text style={styles.planName}>{packageLabel(item)}</Text>
                    {item.kind === 'annual' ? <Text style={styles.planHint}>추천</Text> : null}
                  </View>
                  <Text style={styles.planPrice}>{item.priceString}</Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable
            accessibilityLabel={selectedPackage ? `${packageLabel(selectedPackage)} Pro 시작` : '상품 정보를 확인할 수 없음'}
            accessibilityRole="button"
            accessibilityState={{ disabled: isWorking || !selectedPackage }}
            disabled={isWorking || !selectedPackage}
            onPress={() => selectedPackage && void onPurchase(selectedPackage.identifier)}
            style={({ pressed }) => [
              styles.purchaseButton,
              (!selectedPackage || isWorking) && styles.buttonDisabled,
              pressed && styles.pressed,
            ]}>
            {isWorking ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.purchaseButtonText}>
                {selectedPackage ? `${packageLabel(selectedPackage)} Pro 시작` : '상품 정보를 확인할 수 없어요'}
              </Text>
            )}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={!isConfigured || isWorking}
            onPress={() => void onRestore()}
            style={({ pressed }) => [styles.restoreButton, pressed && styles.pressed]}>
            <Text style={[styles.restoreText, (!isConfigured || isWorking) && styles.restoreTextDisabled]}>
              구매 복원
            </Text>
          </Pressable>
          {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
          <Text style={styles.notice}>
            구독은 선택한 스토어 계정으로 결제되며 해지 전까지 자동 갱신됩니다. 저장한 번호는 계정을 연결하기 전까지 이 기기에만 보관됩니다.
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
  purchaseButton: { height: 48, marginTop: spacing.lg, borderRadius: radius.round, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentPrimary },
  purchaseButtonText: { color: '#FFFFFF', fontSize: typography.sizes.body, fontWeight: typography.weights.semibold },
  buttonDisabled: { backgroundColor: colors.accentDisabled },
  restoreButton: { minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  restoreText: { color: colors.accentPrimary, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold },
  restoreTextDisabled: { color: colors.textTertiary },
  error: { marginTop: spacing.xs, color: colors.hot, fontSize: typography.sizes.caption, lineHeight: 18, textAlign: 'center' },
  notice: { marginTop: spacing.md, color: colors.textTertiary, fontSize: 10, lineHeight: 15, textAlign: 'center' },
  pressed: { opacity: 0.72 },
});
