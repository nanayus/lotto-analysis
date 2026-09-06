import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MainTabHeader } from '@/components/ui/AppTopBar';
import { COMBINATION_ANALYSIS_ROUTE } from '@/features/combination/combinationNavigation';
import { useAutoHideTabBar } from '@/navigation/tabBarVisibility';
import { type ThemeColors, radius, spacing, typography, useAppTheme, useThemedStyles } from '@/theme';

export function StatisticsHubScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const tabBarScrollProps = useAutoHideTabBar();

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.container}>
        <MainTabHeader />
        <ScrollView
          {...tabBarScrollProps}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/statistics/explore')}
            style={({ pressed }) => [styles.featureCard, pressed && styles.pressed]}>
            <View style={styles.featureTop}>
              <View style={styles.featureIcon}>
                <Ionicons color={colors.accentPrimary} name="analytics" size={24} />
              </View>
              <Ionicons color={colors.textSecondary} name="arrow-forward" size={20} />
            </View>
            <Text style={styles.featureTitle}>번호별 통계</Text>
            <Text style={styles.featureDescription}>1–45 번호를 탐색하며 출현 빈도, 최근 흐름, 페어와 트리오를 확인해요.</Text>
            <View style={styles.tagRow}>
              {['출현 빈도', '최근 흐름', '페어 · 트리오'].map((label) => (
                <View key={label} style={styles.tag}><Text style={styles.tagText}>{label}</Text></View>
              ))}
            </View>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/statistics/overall-statistics')}
            style={({ pressed }) => [styles.listCard, pressed && styles.pressed]}>
            <View style={styles.listIcon}>
              <Ionicons color={colors.accentPrimary} name="bar-chart" size={22} />
            </View>
            <View style={styles.listCopy}>
              <Text style={styles.listTitle}>당첨데이터 종합 통계</Text>
              <Text style={styles.listDescription}>전체 회차의 번호 빈도와 조합 형태 요약</Text>
            </View>
            <Ionicons color={colors.textSecondary} name="chevron-forward" size={20} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/statistics/winning-number-analysis')}
            style={({ pressed }) => [styles.listCard, pressed && styles.pressed]}>
            <View style={styles.listIcon}>
              <Ionicons color={colors.accentPrimary} name="calendar-outline" size={22} />
            </View>
            <View style={styles.listCopy}>
              <Text style={styles.listTitle}>당첨번호 분석</Text>
              <Text style={styles.listDescription}>회차를 골라 당첨번호 조합의 과거 기록을 분석</Text>
            </View>
            <Ionicons color={colors.textSecondary} name="chevron-forward" size={20} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/statistics/combination-comparison')}
            style={({ pressed }) => [styles.listCard, pressed && styles.pressed]}>
            <View style={styles.listIcon}>
              <Ionicons color={colors.accentPrimary} name="git-compare-outline" size={22} />
            </View>
            <View style={styles.listCopy}>
              <Text style={styles.listTitle}>조합 비교</Text>
              <Text style={styles.listDescription}>저장 조합과 당첨 회차 두 개를 같은 기준으로 비교</Text>
            </View>
            <Ionicons color={colors.textSecondary} name="chevron-forward" size={20} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({
              pathname: COMBINATION_ANALYSIS_ROUTE,
              params: { returnTo: 'statistics' },
            })}
            style={({ pressed }) => [styles.listCard, pressed && styles.pressed]}>
            <View style={styles.listIcon}>
              <Ionicons color={colors.accentPrimary} name="grid-outline" size={22} />
            </View>
            <View style={styles.listCopy}>
              <Text style={styles.listTitle}>조합 분석</Text>
              <Text style={styles.listDescription}>선택한 6개 번호를 과거 당첨 데이터와 비교</Text>
            </View>
            <Ionicons color={colors.textSecondary} name="chevron-forward" size={20} />
          </Pressable>

          <View style={styles.notice}>
            <Ionicons color={colors.textSecondary} name="information-circle-outline" size={18} />
            <Text style={styles.noticeText}>모든 수치는 과거 데이터에 대한 설명이며 미래 당첨 가능성을 뜻하지 않습니다.</Text>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safeArea: { flex: 1, alignItems: 'center', backgroundColor: colors.background },
  container: { flex: 1, width: '100%', maxWidth: 500, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.huge },
  featureCard: { minHeight: 225, padding: spacing.xxl, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface, boxShadow: 'none', elevation: 0 },
  featureTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  featureIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.surface },
  featureTitle: { color: colors.textPrimary, fontSize: 28, lineHeight: 32, fontWeight: typography.weights.semibold, letterSpacing: -0.28, marginTop: spacing.xxl },
  featureDescription: { color: colors.textSecondary, fontSize: typography.sizes.body, lineHeight: 25, letterSpacing: -0.37, marginTop: spacing.sm },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg },
  tag: { paddingHorizontal: spacing.sm, paddingVertical: 5, borderRadius: radius.round, backgroundColor: colors.surface },
  tagText: { color: colors.textSecondary, fontSize: 10, fontWeight: typography.weights.semibold },
  listCard: { minHeight: 92, marginTop: spacing.md, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface },
  listIcon: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.surfaceElevated },
  listCopy: { flex: 1, marginHorizontal: spacing.lg },
  listTitle: { color: colors.textPrimary, fontSize: typography.sizes.body, fontWeight: typography.weights.bold },
  listDescription: { color: colors.textSecondary, fontSize: typography.sizes.caption, lineHeight: 17, marginTop: spacing.xs },
  notice: { marginTop: spacing.xxl, paddingVertical: spacing.lg, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderStrong },
  noticeText: { flex: 1, color: colors.textSecondary, fontSize: typography.sizes.caption, lineHeight: 18 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.95 }] },
});
