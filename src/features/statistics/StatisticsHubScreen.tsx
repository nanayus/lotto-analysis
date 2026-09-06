import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MainTabHeader } from '@/components/ui/AppTopBar';
import { COMBINATION_ANALYSIS_ROUTE } from '@/features/combination/combinationNavigation';
import { useCombinationDraft } from '@/features/combination/CombinationDraftContext';
import { useAutoHideTabBar } from '@/navigation/tabBarVisibility';
import { type ThemeColors, radius, spacing, typography, useAppTheme, useThemedStyles } from '@/theme';

export function StatisticsHubScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const tabBarScrollProps = useAutoHideTabBar();
  const { clear } = useCombinationDraft();

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.container}>
        <MainTabHeader />
        <ScrollView
          {...tabBarScrollProps}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          <Text style={[styles.sectionLabel, styles.firstSectionLabel]}>번호를 기준으로</Text>
          <Pressable
            accessibilityLabel="번호별 통계 열기"
            accessibilityRole="button"
            onPress={() => router.push('/statistics/explore')}
            style={({ pressed }) => [styles.listCard, pressed && styles.pressed]}>
            <View style={styles.listIcon}>
              <Ionicons color={colors.accentPrimary} name="analytics" size={22} />
            </View>
            <View style={styles.listCopy}>
              <Text style={styles.listTitle}>번호별 통계</Text>
              <Text style={styles.listDescription}>궁금한 번호 하나를 골라 출현 기록과 함께 나온 번호를 살펴보세요.</Text>
            </View>
            <Ionicons color={colors.textSecondary} name="chevron-forward" size={20} />
          </Pressable>

          <Pressable
            accessibilityLabel="조합 분석 열기"
            accessibilityRole="button"
            onPress={() => {
              clear();
              router.push({
                pathname: COMBINATION_ANALYSIS_ROUTE,
                params: { returnTo: 'statistics', selectionMode: 'manual' },
              });
            }}
            style={({ pressed }) => [styles.listCard, pressed && styles.pressed]}>
            <View style={styles.listIcon}>
              <Ionicons color={colors.accentPrimary} name="grid-outline" size={22} />
            </View>
            <View style={styles.listCopy}>
              <Text style={styles.listTitle}>조합 분석</Text>
              <Text style={styles.listDescription}>6개 번호를 직접 선택해 과거 당첨 데이터와 비교해 보세요.</Text>
            </View>
            <Ionicons color={colors.textSecondary} name="chevron-forward" size={20} />
          </Pressable>

          <Text style={styles.sectionLabel}>당첨 기록을 기준으로</Text>
          <Pressable
            accessibilityLabel="당첨번호 분석 열기"
            accessibilityRole="button"
            onPress={() => router.push('/statistics/winning-number-analysis')}
            style={({ pressed }) => [styles.listCard, pressed && styles.pressed]}>
            <View style={styles.listIcon}>
              <Ionicons color={colors.accentPrimary} name="calendar-outline" size={22} />
            </View>
            <View style={styles.listCopy}>
              <Text style={styles.listTitle}>당첨번호 분석</Text>
              <Text style={styles.listDescription}>회차를 선택해 해당 번호가 당첨되기 전까지의 기록을 살펴보세요.</Text>
            </View>
            <Ionicons color={colors.textSecondary} name="chevron-forward" size={20} />
          </Pressable>

          <Pressable
            accessibilityLabel="종합 통계 열기"
            accessibilityRole="button"
            onPress={() => router.push('/statistics/overall-statistics')}
            style={({ pressed }) => [styles.listCard, pressed && styles.pressed]}>
            <View style={styles.listIcon}>
              <Ionicons color={colors.accentPrimary} name="bar-chart" size={22} />
            </View>
            <View style={styles.listCopy}>
              <Text style={styles.listTitle}>종합 통계</Text>
              <Text style={styles.listDescription}>전체 당첨 데이터에서 자주 관찰된 번호와 조합 형태를 살펴보세요.</Text>
            </View>
            <Ionicons color={colors.textSecondary} name="chevron-forward" size={20} />
          </Pressable>

          <Text style={styles.sectionLabel}>더 깊게 보기</Text>
          <Pressable
            accessibilityLabel="조합 비교 열기"
            accessibilityRole="button"
            onPress={() => router.push('/statistics/combination-comparison')}
            style={({ pressed }) => [styles.listCard, pressed && styles.pressed]}>
            <View style={styles.listIcon}>
              <Ionicons color={colors.accentPrimary} name="git-compare-outline" size={22} />
            </View>
            <View style={styles.listCopy}>
              <Text style={styles.listTitle}>조합 비교</Text>
              <Text style={styles.listDescription}>저장한 번호와 과거 당첨번호 중 두 조합을 같은 조건으로 비교하세요.</Text>
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
  sectionLabel: { marginTop: spacing.xxl, marginBottom: spacing.sm, color: colors.textSecondary, fontSize: typography.sizes.small, lineHeight: 20, fontWeight: typography.weights.semibold },
  firstSectionLabel: { marginTop: 0 },
  listCard: { minHeight: 104, marginTop: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, flexDirection: 'row', alignItems: 'center', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface },
  listIcon: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.surfaceElevated },
  listCopy: { flex: 1, marginHorizontal: spacing.lg },
  listTitle: { color: colors.textPrimary, fontSize: typography.sizes.body, fontWeight: typography.weights.bold },
  listDescription: { color: colors.textSecondary, fontSize: typography.sizes.small, lineHeight: 20, marginTop: spacing.xs },
  notice: { marginTop: spacing.xxl, paddingVertical: spacing.lg, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderStrong },
  noticeText: { flex: 1, color: colors.textSecondary, fontSize: 13, lineHeight: 19 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.95 }] },
});
