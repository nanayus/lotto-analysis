import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, spacing, typography, type ThemeColors, useThemedStyles } from '@/theme';

type AnalysisAccessModalProps = {
  onClose: () => void;
  onOpenPro: () => void;
  visible: boolean;
};

export function AnalysisAccessModal({ onClose, onOpenPro, visible }: AnalysisAccessModalProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.root}>
        <Pressable accessibilityLabel="분석 이용 안내 닫기" onPress={onClose} style={styles.backdrop} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.eyebrow}>ANALYSIS</Text>
          <Text style={styles.title}>이번 주 무료 분석을 모두 사용했어요</Text>
          <Text style={styles.description}>
            다음 무료 분석을 기다리거나, Pro에서 조합을 제한 없이 분석할 수 있어요.
          </Text>
          <View accessibilityRole="button" accessibilityState={{ disabled: true }} style={styles.rewardButtonDisabled}>
            <Ionicons color={styles.rewardIcon.color} name="play-circle-outline" size={21} />
            <Text style={styles.rewardButtonText}>리워드 광고 연결 준비 중</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => { onClose(); onOpenPro(); }}
            style={({ pressed }) => [styles.proButton, pressed && styles.pressed]}>
            <Text style={styles.proButtonText}>Pro 살펴보기</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.laterButton}>
            <Text style={styles.laterText}>다음에 하기</Text>
          </Pressable>
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
  eyebrow: { color: colors.accentPrimary, fontSize: 9, fontWeight: typography.weights.bold, letterSpacing: 1.8 },
  title: { marginTop: spacing.sm, color: colors.textPrimary, fontSize: typography.sizes.section, fontWeight: typography.weights.bold },
  description: { marginTop: spacing.sm, color: colors.textSecondary, fontSize: typography.sizes.body, lineHeight: 22 },
  rewardButtonDisabled: { height: 46, marginTop: spacing.xl, borderRadius: radius.round, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.surfaceElevated, opacity: 0.6 },
  rewardIcon: { color: colors.textSecondary },
  rewardButtonText: { color: colors.textSecondary, fontSize: typography.sizes.body, fontWeight: typography.weights.semibold },
  proButton: { height: 46, marginTop: spacing.sm, borderRadius: radius.round, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentPrimary },
  proButtonText: { color: '#FFFFFF', fontSize: typography.sizes.body, fontWeight: typography.weights.bold },
  laterButton: { height: 42, marginTop: spacing.sm, alignItems: 'center', justifyContent: 'center' },
  laterText: { color: colors.textSecondary, fontSize: typography.sizes.small },
  pressed: { opacity: 0.78 },
});

