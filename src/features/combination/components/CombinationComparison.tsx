import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppCard } from '@/components/ui/AppCard';
import { SubScreenHeader } from '@/components/ui/AppTopBar';
import type { AnalysisPeriod } from '@/domain/analytics/types';
import type {
  CombinationAnalysis,
  CombinationSize,
  MainMatchCount,
  PrizeRank,
} from '@/domain/combination/types';
import { AnalysisControls } from '@/features/explore/components/AnalysisControls';
import { type ThemeColors, radius, spacing, typography, useAppTheme, useThemedStyles } from '@/theme';

const MATCH_COUNTS = [6, 5, 4, 3, 2, 1, 0] as const;
const PRIZE_RANKS = [1, 2, 3, 4, 5] as const;
const COMBINATION_SIZES = [2, 3, 4, 5, 6] as const;

function formatNumbers(numbers: readonly number[]) {
  return numbers.map((number) => String(number).padStart(2, '0')).join(' · ');
}

function recentMatch(analysis: CombinationAnalysis) {
  const recent = analysis.recentMeaningfulMatch;
  if (!recent) return '기록 없음';
  return `${recent.round}회 · ${recent.mainMatchCount}개${recent.prizeRank ? ` · ${recent.prizeRank}등` : ''}`;
}

function consecutive(analysis: CombinationAnalysis) {
  if (!analysis.shape.consecutiveGroups.length) return '없음';
  return analysis.shape.consecutiveGroups
    .map((group) => `${group[0]}–${group.at(-1)}`)
    .join(' · ');
}

function ratio(left: number, right: number) {
  return `${left} : ${right}`;
}

function SectionCard({ children, description, title }: {
  children: React.ReactNode;
  description?: string;
  title: string;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <AppCard style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {description ? <Text style={styles.sectionDescription}>{description}</Text> : null}
      {children}
    </AppCard>
  );
}

function DisclosureCard({ children, description, title }: {
  children: React.ReactNode;
  description: string;
  title: string;
}) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [expanded, setExpanded] = useState(false);

  return (
    <AppCard style={styles.disclosureCard}>
      <Pressable
        accessibilityLabel={`${title}, ${description}, ${expanded ? '접기' : '보기'}`}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((current) => !current)}
        style={({ pressed }) => [styles.disclosureHeader, pressed && styles.disclosurePressed]}>
        <View style={styles.disclosureCopy}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionDescription}>{description}</Text>
        </View>
        <View style={styles.disclosureAction}>
          <Text style={styles.disclosureActionText}>{expanded ? '접기' : '보기'}</Text>
          <Ionicons
            color={colors.textSecondary}
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
          />
        </View>
      </Pressable>
      {expanded ? <View style={styles.disclosureBody}>{children}</View> : null}
    </AppCard>
  );
}

function ComparisonRow({ a, b, label }: { a: string; b: string; label: string }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View accessibilityLabel={`${label}, A ${a}, B ${b}`} accessible style={styles.comparisonRow}>
      <Text style={styles.comparisonName}>{label}</Text>
      <Text style={styles.comparisonValue}>{a}</Text>
      <Text style={styles.comparisonValue}>{b}</Text>
    </View>
  );
}

function ColumnHeader() {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={[styles.comparisonRow, styles.columnHeader]}>
      <Text style={styles.comparisonName} />
      <Text style={[styles.comparisonValue, styles.aText]}>A</Text>
      <Text style={[styles.comparisonValue, styles.bText]}>B</Text>
    </View>
  );
}

function SubjectCard({ label, numbers, source }: {
  label: 'A' | 'B';
  numbers: readonly number[];
  source: string;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.subjectCard}>
      <View style={[styles.subjectBadge, label === 'B' && styles.subjectBadgeB]}>
        <Text style={[styles.subjectBadgeText, label === 'B' && styles.subjectBadgeTextB]}>{label}</Text>
      </View>
      <View style={styles.subjectCopy}>
        <Text numberOfLines={1} style={styles.subjectSource}>{source}</Text>
        <Text adjustsFontSizeToFit numberOfLines={1} style={styles.subjectNumbers}>
          {formatNumbers(numbers)}
        </Text>
      </View>
    </View>
  );
}

