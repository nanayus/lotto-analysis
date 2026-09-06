import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import type { AnalysisPeriod } from '@/domain/analytics/types';
import { describeCombinationHeadline } from '@/domain/combination/describeCombinationHeadline';
import type {
  CombinationAnalysis,
  CombinationSize,
  IndividualNumberAnalysis,
  PrizeRank,
} from '@/domain/combination/types';
import {
  CONSECUTIVE_LABELS,
  GENERATOR_BAND_KEYS,
  GENERATOR_METRIC_LIMITS,
  SAME_ENDING_LABELS,
} from '@/domain/generator/combinationGenerator';
import { AppCard } from '@/components/ui/AppCard';
import { SubScreenHeader, TOP_BAR_HEIGHT } from '@/components/ui/AppTopBar';
import {
  ANALYSIS_STICKY_SUMMARY_MIN_HEIGHT,
  ANALYSIS_STICKY_SUMMARY_VERTICAL_PADDING,
} from '@/components/ui/analysisLayout';
import { type ThemeColors, radius, spacing, typography, useThemedStyles } from '@/theme';
import { AnalysisControls } from '@/features/explore/components/AnalysisControls';
import { LibraryStatusActions } from '@/features/library/components/LibraryStatusActions';
import {
  type CombinationResultAction,
  type CombinationResultSectionKey,
  resultSectionVisibilityRatio,
} from '@/features/combination/resultAnalytics';

import { AiCombinationExplanation } from './AiCombinationExplanation';
import { CombinationNumberPills } from './CombinationNumberPills';
import { InlineNumberCircle } from './InlineNumberCircle';

type CombinationResultProps = {
  analysis: CombinationAnalysis;
  bonusIncluded: boolean;
  firstRound: number;
  headerActionAccessibilityLabel?: string;
  headerActionLabel?: string;
  headerTitle?: string;
  heroContext?: React.ReactNode;
  latestRound: number;
  onBonusChange: (included: boolean) => void;
  onBack?: () => void;
  onToggleFavorite?: () => void;
  onOpenHistory: () => void;
  onOpenPrizeRank: (rank: PrizeRank) => void;
  onPeriodChange: (period: AnalysisPeriod) => void;
  onOpenPro?: () => void;
  onStartOver: () => void;
  onRegenerate?: () => void;
  onResultInteraction?: (
    sectionKey: CombinationResultSectionKey,
    action: CombinationResultAction,
    itemKey?: string,
  ) => void;
  onSectionViewed?: (sectionKey: CombinationResultSectionKey) => void;
  period: AnalysisPeriod;
  showLibraryActions?: boolean;
  startOverAccessibilityLabel?: string;
  startOverLabel?: string;
  canRegenerate?: boolean;
  canUseAiExplanation?: boolean;
  favorite?: boolean;
  isPro?: boolean;
  requiresAiLogin?: boolean;
  showAiExplanation?: boolean;
};

const VISIBLE_COMBINATION_SIZES = [2, 3, 4] as const;
const MATCH_COUNTS = [6, 5, 4, 3, 2, 1, 0] as const;
const PRIZE_RANKS = [1, 2, 3, 4, 5] as const;
const CONDITION_STAT_TABS = ['분포', '수 성격', '직전·연번', '번호대·과거'] as const;
const CONDITION_STAT_TAB_KEYS: Record<ConditionStatTab, string> = {
  '분포': 'distribution',
  '수 성격': 'number_character',
  '직전·연번': 'recent_consecutive',
  '번호대·과거': 'number_band_history',
};
const SECTION_VIEW_MIN_RATIO = 0.5;
const SECTION_VIEW_MIN_MS = 800;
const NOOP = () => undefined;
const webPointerStyle = Platform.select({
  web: { cursor: 'pointer' } as unknown as ViewStyle,
});
const webTabStyle = Platform.select({
  web: {
    cursor: 'pointer',
    outlineStyle: 'none',
  } as unknown as ViewStyle,
});

function formatNumber(number: number) {
  return String(number);
}

type NumberGapHighlight = 'critical' | 'notable' | null;

type HeadlineRichTextProps = {
  compact?: boolean;
  style: StyleProp<TextStyle>;
  testID: string;
  text: string;
  tone?: 'accent' | 'critical';
};

type TextRange = { end: number; start: number };

function headlineNumberRanges(text: string, includeStandaloneLabel = false) {
  const ranges: TextRange[] = [];
  const addRange = (start: number, end: number) => {
    if (!ranges.some((range) => range.start === start && range.end === end)) {
      ranges.push({ end, start });
    }
  };

  for (const match of text.matchAll(/\d+(?:[·–-]\d+)+/g)) {
    const compoundStart = match.index ?? 0;
    for (const numberMatch of match[0].matchAll(/\d+/g)) {
      const start = compoundStart + (numberMatch.index ?? 0);
      addRange(start, start + numberMatch[0].length);
    }
  }

  for (const match of text.matchAll(/\d+(?=번(?!호)(?:은|는|이|가|과|와|의|도|을|를|에서|부터|까지)|부터|까지)/g)) {
    const start = match.index ?? 0;
    addRange(start, start + match[0].length);
  }
  if (includeStandaloneLabel) {
    for (const match of text.matchAll(/\d+(?=번(?!호)\s*(?:·|$))/g)) {
      const start = match.index ?? 0;
      addRange(start, start + match[0].length);
    }
  }

  return ranges.sort((left, right) => left.start - right.start);
}

function HeadlineRichText({
  compact = false,
  style,
  testID,
  text,
  tone = 'accent',
}: HeadlineRichTextProps) {
  if (!headlineNumberRanges(text, compact).length) return <Text style={style}>{text}</Text>;

  let numberIndex = 0;
  return (
    <View style={headlineRichTextStyles.line}>
      {text.trim().split(/\s+/).map((word, wordIndex) => {
        const ranges = headlineNumberRanges(word, compact);
        const children: React.ReactNode[] = [];
        let cursor = 0;
        ranges.forEach((range) => {
          if (range.start > cursor) {
            children.push(<Text key={`text-${cursor}`} style={style}>{word.slice(cursor, range.start)}</Text>);
          }
          const number = Number(word.slice(range.start, range.end));
          const currentNumberIndex = numberIndex;
          numberIndex += 1;
          children.push(
            <InlineNumberCircle
              compact={compact}
              key={`number-${range.start}`}
              number={number}
              testID={`${testID}-${number}-${currentNumberIndex}`}
              tone={tone}
            />,
          );
          cursor = word.startsWith('번', range.end) ? range.end + 1 : range.end;
        });
        if (cursor < word.length) {
          children.push(<Text key={`text-${cursor}`} style={style}>{word.slice(cursor)}</Text>);
        }
        return (
          <View
            key={`${word}-${wordIndex}`}
            style={[
              headlineRichTextStyles.word,
              compact && headlineRichTextStyles.wordCompact,
            ]}>
            {children}
          </View>
        );
      })}
    </View>
  );
}

const headlineRichTextStyles = StyleSheet.create({
  line: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    rowGap: 4,
  },
  word: {
    minHeight: 26,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 5,
  },
  wordCompact: {
    minHeight: 21,
    marginRight: 4,
  },
});

function numberGapHighlight(item: IndividualNumberAnalysis): NumberGapHighlight {
  if (item.appearanceCount < 2 || item.averageGap <= 0) return null;
  if (item.currentGap >= item.averageGap * 2) return 'critical';
  if (item.currentGap > item.averageGap) return 'notable';
  return null;
}

function SectionCard({ children, testID, title }: {
  children: React.ReactNode;
  testID?: string;
  title?: string;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <AppCard style={styles.card} testID={testID}>
      {title ? <Text style={styles.cardTitle}>{title}</Text> : null}
      {children}
    </AppCard>
  );
}

type ConditionStatTab = (typeof CONDITION_STAT_TABS)[number];

function clampPercentage(value: number, min: number, max: number) {
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}

function bandDisplayLabel(band: string) {
  return band.replace('-', '–');
}

function BandCountChart({ counts }: {
  counts: CombinationAnalysis['conditionMetrics']['bandCounts'];
}) {
  const styles = useThemedStyles(createStyles);
  const [width, setWidth] = useState(0);
  const data = GENERATOR_BAND_KEYS.map((band) => ({
    frontColor: counts[band] > 0 ? styles.bandChartBar.backgroundColor : styles.bandChartZero.backgroundColor,
    label: bandDisplayLabel(band),
    value: counts[band],
  }));
  const maxCount = Math.max(1, ...GENERATOR_BAND_KEYS.map((band) => counts[band]));
  const summary = GENERATOR_BAND_KEYS
    .map((band) => `${bandDisplayLabel(band)} ${counts[band]}개`)
    .join(', ');
  const sectionWidth = width / GENERATOR_BAND_KEYS.length;
  const barWidth = sectionWidth * 0.6;
  const chartSpacing = sectionWidth * 0.4;
  // Gifted Charts applies initialSpacing to both its scroll container and bar row.
  const initialSpacing = sectionWidth * 0.1;
  const onLayout = (event: LayoutChangeEvent) => {
    const nextWidth = Math.floor(event.nativeEvent.layout.width);
    if (nextWidth > 0 && nextWidth !== width) setWidth(nextWidth);
  };

  return (
    <View
      accessibilityLabel={`번호대 분포, ${summary}`}
      accessible
      onLayout={onLayout}
      style={styles.bandChartFrame}
      testID="condition-band-chart">
      {width > 0 ? (
        <BarChart
          animationDuration={380}
          backgroundColor="transparent"
          barWidth={barWidth}
          barBorderTopLeftRadius={5}
          barBorderTopRightRadius={5}
          data={data}
          disableScroll
          endSpacing={0}
          frontColor={styles.bandChartBar.backgroundColor}
          height={116}
          hideRules
          hideYAxisText
          initialSpacing={initialSpacing}
          isAnimated
          labelsDistanceFromXaxis={7}
          labelsExtraHeight={22}
          maxValue={maxCount * 1.18}
          noOfSections={3}
          parentWidth={width}
          showValuesAsTopLabel
          spacing={chartSpacing}
          topLabelTextStyle={styles.bandChartValue}
          width={width}
          xAxisColor={styles.bandChartAxis.backgroundColor}
          xAxisLabelTextStyle={styles.bandChartLabel}
          xAxisTextNumberOfLines={1}
          xAxisThickness={StyleSheet.hairlineWidth}
          yAxisLabelWidth={0}
          yAxisThickness={0}
        />
      ) : null}
    </View>
  );
}

