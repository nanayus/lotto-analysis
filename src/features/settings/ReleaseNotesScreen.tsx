import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SubScreenHeader } from '@/components/ui/AppTopBar';
import { useAuth } from '@/features/auth/AuthContext';
import { type ThemeColors, radius, spacing, typography, useAppTheme, useThemedStyles } from '@/theme';

import { canViewReleaseNotes, RELEASE_NOTES } from './releaseNotes';

export function ReleaseNotesScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { state } = useAuth();
  const isAllowed = state.status === 'authenticated' && canViewReleaseNotes(state.user.email);

  useEffect(() => {
    if (state.status !== 'loading' && !isAllowed) router.replace('/(tabs)/settings');
  }, [isAllowed, state.status]);

  if (!isAllowed) {
    return (
      <SafeAreaView style={styles.safeArea}>
        {state.status === 'loading' ? <ActivityIndicator color={colors.accentPrimary} /> : null}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.container}>
        <SubScreenHeader onBack={() => router.back()} title="변경 내역" />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.eyebrow}>VERSION HISTORY</Text>
          <Text style={styles.title}>업데이트 기록</Text>
          <Text style={styles.description}>화면별로 달라진 내용을 최신 버전부터 모아봤어요.</Text>

          <View style={styles.releaseList}>
            {RELEASE_NOTES.map((release) => (
              <View key={release.version} style={styles.release}>
                <View style={styles.releaseHeader}>
                  <Text style={styles.version}>버전 {release.version}</Text>
                  <Text style={styles.date}>{release.date}</Text>
                </View>
                <View style={styles.changeList}>
                  {release.changes.map((change, index) => (
                    <View key={`${change.screen}-${index}`} style={styles.change}>
                      <Text style={styles.screen}>{change.screen}</Text>
                      <Text style={styles.summary}>{change.summary}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safeArea: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  container: { flex: 1, width: '100%', maxWidth: 500, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.xxl, paddingBottom: spacing.huge },
  eyebrow: { color: colors.accentPrimary, fontSize: 9, fontWeight: typography.weights.bold, letterSpacing: 1.8 },
  title: { marginTop: spacing.sm, color: colors.textPrimary, fontSize: typography.sizes.title, lineHeight: 40, fontWeight: typography.weights.bold, letterSpacing: -0.7 },
  description: { marginTop: spacing.sm, color: colors.textSecondary, fontSize: typography.sizes.small, lineHeight: 21 },
  releaseList: { marginTop: spacing.xxxl, gap: spacing.xxl },
  release: { overflow: 'hidden', borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.lg, backgroundColor: colors.surface },
  releaseHeader: { minHeight: 62, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
  version: { color: colors.textPrimary, fontSize: typography.sizes.section, fontWeight: typography.weights.bold, fontVariant: ['tabular-nums'] },
  date: { color: colors.textTertiary, fontSize: typography.sizes.caption, fontVariant: ['tabular-nums'] },
  changeList: { paddingHorizontal: spacing.lg },
  change: { paddingVertical: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
  screen: { color: colors.accentPrimary, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold },
  summary: { marginTop: 6, color: colors.textPrimary, fontSize: typography.sizes.small, lineHeight: 21 },
});