function DistributionRow({ a, b, count, max }: {
  a: number;
  b: number;
  count: MainMatchCount;
  max: number;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <View accessibilityLabel={`${count}개 일치, A ${a}회, B ${b}회`} accessible style={styles.distributionGroup}>
      <Text style={styles.distributionLabel}>{count}개</Text>
      <View style={styles.distributionBars}>
        <View style={styles.distributionLine}>
          <Text style={[styles.distributionKey, styles.aText]}>A</Text>
          <View style={styles.distributionTrack}>
            <View style={[styles.distributionFillA, { width: `${(a / max) * 100}%` }]} />
          </View>
          <Text style={styles.distributionValue}>{a}회</Text>
        </View>
        <View style={styles.distributionLine}>
          <Text style={[styles.distributionKey, styles.bText]}>B</Text>
          <View style={styles.distributionTrack}>
            <View style={[styles.distributionFillB, { width: `${(b / max) * 100}%` }]} />
          </View>
          <Text style={styles.distributionValue}>{b}회</Text>
        </View>
      </View>
    </View>
  );
}

function NumberStatistics({ analysis, label }: {
  analysis: CombinationAnalysis;
  label: 'A' | 'B';
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.numberPanel}>
      <View style={styles.panelHeading}>
        <Text style={[styles.panelKey, label === 'B' && styles.panelKeyB]}>{label}</Text>
        <Text style={styles.panelTitle}>번호별 출현</Text>
      </View>
      {[...analysis.individualNumbers]
        .sort((left, right) => left.number - right.number)
        .map((item) => (
          <View
            accessibilityLabel={`${label} ${item.number}번, ${item.appearanceCount}회, ${item.appearanceRank}위`}
            accessible
            key={item.number}
            style={styles.numberRow}>
            <View style={styles.numberCircle}>
              <Text style={styles.numberCircleText}>{String(item.number).padStart(2, '0')}</Text>
            </View>
            <Text style={styles.numberCount}>{item.appearanceCount}회</Text>
            <Text style={styles.numberRank}>{analysis.activeDrawCount ? `${item.appearanceRank}위` : '-'}</Text>
          </View>
        ))}
    </View>
  );
}

function SubCombinationPanel({ analysis, expanded, label, size }: {
  analysis: CombinationAnalysis;
  expanded: boolean;
  label: 'A' | 'B';
  size: CombinationSize;
}) {
  const styles = useThemedStyles(createStyles);
  const appeared = analysis.subCombinations[size]
    .filter((item) => item.appearanceCount > 0);
  const visible = expanded ? appeared : appeared.slice(0, 3);
  return (
    <View style={styles.comboPanel}>
      <View style={styles.panelHeading}>
        <Text style={[styles.panelKey, label === 'B' && styles.panelKeyB]}>{label}</Text>
        <Text style={styles.panelTitle}>TOP 3</Text>
      </View>
      {visible.length ? visible.map((item) => (
        <View key={item.numbers.join('-')} style={styles.comboRow}>
          <Text adjustsFontSizeToFit numberOfLines={1} style={styles.comboNumbers}>
            {item.numbers.join(' · ')}
          </Text>
          <Text style={styles.comboCount}>{item.appearanceCount}회</Text>
          <Text style={styles.comboRound}>{item.latestRound ? `최근 ${item.latestRound}회` : '-'}</Text>
        </View>
      )) : (
        <Text style={styles.emptyText}>과거 동일 조합 없음</Text>
      )}
    </View>
  );
}