function DistributionMeter({
  label,
  limits,
  testID,
  value,
  valueLabel,
}: {
  label: string;
  limits: { min: number; max: number };
  testID: string;
  value: number;
  valueLabel: string;
}) {
  const styles = useThemedStyles(createStyles);
  const percentage = clampPercentage(value, limits.min, limits.max);

  return (
    <View
      accessibilityLabel={`${label}, ${valueLabel}, 전체 범위 ${limits.min}에서 ${limits.max}`}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: limits.min, max: limits.max, now: value, text: valueLabel }}
      style={styles.distributionMeter}
      testID={testID}>
      <View style={styles.distributionMeterHeader}>
        <Text style={styles.distributionMeterLabel}>{label}</Text>
        <Text style={styles.distributionMeterValue}>{valueLabel}</Text>
      </View>
      <View style={styles.distributionMeterTrack}>
        <View style={[styles.distributionMeterFill, { width: `${percentage}%` }]} />
        <View style={[styles.distributionMeterMarker, { left: `${percentage}%` }]} />
      </View>
      <View style={styles.distributionMeterRange}>
        <Text style={styles.distributionMeterRangeText}>{limits.min}</Text>
        <Text style={styles.distributionMeterRangeText}>{limits.max}</Text>
      </View>
    </View>
  );
}

function SameEndingProfile({
  numbers,
  patternLabel,
}: {
  numbers: readonly number[];
  patternLabel: string;
}) {
  const styles = useThemedStyles(createStyles);
  const groups = [...numbers]
    .sort((left, right) => left - right)
    .reduce<Map<number, number[]>>((result, number) => {
      const ending = number % 10;
      result.set(ending, [...(result.get(ending) ?? []), number]);
      return result;
    }, new Map());
  const orderedGroups = [...groups.entries()].sort((left, right) => (
    right[1].length - left[1].length || left[1][0] - right[1][0]
  ));

  return (
    <View
      accessibilityLabel={`동끝수 형태, ${patternLabel}`}
      accessible
      style={styles.sameEndingProfile}
      testID="condition-same-ending-profile">
      <View style={styles.distributionCardHeader}>
        <Text style={styles.distributionCardTitle}>동끝수 형태</Text>
        <Text style={styles.distributionCardValue}>{patternLabel}</Text>
      </View>
      <View style={styles.sameEndingGroups}>
        {orderedGroups.map(([ending, group]) => {
          const connected = group.length > 1;
          return (
            <View
              accessibilityLabel={`${ending}로 끝나는 번호 ${group.join(', ')}`}
              accessible
              key={`${ending}-${group.join('-')}`}
              style={[styles.sameEndingGroup, connected && styles.sameEndingGroupConnected]}>
              {group.map((number) => (
                <View
                  key={number}
                  style={[styles.sameEndingNumber, connected && styles.sameEndingNumberConnected]}>
                  <Text style={[styles.sameEndingNumberText, connected && styles.sameEndingNumberTextConnected]}>
                    {number}
                  </Text>
                </View>
              ))}
            </View>
          );
        })}
      </View>
      <View style={styles.sameEndingLegend}>
        <View style={styles.sameEndingLegendDot} />
        <Text style={styles.sameEndingLegendText}>같은 배경으로 묶인 번호는 끝수가 같아요.</Text>
      </View>
    </View>
  );
}

function RatioProfile({
  leftCount,
  leftLabel,
  rightLabel,
  testID,
  title,
}: {
  leftCount: number;
  leftLabel: string;
  rightLabel: string;
  testID: string;
  title: string;
}) {
  const styles = useThemedStyles(createStyles);
  const rightCount = 6 - leftCount;

  return (
    <View
      accessibilityLabel={`${title}, ${leftLabel} ${leftCount}, ${rightLabel} ${rightCount}`}
      accessible
      style={styles.ratioProfile}
      testID={testID}>
      <Text style={styles.ratioTitle}>{title}</Text>
      <View style={styles.ratioCountRow}>
        <Text style={styles.ratioCountPrimary}>{leftLabel} {leftCount}</Text>
        <Text style={styles.ratioCountSecondary}>{rightLabel} {rightCount}</Text>
      </View>
      <View style={styles.ratioSegments}>
        {Array.from({ length: 6 }, (_, index) => (
          <View
            key={index}
            style={[styles.ratioSegment, index < leftCount && styles.ratioSegmentPrimary]}
          />
        ))}
      </View>
    </View>
  );
}

function DistributionProfile({ analysis }: { analysis: CombinationAnalysis }) {
  const styles = useThemedStyles(createStyles);
  const metrics = analysis.conditionMetrics;

  return (
    <View style={styles.distributionProfile} testID="condition-distribution-profile">
      <SameEndingProfile
        numbers={analysis.numbers}
        patternLabel={SAME_ENDING_LABELS[metrics.sameEndingPattern]}
      />
      <View style={styles.distributionMeterCard}>
        <DistributionMeter
          label="표준편차"
          limits={GENERATOR_METRIC_LIMITS.standardDeviation}
          testID="condition-meter-standard-deviation"
          value={metrics.standardDeviation}
          valueLabel={metrics.standardDeviation.toFixed(1)}
        />
        <View style={styles.distributionMeterDivider} />
        <DistributionMeter
          label="번호 총합"
          limits={GENERATOR_METRIC_LIMITS.sum}
          testID="condition-meter-sum"
          value={metrics.sum}
          valueLabel={String(metrics.sum)}
        />
        <View style={styles.distributionMeterDivider} />
        <DistributionMeter
          label="끝수 총합"
          limits={GENERATOR_METRIC_LIMITS.lastDigitSum}
          testID="condition-meter-last-digit-sum"
          value={metrics.lastDigitSum}
          valueLabel={String(metrics.lastDigitSum)}
        />
      </View>
      <View style={styles.ratioProfiles}>
        <RatioProfile
          leftCount={metrics.oddCount}
          leftLabel="홀"
          rightLabel="짝"
          testID="condition-ratio-odd-even"
          title="홀짝 비율"
        />
        <RatioProfile
          leftCount={metrics.lowCount}
          leftLabel="저"
          rightLabel="고"
          testID="condition-ratio-low-high"
          title="저고 비율"
        />
      </View>
    </View>
  );
}

type MetricNumberTone = 'carry' | 'neighbor' | 'reference';

function MetricNumberChips({
  bonus,
  compact = false,
  highlightedBonus = false,
  highlightedNumbers = [],
  numbers,
  testIDPrefix,
  tone,
}: {
  bonus?: number | null;
  compact?: boolean;
  highlightedBonus?: boolean;
  highlightedNumbers?: readonly number[];
  numbers: readonly number[];
  testIDPrefix: string;
  tone: MetricNumberTone;
}) {
  const styles = useThemedStyles(createStyles);
  const highlightedNumberSet = new Set(highlightedNumbers);
  if (numbers.length === 0 && bonus == null) {
    return (
      <Text style={[styles.metricNumberEmpty, compact && styles.metricNumberEmptyCompact]}>
        {compact ? '없음' : '해당 없음'}
      </Text>
    );
  }
  return (
    <View style={[styles.metricNumberList, compact && styles.metricNumberListCompact]}>
      {numbers.map((number) => {
        const highlighted = highlightedNumberSet.has(number);
        return (
          <View
            accessibilityLabel={`${number}번${highlighted ? ', 선택한 관계의 기준 번호' : ''}`}
            accessibilityState={{ selected: highlighted }}
            accessible
            key={number}
            style={[
              styles.metricNumberChip,
              tone === 'carry' && styles.metricNumberChipCarry,
              tone === 'neighbor' && styles.metricNumberChipNeighbor,
              highlighted && styles.metricNumberChipHighlighted,
            ]}
            testID={`${testIDPrefix}-${number}`}>
            <Text style={[
              styles.metricNumberText,
              tone === 'carry' && styles.metricNumberTextCarry,
              tone === 'neighbor' && styles.metricNumberTextNeighbor,
              highlighted && styles.metricNumberTextHighlighted,
            ]}>
              {number}
            </Text>
          </View>
        );
      })}
      {bonus != null ? (
        <View
          accessibilityLabel={`보너스 ${bonus}번${highlightedBonus ? ', 선택한 관계의 기준 번호' : ''}`}
          accessibilityState={{ selected: highlightedBonus }}
          accessible
          style={[styles.metricBonusChip, highlightedBonus && styles.metricBonusChipHighlighted]}
          testID={`${testIDPrefix}-bonus-${bonus}`}>
          <Text style={[styles.metricBonusMark, highlightedBonus && styles.metricBonusTextHighlighted]}>B</Text>
          <Text style={[styles.metricBonusNumber, highlightedBonus && styles.metricBonusTextHighlighted]}>{bonus}</Text>
        </View>
      ) : null}
    </View>
  );
}

