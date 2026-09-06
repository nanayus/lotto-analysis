import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';

import { useAuth } from '@/features/auth/AuthContext';
import type { AuthProviderId } from '@/features/auth/types';
import { radius, spacing, typography, type ThemeColors, useThemedStyles } from '@/theme';

const providerLabels: Record<AuthProviderId, string> = {
  'apple.com': 'Apple',
  'google.com': 'Google',
};

type AccountSettingsSectionProps = {
  showAccountLinking?: boolean;
};

export function AccountSettingsSection({ showAccountLinking = true }: AccountSettingsSectionProps) {
  const styles = useThemedStyles(createStyles);
  const {
    deleteAccount,
    error,
    isWorking,
    link,
    openLogin,
    signOut,
    state,
  } = useAuth();
  const [deleteVisible, setDeleteVisible] = useState(false);

  if (state.status === 'loading') {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>계정</Text>
        <View style={styles.card}><ActivityIndicator style={styles.loading} /></View>
      </View>
    );
  }

  if (state.status === 'guest' || state.status === 'anonymous') {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>계정</Text>
        <View style={styles.card}>
          {showAccountLinking ? (
            <Pressable
              accessibilityHint="Apple 또는 Google 계정을 선택적으로 연결합니다"
              accessibilityRole="button"
              onPress={() => openLogin()}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <View style={styles.loginCopy}>
                <Text style={styles.rowLabel}>계정 연결 · 선택</Text>
                <Text style={styles.rowDescription}>번호를 다른 기기에서도 이어볼 때만 필요해요.</Text>
              </View>
              <Ionicons color="#2997FF" name="person-circle-outline" size={25} />
            </Pressable>
          ) : null}
          {state.status === 'anonymous' ? (
            <>
              {showAccountLinking ? <View style={styles.separator} /> : null}
              <Pressable
                accessibilityRole="button"
                disabled={isWorking}
                onPress={() => setDeleteVisible(true)}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                <Text style={styles.dangerText}>익명 이용 정보 삭제</Text>
              </Pressable>
            </>
          ) : null}
        </View>
        {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
        <Modal animationType="fade" onRequestClose={() => setDeleteVisible(false)} transparent visible={deleteVisible}>
          <View style={styles.modalRoot}>
            <Pressable accessibilityLabel="익명 이용 정보 삭제 취소" onPress={() => setDeleteVisible(false)} style={styles.backdrop} />
            <View accessibilityRole="alert" style={styles.dialog}>
              <Text style={styles.dialogTitle}>익명 이용 정보를 삭제할까요?</Text>
              <Text style={styles.dialogDescription}>
                서버의 익명 식별 정보가 삭제됩니다. 스토어 구독은 해지되지 않으며 이 기기에 저장된 번호는 남아 있어요.
              </Text>
              <View style={styles.dialogActions}>
                <Pressable disabled={isWorking} onPress={() => setDeleteVisible(false)} style={styles.dialogButton}>
                  <Text style={styles.cancelText}>취소</Text>
                </Pressable>
                <Pressable
                  disabled={isWorking}
                  onPress={() => void deleteAccount().then(() => setDeleteVisible(false)).catch(() => undefined)}
                  style={[styles.dialogButton, styles.deleteButton]}>
                  {isWorking ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.deleteText}>삭제</Text>}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  const { user } = state;
  const missingProviders = (['apple.com', 'google.com'] as const)
    .filter((provider) => !user.providers.includes(provider));

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>계정</Text>
      <View style={styles.card}>
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Ionicons color="#2997FF" name="person" size={18} />
          </View>
          <View style={styles.profileCopy}>
            <Text numberOfLines={1} style={styles.rowLabel}>
              {user.displayName || user.email || 'Lotto Insight 계정'}
            </Text>
            <Text style={styles.rowDescription}>
              {user.providers.map((provider) => providerLabels[provider]).join(' · ')} 연결됨
            </Text>
          </View>
        </View>

        {missingProviders.map((provider) => (
          <View key={provider}>
            <View style={styles.separator} />
            <Pressable
              accessibilityRole="button"
              disabled={isWorking}
              onPress={() => void link(provider)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <Text style={styles.rowLabel}>{providerLabels[provider]} 계정 연결</Text>
              <Ionicons color="#2997FF" name="link-outline" size={19} />
            </Pressable>
          </View>
        ))}

        {user.email?.endsWith('@privaterelay.appleid.com') && missingProviders.length ? (
          <Text style={styles.privateRelayNotice}>
            다른 로그인 수단을 연결하면 Apple 비공개 계정과 같은 Lotto Insight 계정으로 사용됩니다.
          </Text>
        ) : null}

        <View style={styles.separator} />
        <Pressable
          accessibilityRole="button"
          disabled={isWorking}
          onPress={() => void signOut()}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
          <Text style={styles.rowLabel}>로그아웃</Text>
        </Pressable>
        <View style={styles.separator} />
        <Pressable
          accessibilityRole="button"
          disabled={isWorking}
          onPress={() => setDeleteVisible(true)}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
          <Text style={styles.dangerText}>계정 삭제</Text>
        </Pressable>
      </View>

      {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}

      <Modal animationType="fade" onRequestClose={() => setDeleteVisible(false)} transparent visible={deleteVisible}>
        <View style={styles.modalRoot}>
          <Pressable accessibilityLabel="계정 삭제 취소" onPress={() => setDeleteVisible(false)} style={styles.backdrop} />
          <View accessibilityRole="alert" style={styles.dialog}>
            <Text style={styles.dialogTitle}>계정을 삭제할까요?</Text>
            <Text style={styles.dialogDescription}>
              계정과 클라우드 저장 데이터가 삭제됩니다. 스토어 구독은 별도로 해지해야 하며 이 기기에 저장된 번호는 남아 있어요.
            </Text>
            <View style={styles.dialogActions}>
              <Pressable disabled={isWorking} onPress={() => setDeleteVisible(false)} style={styles.dialogButton}>
                <Text style={styles.cancelText}>취소</Text>
              </Pressable>
              <Pressable
                disabled={isWorking}
                onPress={() => void deleteAccount().then(() => setDeleteVisible(false)).catch(() => undefined)}
                style={[styles.dialogButton, styles.deleteButton]}>
                {isWorking ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.deleteText}>삭제</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  section: { marginBottom: spacing.xxl },
  sectionLabel: { marginBottom: spacing.sm, marginLeft: spacing.xs, color: colors.textSecondary, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold },
  card: { overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.divider, borderRadius: radius.lg, backgroundColor: colors.surface },
  row: { minHeight: 58, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  profileRow: { minHeight: 70, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surfaceAccent, alignItems: 'center', justifyContent: 'center' },
  profileCopy: { flex: 1 },
  loginCopy: { flex: 1, paddingVertical: spacing.md },
  rowLabel: { color: colors.textPrimary, fontSize: typography.sizes.body, fontWeight: typography.weights.medium },
  rowDescription: { marginTop: 3, color: colors.textSecondary, fontSize: typography.sizes.caption },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: spacing.lg, backgroundColor: colors.divider },
  dangerText: { color: colors.hot, fontSize: typography.sizes.body, fontWeight: typography.weights.medium },
  pressed: { opacity: 0.68 },
  loading: { marginVertical: spacing.xl },
  error: { marginTop: spacing.sm, marginHorizontal: spacing.sm, color: colors.hot, fontSize: typography.sizes.caption },
  privateRelayNotice: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, color: colors.textSecondary, fontSize: typography.sizes.caption, lineHeight: 18 },
  modalRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: colors.backdropStrong },
  dialog: { width: '100%', maxWidth: 420, padding: spacing.xl, borderRadius: radius.xl, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.divider, backgroundColor: colors.surface },
  dialogTitle: { color: colors.textPrimary, fontSize: typography.sizes.section, fontWeight: typography.weights.bold },
  dialogDescription: { marginTop: spacing.sm, color: colors.textSecondary, fontSize: typography.sizes.body, lineHeight: 22 },
  dialogActions: { marginTop: spacing.xl, flexDirection: 'row', gap: spacing.sm },
  dialogButton: { flex: 1, height: 44, borderRadius: radius.round, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceElevated },
  deleteButton: { backgroundColor: colors.hot },
  cancelText: { color: colors.textPrimary, fontSize: typography.sizes.body, fontWeight: typography.weights.semibold },
  deleteText: { color: '#FFFFFF', fontSize: typography.sizes.body, fontWeight: typography.weights.bold },
});
