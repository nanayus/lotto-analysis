import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import lottoHistoryJson from '@/data/generated/lotto_history.json';
import { SubScreenBackButton } from '@/components/ui/SubScreenBackButton';
import { buildOverallStatistics } from '@/domain/analytics/buildOverallStatistics';
import type { LottoHistoryDraw } from '@/domain/analytics/types';
import { type ThemeColors, radius, spacing, typography, useThemedStyles } from '@/theme';

const lottoHistory = lottoHistoryJson as LottoHistoryDraw[];

export function OverallStatisticsScreen() {
  const styles = useThemedStyles(createStyles);
  const statistics = useMemo(() => buildOverallStatistics(lottoHistory), []);
  const maxCount = statistics.topNumbers[0]?.count ?? 1;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <SubScreenBackButton accessibilityLabel="통계보기로 돌아가기" onPress={() => router.back()} />
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>ALL DRAW DATA</Text>
              <Text style={styles.title}>당첨데이터 종합 통계</Text>
            </View>
          </View>

          <View style={styles.rangeRow}>
            <Text style={styles.rangeLabel}>분석 범위</Text>
            <Text style={styles.rangeValue}>{statistics.firstRound.toLocaleString()}–{statistics.latestRound.toLocaleString()}회 · 보너스 제외</Text>
          </View>

          <View style={styles.summaryGrid}>
            <View style={styles.summaryMain}>
              <Text style={[styles.metricLabel, styles.metricLabelLight]}>분석 회차</Text>
              <Text style={styles.metricHero}>{statistics.drawCount.toLocaleString()}</Text>
              <Text style={styles.metricUnit}>회</Text>
            </View>
            <View style={styles.summarySide}>
              <View style={styles.sideMetric}>
                <Text style={styles.metricLabel}>평균 번호 합</Text>
                <Text style={styles.metricValue}>{statistics.averageSum.toFixed(1)}</Text>
              </View>
              <View style={styles.sideDivider} />
              <View style={styles.sideMetric}>
                <Text style={styles.metricLabel}>평균 홀짝</Text>
                <Text style={styles.metricValue}>{statistics.averageOddCount.toFixed(1)} : {statistics.averageEvenCount.toFixed(1)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.chartCard}>
            <View style={styles.sectionHeading}>
              <View>
                <Text style={styles.sectionTitle}>가장 자주 나온 번호</Text>
                <Text style={styles.sectionDescription}>메인 당첨번호 기준 상위 6개</Text>
              </View>
              <Ionicons color={styles.chartIcon.color} name="podium-outline" size={22} />
            </View>
            <View style={styles.chart}>
              {statistics.topNumbers.map((item, index) => (
                <View key={item.number} style={styles.barColumn}>
                  <Text style={styles.barCount}>{item.count}</Text>
                  <View style={styles.barTrack}>
                    <View style={[
                      styles.bar,
                      { height: `${Math.max(18, (item.count / maxCount) * 100)}%` },
                      index === 0 && styles.barFirst,
                    ]} />
                  </View>
                  <View style={[styles.numberBadge, index === 0 && styles.numberBadgeFirst]}>
                    <Text style={[styles.numberText, index === 0 && styles.numberTextFirst]}>{item.number}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.insightCard}>
            <View style={styles.insightIcon}><Ionicons color={styles.chartIcon.color} name="information" size={18} /></View>
            <Text style={styles.insightText}>출현 횟수가 많았던 번호가 다음 회차에 더 잘 나온다는 의미는 아닙니다. 과거 데이터의 분포로만 봐주세요.</Text>
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
  header: { flexDirection: 'row', alignItems: 'center' },
  headerCopy: { flex: 1, marginLeft: spacing.md },
  eyebrow: { color: colors.accentSecondary, fontSize: 9, fontWeight: typography.weights.bold, letterSpacing: 1.5, marginBottom: spacing.xs },
  title: { color: colors.textPrimary, fontSize: 22, fontWeight: typography.weights.bold, letterSpacing: -0.6 },
  rangeRow: { marginTop: spacing.xxl, paddingBottom: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.divider },
  rangeLabel: { color: colors.textSecondary, fontSize: typography.sizes.caption },
  rangeValue: { color: colors.textPrimary, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold },
  summaryGrid: { marginTop: spacing.xl, flexDirection: 'row', gap: spacing.md },
  summaryMain: { flex: 1.05, minHeight: 165, padding: spacing.lg, justifyContent: 'flex-end', borderRadius: radius.lg, backgroundColor: colors.accentPrimary },
  summarySide: { flex: 1, padding: spacing.lg, justifyContent: 'space-around', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.surface },
  sideMetric: { gap: spacing.xs },
  sideDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.divider },
  metricLabel: { color: colors.textSecondary, fontSize: typography.sizes.caption },
  metricLabelLight: { color: '#FFFFFFC7' },
  metricHero: { color: '#FFFFFF', fontSize: 40, fontWeight: typography.weights.bold, letterSpacing: -1.5, marginTop: spacing.sm },
  metricUnit: { color: '#FFFFFFB8', fontSize: typography.sizes.caption },
  metricValue: { color: colors.textPrimary, fontSize: typography.sizes.section, fontWeight: typography.weights.bold, fontVariant: ['tabular-nums'] },
  chartCard: { marginTop: spacing.xl, padding: spacing.xl, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.surface, boxShadow: colors.cardShadow, elevation: 2 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: colors.textPrimary, fontSize: typography.sizes.label, fontWeight: typography.weights.bold },
  sectionDescription: { color: colors.textSecondary, fontSize: typography.sizes.caption, marginTop: spacing.xs },
  chartIcon: { color: colors.accentPrimary },
  chart: { height: 235, marginTop: spacing.xxl, flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  barColumn: { flex: 1, height: '100%', alignItems: 'center' },
  barCount: { color: colors.textSecondary, fontSize: 9, fontVariant: ['tabular-nums'], marginBottom: spacing.xs },
  barTrack: { flex: 1, width: 18, justifyContent: 'flex-end', overflow: 'hidden', borderRadius: radius.round, backgroundColor: colors.surfaceElevated },
  bar: { width: '100%', borderRadius: radius.round, backgroundColor: colors.accentBorder },
  barFirst: { backgroundColor: colors.accentPrimary },
  numberBadge: { width: 32, height: 32, marginTop: spacing.sm, alignItems: 'center', justifyContent: 'center', borderRadius: radius.round, backgroundColor: colors.surfaceElevated },
  numberBadgeFirst: { backgroundColor: colors.surfaceAccent, borderWidth: 1, borderColor: colors.accentBorder },
  numberText: { color: colors.textSecondary, fontSize: typography.sizes.caption, fontWeight: typography.weights.bold },
  numberTextFirst: { color: colors.accentPrimary },
  insightCard: { marginTop: spacing.lg, padding: spacing.lg, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface },
  insightIcon: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: radius.round, backgroundColor: colors.surfaceAccent },
  insightText: { flex: 1, color: colors.textSecondary, fontSize: typography.sizes.caption, lineHeight: 18 },
});
