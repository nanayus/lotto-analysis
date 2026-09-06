import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, spacing, typography, type ThemeColors, useThemedStyles } from '@/theme';

function formatExpiryDate(value: string | null) {
  if (!value) return '이용 기간을 확인하고 있어요';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '이용 기간을 확인하고 있어요';
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일까지`;
}

export function ProStatusModal({
  expiresAt,
  onClose,
  onManage,
  visible,
}: {
  expiresAt: string | null;
  onClose: () => void;
  onManage?: () => void;
  visible: boolean;
}) {
  const styles = useThemedStyles(createStyles);

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.root}>
        <Pressable accessibilityLabel="Pro 이용 정보 닫기" onPress={onClose} style={styles.backdrop} />
        <View accessibilityViewIsModal style={styles.dialog}>
          <View style={styles.icon}>
            <Ionicons color={styles.iconColor.color} name="sparkles" size={22} />
          </View>
          <View style={styles.badge}><Text style={styles.badgeText}>PRO</Text></View>
          <Text style={styles.title}>Pro를 이용 중이에요</Text>
          <View style={styles.statusCard}>
            <Text style={styles.statusLabel}>이용 가능 기간</Text>
            <Text style={styles.statusValue}>{formatExpiryDate(expiresAt)}</Text>
          </View>
          <Text style={styles.description}>
            광고 없이 결과를 확인하고 추천 조건과 AI 해설을 이용할 수 있어요.
          </Text>
          {onManage ? (
            <Pressable
              accessibilityRole="link"
              onPress={onManage}
              style={({ pressed }) => [styles.manageButton, pressed && styles.pressed]}>
              <Text style={styles.manageText}>구독 관리</Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => [styles.confirmButton, pressed && styles.pressed]}>
            <Text style={styles.confirmText}>확인</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: colors.backdropStrong },
  dialog: {
    width: '100%', maxWidth: 400, alignItems: 'center', padding: spacing.xl,
    borderRadius: radius.xl, borderWidth: 1, borderColor: colors.accentBorder,
    backgroundColor: colors.surfaceElevated,
  },
  icon: {
    width: 52, height: 52, alignItems: 'center', justifyContent: 'center',
    borderRadius: radius.round, backgroundColor: colors.surfaceAccent,
  },
  iconColor: { color: colors.accentPrimary },
  badge: {
    marginTop: spacing.md, paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderRadius: radius.round, backgroundColor: colors.accentPrimary,
  },
  badgeText: { color: '#FFFFFF', fontSize: typography.sizes.caption, fontWeight: typography.weights.bold, letterSpacing: 0.9 },
  title: {
    marginTop: spacing.sm, color: colors.textPrimary, fontSize: typography.sizes.section,
    fontWeight: typography.weights.bold, letterSpacing: -0.3,
  },
  statusCard: {
    width: '100%', marginTop: spacing.xl, padding: spacing.lg,
    borderRadius: radius.md, backgroundColor: colors.surfaceAccent,
  },
  statusLabel: { color: colors.textSecondary, fontSize: typography.sizes.caption },
  statusValue: {
    marginTop: spacing.xs, color: colors.accentPrimary, fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
  },
  description: {
    marginTop: spacing.lg, color: colors.textSecondary, fontSize: typography.sizes.small,
    lineHeight: 20, textAlign: 'center',
  },
  manageButton: { minHeight: 42, marginTop: spacing.md, alignItems: 'center', justifyContent: 'center' },
  manageText: { color: colors.accentPrimary, fontSize: typography.sizes.small, fontWeight: typography.weights.semibold },
  confirmButton: {
    width: '100%', minHeight: 48, marginTop: spacing.xl,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: radius.md, backgroundColor: colors.accentPrimary,
  },
  confirmText: { color: '#FFFFFF', fontSize: typography.sizes.small, fontWeight: typography.weights.bold },
  pressed: { opacity: 0.72 },
});