export function CombinationComparison({
  a,
  aLabel = 'A 조합',
  b,
  bLabel = 'B 조합',
  bonusIncluded,
  firstRound,
  latestRound,
  onBack,
  onBonusChange,
  onPeriodChange,
  period,
}: {
  a: CombinationAnalysis;
  aLabel?: string;
  b: CombinationAnalysis;
  bLabel?: string;
  bonusIncluded: boolean;
  firstRound: number;
  latestRound: number;
  onBack: () => void;
  onBonusChange: (value: boolean) => void;
  onPeriodChange: (period: AnalysisPeriod) => void;
  period: AnalysisPeriod;
}) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [activeCombinationSize, setActiveCombinationSize] = useState<CombinationSize>(2);
  const [subCombinationsExpanded, setSubCombinationsExpanded] = useState(false);
  const common = a.numbers.filter((number) => b.numbers.includes(number));
  const maxDistribution = Math.max(
    1,
    ...MATCH_COUNTS.flatMap((count) => [a.matchDistribution[count], b.matchDistribution[count]]),
  );
  const conditionRows = [
    ['홀수 : 짝수', ratio(a.shape.oddCount, a.shape.evenCount), ratio(b.shape.oddCount, b.shape.evenCount)],
    ['번호 합계', String(a.shape.sum), String(b.shape.sum)],
    ['연속 번호', consecutive(a), consecutive(b)],
    ['저 : 고', ratio(a.conditionMetrics.lowCount, a.conditionMetrics.highCount), ratio(b.conditionMetrics.lowCount, b.conditionMetrics.highCount)],
    ['AC 값', String(a.conditionMetrics.acValue), String(b.conditionMetrics.acValue)],
    ['표준편차', a.conditionMetrics.standardDeviation.toFixed(1), b.conditionMetrics.standardDeviation.toFixed(1)],
    ['소수 : 합성수', ratio(a.conditionMetrics.primeCount, a.conditionMetrics.compositeCount), ratio(b.conditionMetrics.primeCount, b.conditionMetrics.compositeCount)],
    ['이월수', `${a.conditionMetrics.carryCount}개`, `${b.conditionMetrics.carryCount}개`],
    ['이웃수', `${a.conditionMetrics.neighborCount}개`, `${b.conditionMetrics.neighborCount}개`],
  ] as const;

  return (
    <View style={styles.screen}>
      <SubScreenHeader backAccessibilityLabel="조합 선택으로 돌아가기" onBack={onBack} title="비교 결과" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.subjects}>
          <SubjectCard label="A" numbers={a.numbers} source={aLabel} />
          <SubjectCard label="B" numbers={b.numbers} source={bLabel} />
        </View>

        <View style={styles.filterRow}>
          <View style={styles.filterLabelGroup}>
            <Ionicons color={colors.textSecondary} name="options-outline" size={16} />
            <Text style={styles.filterLabel}>공통 분석 조건</Text>
          </View>
          <AnalysisControls
            bonusIncluded={bonusIncluded}
            compact
            firstRound={firstRound}
            latestRound={latestRound}
            onBonusChange={onBonusChange}
            onPeriodChange={onPeriodChange}
            period={period}
            variant="plain"
          />
        </View>

        <View style={styles.commonCard}>
          <View style={styles.commonIcon}>
            <Ionicons color={colors.accentPrimary} name="link-outline" size={17} />
          </View>
          <View style={styles.commonCopy}>
            <Text style={styles.commonLabel}>공통 번호 · {common.length}개</Text>
            <Text style={styles.commonNumbers}>{common.length ? formatNumbers(common) : '겹치는 번호가 없어요'}</Text>
          </View>
        </View>

        <SectionCard description="같은 분석 조건에서 두 조합의 핵심 기록을 비교합니다." title="핵심 비교">
          <View style={styles.comparisonTable}>
            <ColumnHeader />
            <ComparisonRow a={`${a.highestMainMatch}개`} b={`${b.highestMainMatch}개`} label="과거 최고 일치" />
            <ComparisonRow a={recentMatch(a)} b={recentMatch(b)} label="최근 3개 이상 일치" />
            <ComparisonRow
              a={`${a.groupFrequency.selectedAverage.toFixed(1)}회`}
              b={`${b.groupFrequency.selectedAverage.toFixed(1)}회`}
              label="선택 번호 평균"
            />
            <ComparisonRow
              a={`${a.groupFrequency.differencePct >= 0 ? '+' : ''}${a.groupFrequency.differencePct.toFixed(1)}%`}
              b={`${b.groupFrequency.differencePct >= 0 ? '+' : ''}${b.groupFrequency.differencePct.toFixed(1)}%`}
              label="전체 평균 대비"
            />
          </View>
        </SectionCard>

        <SectionCard description="등수 기록은 보너스 분석 필터와 무관하게 실제 당첨 규칙으로 계산합니다." title="과거 당첨 기록">
          <View style={styles.prizeGrid}>
            <View style={styles.prizeHeaderRow}>
              <Text style={styles.prizeLabel} />
              {PRIZE_RANKS.map((rank) => <Text key={rank} style={styles.prizeValue}>{rank}등</Text>)}
            </View>
            {(['A', 'B'] as const).map((label) => {
              const analysis = label === 'A' ? a : b;
              return (
                <View key={label} style={styles.prizeRow}>
                  <Text style={[styles.prizeLabel, label === 'A' ? styles.aText : styles.bText]}>{label}</Text>
                  {PRIZE_RANKS.map((rank: PrizeRank) => (
                    <Text key={rank} style={styles.prizeValue}>{analysis.prizeCounts[rank]}회</Text>
                  ))}
                </View>
              );
            })}
          </View>
        </SectionCard>

        <DisclosureCard description="본번호가 0–6개 일치한 회차 수" title="전체 회차 일치 분포">
          <View style={styles.distributionList}>
            {MATCH_COUNTS.map((count) => (
              <DistributionRow
                a={a.matchDistribution[count]}
                b={b.matchDistribution[count]}
                count={count}
                key={count}
                max={maxDistribution}
              />
            ))}
          </View>
        </DisclosureCard>

        <DisclosureCard description="홀짝, 합계와 7가지 세부 형태" title="조합 형태">
          <View style={styles.comparisonTable}>
            <ColumnHeader />
            {conditionRows.map(([label, aValue, bValue]) => (
              <ComparisonRow a={aValue} b={bValue} key={label} label={label} />
            ))}
          </View>
        </DisclosureCard>

        <DisclosureCard description="각 번호의 출현 횟수와 1–45 내 순위" title="번호별 분석">
          <View style={styles.twoColumns}>
            <NumberStatistics analysis={a} label="A" />
            <NumberStatistics analysis={b} label="B" />
          </View>
        </DisclosureCard>

        <DisclosureCard description="2–6개 부분 조합의 동시 출현 기록" title="자주 나온 조합">
          <View accessibilityRole="tablist" style={styles.sizeTabs}>
            {COMBINATION_SIZES.map((size) => {
              const selected = activeCombinationSize === size;
              return (
                <Pressable
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  key={size}
                  onPress={() => {
                    setActiveCombinationSize(size);
                    setSubCombinationsExpanded(false);
                  }}
                  style={[styles.sizeTab, selected && styles.sizeTabSelected]}>
                  <Text style={[styles.sizeTabText, selected && styles.sizeTabTextSelected]}>{size}개</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.twoColumns}>
            <SubCombinationPanel analysis={a} expanded={subCombinationsExpanded} label="A" size={activeCombinationSize} />
            <SubCombinationPanel analysis={b} expanded={subCombinationsExpanded} label="B" size={activeCombinationSize} />
          </View>
          {Math.max(
            a.subCombinations[activeCombinationSize].filter((item) => item.appearanceCount > 0).length,
            b.subCombinations[activeCombinationSize].filter((item) => item.appearanceCount > 0).length,
          ) > 3 ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setSubCombinationsExpanded((current) => !current)}
              style={({ pressed }) => [styles.expandButton, pressed && styles.expandButtonPressed]}>
              <Text style={styles.expandButtonText}>{subCombinationsExpanded ? 'TOP 3만 보기' : '전체 보기'}</Text>
              <Ionicons
                color={colors.accentPrimary}
                name={subCombinationsExpanded ? 'chevron-up' : 'chevron-down'}
                size={15}
              />
            </Pressable>
          ) : null}
        </DisclosureCard>

        <Text style={styles.disclaimer}>
          비교 결과는 같은 조건의 과거 기록을 나란히 보여주는 설명이며,{`\n`}
          어느 조합이 더 유리하거나 당첨 가능성이 높다는 뜻이 아닙니다.
        </Text>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.huge, gap: spacing.md },
  subjects: { gap: spacing.sm },
  subjectCard: { minHeight: 68, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.surface },
  subjectBadge: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: radius.round, backgroundColor: colors.accentPrimary },
  subjectBadgeB: { borderWidth: 1, borderColor: colors.accentPrimary, backgroundColor: colors.surfaceAccent },
  subjectBadgeText: { color: '#FFFFFF', fontSize: typography.sizes.small, fontWeight: typography.weights.bold },
  subjectBadgeTextB: { color: colors.accentPrimary },
  subjectCopy: { flex: 1, minWidth: 0 },
  subjectSource: { color: colors.textSecondary, fontSize: typography.sizes.caption },
  subjectNumbers: { marginTop: spacing.xs, color: colors.textPrimary, fontSize: typography.sizes.small, fontWeight: typography.weights.semibold, fontVariant: ['tabular-nums'] },
  filterRow: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  filterLabelGroup: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  filterLabel: { color: colors.textSecondary, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold },
  commonCard: { minHeight: 64, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surfaceAccent },
  commonIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: radius.round, backgroundColor: colors.surface },
  commonCopy: { flex: 1 },
  commonLabel: { color: colors.textSecondary, fontSize: typography.sizes.caption },
  commonNumbers: { marginTop: 3, color: colors.textPrimary, fontSize: typography.sizes.small, fontWeight: typography.weights.semibold },
  sectionCard: { padding: spacing.lg, borderRadius: radius.lg },
  sectionTitle: { color: colors.textPrimary, fontSize: typography.sizes.label, fontWeight: typography.weights.semibold },
  sectionDescription: { marginTop: spacing.sm, color: colors.textSecondary, fontSize: typography.sizes.caption, lineHeight: 18 },
  disclosureCard: { padding: 0, borderRadius: radius.lg, overflow: 'hidden' },
  disclosureHeader: { minHeight: 76, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, flexDirection: 'row', alignItems: 'center' },
  disclosurePressed: { opacity: 0.7 },
  disclosureCopy: { flex: 1, minWidth: 0, paddingRight: spacing.md },
  disclosureAction: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  disclosureActionText: { color: colors.textSecondary, fontSize: typography.sizes.caption },
  disclosureBody: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
  comparisonTable: { marginTop: spacing.lg },
  comparisonRow: { minHeight: 46, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
  columnHeader: { minHeight: 30 },
  comparisonName: { width: '40%', paddingRight: spacing.sm, color: colors.textSecondary, fontSize: typography.sizes.caption },
  comparisonValue: { width: '30%', paddingLeft: spacing.xs, color: colors.textPrimary, fontSize: typography.sizes.caption, fontWeight: typography.weights.medium, textAlign: 'right', fontVariant: ['tabular-nums'] },
  aText: { color: colors.accentPrimary },
  bText: { color: colors.textPrimary },
  prizeGrid: { marginTop: spacing.lg },
  prizeHeaderRow: { minHeight: 30, flexDirection: 'row', alignItems: 'center' },
  prizeRow: { minHeight: 42, flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
  prizeLabel: { width: '12%', color: colors.textSecondary, fontSize: typography.sizes.caption, fontWeight: typography.weights.bold },
  prizeValue: { width: '17.6%', color: colors.textPrimary, fontSize: typography.sizes.caption, textAlign: 'right', fontVariant: ['tabular-nums'] },
  distributionList: { marginTop: spacing.lg, gap: spacing.md },
  distributionGroup: { flexDirection: 'row', alignItems: 'center' },
  distributionLabel: { width: 34, color: colors.textSecondary, fontSize: typography.sizes.caption },
  distributionBars: { flex: 1, gap: 5 },
  distributionLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  distributionKey: { width: 10, fontSize: 10, fontWeight: typography.weights.bold },
  distributionTrack: { flex: 1, height: 4, overflow: 'hidden', borderRadius: radius.round, backgroundColor: colors.surfaceElevated },
  distributionFillA: { height: '100%', borderRadius: radius.round, backgroundColor: colors.accentPrimary },
  distributionFillB: { height: '100%', borderRadius: radius.round, backgroundColor: colors.textSecondary },
  distributionValue: { width: 40, color: colors.textPrimary, fontSize: typography.sizes.caption, textAlign: 'right', fontVariant: ['tabular-nums'] },
  twoColumns: { marginTop: spacing.lg, flexDirection: 'row', gap: spacing.sm },
  numberPanel: { flex: 1, minWidth: 0, padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surfaceElevated },
  panelHeading: { minHeight: 30, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  panelKey: { width: 24, height: 24, paddingTop: 4, borderRadius: radius.round, color: '#FFFFFF', backgroundColor: colors.accentPrimary, fontSize: typography.sizes.caption, fontWeight: typography.weights.bold, textAlign: 'center', overflow: 'hidden' },
  panelKeyB: { color: colors.accentPrimary, borderWidth: 1, borderColor: colors.accentPrimary, backgroundColor: colors.surfaceAccent },
  panelTitle: { color: colors.textSecondary, fontSize: typography.sizes.caption },
  numberRow: { minHeight: 38, flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
  numberCircle: { width: 25, height: 25, alignItems: 'center', justifyContent: 'center', borderRadius: radius.round, borderWidth: 1, borderColor: colors.borderStrong },
  numberCircleText: { color: colors.textPrimary, fontSize: 10, fontWeight: typography.weights.semibold },
  numberCount: { flex: 1, marginLeft: spacing.sm, color: colors.textPrimary, fontSize: 11, textAlign: 'right', fontVariant: ['tabular-nums'] },
  numberRank: { width: 31, color: colors.textSecondary, fontSize: 10, textAlign: 'right', fontVariant: ['tabular-nums'] },
  sizeTabs: { marginTop: spacing.lg, padding: 3, flexDirection: 'row', borderRadius: radius.md, backgroundColor: colors.surfaceElevated },
  sizeTab: { flex: 1, minHeight: 34, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  sizeTabSelected: { backgroundColor: colors.surface },
  sizeTabText: { color: colors.textSecondary, fontSize: typography.sizes.caption },
  sizeTabTextSelected: { color: colors.textPrimary, fontWeight: typography.weights.semibold },
  comboPanel: { flex: 1, minWidth: 0, padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surfaceElevated },
  comboRow: { minHeight: 43, justifyContent: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
  comboNumbers: { color: colors.textPrimary, fontSize: 11, fontWeight: typography.weights.semibold },
  comboCount: { marginTop: 3, color: colors.textPrimary, fontSize: 10 },
  comboRound: { color: colors.textSecondary, fontSize: 10 },
  emptyText: { minHeight: 80, paddingTop: spacing.xxl, color: colors.textSecondary, fontSize: typography.sizes.caption, lineHeight: 18, textAlign: 'center' },
  expandButton: { minHeight: 42, marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  expandButtonPressed: { opacity: 0.68 },
  expandButtonText: { color: colors.accentPrimary, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold },
  disclaimer: { paddingVertical: spacing.xl, color: colors.textTertiary, fontSize: typography.sizes.caption, lineHeight: 20, textAlign: 'center' },
});
