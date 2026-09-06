import Ionicons from '@expo/vector-icons/Ionicons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { ActivityIndicator, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, spacing, typography, type ThemeColors, useThemedStyles } from '@/theme';

import { useAuth } from './AuthContext';

export function LoginModal() {
  const styles = useThemedStyles(createStyles);
  const {
    closeLogin,
    error,
    isConfigured,
    isLoginVisible,
    isWorking,
    signIn,
  } = useAuth();

  return (
    <Modal animationType="fade" onRequestClose={closeLogin} transparent visible={isLoginVisible}>
      <View style={styles.root}>
        <Pressable accessibilityLabel="로그인 닫기" onPress={closeLogin} style={styles.backdrop} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.eyebrow}>ACCOUNT</Text>
          <Text style={styles.title}>계정 연결</Text>
          <Text style={styles.description}>기기간 동기화와 계정 복원에 사용해요.</Text>

          <View style={styles.buttons}>
            {Platform.OS === 'ios' ? (
              <AppleAuthentication.AppleAuthenticationButton
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                cornerRadius={22}
                onPress={() => void signIn('apple.com')}
                style={styles.appleButton}
              />
            ) : (
              <Pressable
                accessibilityRole="button"
                disabled={isWorking || !isConfigured}
                onPress={() => void signIn('apple.com')}
                style={({ pressed }) => [styles.providerButton, styles.appleButtonFallback, pressed && styles.pressed]}>
                <Ionicons color="#FFFFFF" name="logo-apple" size={20} />
                <Text style={styles.appleButtonText}>Apple로 로그인</Text>
              </Pressable>
            )}
            <Pressable
              accessibilityRole="button"
              disabled={isWorking || !isConfigured}
              onPress={() => void signIn('google.com')}
              style={({ pressed }) => [styles.providerButton, styles.googleButton, pressed && styles.pressed]}>
              <Ionicons color="#4285F4" name="logo-google" size={19} />
              <Text style={styles.googleButtonText}>Google로 로그인</Text>
            </Pressable>
          </View>

          {isWorking ? <ActivityIndicator color="#2997FF" style={styles.progress} /> : null}
          {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
          <Text style={styles.notice}>로그인하면 이용약관과 개인정보처리방침에 동의한 것으로 간주합니다.</Text>
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
  eyebrow: { color: colors.accentPrimary, fontSize: typography.sizes.caption, fontWeight: typography.weights.bold, letterSpacing: 1.4 },
  title: { marginTop: spacing.sm, color: colors.textPrimary, fontSize: typography.sizes.section, fontWeight: typography.weights.bold },
  description: { marginTop: spacing.sm, color: colors.textSecondary, fontSize: typography.sizes.body, lineHeight: 22 },
  buttons: { marginTop: spacing.xl, gap: spacing.sm },
  providerButton: { height: 44, borderRadius: radius.round, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  appleButton: { width: '100%', height: 44 },
  appleButtonFallback: { backgroundColor: '#000000', borderWidth: 1, borderColor: '#FFFFFF33' },
  appleButtonText: { color: '#FFFFFF', fontSize: typography.sizes.body, fontWeight: typography.weights.semibold },
  googleButton: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DADCE0' },
  googleButtonText: { color: '#202124', fontSize: typography.sizes.body, fontWeight: typography.weights.semibold },
  pressed: { opacity: 0.76 },
  progress: { marginTop: spacing.lg },
  error: { marginTop: spacing.md, color: colors.hot, fontSize: typography.sizes.small, textAlign: 'center' },
  notice: { marginTop: spacing.lg, color: colors.textTertiary, fontSize: typography.sizes.caption, lineHeight: 18, textAlign: 'center' },
});