function CharacterSegments({ count, total }: {
  count: number;
  total: number;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      style={styles.characterSegments}>
      {Array.from({ length: total }, (_, index) => (
        <View
          key={index}
          style={[styles.characterSegment, index < count && styles.characterSegmentActive]}
        />
      ))}
    </View>
  );
}

function NumberCharacterGroup({
  items,
  title,
}: {
  items: { label: string; numbers: readonly number[]; testID: string }[];
  title: string;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.characterGroupCard}>
      <Text style={styles.characterGroupTitle}>{title}</Text>
      {items.map((item, index) => (
        <View
          key={item.label}
          style={[
            styles.characterTrait,
            index < items.length - 1 && styles.characterTraitDivider,
          ]}
          testID={item.testID}>
          <Text style={styles.characterTraitLabel}>{item.label}</Text>
          <MetricNumberChips
            compact
            numbers={item.numbers}
            testIDPrefix={`${item.testID}-number`}
            tone="neighbor"
          />
          <Text style={styles.characterTraitCount}>{item.numbers.length}개</Text>
        </View>
      ))}
    </View>
  );
}

function NumberCharacterProfile({
  metrics,
}: {
  metrics: CombinationAnalysis['conditionMetrics'];
}) {
  const styles = useThemedStyles(createStyles);
  const acStepCount = Math.max(0, Math.min(10, metrics.acValue));
  return (
    <View style={styles.numberCharacterProfile} testID="condition-number-character-profile">
      <View
        accessibilityLabel={`A/C 값 ${metrics.acValue}, 범위 0에서 10`}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 10, now: metrics.acValue, text: String(metrics.acValue) }}
        style={styles.acProfile}
        testID="condition-ac-profile">
        <View style={styles.acProfileHeader}>
          <View>
            <Text style={styles.acProfileTitle}>A/C 값</Text>
            <Text style={styles.acProfileDescription}>서로 다른 번호 간격의 다양성</Text>
          </View>
          <Text style={styles.acProfileValue}>{metrics.acValue}</Text>
        </View>
        <CharacterSegments count={acStepCount} total={10} />
        <View style={styles.acProfileRange}>
          <Text style={styles.acProfileRangeText}>0</Text>
          <Text style={styles.acProfileRangeText}>10</Text>
        </View>
      </View>

      <NumberCharacterGroup
        items={[
          { label: '소수', numbers: metrics.primeNumbers, testID: 'condition-prime-profile' },
          { label: '완전제곱수', numbers: metrics.squareNumbers, testID: 'condition-square-profile' },
          { label: '합성수', numbers: metrics.compositeNumbers, testID: 'condition-composite-profile' },
        ]}
        title="수의 종류"
      />
      <NumberCharacterGroup
        items={([3, 4, 5] as const).map((multiple) => ({
          label: `${multiple}의 배수`,
          numbers: metrics.multipleNumbers[multiple],
          testID: `condition-multiple-${multiple}-profile`,
        }))}
        title="배수 포함"
      />
    </View>
  );
}

function RecentNumberRelations({
  bonusIncluded,
  metrics,
}: {
  bonusIncluded: boolean;
  metrics: CombinationAnalysis['conditionMetrics'];
}) {
  const styles = useThemedStyles(createStyles);
  const [activeRelation, setActiveRelation] = useState<'carry' | 'neighbor' | null>(null);
  const roundLabel = metrics.previousRound ? `${metrics.previousRound}회 당첨 번호` : '기준 회차 없음';
  const relationReferenceNumbers = activeRelation === 'carry'
    ? metrics.previousNumbers.filter((number) => metrics.carryNumbers.includes(number))
    : activeRelation === 'neighbor'
      ? metrics.previousNumbers.filter((number) => (
        metrics.neighborNumbers.some((neighbor) => Math.abs(neighbor - number) === 1)
      ))
      : [];
  const previousBonusIsHighlighted = bonusIncluded && metrics.previousBonus != null && (
    activeRelation === 'carry'
      ? metrics.carryNumbers.includes(metrics.previousBonus)
      : activeRelation === 'neighbor'
        ? metrics.neighborNumbers.some((neighbor) => Math.abs(neighbor - metrics.previousBonus!) === 1)
        : false
  );
  const previousAccessibilityLabel = metrics.previousNumbers.length
    ? `직전 회차 번호, ${metrics.previousNumbers.join(', ')}${bonusIncluded && metrics.previousBonus != null ? `, 보너스 ${metrics.previousBonus}` : ''}`
    : '직전 회차 번호 없음';

  return (
    <View style={styles.recentNumberStatistics}>
      <View
        accessibilityLabel={previousAccessibilityLabel}
        accessible
        style={styles.previousDrawCard}
        testID="condition-previous-draw">
        <View style={styles.previousDrawHeader}>
          <View style={styles.previousDrawCopy}>
            <Text style={styles.previousDrawTitle}>직전 회차 번호</Text>
            <Text style={styles.previousDrawRound}>{roundLabel}</Text>
          </View>
          <View style={styles.previousDrawFilterBadge}>
            <Text style={styles.previousDrawFilterText}>보너스 {bonusIncluded ? '포함' : '제외'}</Text>
          </View>
        </View>
        <MetricNumberChips
          bonus={bonusIncluded ? metrics.previousBonus : null}
          highlightedBonus={previousBonusIsHighlighted}
          highlightedNumbers={relationReferenceNumbers}
          numbers={metrics.previousNumbers}
          testIDPrefix="condition-previous-number"
          tone="reference"
        />
      </View>

      <View style={styles.relationSectionHeader}>
        <Text style={styles.relationSectionTitle}>현재 조합과의 관계</Text>
        <Text style={styles.relationSectionHint}>
          {activeRelation === 'carry'
            ? '이월수의 기준 번호를 강조했어요.'
            : activeRelation === 'neighbor'
              ? '이웃수의 기준 번호를 강조했어요.'
              : '카드를 눌러 직전 번호를 확인하세요.'}
        </Text>
      </View>

      <View style={styles.relationCards}>
        <Pressable
          accessibilityLabel={`이월수 ${metrics.carryCount}개, ${metrics.carryNumbers.length ? metrics.carryNumbers.join(', ') : '해당 없음'}, 직전 기준 번호 보기`}
          accessibilityRole="button"
          accessibilityState={{ selected: activeRelation === 'carry' }}
          onPress={() => setActiveRelation((current) => current === 'carry' ? null : 'carry')}
          style={({ pressed }) => [
            styles.relationCard,
            activeRelation === 'carry' && styles.relationCardSelected,
            webPointerStyle,
            pressed && styles.pressed,
          ]}
          testID="condition-relation-carry">
          <View style={styles.relationHeader}>
            <Text style={styles.relationTitle}>이월수</Text>
            <Text style={styles.relationCount}>{metrics.carryCount}개</Text>
          </View>
          <Text style={styles.relationDescription}>직전 회차와 같은 번호</Text>
          <MetricNumberChips
            numbers={metrics.carryNumbers}
            testIDPrefix="condition-carry-number"
            tone="carry"
          />
        </Pressable>

        <Pressable
          accessibilityLabel={`이웃수 ${metrics.neighborCount}개, ${metrics.neighborNumbers.length ? metrics.neighborNumbers.join(', ') : '해당 없음'}, 직전 기준 번호 보기`}
          accessibilityRole="button"
          accessibilityState={{ selected: activeRelation === 'neighbor' }}
          onPress={() => setActiveRelation((current) => current === 'neighbor' ? null : 'neighbor')}
          style={({ pressed }) => [
            styles.relationCard,
            activeRelation === 'neighbor' && styles.relationCardSelected,
            webPointerStyle,
            pressed && styles.pressed,
          ]}
          testID="condition-relation-neighbor">
          <View style={styles.relationHeader}>
            <Text style={styles.relationTitle}>이웃수</Text>
            <Text style={styles.relationCount}>{metrics.neighborCount}개</Text>
          </View>
          <Text style={styles.relationDescription}>직전 번호의 앞·뒤(±1)</Text>
          <MetricNumberChips
            numbers={metrics.neighborNumbers}
            testIDPrefix="condition-neighbor-number"
            tone="neighbor"
          />
        </Pressable>
      </View>

      <View style={styles.consecutiveSummary}>
        <View style={styles.consecutiveCopy}>
          <Text style={styles.consecutiveLabel}>연번 형태</Text>
          <Text style={styles.consecutiveDescription}>현재 조합 안의 연속 번호</Text>
        </View>
        <Text style={styles.consecutiveValue}>{CONSECUTIVE_LABELS[metrics.consecutivePattern]}</Text>
      </View>
    </View>
  );
}

