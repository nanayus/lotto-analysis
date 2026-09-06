import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useState } from 'react';

import { radius, spacing, typography, type ThemeColors, useThemedStyles } from '@/theme';

type ReferralCodeOnboardingModalProps = {
  error: string | null;
  isApplying: boolean;
  onApply: (code: string) => void;
  onClose: () => void;
  requiresLogin: boolean;
  visible: boolean;
};

function normalizeCode(value: string) {
  return value.replace(/[^a-fA-F0-9]/g, '').toUpperCase().slice(0, 8);
}

export function ReferralCodeOnboardingModal({
  error,
  isApplying,
  onApply,
  onClose,
  requiresLogin,
  visible,
}: ReferralCodeOnboardingModalProps) {
  const styles = useThemedStyles(createStyles);
  const [code, setCode] = useState('');
  const canApply = code.length === 8 && !isApplying;

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.root}>
        <Pressable accessibilityLabel="초대코드 입력 닫기" onPress={onClose} style={styles.backdrop} />
        <View style={styles.sheet}>
          <View style={styles.icon}>
            <Ionicons color={styles.iconColor.color} name="people-outline" size={24} />
          </View>
          <Text style={styles.eyebrow}>INVITATION</Text>
          <Text style={styles.title}>받은 초대코드를 입력하세요</Text>
          <Text style={styles.description}>
            로그인 후 7일 이내에 한 번 등록할 수 있어요. 로그인 전이라면 코드를 보관한 뒤 계정 연결을 이어갑니다.
          </Text>
          <TextInput
            accessibilityLabel="친구에게 받은 초대 코드"
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!isApplying}
            maxLength={8}
            onChangeText={(value) => setCode(normalizeCode(value))}
            placeholder="8자리 초대 코드"
            placeholderTextColor={styles.placeholder.color}
            style={styles.input}
            value={code}
          />
          {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
          <Pressable
            accessibilityRole="button"
            disabled={!canApply}
            onPress={() => onApply(code)}
            style={({ pressed }) => [
              styles.primaryButton,
              !canApply && styles.primaryButtonDisabled,
              pressed && canApply && styles.pressed,
            ]}>
            {isApplying ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {requiresLogin ? '로그인하고 등록' : '코드 등록'}
              </Text>
            )}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={isApplying}
            onPress={onClose}
            style={({ pressed }) => [styles.skipButton, pressed && styles.pressed]}>
            <Text style={styles.skipButtonText}>다음에 입력</Text>
          </Pressable>
          <Text style={styles.notice}>설정에서도 입력할 수 있습니다.</Text>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: colors.backdropStrong },
  sheet: { width: '100%', maxWidth: 420, padding: spacing.xl, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.divider, borderRadius: radius.xl, backgroundColor: colors.surface },
  icon: { width: 48, height: 48, marginBottom: spacing.lg, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAccent },
  iconColor: { color: colors.accentPrimary },
  eyebrow: { color: colors.accentPrimary, fontSize: typography.sizes.caption, fontWeight: typography.weights.bold, letterSpacing: 1.4 },
  title: { marginTop: spacing.sm, color: colors.textPrimary, fontSize: typography.sizes.section, fontWeight: typography.weights.bold, lineHeight: 28 },
  description: { marginTop: spacing.sm, color: colors.textSecondary, fontSize: typography.sizes.body, lineHeight: 22 },
  input: { height: 48, marginTop: spacing.xl, paddingHorizontal: spacing.lg, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.md, color: colors.textPrimary, backgroundColor: colors.background, fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, letterSpacing: 2, textAlign: 'center' },
  placeholder: { color: colors.textTertiary },
  error: { marginTop: spacing.sm, color: colors.hot, fontSize: typography.sizes.caption, lineHeight: 18, textAlign: 'center' },
  primaryButton: { height: 46, marginTop: spacing.lg, borderRadius: radius.round, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentPrimary },
  primaryButtonDisabled: { backgroundColor: colors.accentDisabled },
  primaryButtonText: { color: '#FFFFFF', fontSize: typography.sizes.body, fontWeight: typography.weights.semibold },
  skipButton: { minHeight: 42, marginTop: spacing.xs, alignItems: 'center', justifyContent: 'center' },
  skipButtonText: { color: colors.textSecondary, fontSize: typography.sizes.caption, fontWeight: typography.weights.medium },
  notice: { color: colors.textTertiary, fontSize: typography.sizes.caption, lineHeight: 18, textAlign: 'center' },
  pressed: { opacity: 0.72 },
});
