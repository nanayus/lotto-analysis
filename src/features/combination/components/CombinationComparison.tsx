import Ionicons from '@expo/vector-icons/Ionicons';
import { useRef, useState } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { AppCard } from '@/components/ui/AppCard';
import {
  ANALYSIS_STICKY_SUMMARY_MIN_HEIGHT,
  ANALYSIS_STICKY_SUMMARY_VERTICAL_PADDING,
} from '@/components/ui/analysisLayout';
import { SubScreenHeader, TOP_BAR_HEIGHT } from '@/components/ui/AppTopBar';
import { formatAnalysisPeriodRange } from '@/domain/analytics/formatAnalysisPeriod';
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
  return numbers.map(String).join(' · ');
}

function formatCompactNumbers(numbers: readonly number[]) {
  return numbers.join(' ');
}

type ComparisonValue = {
  detail?: string;
  value: string;
};

function recentMatch(analysis: CombinationAnalysis): ComparisonValue {
  const recent = analysis.recentMeaningfulMatch;
  if (!recent) return { value: '기록 없음' };
  return {
    detail: `${recent.mainMatchCount}개${recent.prizeRank ? ` · ${recent.prizeRank}등` : ''}`,
    value: `${recent.round}회`,
  };
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

function SectionCard({ children, description, primary = false, title }: {
  children: React.ReactNode;
  description?: string;
  primary?: boolean;
  title: string;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <AppCard style={[styles.sectionCard, primary && styles.sectionCardPrimary]}>
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
  const [expanded, setExpanded] = useState(true);

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

function normalizeComparisonValue(value: ComparisonValue | string): ComparisonValue {
  return typeof value === 'string' ? { value } : value;
}

function ComparisonCell({ emphasized = false, value }: {
  emphasized?: boolean;
  value: ComparisonValue | string;
}) {
  const styles = useThemedStyles(createStyles);
  const normalized = normalizeComparisonValue(value);
  return (
    <View style={styles.comparisonValueCell}>
      <Text
        adjustsFontSizeToFit
        numberOfLines={1}
        style={[styles.comparisonValue, emphasized && styles.comparisonValueEmphasized]}>
        {normalized.value}
      </Text>
      {normalized.detail ? (
        <Text numberOfLines={2} style={styles.comparisonValueDetail}>{normalized.detail}</Text>
      ) : null}
    </View>
  );
}

function ComparisonRow({ a, b, emphasized = false, label }: {
  a: ComparisonValue | string;
  b: ComparisonValue | string;
  emphasized?: boolean;
  label: string;
}) {
  const styles = useThemedStyles(createStyles);
  const aValue = normalizeComparisonValue(a);
  const bValue = normalizeComparisonValue(b);
  return (
    <View
      accessibilityLabel={`${label}, A ${aValue.value}${aValue.detail ? ` ${aValue.detail}` : ''}, B ${bValue.value}${bValue.detail ? ` ${bValue.detail}` : ''}`}
      accessible
      style={[styles.comparisonRow, emphasized && styles.comparisonRowEmphasized]}>
      <Text style={[styles.comparisonName, emphasized && styles.comparisonNameEmphasized]}>{label}</Text>
      <ComparisonCell emphasized={emphasized} value={a} />
      <ComparisonCell emphasized={emphasized} value={b} />
    </View>
  );
}

function ColumnHeader() {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={[styles.comparisonRow, styles.columnHeader]}>
      <Text style={styles.comparisonName} />
      <View style={styles.comparisonValueCell}>
        <View style={styles.columnKeyA}><Text style={styles.columnKeyTextA}>A</Text></View>
      </View>
      <View style={styles.comparisonValueCell}>
        <View style={styles.columnKeyB}><Text style={styles.columnKeyTextB}>B</Text></View>
      </View>
    </View>
  );
}

function SubjectRow({ common, label, numbers, source }: {
  common: readonly number[];
  label: 'A' | 'B';
  numbers: readonly number[];
  source: string;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.subjectRow}>
      <View style={[styles.subjectBadge, label === 'B' && styles.subjectBadgeB]}>
        <Text style={[styles.subjectBadgeText, label === 'B' && styles.subjectBadgeTextB]}>{label}</Text>
      </View>
      <View style={styles.subjectCopy}>
        <Text numberOfLines={1} style={styles.subjectSource}>{source}</Text>
        <View accessibilityLabel={`${label} 번호 ${numbers.join(', ')}`} accessible style={styles.subjectNumbers}>
          {numbers.map((number) => {
            const shared = common.includes(number);
            return (
              <View key={number} style={[styles.subjectNumber, shared && styles.subjectNumberShared]}>
                <Text style={[styles.subjectNumberText, shared && styles.subjectNumberTextShared]}>{number}</Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function StickySubject({ label, numbers }: {
  label: 'A' | 'B';
  numbers: readonly number[];
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.stickySubject}>
      <View style={[styles.stickyBadge, label === 'B' && styles.stickyBadgeB]}>
        <Text style={[styles.stickyBadgeText, label === 'B' && styles.stickyBadgeTextB]}>{label}</Text>
      </View>
      <Text numberOfLines={1} style={styles.stickyNumbers}>{formatCompactNumbers(numbers)}</Text>
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
        <Text adjustsFontSizeToFit numberOfLines={1} style={styles.panelTitle}>{label} 조합</Text>
      </View>
      <View style={styles.numberHeaderRow}>
        <Text style={styles.numberHeaderLabel}>번호</Text>
        <Text style={styles.numberHeaderValue}>출현</Text>
        <Text style={styles.numberHeaderValue}>순위</Text>
      </View>
      {[...analysis.individualNumbers]
        .sort((left, right) => left.number - right.number)
        .map((item) => (
          <View
            accessibilityLabel={`${label} ${item.number}번, ${item.appearanceCount}회, ${item.appearanceRank}위`}
            accessible
            key={item.number}
            style={styles.numberRow}>
            <View style={styles.numberIdentity}>
              <View style={styles.numberCircle}>
                <Text style={styles.numberCircleText}>{item.number}</Text>
              </View>
            </View>
            <Text style={styles.numberCount}>{item.appearanceCount}회</Text>
            <Text style={styles.numberRank}>
              {analysis.activeDrawCount ? `${item.appearanceRank}위` : '-'}
            </Text>
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
        <Text adjustsFontSizeToFit numberOfLines={1} style={styles.panelTitle}>
          {size}개 조합{appeared.length ? ` · ${expanded ? `전체 ${appeared.length}개` : 'TOP 3'}` : ''}
        </Text>
      </View>
      {visible.length ? visible.map((item) => (
        <View key={item.numbers.join('-')} style={styles.comboRow}>
          <Text adjustsFontSizeToFit minimumFontScale={0.72} numberOfLines={1} style={styles.comboNumbers}>
            {item.numbers.join(' · ')}
          </Text>
          <View style={styles.comboMeta}>
            <Text style={styles.comboCount}>{item.appearanceCount}회</Text>
            <Text style={styles.comboRound}>{item.latestRound ? `최근 ${item.latestRound}회` : '-'}</Text>
          </View>
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
  const [stickySubjectsVisible, setStickySubjectsVisible] = useState(false);
  const subjectBottomRef = useRef(0);
  const stickySubjectsVisibleRef = useRef(false);
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

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (subjectBottomRef.current <= 0) return;
    const visible = event.nativeEvent.contentOffset.y >= subjectBottomRef.current;
    if (visible === stickySubjectsVisibleRef.current) return;
    stickySubjectsVisibleRef.current = visible;
    setStickySubjectsVisible(visible);
  };

  return (
    <View style={styles.screen}>
      <SubScreenHeader backAccessibilityLabel="조합 선택으로 돌아가기" onBack={onBack} title="비교 결과" />
      {stickySubjectsVisible ? (
        <Animated.View
          accessibilityLabel={`A 조합 ${a.numbers.join(', ')}, B 조합 ${b.numbers.join(', ')}`}
          accessible
          entering={FadeIn.duration(120)}
          exiting={FadeOut.duration(100)}
          pointerEvents="none"
          style={styles.stickySubjectBar}
          testID="comparison-sticky-subjects">
          <StickySubject label="A" numbers={a.numbers} />
          <View style={styles.stickyDivider} />
          <StickySubject label="B" numbers={b.numbers} />
        </Animated.View>
      ) : null}
      <ScrollView
        contentContainerStyle={styles.content}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        testID="combination-comparison-scroll">
        <View
          accessibilityElementsHidden={stickySubjectsVisible}
          importantForAccessibility={stickySubjectsVisible ? 'no-hide-descendants' : 'auto'}
          onLayout={(event) => {
            const { height, y } = event.nativeEvent.layout;
            subjectBottomRef.current = y + height;
          }}
          testID="comparison-subject-anchor">
          <AppCard style={styles.subjectCard}>
            <View style={styles.subjectHeading}>
              <Text style={styles.subjectHeadingTitle}>비교 대상</Text>
              <Text style={styles.subjectHeadingMeta}>공통 번호 · {common.length}개</Text>
            </View>
            <SubjectRow common={common} label="A" numbers={a.numbers} source={aLabel} />
            <View style={styles.subjectDivider} />
            <SubjectRow common={common} label="B" numbers={b.numbers} source={bLabel} />
            <View style={styles.commonSummary}>
              <Ionicons color={colors.accentPrimary} name="link-outline" size={15} />
              <Text style={styles.commonSummaryLabel}>
                {common.length ? `공통 번호 · ${formatNumbers(common)}` : '공통 번호가 없어요'}
              </Text>
            </View>
          </AppCard>
        </View>

        <AppCard style={styles.filterCard}>
          <View style={styles.filterHeading}>
            <View style={styles.filterIcon}>
              <Ionicons color={colors.accentPrimary} name="options-outline" size={16} />
            </View>
            <View style={styles.filterCopy}>
              <Text style={styles.filterTitle}>분석 기준</Text>
              <Text style={styles.filterDescription}>
                {formatAnalysisPeriodRange(period)} · {a.activeDrawCount.toLocaleString()}개 회차에 같은 조건 적용
              </Text>
            </View>
          </View>
          <View style={styles.filterControls}>
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
          <Text style={styles.filterNote}>보너스 설정은 출현·부분 조합 빈도에만 적용됩니다.</Text>
        </AppCard>

        <SectionCard
          description="같은 기준의 과거 기록을 A와 B로 나란히 보여줍니다."
          primary
          title="핵심 비교">
          <View style={styles.comparisonTable}>
            <ColumnHeader />
            <ComparisonRow a={`${a.highestMainMatch}개`} b={`${b.highestMainMatch}개`} emphasized label="과거 최고 일치" />
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

        <SectionCard description="보너스 설정과 무관하게 실제 당첨 규칙으로 계산한 과거 기록입니다." title="과거 당첨 기록">
          <View style={styles.comparisonTable}>
            <ColumnHeader />
            {PRIZE_RANKS.map((rank: PrizeRank) => (
              <ComparisonRow
                a={`${a.prizeCounts[rank]}회`}
                b={`${b.prizeCounts[rank]}회`}
                key={rank}
                label={`${rank}등`}
              />
            ))}
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
          <View style={styles.pairedPanels} testID="number-comparison-columns">
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
          <View style={styles.pairedPanels} testID="sub-combination-comparison-columns">
            <SubCombinationPanel analysis={a} expanded={subCombinationsExpanded} label="A" size={activeCombinationSize} />
            <SubCombinationPanel analysis={b} expanded={subCombinationsExpanded} label="B" size={activeCombinationSize} />
          </View>
          {Math.max(
            a.subCombinations[activeCombinationSize].filter((item) => item.appearanceCount > 0).length,
            b.subCombinations[activeCombinationSize].filter((item) => item.appearanceCount > 0).length,
          ) > 3 ? (
            <Pressable
              accessibilityLabel={subCombinationsExpanded ? 'TOP 3만 보기' : '부분 조합 전체 보기'}
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
  stickySubjectBar: {
    position: 'absolute',
    top: TOP_BAR_HEIGHT,
    left: 0,
    right: 0,
    zIndex: 19,
    minHeight: ANALYSIS_STICKY_SUMMARY_MIN_HEIGHT,
    paddingHorizontal: spacing.lg,
    paddingVertical: ANALYSIS_STICKY_SUMMARY_VERTICAL_PADDING,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
    backgroundColor: colors.surface,
    boxShadow: colors.cardShadow,
  },
  stickySubject: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stickyBadge: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center', borderRadius: radius.round, backgroundColor: colors.accentPrimary },
  stickyBadgeB: { borderWidth: 1, borderColor: colors.accentBorder, backgroundColor: colors.surfaceAccent },
  stickyBadgeText: { color: '#FFFFFF', fontSize: typography.sizes.caption, fontWeight: typography.weights.bold },
  stickyBadgeTextB: { color: colors.accentPrimary },
  stickyNumbers: { flex: 1, minWidth: 0, color: colors.textPrimary, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold, fontVariant: ['tabular-nums'] },
  stickyDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: colors.divider },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.huge, gap: spacing.md },
  subjectCard: { padding: 0, overflow: 'hidden', borderRadius: radius.lg },
  subjectHeading: { minHeight: 42, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
  subjectHeadingTitle: { color: colors.textPrimary, fontSize: typography.sizes.small, fontWeight: typography.weights.semibold },
  subjectHeadingMeta: { color: colors.textSecondary, fontSize: typography.sizes.caption, fontWeight: typography.weights.medium },
  subjectRow: { minHeight: 82, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  subjectDivider: { height: StyleSheet.hairlineWidth, marginLeft: 60, backgroundColor: colors.divider },
  subjectBadge: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: radius.round, backgroundColor: colors.accentPrimary },
  subjectBadgeB: { borderWidth: 1, borderColor: colors.accentPrimary, backgroundColor: colors.surfaceAccent },
  subjectBadgeText: { color: '#FFFFFF', fontSize: typography.sizes.small, fontWeight: typography.weights.bold },
  subjectBadgeTextB: { color: colors.accentPrimary },
  subjectCopy: { flex: 1, minWidth: 0 },
  subjectSource: { color: colors.textSecondary, fontSize: typography.sizes.caption },
  subjectNumbers: { marginTop: 7, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  subjectNumber: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: radius.round, borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.surfaceElevated },
  subjectNumberShared: { borderColor: colors.accentBorder, backgroundColor: colors.surfaceAccent },
  subjectNumberText: { color: colors.textPrimary, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold, fontVariant: ['tabular-nums'] },
  subjectNumberTextShared: { color: colors.accentPrimary },
  commonSummary: { minHeight: 40, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider, backgroundColor: colors.surfaceAccent },
  commonSummaryLabel: { flex: 1, color: colors.textPrimary, fontSize: typography.sizes.caption, fontWeight: typography.weights.medium },
  filterCard: { padding: spacing.lg, borderRadius: radius.lg },
  filterHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  filterIcon: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: radius.round, backgroundColor: colors.surfaceAccent },
  filterCopy: { flex: 1, minWidth: 0 },
  filterTitle: { color: colors.textPrimary, fontSize: typography.sizes.small, fontWeight: typography.weights.semibold },
  filterDescription: { marginTop: 3, color: colors.textSecondary, fontSize: typography.sizes.caption },
  filterControls: { marginTop: spacing.sm, alignItems: 'flex-end' },
  filterNote: { marginTop: spacing.xs, color: colors.textTertiary, fontSize: typography.sizes.caption, lineHeight: 18 },
  sectionCard: { padding: spacing.lg, borderRadius: radius.lg },
  sectionCardPrimary: { borderColor: colors.accentBorder },
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
  comparisonRow: { minHeight: 50, paddingVertical: spacing.sm, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
  comparisonRowEmphasized: { minHeight: 58, marginHorizontal: -spacing.sm, paddingHorizontal: spacing.sm, borderBottomWidth: 0, borderRadius: radius.md, backgroundColor: colors.surfaceAccent },
  columnHeader: { minHeight: 34, paddingVertical: 0 },
  comparisonName: { width: '38%', paddingRight: spacing.sm, color: colors.textSecondary, fontSize: typography.sizes.caption, lineHeight: 18 },
  comparisonNameEmphasized: { color: colors.textPrimary, fontWeight: typography.weights.semibold },
  comparisonValueCell: { width: '31%', minWidth: 0, paddingLeft: spacing.sm, alignItems: 'flex-end', justifyContent: 'center' },
  comparisonValue: { maxWidth: '100%', color: colors.textPrimary, fontSize: typography.sizes.small, fontWeight: typography.weights.semibold, textAlign: 'right', fontVariant: ['tabular-nums'] },
  comparisonValueEmphasized: { fontSize: typography.sizes.label, color: colors.highlight },
  comparisonValueDetail: { marginTop: 3, color: colors.textSecondary, fontSize: typography.sizes.caption, lineHeight: 16, textAlign: 'right' },
  columnKeyA: { minWidth: 28, height: 24, paddingHorizontal: spacing.sm, alignItems: 'center', justifyContent: 'center', borderRadius: radius.round, backgroundColor: colors.accentPrimary },
  columnKeyB: { minWidth: 28, height: 24, paddingHorizontal: spacing.sm, alignItems: 'center', justifyContent: 'center', borderRadius: radius.round, borderWidth: 1, borderColor: colors.accentBorder, backgroundColor: colors.surfaceAccent },
  columnKeyTextA: { color: '#FFFFFF', fontSize: typography.sizes.caption, fontWeight: typography.weights.bold },
  columnKeyTextB: { color: colors.accentPrimary, fontSize: typography.sizes.caption, fontWeight: typography.weights.bold },
  aText: { color: colors.accentPrimary },
  bText: { color: colors.textPrimary },
  distributionList: { marginTop: spacing.lg, gap: spacing.md },
  distributionGroup: { flexDirection: 'row', alignItems: 'center' },
  distributionLabel: { width: 34, color: colors.textSecondary, fontSize: typography.sizes.caption },
  distributionBars: { flex: 1, gap: 5 },
  distributionLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  distributionKey: { width: 12, fontSize: typography.sizes.caption, fontWeight: typography.weights.bold },
  distributionTrack: { flex: 1, height: 4, overflow: 'hidden', borderRadius: radius.round, backgroundColor: colors.surfaceElevated },
  distributionFillA: { height: '100%', borderRadius: radius.round, backgroundColor: colors.accentPrimary },
  distributionFillB: { height: '100%', borderRadius: radius.round, backgroundColor: colors.textSecondary },
  distributionValue: { width: 40, color: colors.textPrimary, fontSize: typography.sizes.caption, textAlign: 'right', fontVariant: ['tabular-nums'] },
  pairedPanels: { marginTop: spacing.lg, flexDirection: 'row', gap: spacing.sm },
  numberPanel: { flex: 1, minWidth: 0, padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surfaceElevated },
  panelHeading: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  panelKey: { width: 24, height: 24, paddingTop: 4, borderRadius: radius.round, color: '#FFFFFF', backgroundColor: colors.accentPrimary, fontSize: typography.sizes.caption, fontWeight: typography.weights.bold, textAlign: 'center', overflow: 'hidden' },
  panelKeyB: { color: colors.accentPrimary, borderWidth: 1, borderColor: colors.accentPrimary, backgroundColor: colors.surfaceAccent },
  panelTitle: { flex: 1, minWidth: 0, color: colors.textPrimary, fontSize: typography.sizes.small, fontWeight: typography.weights.semibold },
  numberHeaderRow: { minHeight: 30, flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
  numberHeaderLabel: { flex: 1, color: colors.textTertiary, fontSize: typography.sizes.caption },
  numberHeaderValue: { width: 42, color: colors.textTertiary, fontSize: typography.sizes.caption, textAlign: 'right' },
  numberRow: { minHeight: 43, flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
  numberIdentity: { flex: 1, minWidth: 0 },
  numberCircle: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: radius.round, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface },
  numberCircleText: { color: colors.textPrimary, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold },
  numberCount: { width: 42, color: colors.textPrimary, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold, textAlign: 'right', fontVariant: ['tabular-nums'] },
  numberRank: { width: 42, color: colors.textSecondary, fontSize: typography.sizes.caption, textAlign: 'right', fontVariant: ['tabular-nums'] },
  sizeTabs: { marginTop: spacing.lg, padding: 3, flexDirection: 'row', borderRadius: radius.md, backgroundColor: colors.surfaceElevated },
  sizeTab: { flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  sizeTabSelected: { backgroundColor: colors.surface },
  sizeTabText: { color: colors.textSecondary, fontSize: typography.sizes.caption },
  sizeTabTextSelected: { color: colors.textPrimary, fontWeight: typography.weights.semibold },
  comboPanel: { flex: 1, minWidth: 0, padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surfaceElevated },
  comboRow: { minHeight: 62, paddingVertical: spacing.sm, justifyContent: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
  comboNumbers: { width: '100%', color: colors.textPrimary, fontSize: typography.sizes.small, fontWeight: typography.weights.semibold, fontVariant: ['tabular-nums'] },
  comboMeta: { marginTop: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs },
  comboCount: { color: colors.textPrimary, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold },
  comboRound: { flexShrink: 1, color: colors.textSecondary, fontSize: typography.sizes.caption, textAlign: 'right' },
  emptyText: { minHeight: 80, paddingTop: spacing.xxl, color: colors.textSecondary, fontSize: typography.sizes.caption, lineHeight: 18, textAlign: 'center' },
  expandButton: { minHeight: 42, marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  expandButtonPressed: { opacity: 0.68 },
  expandButtonText: { color: colors.accentPrimary, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold },
  disclaimer: { paddingVertical: spacing.xl, color: colors.textTertiary, fontSize: typography.sizes.caption, lineHeight: 20, textAlign: 'center' },
});