function ConditionStatistics({
  analysis,
  bonusIncluded,
  onInteraction = NOOP,
}: {
  analysis: CombinationAnalysis;
  bonusIncluded: boolean;
  onInteraction?: (action: CombinationResultAction, itemKey?: string) => void;
}) {
  const styles = useThemedStyles(createStyles);
  const [activeTab, setActiveTab] = useState<ConditionStatTab>('분포');
  const metrics = analysis.conditionMetrics;
  return (
    <SectionCard testID="result-section-condition-statistics" title="조건별 통계">
      <ScrollView
        contentContainerStyle={styles.conditionTabContent}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.conditionTabs}>
        {CONDITION_STAT_TABS.map((tab) => {
          const selected = tab === activeTab;
          return (
            <Pressable
              accessibilityLabel={`${tab} 통계`}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              key={tab}
              onPress={() => {
                setActiveTab(tab);
                onInteraction('change_condition_tab', CONDITION_STAT_TAB_KEYS[tab]);
              }}
              style={({ pressed }) => [
                styles.conditionTab,
                selected && styles.conditionTabSelected,
                webTabStyle,
                pressed && styles.pressed,
              ]}
              testID={`condition-stat-tab-${tab}`}>
              <Text style={[styles.conditionTabText, selected && styles.conditionTabTextSelected]}>
                {tab}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {activeTab === '분포' ? (
        <DistributionProfile analysis={analysis} />
      ) : activeTab === '수 성격' ? (
        <NumberCharacterProfile metrics={metrics} />
      ) : activeTab === '번호대·과거' ? (
        <View style={styles.bandStatistics}>
          <BandCountChart counts={metrics.bandCounts} />
        </View>
      ) : activeTab === '직전·연번' ? (
        <RecentNumberRelations bonusIncluded={bonusIncluded} metrics={metrics} />
      ) : null}

    </SectionCard>
  );
}

function FrequentCombinations({
  analysis,
  onInteraction = NOOP,
}: {
  analysis: CombinationAnalysis;
  onInteraction?: (action: CombinationResultAction, itemKey?: string) => void;
}) {
  const styles = useThemedStyles(createStyles);
  const [activeSize, setActiveSize] = useState<(typeof VISIBLE_COMBINATION_SIZES)[number]>(2);
  const [focusedSize, setFocusedSize] = useState<CombinationSize | null>(null);
  const [expanded, setExpanded] = useState(false);
  const combinations = analysis.subCombinations[activeSize];
  const collapsedCombinations = combinations
    .filter((item) => item.appearanceCount > 0)
    .slice(0, 3);
  const visibleCombinations = expanded ? combinations : collapsedCombinations;
  const remainingCount = combinations.length - collapsedCombinations.length;

  return (
    <SectionCard title="자주 나온 조합">
      <View accessibilityRole="tablist" style={styles.comboTabs}>
        {VISIBLE_COMBINATION_SIZES.map((size) => {
          const selected = size === activeSize;
          return (
            <Pressable
              accessibilityLabel={`${size}개 조합`}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              key={size}
              onBlur={() => setFocusedSize(null)}
              onFocus={(event) => {
                const target = event.target as unknown as { matches?: (selector: string) => boolean };
                const focusVisible = Platform.OS !== 'web'
                  || target.matches?.(':focus-visible') !== false;
                setFocusedSize(focusVisible ? size : null);
              }}
              onPress={() => {
                setActiveSize(size);
                setExpanded(false);
                onInteraction('change_combination_size', String(size));
              }}
              style={({ pressed }) => [
                styles.comboTab,
                selected && styles.comboTabSelected,
                webTabStyle,
                focusedSize === size && styles.comboTabFocused,
                pressed && styles.pressed,
              ]}
              testID={`combination-size-tab-${size}`}>
              <Text style={[styles.comboTabText, selected && styles.comboTabTextSelected]}>
                {size}개
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.comboList}>
        {visibleCombinations.length ? visibleCombinations.map((item, index) => (
          <View
            accessibilityLabel={`${item.numbers.join(', ')} 조합, ${item.appearanceCount}회, ${item.latestRound ? `최근 ${item.latestRound}회` : '최근 기록 없음'}`}
            accessible
            key={item.numbers.join('-')}
            style={[
              styles.comboRow,
              index < visibleCombinations.length - 1 && styles.comboRowDivider,
            ]}
            testID={`frequent-combination-row-${activeSize}-${item.numbers.join('-')}`}>
            <Text numberOfLines={1} style={styles.comboNumbers}>
              {item.numbers.map(formatNumber).join(' · ')}
            </Text>
            <View style={styles.comboMetaGroup}>
              <Text numberOfLines={1} style={[
                styles.comboCount,
                item.appearanceCount === 0 && styles.comboCountZero,
              ]}>
                {item.appearanceCount}회
              </Text>
              <Text numberOfLines={1} style={styles.comboRound}>
                {item.latestRound ? `최근 ${item.latestRound}회` : '-'}
              </Text>
            </View>
          </View>
        )) : (
          <Text style={styles.emptyText}>선택 범위에서 동시 출현 기록이 없습니다.</Text>
        )}
        {expanded || remainingCount > 0 ? (
          <Pressable
            accessibilityLabel={expanded ? '조합 목록 접기' : `${remainingCount}개 조합 더보기`}
            accessibilityRole="button"
            hitSlop={6}
            onPress={() => setExpanded((current) => {
              onInteraction(
                current ? 'collapse_combinations' : 'expand_combinations',
                String(activeSize),
              );
              return !current;
            })}
            style={({ pressed }) => [
              styles.comboExpandAction,
              webPointerStyle,
              pressed && styles.pressed,
            ]}>
            <Text style={styles.comboExpandText}>
              {expanded ? '접기' : `+ ${remainingCount}개 더보기`}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </SectionCard>
  );
}

export function CombinationResult({
  analysis,
  bonusIncluded,
  firstRound,
  headerActionAccessibilityLabel = '새로 분석하기',
  headerActionLabel = '새로 분석하기',
  headerTitle = '조합 분석',
  heroContext,
  latestRound,
  onBonusChange,
  onBack = NOOP,
  onToggleFavorite = NOOP,
  onOpenHistory,
  onOpenPrizeRank,
  onPeriodChange,
  onOpenPro = NOOP,
  onStartOver,
  onRegenerate = NOOP,
  onResultInteraction = NOOP,
  onSectionViewed,
  period,
  showLibraryActions = true,
  startOverAccessibilityLabel = '새로 분석하기',
  startOverLabel = '새로 분석하기',
  canRegenerate = false,
  favorite = false,
  isPro = false,
  canUseAiExplanation = isPro,
  requiresAiLogin = false,
  showAiExplanation = true,
}: CombinationResultProps) {
  const styles = useThemedStyles(createStyles);
  const headline = describeCombinationHeadline(analysis);
  const headlineEvidence = [headline.sourceLabel, headline.supportingSourceLabel]
    .filter((label): label is string => Boolean(label));
  const compactPeriodLabel = period.kind === 'preset'
    ? period.label
    : `${period.startRound}~${period.endRound}회`;
  const stickyFilterLabel = `${compactPeriodLabel} · 보너스 ${bonusIncluded ? '포함' : '제외'}`;
  const [libraryNotice, setLibraryNotice] = useState<string | null>(null);
  const [stickyNumbersVisible, setStickyNumbersVisible] = useState(false);
  const [favoriteSelection, setFavoriteSelection] = useState<{ key: string; value: boolean } | null>(null);
  const libraryNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sectionLayoutsRef = useRef(new Map<CombinationResultSectionKey, { height: number; y: number }>());
  const sectionTimersRef = useRef(new Map<CombinationResultSectionKey, ReturnType<typeof setTimeout>>());
  const viewedSectionsRef = useRef(new Set<CombinationResultSectionKey>());
  const resultScrollYRef = useRef(0);
  const resultViewportHeightRef = useRef(0);
  const onSectionViewedRef = useRef(onSectionViewed);
  const selectedProfileYRef = useRef(0);
  const selectedNumbersBottomRef = useRef(0);
  const stickyNumbersVisibleRef = useRef(false);
  const individualNumbers = [...analysis.individualNumbers].sort(
    (left, right) => right.appearanceCount - left.appearanceCount || left.number - right.number,
  );
  const maxDistribution = Math.max(...Object.values(analysis.matchDistribution), 1);
  const consecutiveLabel = analysis.shape.consecutiveGroups.length
    ? analysis.shape.consecutiveGroups
      .map((group) => `${formatNumber(group[0])}‑${formatNumber(group.at(-1)!)}`)
      .join(' · ')
    : '-';
  const analysisNumberKey = analysis.numbers.join('-');
  const favoriteSelected = favoriteSelection?.key === analysisNumberKey
    ? favoriteSelection.value
    : favorite;

  useEffect(() => {
    onSectionViewedRef.current = onSectionViewed;
  }, [onSectionViewed]);

  useEffect(() => () => {
    if (libraryNoticeTimerRef.current) clearTimeout(libraryNoticeTimerRef.current);
    sectionTimersRef.current.forEach(clearTimeout);
    sectionTimersRef.current.clear();
  }, []);

  const updateSectionVisibility = useCallback(() => {
    if (!onSectionViewedRef.current) return;
    sectionLayoutsRef.current.forEach((layout, sectionKey) => {
      if (viewedSectionsRef.current.has(sectionKey)) return;
      const visible = resultSectionVisibilityRatio(
        layout,
        resultScrollYRef.current,
        resultViewportHeightRef.current,
      ) >= SECTION_VIEW_MIN_RATIO;
      const currentTimer = sectionTimersRef.current.get(sectionKey);
      if (!visible) {
        if (currentTimer) clearTimeout(currentTimer);
        sectionTimersRef.current.delete(sectionKey);
        return;
      }
      if (currentTimer) return;
      const timer = setTimeout(() => {
        sectionTimersRef.current.delete(sectionKey);
        const latestLayout = sectionLayoutsRef.current.get(sectionKey);
        if (!latestLayout || resultSectionVisibilityRatio(
          latestLayout,
          resultScrollYRef.current,
          resultViewportHeightRef.current,
        ) < SECTION_VIEW_MIN_RATIO) return;
        viewedSectionsRef.current.add(sectionKey);
        onSectionViewedRef.current?.(sectionKey);
      }, SECTION_VIEW_MIN_MS);
      sectionTimersRef.current.set(sectionKey, timer);
    });
  }, []);

  const sectionLayoutHandler = useCallback((sectionKey: CombinationResultSectionKey) => (
    event: LayoutChangeEvent,
  ) => {
    const { height, y } = event.nativeEvent.layout;
    sectionLayoutsRef.current.set(sectionKey, { height, y });
    updateSectionVisibility();
  }, [updateSectionVisibility]);

  useEffect(() => {
    viewedSectionsRef.current.clear();
    sectionTimersRef.current.forEach(clearTimeout);
    sectionTimersRef.current.clear();
    if (!onSectionViewedRef.current) return undefined;
    const refreshTimer = setTimeout(updateSectionVisibility, 0);
    return () => clearTimeout(refreshTimer);
  }, [analysisNumberKey, updateSectionVisibility]);

  const showLibraryNotice = (message: string) => {
    if (libraryNoticeTimerRef.current) clearTimeout(libraryNoticeTimerRef.current);
    setLibraryNotice(message);
    libraryNoticeTimerRef.current = setTimeout(() => setLibraryNotice(null), 1800);
  };

  const handleToggleFavorite = () => {
    const selected = !favoriteSelected;
    setFavoriteSelection({ key: analysisNumberKey, value: selected });
    onToggleFavorite();
    onResultInteraction('headline', 'toggle_favorite', selected ? 'on' : 'off');
    showLibraryNotice(selected ? '즐겨찾기에 등록되었습니다.' : '즐겨찾기에서 해제되었습니다.');
  };

  const handleResultScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    resultScrollYRef.current = event.nativeEvent.contentOffset.y;
    updateSectionVisibility();
    const threshold = selectedProfileYRef.current + selectedNumbersBottomRef.current;
    if (threshold <= 0) return;
    const visible = event.nativeEvent.contentOffset.y >= threshold;
    if (visible === stickyNumbersVisibleRef.current) return;
    stickyNumbersVisibleRef.current = visible;
    setStickyNumbersVisible(visible);
  };

  return (
    <View style={styles.screen}>
      <SubScreenHeader
        onBack={onBack}
        right={(
          <Pressable
            accessibilityLabel={headerActionAccessibilityLabel}
            accessibilityRole="button"
            onPress={() => {
              onResultInteraction('headline', 'start_over');
              onStartOver();
            }}
            style={({ pressed }) => [styles.startOverButton, webPointerStyle, pressed && styles.pressed]}
            testID="combination-header-start-over">
            <Text style={styles.startOverText}>{headerActionLabel}</Text>
          </Pressable>
        )}
        title={headerTitle}
      />
      {stickyNumbersVisible ? (
        <Animated.View
          accessibilityLabel={`선택 번호 ${analysis.numbers.join(', ')}, ${stickyFilterLabel}`}
          accessible
          entering={FadeIn.duration(120)}
          exiting={FadeOut.duration(100)}
          pointerEvents="none"
          style={styles.stickyNumberBar}
          testID="result-sticky-numbers">
          <CombinationNumberPills compact numbers={analysis.numbers} />
          <Text numberOfLines={1} style={styles.stickyFilterText}>{stickyFilterLabel}</Text>
        </Animated.View>
      ) : null}
      <ScrollView
        contentContainerStyle={styles.content}
        onLayout={(event) => {
          resultViewportHeightRef.current = event.nativeEvent.layout.height;
          updateSectionVisibility();
        }}
        onScroll={handleResultScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        testID="combination-result-scroll">
      <View
        onLayout={(event) => {
          selectedProfileYRef.current = event.nativeEvent.layout.y;
        }}
        testID="result-selected-profile">
      <View style={[styles.selectedProfile, !showLibraryActions && styles.selectedProfileWithoutActions]}>
        {heroContext ? <View style={styles.heroContext}>{heroContext}</View> : null}
        {showLibraryActions ? (
          <View style={styles.profileLibraryActions}>
            <LibraryStatusActions
              favorite={favoriteSelected}
              onToggleFavorite={handleToggleFavorite}
              testID="result-card-actions"
            />
          </View>
        ) : null}
        <View
          accessibilityElementsHidden={stickyNumbersVisible}
          importantForAccessibility={stickyNumbersVisible ? 'no-hide-descendants' : 'auto'}
          onLayout={(event) => {
            const { height, y } = event.nativeEvent.layout;
            selectedNumbersBottomRef.current = y + height;
          }}
          testID="result-selected-numbers-anchor">
          <CombinationNumberPills numbers={analysis.numbers} />
        </View>
        <Text style={styles.profileMeta}>
          <Text style={styles.profileMetaMuted}>
            홀짝 {analysis.shape.oddCount}:{analysis.shape.evenCount}
            {' · '}합계 {analysis.shape.sum}
            {' · 연\u2060속\u00A0'}{consecutiveLabel}
          </Text>
        </Text>
      </View>
      </View>

      <View style={styles.filterRow}>
        <AnalysisControls
          bonusIncluded={bonusIncluded}
          compact
          firstRound={firstRound}
          latestRound={latestRound}
          onBonusChange={(included) => {
            onResultInteraction('headline', 'toggle_bonus', included ? 'include' : 'exclude');
            onBonusChange(included);
          }}
          onPeriodChange={(nextPeriod) => {
            onResultInteraction(
              'headline',
              'change_period',
              nextPeriod.kind === 'preset' ? nextPeriod.label : 'custom',
            );
            onPeriodChange(nextPeriod);
          }}
          period={period}
          variant="plain"
        />
      </View>

      <View onLayout={sectionLayoutHandler('prize_history')}>
      <AppCard style={styles.prizeSection} testID="result-section-prize">
        <View style={styles.prizeHeadingRow}>
          <Text style={styles.prizeSectionTitle}>과거 당첨 기록</Text>
          <Pressable
            accessibilityLabel="전체 기록"
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => {
              onResultInteraction('prize_history', 'open_all_history');
              onOpenHistory();
            }}
            style={({ pressed }) => [
              styles.historyAction,
              webPointerStyle,
              pressed && styles.pressed,
            ]}>
            <Text style={styles.historyActionText}>전체 기록</Text>
            <Text style={styles.historyActionChevron}>›</Text>
          </Pressable>
        </View>
        <View style={styles.prizeRow}>
          {PRIZE_RANKS.map((rank, index) => {
            const disabled = analysis.prizeCounts[rank] === 0;
            return (
              <Pressable
                accessibilityLabel={`${rank}등 기록 ${analysis.prizeCounts[rank]}회`}
                accessibilityRole="button"
                accessibilityState={{ disabled }}
                disabled={disabled}
                key={rank}
                onPress={() => {
                  onResultInteraction('prize_history', 'open_prize_rank', String(rank));
                  onOpenPrizeRank(rank);
                }}
                style={({ pressed }) => [
                  styles.prizeItem,
                  index > 0 && styles.prizeDivider,
                  !disabled && webPointerStyle,
                  disabled && styles.prizeItemDisabled,
                  pressed && styles.prizeItemPressed,
                ]}>
                <Text style={styles.prizeLabel}>{rank}등</Text>
                <Text style={styles.prizeValue}>{analysis.prizeCounts[rank]}회</Text>
              </Pressable>
            );
          })}
        </View>
      </AppCard>
      </View>

      <View
        onLayout={sectionLayoutHandler('headline')}
        style={styles.headlineBlock}
        testID="combination-headline-card">
        <Text style={styles.headlineSectionTitle}>주요 분석</Text>
        <View
          accessibilityLabel={`조합 요약, ${headline.text}${headline.supportingText ? `, ${headline.supportingText}` : ''}, 근거 지표 ${headlineEvidence.join(', ')}`}
          accessible
          testID="combination-headline">
          <View style={styles.headlineInsightRow}>
            <View
              style={[
                styles.headlineDot,
                headline.tone === 'critical' && styles.headlineDotCritical,
              ]}
              testID="headline-insight-dot-primary"
            />
            <View style={styles.headlineCopy}>
              <HeadlineRichText
                style={styles.headlineText}
                testID="headline-primary-number"
                text={headline.text}
                tone={headline.tone === 'critical' ? 'critical' : 'accent'}
              />
            </View>
          </View>
          {headline.supportingText ? (
            <View style={[styles.headlineInsightRow, styles.headlineInsightRowSecondary]}>
              <View
                style={[
                  styles.headlineDot,
                  headline.supportingTone === 'critical' && styles.headlineDotCritical,
                ]}
                testID="headline-insight-dot-supporting"
              />
              <View style={styles.headlineCopy}>
                <View testID="combination-headline-supporting">
                  <HeadlineRichText
                    style={styles.headlineText}
                    testID="headline-supporting-number"
                    text={headline.supportingText}
                    tone={headline.supportingTone === 'critical' ? 'critical' : 'accent'}
                  />
                </View>
              </View>
            </View>
          ) : null}
        </View>
      </View>

      {showAiExplanation ? (
        <AiCombinationExplanation
          analysis={analysis}
          isPro={canUseAiExplanation}
          onOpenPro={onOpenPro}
          requiresLogin={requiresAiLogin}
        />
      ) : null}

      <Text style={styles.resultGroupTitle}>번호 구성 분석</Text>

      <View onLayout={sectionLayoutHandler('group_frequency')}>
      <SectionCard testID="result-section-group-frequency" title="선택 번호 출현 빈도">
        <View style={styles.trendRow}>
          <View
            accessibilityLabel={`선택 6개 평균, ${analysis.groupFrequency.selectedAverage.toFixed(1)}회`}
            accessible
            style={styles.trendItem}>
            <Text style={styles.trendValue}>
              {analysis.groupFrequency.selectedAverage.toFixed(1)}회
            </Text>
            <Text style={styles.trendLabel}>선택 6개 평균</Text>
          </View>
          <View style={styles.trendDivider} />
          <View
            accessibilityLabel={`전체 번호 평균, ${analysis.groupFrequency.overallAverage.toFixed(1)}회`}
            accessible
            style={styles.trendItem}>
            <Text style={styles.trendValue}>
              {analysis.groupFrequency.overallAverage.toFixed(1)}회
            </Text>
            <Text style={styles.trendLabel}>전체 번호 평균</Text>
          </View>
        </View>
        <Text style={styles.comparisonText}>
          전체 평균 대비 {analysis.groupFrequency.differencePct >= 0 ? '+' : ''}
          {analysis.groupFrequency.differencePct.toFixed(1)}%
        </Text>
      </SectionCard>
      </View>

      <View
        onLayout={sectionLayoutHandler('individual_numbers')}
        testID="result-section-individual-numbers">
      <SectionCard title="번호별 분석">
        <View style={styles.numberInsightGrid}>
          {individualNumbers.map((item) => {
            const appearanceRate = analysis.activeDrawCount
              ? (item.appearanceCount / analysis.activeDrawCount) * 100
              : 0;
            const rankLabel = analysis.activeDrawCount ? `전체 ${item.appearanceRank}위` : '순위 없음';
            const averageGapLabel = item.appearanceCount >= 2
              ? `${item.averageGap.toFixed(1)}회`
              : '-';
            const gapHighlight = numberGapHighlight(item);
            const gapHighlightLabel = gapHighlight === 'critical'
              ? '평균 2배 이상'
              : gapHighlight === 'notable' ? '평균 초과' : null;
            return (
              <View
                accessibilityLabel={`${item.number}번, 출현 ${item.appearanceCount}회, ${rankLabel}, 평균 출현 간격 ${averageGapLabel}, 현재 ${item.currentGap}회째 미출현${gapHighlightLabel ? `, ${gapHighlightLabel}` : ''}`}
                accessible
                key={item.number}
                style={[
                  styles.numberInsightCard,
                  gapHighlight === 'notable' && styles.numberInsightCardNotable,
                  gapHighlight === 'critical' && styles.numberInsightCardCritical,
                ]}
                testID={`individual-number-card-${item.number}`}>
                <View style={styles.numberInsightHeader}>
                  <Text style={[
                    styles.numberInsightRank,
                    gapHighlight === 'critical' && styles.numberInsightRankCritical,
                  ]}>{rankLabel}</Text>
                  {gapHighlightLabel ? (
                    <View
                      style={[
                        styles.numberInsightGapBadge,
                        gapHighlight === 'critical' && styles.numberInsightGapBadgeCritical,
                      ]}
                      testID={`individual-number-gap-status-${item.number}`}>
                      <Text style={[
                        styles.numberInsightGapBadgeText,
                        gapHighlight === 'critical' && styles.numberInsightGapBadgeTextCritical,
                      ]}>{gapHighlightLabel}</Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.numberInsightHero}>
                  <View style={[
                    styles.numberInsightCircle,
                    gapHighlight === 'notable' && styles.numberInsightCircleNotable,
                    gapHighlight === 'critical' && styles.numberInsightCircleCritical,
                  ]}>
                    <Text style={[
                      styles.numberInsightNumber,
                      gapHighlight === 'notable' && styles.numberInsightNumberNotable,
                      gapHighlight === 'critical' && styles.numberInsightNumberCritical,
                    ]}>{formatNumber(item.number)}</Text>
                  </View>
                  <View style={styles.numberInsightFrequency}>
                    <Text style={styles.numberInsightCount}>{item.appearanceCount}회</Text>
                    <Text style={styles.numberInsightRate}>출현 {appearanceRate.toFixed(1)}%</Text>
                  </View>
                </View>
                <View style={styles.numberInsightMetrics}>
                  <View style={styles.numberInsightMetricRow}>
                    <Text style={styles.numberInsightMetricLabel}>평균 출현 간격</Text>
                    <Text style={styles.numberInsightMetricValue}>{averageGapLabel}</Text>
                  </View>
                  <View style={styles.numberInsightMetricRow}>
                    <Text style={styles.numberInsightMetricLabel}>현재 미출현</Text>
                    <Text
                      style={[
                        styles.numberInsightMetricValue,
                        gapHighlight === 'notable' && styles.numberInsightMetricValueNotable,
                        gapHighlight === 'critical' && styles.numberInsightMetricValueCritical,
                      ]}
                      testID={`individual-number-current-gap-${item.number}`}>
                      {item.currentGap}회
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </SectionCard>
      </View>

      <View onLayout={sectionLayoutHandler('condition_statistics')}>
      <ConditionStatistics
        analysis={analysis}
        bonusIncluded={bonusIncluded}
        onInteraction={(action, itemKey) => onResultInteraction(
          'condition_statistics',
          action,
          itemKey,
        )}
      />
      </View>

      <Text style={styles.resultGroupTitle}>과거 기록 비교</Text>

      <View
        onLayout={sectionLayoutHandler('frequent_combinations')}
        testID="result-section-frequent-combinations">
      <FrequentCombinations
        analysis={analysis}
        onInteraction={(action, itemKey) => onResultInteraction(
          'frequent_combinations',
          action,
          itemKey,
        )}
      />
      </View>

      <View onLayout={sectionLayoutHandler('match_distribution')}>
      <SectionCard testID="result-section-match-distribution" title="전체 회차 일치 분포">
        <Text style={styles.cardDescription}>
          선택 번호가 과거 각 회차에서 몇 개씩 일치했는지 보여줍니다.
        </Text>
        <View style={styles.distributionList}>
          {MATCH_COUNTS.map((count) => {
            const value = analysis.matchDistribution[count];
            const percentage = analysis.activeDrawCount
              ? (value / analysis.activeDrawCount) * 100
              : 0;
            return (
              <View
                accessibilityLabel={`${count}개 일치, ${value}회, ${percentage.toFixed(1)}%`}
                accessible
                key={count}
                style={styles.distributionRow}
                testID={`match-distribution-row-${count}`}>
                <Text style={styles.distributionLabel}>{count}개</Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { width: `${(value / maxDistribution) * 100}%` },
                    ]}
                    testID={`match-distribution-bar-${count}`}
                  />
                </View>
                <Text style={styles.distributionValue}>{value}회</Text>
                <Text style={styles.distributionPct}>{percentage.toFixed(1)}%</Text>
              </View>
            );
          })}
        </View>
      </SectionCard>
      </View>

      <View style={styles.resultFooter} testID="combination-result-footer">
        <Text style={styles.resultDisclaimer}>
          모든 수치는 과거 회차의 당첨 번호 기록을 집계한 것으로,{`\n`}
          앞으로의 추첨 결과를 예측하거나 보장하지 않아요.
        </Text>
        <Pressable
          accessibilityLabel={startOverAccessibilityLabel}
          accessibilityRole="button"
          onPress={() => {
            onResultInteraction('headline', 'start_over');
            onStartOver();
          }}
          style={({ pressed }) => [
            styles.newAnalysisButton,
            webPointerStyle,
            pressed && styles.pressed,
          ]}
          testID="combination-footer-start-over">
          <Text style={styles.newAnalysisText}>{startOverLabel}</Text>
        </Pressable>
        {canRegenerate ? (
          <Pressable
            accessibilityLabel={isPro
              ? '같은 조건으로 다시 뽑기'
              : '같은 조건으로 다시 뽑기, Pro 전용'}
            accessibilityRole="button"
            onPress={() => {
              onResultInteraction('headline', 'regenerate');
              onRegenerate();
            }}
            style={({ pressed }) => [
              styles.footerRegenerateButton,
              webPointerStyle,
              pressed && styles.pressed,
            ]}
            testID="combination-footer-regenerate">
            <Ionicons color={styles.footerRegenerateIcon.color} name="shuffle" size={18} />
            <Text style={styles.footerRegenerateText}>같은 조건으로 다시 뽑기</Text>
            {!isPro ? (
              <View style={styles.footerProBadge}>
                <Text style={styles.footerProText}>Pro</Text>
              </View>
            ) : null}
          </Pressable>
        ) : null}
      </View>
      </ScrollView>
      {libraryNotice ? (
        <Animated.View
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          entering={FadeIn.duration(140)}
          exiting={FadeOut.duration(140)}
          pointerEvents="none"
          style={styles.toastPositioner}
          testID="library-action-toast">
          <View style={styles.toast}>
            <Ionicons color={styles.toastText.color} name="checkmark-circle" size={17} />
            <Text style={styles.toastText}>{libraryNotice}</Text>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { flex: 1 },
  stickyNumberBar: {
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
    justifyContent: 'space-between',
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
    backgroundColor: colors.surface,
    boxShadow: colors.cardShadow,
  },
  stickyFilterText: {
    flexShrink: 1,
    color: colors.textSecondary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: 0,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  startOverButton: {
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  startOverText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
  },
  selectedProfile: {
    position: 'relative',
    alignItems: 'stretch',
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.huge + spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
    backgroundColor: colors.surface,
  },
  selectedProfileWithoutActions: {
    paddingTop: spacing.xxl,
  },
  heroContext: {
    alignSelf: 'stretch',
    marginBottom: spacing.lg,
  },
  profileLibraryActions: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.md,
  },
  headlineBlock: {
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  headlineSectionTitle: {
    marginBottom: spacing.sm,
    color: colors.textPrimary,
    fontSize: typography.sizes.section,
    fontWeight: typography.weights.semibold,
  },
  headlineInsightRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  headlineInsightRowSecondary: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  headlineDot: {
    width: 7,
    height: 7,
    marginTop: 8,
    borderRadius: radius.round,
    backgroundColor: colors.accentPrimary,
  },
  headlineDotCritical: {
    backgroundColor: colors.hot,
  },
  headlineCopy: {
    minWidth: 0,
    flex: 1,
  },
  headlineText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.medium,
    lineHeight: 24,
  },
  resultGroupTitle: {
    marginTop: spacing.lg,
    marginLeft: spacing.xs,
    color: colors.textPrimary,
    fontSize: typography.sizes.section,
    fontWeight: typography.weights.semibold,
  },
  resultFooter: {
    paddingTop: spacing.md,
    gap: spacing.xl,
  },
  resultDisclaimer: {
    color: colors.textTertiary,
    fontSize: typography.sizes.caption,
    lineHeight: 22,
    textAlign: 'center',
  },
  newAnalysisButton: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    backgroundColor: colors.accentPrimary,
  },
  newAnalysisText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
  },
  footerRegenerateButton: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    backgroundColor: colors.surfaceAccent,
  },
  footerRegenerateIcon: { color: colors.accentPrimary },
  footerRegenerateText: {
    color: colors.accentPrimary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
  },
  footerProBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    backgroundColor: colors.surface,
  },
  footerProText: {
    color: colors.accentPrimary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
  },
  profileMeta: {
    alignSelf: 'stretch',
    color: colors.textSecondary,
    fontSize: typography.sizes.small,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  profileMetaMuted: {
    color: colors.textSecondary,
  },
  accountPrompt: {
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  accountPromptCopy: {
    flex: 1,
  },
  accountPromptTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
  },
  accountPromptDescription: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: typography.sizes.caption,
    lineHeight: 18,
  },
  accountPromptButton: {
    minWidth: 66,
    minHeight: 38,
    paddingHorizontal: spacing.md,
    borderRadius: radius.round,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAccent,
  },
  accountPromptButtonText: {
    color: colors.accentPrimary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  filterRow: {
    minHeight: 48,
    alignItems: 'flex-end',
  },
  toastPositioner: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: spacing.xl,
    alignItems: 'center',
    zIndex: 20,
    elevation: 8,
  },
  toast: {
    minHeight: 42,
    maxWidth: '90%',
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.round,
    backgroundColor: colors.textPrimary,
    boxShadow: colors.cardShadow,
  },
  toastText: {
    color: colors.background,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing.lg,
  },
  cardDescription: {
    color: colors.textSecondary,
    fontSize: typography.sizes.small,
    lineHeight: 19,
    marginBottom: spacing.lg,
  },
  conditionTabs: {
    marginHorizontal: -spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  conditionTabContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  conditionTab: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  conditionTabSelected: {
    borderBottomColor: colors.accentPrimary,
  },
  conditionTabText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.medium,
  },
  conditionTabTextSelected: {
    color: colors.highlight,
    fontWeight: typography.weights.semibold,
  },
  conditionStatList: {
    paddingTop: spacing.sm,
  },
  conditionStatRow: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  conditionStatRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  conditionStatLabel: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: typography.sizes.small,
  },
  conditionStatValue: {
    color: colors.textPrimary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  numberCharacterProfile: {
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  acProfile: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
    backgroundColor: colors.surfaceElevated,
  },
  acProfileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  acProfileTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
  },
  acProfileDescription: {
    marginTop: 3,
    color: colors.textTertiary,
    fontSize: typography.sizes.caption,
    lineHeight: 18,
  },
  acProfileValue: {
    color: colors.accentPrimary,
    fontSize: typography.sizes.section,
    fontWeight: typography.weights.bold,
    fontVariant: ['tabular-nums'],
  },
  characterSegments: {
    width: '100%',
    marginTop: spacing.md,
    flexDirection: 'row',
    gap: 3,
  },
  characterSegment: {
    flex: 1,
    height: 7,
    borderRadius: radius.round,
    backgroundColor: colors.borderStrong,
  },
  characterSegmentActive: {
    backgroundColor: colors.accentPrimary,
  },
  acProfileRange: {
    marginTop: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  acProfileRangeText: {
    color: colors.textTertiary,
    fontSize: typography.sizes.caption,
    fontVariant: ['tabular-nums'],
  },
  characterGroupCard: {
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
    backgroundColor: colors.surfaceElevated,
  },
  characterGroupTitle: {
    paddingTop: spacing.md,
    color: colors.textPrimary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
  },
  characterTrait: {
    minHeight: 58,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  characterTraitDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  characterTraitLabel: {
    width: 88,
    color: colors.textSecondary,
    fontSize: typography.sizes.small,
  },
  characterTraitCount: {
    minWidth: 28,
    color: colors.accentPrimary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  distributionProfile: {
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  sameEndingProfile: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.accentBorder,
    backgroundColor: colors.surfaceAccent,
  },
  distributionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  distributionCardTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
  },
  distributionCardValue: {
    color: colors.accentPrimary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
  },
  sameEndingGroups: {
    marginTop: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sameEndingGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  sameEndingGroupConnected: {
    padding: 3,
    borderRadius: radius.round,
    backgroundColor: colors.accentPrimary,
  },
  sameEndingNumber: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
  },
  sameEndingNumberConnected: {
    borderColor: colors.accentPrimary,
    backgroundColor: colors.accentPrimary,
  },
  sameEndingNumberText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
    fontVariant: ['tabular-nums'],
  },
  sameEndingNumberTextConnected: {
    color: '#FFFFFF',
  },
  sameEndingLegend: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  sameEndingLegendDot: {
    width: 6,
    height: 6,
    borderRadius: radius.round,
    backgroundColor: colors.accentPrimary,
  },
  sameEndingLegendText: {
    flex: 1,
    color: colors.textTertiary,
    fontSize: typography.sizes.caption,
    lineHeight: 18,
  },
  distributionMeterCard: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
    backgroundColor: colors.surfaceElevated,
  },
  distributionMeter: {
    minHeight: 64,
    justifyContent: 'center',
  },
  distributionMeterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  distributionMeterLabel: {
    color: colors.textSecondary,
    fontSize: typography.sizes.small,
  },
  distributionMeterValue: {
    color: colors.textPrimary,
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.bold,
    fontVariant: ['tabular-nums'],
  },
  distributionMeterTrack: {
    position: 'relative',
    height: 6,
    marginTop: spacing.sm,
    borderRadius: radius.round,
    backgroundColor: colors.divider,
  },
  distributionMeterFill: {
    height: '100%',
    borderRadius: radius.round,
    backgroundColor: colors.accentPrimary,
  },
  distributionMeterMarker: {
    position: 'absolute',
    top: -3,
    width: 12,
    height: 12,
    marginLeft: -6,
    borderRadius: radius.round,
    borderWidth: 2,
    borderColor: colors.surfaceElevated,
    backgroundColor: colors.accentPrimary,
  },
  distributionMeterRange: {
    marginTop: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  distributionMeterRangeText: {
    color: colors.textTertiary,
    fontSize: typography.sizes.caption,
    fontVariant: ['tabular-nums'],
  },
  distributionMeterDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
  },
  ratioProfiles: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.sm,
  },
  ratioProfile: {
    flex: 1,
    minWidth: 0,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
    backgroundColor: colors.surfaceElevated,
  },
  ratioTitle: {
    color: colors.textSecondary,
    fontSize: typography.sizes.caption,
  },
  ratioCountRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  ratioCountPrimary: {
    color: colors.accentPrimary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
    fontVariant: ['tabular-nums'],
  },
  ratioCountSecondary: {
    color: colors.textSecondary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    fontVariant: ['tabular-nums'],
  },
  ratioSegments: {
    marginTop: spacing.md,
    flexDirection: 'row',
    gap: 3,
  },
  ratioSegment: {
    flex: 1,
    height: 7,
    borderRadius: radius.round,
    backgroundColor: colors.borderStrong,
  },
  ratioSegmentPrimary: {
    backgroundColor: colors.accentPrimary,
  },
  recentNumberStatistics: {
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  previousDrawCard: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 0,
    backgroundColor: colors.surfaceElevated,
  },
  previousDrawHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  previousDrawCopy: {
    flex: 1,
  },
  previousDrawTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
  },
  previousDrawRound: {
    marginTop: 3,
    color: colors.textTertiary,
    fontSize: typography.sizes.caption,
    lineHeight: 18,
  },
  previousDrawFilterBadge: {
    minHeight: 25,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
    backgroundColor: colors.surfaceAccent,
  },
  previousDrawFilterText: {
    color: colors.accentPrimary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  metricNumberList: {
    marginTop: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metricNumberListCompact: {
    flex: 1,
    marginTop: 0,
  },
  metricNumberChip: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
  },
  metricNumberChipCarry: {
    borderColor: colors.accentPrimary,
    backgroundColor: colors.accentPrimary,
  },
  metricNumberChipNeighbor: {
    borderColor: colors.accentBorder,
    backgroundColor: colors.surfaceAccent,
  },
  metricNumberChipHighlighted: {
    borderColor: colors.accentPrimary,
    backgroundColor: colors.accentPrimary,
  },
  metricNumberText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
    fontVariant: ['tabular-nums'],
  },
  metricNumberTextCarry: {
    color: '#FFFFFF',
  },
  metricNumberTextNeighbor: {
    color: colors.accentPrimary,
  },
  metricNumberTextHighlighted: {
    color: '#FFFFFF',
  },
  metricBonusChip: {
    minWidth: 42,
    height: 30,
    paddingHorizontal: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    backgroundColor: colors.surfaceAccent,
  },
  metricBonusMark: {
    color: colors.accentPrimary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
  },
  metricBonusNumber: {
    color: colors.accentPrimary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    fontVariant: ['tabular-nums'],
  },
  metricBonusChipHighlighted: {
    borderColor: colors.accentPrimary,
    backgroundColor: colors.accentPrimary,
  },
  metricBonusTextHighlighted: {
    color: '#FFFFFF',
  },
  metricNumberEmpty: {
    marginTop: spacing.md,
    color: colors.textTertiary,
    fontSize: typography.sizes.caption,
  },
  metricNumberEmptyCompact: {
    flex: 1,
    marginTop: 0,
  },
  relationCards: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.sm,
  },
  relationSectionHeader: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  relationSectionTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
  },
  relationSectionHint: {
    flex: 1,
    color: colors.textTertiary,
    fontSize: typography.sizes.caption,
    lineHeight: 18,
    textAlign: 'right',
  },
  relationCard: {
    flex: 1,
    minWidth: 0,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  relationCardSelected: {
    borderColor: colors.accentPrimary,
    backgroundColor: colors.surfaceAccent,
  },
  relationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  relationTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
  },
  relationCount: {
    color: colors.accentPrimary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
    fontVariant: ['tabular-nums'],
  },
  relationDescription: {
    marginTop: 4,
    color: colors.textTertiary,
    fontSize: typography.sizes.caption,
    lineHeight: 18,
  },
  consecutiveSummary: {
    minHeight: 54,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
  },
  consecutiveCopy: {
    flex: 1,
  },
  consecutiveLabel: {
    color: colors.textPrimary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
  },
  consecutiveDescription: {
    marginTop: 3,
    color: colors.textTertiary,
    fontSize: typography.sizes.caption,
    lineHeight: 18,
  },
  consecutiveValue: {
    color: colors.textPrimary,
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.bold,
  },
  bandStatistics: {
    paddingTop: spacing.lg,
  },
  bandChartFrame: {
    minHeight: 164,
    overflow: 'hidden',
  },
  bandChartBar: {
    backgroundColor: colors.accentPrimary,
  },
  bandChartZero: {
    backgroundColor: colors.borderStrong,
  },
  bandChartAxis: {
    backgroundColor: colors.borderStrong,
  },
  bandChartLabel: {
    color: colors.textSecondary,
    fontSize: typography.sizes.caption,
    lineHeight: 16,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  bandChartValue: {
    color: colors.textPrimary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
    fontVariant: ['tabular-nums'],
  },
  prizeSection: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  prizeHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  prizeSectionTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.semibold,
  },
  historyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.md,
    paddingVertical: spacing.xs,
  },
  historyActionText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: typography.weights.medium,
  },
  historyActionChevron: {
    color: colors.textSecondary,
    fontSize: 14,
    marginLeft: 2,
  },
  prizeRow: {
    flexDirection: 'row',
  },
  prizeItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  prizeDivider: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: colors.divider,
  },
  prizeLabel: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  prizeValue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: typography.weights.semibold,
    marginTop: spacing.xs,
  },
  prizeItemDisabled: {
    opacity: 0.6,
  },
  prizeItemPressed: {
    opacity: 0.62,
  },
  pressed: {
    opacity: 0.7,
  },
  distributionList: {
    gap: spacing.md,
  },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distributionLabel: {
    width: 28,
    color: colors.textSecondary,
    fontSize: typography.sizes.small,
  },
  distributionValue: {
    width: 52,
    color: colors.textPrimary,
    fontSize: typography.sizes.small,
    textAlign: 'right',
  },
  distributionPct: {
    width: 48,
    color: colors.textSecondary,
    fontSize: typography.sizes.small,
    textAlign: 'right',
  },
  barTrack: {
    flex: 1,
    height: 6,
    borderRadius: radius.round,
    backgroundColor: colors.divider,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: radius.round,
    backgroundColor: colors.accentPrimary,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  trendItem: {
    flex: 1,
    alignItems: 'center',
  },
  trendDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
  },
  trendValue: {
    color: colors.highlight,
    fontSize: typography.sizes.section,
    fontWeight: typography.weights.semibold,
  },
  trendLabel: {
    color: colors.textSecondary,
    fontSize: typography.sizes.small,
    marginTop: spacing.xs,
  },
  comparisonText: {
    color: colors.highlight,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.medium,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  numberInsightGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.sm,
  },
  numberInsightCard: {
    width: '48%',
    minHeight: 170,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
    backgroundColor: colors.surfaceElevated,
  },
  numberInsightCardNotable: {
    borderWidth: 1,
    borderColor: colors.accentBorder,
    backgroundColor: colors.surfaceAccent,
  },
  numberInsightCardCritical: {
    borderWidth: 1,
    borderColor: colors.hot,
    backgroundColor: colors.surfaceDanger,
  },
  numberInsightHeader: {
    minHeight: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  numberInsightRank: {
    color: colors.accentPrimary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  numberInsightRankCritical: { color: colors.hot },
  numberInsightGapBadge: {
    minHeight: 22,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
    backgroundColor: colors.surface,
  },
  numberInsightGapBadgeCritical: { backgroundColor: colors.surface },
  numberInsightGapBadgeText: {
    color: colors.accentPrimary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  numberInsightGapBadgeTextCritical: { color: colors.hot },
  numberInsightHero: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  numberInsightCircle: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: colors.accentPrimary,
    backgroundColor: colors.surface,
  },
  numberInsightCircleNotable: {
    borderColor: colors.accentPrimary,
    backgroundColor: colors.surface,
  },
  numberInsightCircleCritical: {
    borderColor: colors.hot,
    backgroundColor: colors.surface,
  },
  numberInsightNumber: {
    color: colors.textPrimary,
    fontSize: typography.sizes.section,
    fontWeight: typography.weights.bold,
    fontVariant: ['tabular-nums'],
  },
  numberInsightNumberNotable: { color: colors.accentPrimary },
  numberInsightNumberCritical: { color: colors.hot },
  numberInsightFrequency: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-end',
  },
  numberInsightCount: {
    color: colors.textPrimary,
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.semibold,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  numberInsightRate: {
    marginTop: 2,
    color: colors.textSecondary,
    fontSize: typography.sizes.caption,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  numberInsightMetrics: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  numberInsightMetricRow: {
    minHeight: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  numberInsightMetricLabel: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: typography.sizes.caption,
  },
  numberInsightMetricValue: {
    color: colors.textPrimary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  numberInsightMetricValueNotable: { color: colors.accentPrimary },
  numberInsightMetricValueCritical: { color: colors.hot },
  comboRow: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
  },
  comboRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  comboNumbers: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    paddingRight: spacing.md,
  },
  comboMetaGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  comboCount: {
    minWidth: 34,
    color: colors.highlight,
    fontSize: 14,
    fontWeight: typography.weights.medium,
    textAlign: 'right',
  },
  comboRound: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'right',
  },
  comboCountZero: {
    color: colors.textSecondary,
  },
  comboExpandAction: {
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  comboExpandText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: typography.weights.medium,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.small,
    lineHeight: 20,
    paddingVertical: spacing.md,
  },
  comboTabs: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  comboTab: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  comboTabSelected: {
    borderBottomColor: colors.accentPrimary,
  },
  comboTabFocused: {
    backgroundColor: colors.surfaceElevated,
  },
  comboTabText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: typography.weights.medium,
  },
  comboTabTextSelected: {
    color: colors.highlight,
    fontWeight: typography.weights.semibold,
  },
  comboList: {
    paddingTop: spacing.xs,
  },
});
