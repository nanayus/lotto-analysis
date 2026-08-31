import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useState } from 'react';

import { radius, spacing, typography, type ThemeColors, useThemedStyles } from '@/theme';

type ReferralCodeOnboardingModalProps = {
  error: string | null;
  isApplying: boolean;
  onApply: (code: string) => void;
  onSkip: () => void;
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
  onSkip,
  requiresLogin,
  visible,
}: ReferralCodeOnboardingModalProps) {
  const styles = useThemedStyles(createStyles);
  const [code, setCode] = useState('');
  const canApply = code.length === 8 && !isApplying;

  return (
    <Modal animationType="fade" onRequestClose={onSkip} transparent visible={visible}>
      <View style={styles.root}>
        <View style={styles.backdrop} />
        <View style={styles.sheet}>
          <View style={styles.icon}>
            <Ionicons color={styles.iconColor.color} name="people-outline" size={24} />
          </View>
          <Text style={styles.eyebrow}>WELCOME</Text>
          <Text style={styles.title}>친구에게 초대 코드를 받았나요?</Text>
          <Text style={styles.description}>
            받은 코드가 있다면 지금 등록해 주세요. 첫 실행과 첫 분석 전에만 등록할 수 있어요.
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
            onPress={onSkip}
            style={({ pressed }) => [styles.skipButton, pressed && styles.pressed]}>
            <Text style={styles.skipButtonText}>초대 코드 없이 시작</Text>
          </Pressable>
          <Text style={styles.notice}>이 화면을 닫으면 나중에 코드를 입력할 수 없어요.</Text>
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
  eyebrow: { color: colors.accentPrimary, fontSize: 9, fontWeight: typography.weights.bold, letterSpacing: 1.8 },
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
  notice: { color: colors.textTertiary, fontSize: 10, lineHeight: 15, textAlign: 'center' },
  pressed: { opacity: 0.72 },
});
