import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { SubScreenHeader } from '@/components/ui/AppTopBar';
import { useAuth } from '@/features/auth/AuthContext';
import { radius, spacing, typography, type ThemeColors, useThemedStyles } from '@/theme';

export default function AccountDeletionScreen() {
  const styles = useThemedStyles(createStyles);
  const { deleteAccount, error, isWorking, openLogin, state } = useAuth();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <SubScreenHeader onBack={() => router.back()} title="계정 삭제" />
        <View style={styles.content}>
          <Text style={styles.eyebrow}>ACCOUNT DELETION</Text>
          <Text style={styles.title}>계정 및 데이터 삭제</Text>
          <Text style={styles.description}>
            Lotto Insight 계정과 연결된 서버·클라우드 데이터를 영구 삭제할 수 있습니다. 이 기기에 저장된 번호는 삭제되지 않습니다.
          </Text>
          <View style={styles.card}>
          {state.status === 'loading' ? (
            <ActivityIndicator color="#2997FF" />
          ) : state.status === 'guest' ? (
            <>
              <Text style={styles.cardTitle}>본인 확인이 필요해요</Text>
              <Text style={styles.cardCopy}>삭제할 계정으로 먼저 로그인해 주세요.</Text>
              <Pressable onPress={() => openLogin()} style={styles.primaryButton}>
                <Text style={styles.primaryText}>로그인</Text>
              </Pressable>
            </>
          ) : state.status === 'anonymous' ? (
            <>
              <Text style={styles.cardTitle}>익명 이용 정보</Text>
              <Text style={styles.cardCopy}>
                서버의 익명 식별 정보를 삭제합니다. 스토어 구독은 해지되지 않으며 기기에 저장된 번호는 남아 있습니다.
              </Text>
              <Pressable
                disabled={isWorking}
                onPress={() => void deleteAccount().catch(() => undefined)}
                style={styles.deleteButton}>
                {isWorking ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.deleteText}>익명 이용 정보 삭제</Text>}
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.cardTitle}>{state.user.email ?? '로그인된 계정'}</Text>
              <Text style={styles.cardCopy}>삭제를 누르면 다시 로그인한 뒤 계정과 저장 데이터를 삭제합니다. 스토어 구독은 별도로 해지해야 합니다.</Text>
              <Pressable
                disabled={isWorking}
                onPress={() => void deleteAccount().catch(() => undefined)}
                style={styles.deleteButton}>
                {isWorking ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.deleteText}>계정 영구 삭제</Text>}
              </Pressable>
            </>
          )}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safeArea: { flex: 1, alignItems: 'center', backgroundColor: colors.background },
  container: { flex: 1, width: '100%', maxWidth: 500 },
  content: { padding: spacing.xl },
  eyebrow: { color: colors.accentPrimary, fontSize: 9, fontWeight: typography.weights.bold, letterSpacing: 1.8 },
  title: { marginTop: spacing.sm, color: colors.textPrimary, fontSize: typography.sizes.title, fontWeight: typography.weights.bold },
  description: { marginTop: spacing.md, color: colors.textSecondary, fontSize: typography.sizes.body, lineHeight: 23 },
  card: { marginTop: spacing.xxl, padding: spacing.xl, borderWidth: 1, borderColor: colors.divider, borderRadius: radius.lg, backgroundColor: colors.surface },
  cardTitle: { color: colors.textPrimary, fontSize: typography.sizes.label, fontWeight: typography.weights.bold },
  cardCopy: { marginTop: spacing.sm, color: colors.textSecondary, fontSize: typography.sizes.small, lineHeight: 20 },
  primaryButton: { marginTop: spacing.xl, height: 44, borderRadius: radius.round, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentPrimary },
  primaryText: { color: '#FFFFFF', fontWeight: typography.weights.bold },
  deleteButton: { marginTop: spacing.xl, height: 44, borderRadius: radius.round, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.hot },
  deleteText: { color: '#FFFFFF', fontWeight: typography.weights.bold },
  error: { marginTop: spacing.md, color: colors.hot, fontSize: typography.sizes.small },
});
