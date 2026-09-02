import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Modal,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SubScreenHeader } from '@/components/ui/AppTopBar';
import type { LottoHistoryDraw } from '@/domain/analytics/types';
import {
  activeConditionCount,
  buildBalancedGeneratorPreset,
  buildGeneratorConditionDefaults,
  buildGeneratorRangePresets,
  cloneGeneratorConditions,
  conditionDerivedExclusions,
  CONSECUTIVE_LABELS,
  enabledGeneratorConditionCount,
  GENERATOR_BAND_KEYS,
  GENERATOR_COUNT_VALUES,
  generatorSectionEnabled,
  SAME_ENDING_LABELS,
} from '@/domain/generator/combinationGenerator';
import {
  buildConditionHelp,
  type ConditionHelpKey,
} from '@/domain/generator/conditionHelp';
import type {
  ConsecutivePattern,
  CountValue,
  GeneratorConditions,
  GeneratorSectionKey,
  SameEndingPattern,
} from '@/domain/generator/types';
import { type ThemeColors, radius, spacing, typography, useThemedStyles } from '@/theme';

import { CollapsibleConditionContent } from './CollapsibleConditionContent';
import { ConditionInfoButton } from './ConditionInfoButton';
import { ConditionToggle } from './ConditionToggle';
import { RangeControl } from './RangeControl';

const NUMBERS = Array.from({ length: 45 }, (_, index) => index + 1);
const PRIME_NUMBERS = NUMBERS.filter((number) => {
  if (number < 2) return false;
  return !Array.from({ length: Math.floor(Math.sqrt(number)) - 1 }, (_, index) => index + 2)
    .some((divisor) => number % divisor === 0);
});
const SQUARE_NUMBERS = [4, 9, 16, 25, 36];
const COMPOSITE_NUMBERS = NUMBERS.filter((number) => number > 1 && !PRIME_NUMBERS.includes(number));
const NUMBER_GRID_PLACEHOLDERS = Array.from({ length: 4 }, (_, index) => index);
const PAGE_LABELS = ['번호', '분포', '수 성격', '직전·연번', '번호대·과거'];
const SAME_ENDING_PATTERNS: SameEndingPattern[] = [
  'none', '2', '2+2', '2+2+2', '3', '3+2', '3+3', '4', '4+2', '5',
];
const CONSECUTIVE_PATTERNS: ConsecutivePattern[] = [
  'none', '2', '2+2', '2+2+2', '3', '3+2', '3+3', '4', '4+2', '5', '6',
];
const SAME_ENDING_OPTIONS = SAME_ENDING_PATTERNS.map((value) => [value, SAME_ENDING_LABELS[value]] as const);
const CONSECUTIVE_OPTIONS = CONSECUTIVE_PATTERNS.map((value) => [value, CONSECUTIVE_LABELS[value]] as const);
const MULTIPLE_HELP_KEYS = {
  3: 'multiple3',
  4: 'multiple4',
  5: 'multiple5',
} as const satisfies Record<3 | 4 | 5, ConditionHelpKey>;
const BAND_HELP_KEYS = {
  '1-9': 'band1To9',
  '10-19': 'band10To19',
  '20-29': 'band20To29',
  '30-39': 'band30To39',
  '40-45': 'band40To45',
} as const satisfies Record<(typeof GENERATOR_BAND_KEYS)[number], ConditionHelpKey>;
const BAND_SECTION_KEYS = {
  '1-9': 'band1To9',
  '10-19': 'band10To19',
  '20-29': 'band20To29',
  '30-39': 'band30To39',
  '40-45': 'band40To45',
} as const satisfies Record<(typeof GENERATOR_BAND_KEYS)[number], GeneratorSectionKey>;
const MULTIPLE_SECTION_KEYS = {
  3: 'multiple3',
  4: 'multiple4',
  5: 'multiple5',
} as const satisfies Record<3 | 4 | 5, GeneratorSectionKey>;
const NUMBER_GRID_COLUMN_COUNT = 7;
const NUMBER_GRID_MAXIMUM_SIZE = 48;

type ConditionSheetProps = {
  applyAccess: 'guest' | 'pro';
  canUseBalancedPreset: boolean;
  conditions: GeneratorConditions;
  conditionSelectionLimit: number | null;
  history: readonly LottoHistoryDraw[];
  onApply: (conditions: GeneratorConditions) => void;
  onClose: () => void;
  onOpenPro: () => void;
  onRecommendationPromptDismiss?: () => void;
  presentation?: 'modal' | 'screen';
  recommendationPromptVisible?: boolean;
  visible: boolean;
};

type Option<T extends string | number> = {
  accessibilityLabel?: string;
  label: string;
  value: T;
  visual?: React.ReactNode;
};

function toggleValue<T>(values: readonly T[], value: T) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function ConditionGroupHeader({ label }: { label: string }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View
      accessibilityLabel={label}
      accessibilityRole="header"
      accessible
      style={styles.conditionGroupHeader}>
      <Text style={styles.conditionGroupTitle}>{label}</Text>
      <View style={styles.conditionGroupDivider} />
    </View>
  );
}

function Section({
  activationLocked = false,
  children,
  enabled,
  headerAction,
  hint,
  onActivationLocked,
  onEnabledChange,
  onHelpPress,
  title,
}: {
  activationLocked?: boolean;
  children: React.ReactNode;
  enabled?: boolean;
  headerAction?: React.ReactNode;
  hint?: string;
  onActivationLocked?: () => void;
  onEnabledChange?: (enabled: boolean) => void;
  onHelpPress?: () => void;
  title: string;
}) {
  const styles = useThemedStyles(createStyles);
  const expanded = enabled !== false;
  return (
    <View style={[styles.section, enabled && styles.sectionEnabled]}>
      <View style={styles.sectionHeading}>
        <View style={styles.sectionHeadingCopy}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {onHelpPress ? <ConditionInfoButton onPress={onHelpPress} title={title} /> : null}
          </View>
          {expanded && hint ? <Text style={styles.sectionHint}>{hint}</Text> : null}
        </View>
        {headerAction || enabled !== undefined ? (
          <View style={styles.sectionHeaderActions}>
            {headerAction ? (
              <View style={[styles.sectionHeaderAction, enabled === false && styles.conditionDisabled]}>
                {headerAction}
              </View>
            ) : null}
            {enabled !== undefined && onEnabledChange ? (
              <ConditionToggle
                enabled={enabled}
                locked={activationLocked && !enabled}
                onChange={onEnabledChange}
                onLockedPress={onActivationLocked}
                title={title}
              />
            ) : null}
          </View>
        ) : null}
      </View>
      <CollapsibleConditionContent expanded={expanded} style={styles.sectionContent}>
        {children}
      </CollapsibleConditionContent>
    </View>
  );
}

function OptionSelector<T extends string | number>({
  accessibilityLabel,
  options,
  selected,
  onChange,
}: {
  accessibilityLabel: string;
  onChange: (values: T[]) => void;
  options: Option<T>[];
  selected: readonly T[];
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <View accessibilityLabel={accessibilityLabel} style={styles.optionGrid}>
      {options.map((option) => {
        const active = selected.includes(option.value);
        return (
          <Pressable
            accessibilityLabel={option.accessibilityLabel}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: active }}
            key={String(option.value)}
            onPress={() => onChange(toggleValue(selected, option.value))}
            style={[styles.option, Boolean(option.visual) && styles.optionVisual, active && styles.optionActive]}>
            <Text style={[styles.optionText, active && styles.optionTextActive]}>{option.label}</Text>
            {option.visual ? <View aria-hidden accessibilityElementsHidden style={styles.optionVisualContent}>{option.visual}</View> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export function patternGroups(pattern: SameEndingPattern | ConsecutivePattern) {
  const grouped = pattern === 'none' ? [] : pattern.split('+').map(Number);
  const singles = Math.max(0, 6 - grouped.reduce((total, size) => total + size, 0));
  return [...grouped, ...Array.from({ length: singles }, () => 1)];
}

function PatternDiagram({ kind, pattern }: { kind: 'consecutive' | 'sameEnding'; pattern: SameEndingPattern | ConsecutivePattern }) {
  const styles = useThemedStyles(createStyles);
  const groups = patternGroups(pattern);
  return (
    <View aria-hidden accessibilityElementsHidden style={styles.patternDiagram}>
      {groups.map((size, groupIndex) => {
        if (kind === 'sameEnding') {
          const ending = (groupIndex + 2) % 10;
          return (
            <View key={`${pattern}-${groupIndex}`} style={[styles.endingGroup, size > 1 && styles.endingGroupLinked]}>
              {Array.from({ length: size }, (_, index) => (
                <Text key={index} style={[styles.patternCell, size > 1 && styles.patternCellLinked]}>
                  {ending + (index * 10)}
                </Text>
              ))}
            </View>
          );
        }
        const start = 4 + groups
          .slice(0, groupIndex)
          .reduce((total, groupSize) => total + groupSize + 3, 0);
        return (
          <View key={`${pattern}-${groupIndex}`} style={[styles.consecutiveGroup, size > 1 && styles.consecutiveGroupLinked]}>
            {Array.from({ length: size }, (_, index) => (
              <Text key={index} style={[styles.patternCell, size > 1 && styles.patternCellLinked]}>
                {start + index}
              </Text>
            ))}
          </View>
        );
      })}
    </View>
  );
}

function PatternSelector<T extends SameEndingPattern | ConsecutivePattern>({
  accessibilityLabel,
  historicalValue,
  kind,
  onChange,
  options,
  selected,
}: {
  accessibilityLabel: string;
  historicalValue?: T;
  kind: 'consecutive' | 'sameEnding';
  onChange: (values: T[]) => void;
  options: Option<T>[];
  selected: readonly T[];
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <View accessibilityLabel={accessibilityLabel} style={styles.patternGrid}>
      {options.map((option) => {
        const active = selected.includes(option.value);
        return (
          <Pressable
            accessibilityLabel={`${option.label}${historicalValue === option.value ? ', 과거 최다' : ''}`}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: active }}
            key={option.value}
            onPress={() => onChange(toggleValue(selected, option.value))}
            style={[styles.patternOption, active && styles.patternOptionActive]}
            testID={`pattern-${kind}-${option.value}`}>
            <View style={styles.patternOptionHeader}>
              <Text style={[styles.patternOptionText, active && styles.optionTextActive]}>{option.label}</Text>
              {historicalValue === option.value ? <Text style={styles.patternTopBadge}>과거 최다</Text> : null}
            </View>
            <PatternDiagram kind={kind} pattern={option.value} />
          </Pressable>
        );
      })}
    </View>
  );
}

type RatioPalette = 'oddEven' | 'lowHigh';

function RatioDiagram({
  palette,
  primaryCount,
}: {
  palette: RatioPalette;
  primaryCount: number;
}) {
  const styles = useThemedStyles(createStyles);
  const primaryStyle = palette === 'oddEven' ? styles.ratioSegmentOdd : styles.ratioSegmentLow;
  const secondaryStyle = palette === 'oddEven' ? styles.ratioSegmentEven : styles.ratioSegmentHigh;
  return (
    <View aria-hidden accessibilityElementsHidden style={styles.ratioDiagram}>
      {GENERATOR_COUNT_VALUES.slice(0, 6).map((_, index) => (
        <View key={index} style={[styles.ratioSegment, index < primaryCount ? primaryStyle : secondaryStyle]} />
      ))}
    </View>
  );
}

function CountDiagram({ count }: { count: number }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View aria-hidden accessibilityElementsHidden style={styles.countDiagram}>
      {GENERATOR_COUNT_VALUES.slice(0, 6).map((_, index) => (
        <View key={index} style={[styles.countDot, index < count && styles.countDotActive]} />
      ))}
    </View>
  );
}

function NumberSetGuide({
  label,
  maxVisible = 14,
  numbers,
}: {
  label: string;
  maxVisible?: number;
  numbers: readonly number[];
}) {
  const styles = useThemedStyles(createStyles);
  const visibleNumbers = numbers.slice(0, maxVisible);
  const hiddenCount = numbers.length - visibleNumbers.length;
  return (
    <View accessibilityLabel={`${label}: ${numbers.join(', ')}`} style={styles.numberSetGuide}>
      <Text style={styles.numberSetLabel}>{label}</Text>
      <View aria-hidden accessibilityElementsHidden style={styles.numberSetValues}>
        {visibleNumbers.map((number) => (
          <View key={number} style={styles.numberSetChip}>
            <Text style={styles.numberSetChipText}>{number}</Text>
          </View>
        ))}
        {hiddenCount > 0 ? <Text style={styles.numberSetMore}>+{hiddenCount}</Text> : null}
      </View>
    </View>
  );
}

function RecentNumberGuide({
  includeBonus,
  kind,
  latest,
}: {
  includeBonus: boolean;
  kind: 'carry' | 'neighbor';
  latest?: LottoHistoryDraw;
}) {
  const styles = useThemedStyles(createStyles);
  if (!latest) return null;
  const sourceNumbers = [...latest.numbers, ...(includeBonus ? [latest.bonus] : [])]
    .sort((left, right) => left - right);
  const targetNumbers = kind === 'carry'
    ? sourceNumbers
    : [...new Set(sourceNumbers.flatMap((number) => [number - 1, number + 1]))]
      .filter((number) => number >= 1 && number <= 45)
      .sort((left, right) => left - right);
  return (
    <View style={styles.recentGuide}>
      <View style={styles.recentGuideHeading}>
        <Text style={styles.recentGuideTitle}>
          {kind === 'carry' ? '직전 번호와 같은 수' : '직전 번호의 앞·뒤 수'}
        </Text>
        <Text style={styles.recentGuideMeta}>{latest.round}회 기준</Text>
      </View>
      {kind === 'neighbor' ? (
        <NumberSetGuide label="기준 번호" maxVisible={7} numbers={sourceNumbers} />
      ) : null}
      <NumberSetGuide
        label={kind === 'carry' ? '선택 기준' : '선택 후보'}
        maxVisible={kind === 'carry' ? 7 : 14}
        numbers={targetNumbers}
      />
    </View>
  );
}

function BandGuide({ activeBand }: { activeBand: (typeof GENERATOR_BAND_KEYS)[number] }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View accessibilityLabel={`1에서 45 중 ${activeBand} 번호대`} style={styles.bandGuide}>
      {GENERATOR_BAND_KEYS.map((band, index) => (
        <View
          key={band}
          style={[styles.bandGuideSegment, { flex: index === 4 ? 6 : index === 0 ? 9 : 10 }, band === activeBand && styles.bandGuideSegmentActive]}>
          <Text style={[styles.bandGuideText, band === activeBand && styles.bandGuideTextActive]}>{band}</Text>
        </View>
      ))}
    </View>
  );
}

function CountSelector({
  label,
  ratioPalette,
  ratioLabels,
  selected,
  visual = false,
  onChange,
}: {
  label: string;
  onChange: (values: CountValue[]) => void;
  ratioPalette?: RatioPalette;
  ratioLabels?: { primary: string; primaryLong: string; secondary: string; secondaryLong: string };
  selected: readonly CountValue[];
  visual?: boolean;
}) {
  const styles = useThemedStyles(createStyles);
  const primaryLegendDotStyle = ratioPalette === 'lowHigh'
    ? styles.ratioLegendLowDot
    : styles.ratioLegendOddDot;
  const primaryLegendTextStyle = ratioPalette === 'lowHigh'
    ? styles.ratioLegendLowText
    : styles.ratioLegendOddText;
  const secondaryLegendDotStyle = ratioPalette === 'lowHigh'
    ? styles.ratioLegendHighDot
    : styles.ratioLegendEvenDot;
  const secondaryLegendTextStyle = ratioPalette === 'lowHigh'
    ? styles.ratioLegendHighText
    : styles.ratioLegendEvenText;
  const countValues = ratioLabels
    ? [...GENERATOR_COUNT_VALUES].reverse()
    : GENERATOR_COUNT_VALUES;
  return (
    <View style={styles.countSelector}>
      {ratioLabels ? (
        <View accessibilityLabel={`${ratioLabels.primaryLong} 대 ${ratioLabels.secondaryLong} 순서`} style={styles.ratioLegend}>
          <View style={styles.ratioLegendItem}>
            <View style={[styles.ratioLegendDot, primaryLegendDotStyle]} />
            <Text style={[styles.ratioLegendText, primaryLegendTextStyle]}>{ratioLabels.primaryLong}</Text>
          </View>
          <Text style={styles.ratioLegendOrder}>왼쪽 : 오른쪽</Text>
          <View style={styles.ratioLegendItem}>
            <View style={[styles.ratioLegendDot, secondaryLegendDotStyle]} />
            <Text style={[styles.ratioLegendText, secondaryLegendTextStyle]}>{ratioLabels.secondaryLong}</Text>
          </View>
        </View>
      ) : null}
      <OptionSelector
        accessibilityLabel={label}
        onChange={(values) => onChange(values as CountValue[])}
        options={countValues.map((value) => ({
          accessibilityLabel: ratioLabels
            ? `${ratioLabels.primaryLong} ${value}개, ${ratioLabels.secondaryLong} ${6 - value}개`
            : `${value}개`,
          value,
          label: ratioLabels
            ? `${ratioLabels.primary} ${value} : ${ratioLabels.secondary} ${6 - value}`
            : `${value}개`,
          visual: ratioLabels
            ? <RatioDiagram palette={ratioPalette ?? 'oddEven'} primaryCount={value} />
            : visual ? <CountDiagram count={value} /> : undefined,
        }))}
        selected={selected}
      />
    </View>
  );
}

function BonusToggle({
  included,
  onChange,
  testID,
}: {
  included: boolean;
  onChange: (value: boolean) => void;
  testID: string;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: included }}
      onPress={() => onChange(!included)}
      style={[styles.bonusToggle, included && styles.bonusToggleActive]}
      testID={testID}>
      <Text style={[styles.bonusText, included && styles.bonusTextActive]}>
        보너스 {included ? '포함' : '제외'}
      </Text>
    </Pressable>
  );
}

function PreviewNumber({
  conditionExcluded,
  excluded,
  fixed,
  marginRight = 0,
  number,
  onPress,
  size,
}: {
  conditionExcluded: boolean;
  excluded: boolean;
  fixed: boolean;
  marginRight?: number;
  number: number;
  onPress: () => void;
  size: number;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable
      accessibilityLabel={`${number}번${fixed ? ', 고정수' : excluded ? ', 제외수' : conditionExcluded ? ', 조건상 제외' : ''}`}
      accessibilityRole="button"
      hitSlop={Math.max(0, (44 - size) / 2)}
      onPress={onPress}
      style={[
        styles.numberChip,
        { height: size, marginRight, width: size },
        fixed && styles.numberChipFixed,
        excluded && styles.numberChipExcluded,
        conditionExcluded && styles.numberChipDerived,
      ]}>
      <Text style={[
        styles.numberChipText,
        fixed && styles.numberChipTextFixed,
        excluded && styles.numberChipTextExcluded,
        conditionExcluded && styles.numberChipTextDerived,
      ]}>{number}</Text>
    </Pressable>
  );
}

export function ConditionSheet({
  applyAccess,
  canUseBalancedPreset,
  conditionSelectionLimit,
  conditions,
  history,
  onApply,
  onClose,
  onOpenPro,
  onRecommendationPromptDismiss,
  presentation = 'modal',
  recommendationPromptVisible = false,
  visible,
}: ConditionSheetProps) {
  const styles = useThemedStyles(createStyles);
  const { width: windowWidth } = useWindowDimensions();
  const sheetWidth = Math.min(windowWidth, 500);
  const fallbackNumberGridWidth = Math.max(
    0,
    sheetWidth - (spacing.xl * 2) - (spacing.md * 2) - 2,
  );
  const [measuredNumberGridWidth, setMeasuredNumberGridWidth] = useState<number | null>(null);
  const gridAvailableWidth = measuredNumberGridWidth ?? fallbackNumberGridWidth;
  const expandedNumberSize = Math.min(
    NUMBER_GRID_MAXIMUM_SIZE,
    Math.max(
      0,
      (gridAvailableWidth - (spacing.sm * (NUMBER_GRID_COLUMN_COUNT - 1)))
        / NUMBER_GRID_COLUMN_COUNT,
    ),
  );
  const expandedGridWidth = Math.min(
    gridAvailableWidth,
    (expandedNumberSize * NUMBER_GRID_COLUMN_COUNT)
      + (spacing.sm * (NUMBER_GRID_COLUMN_COUNT - 1)),
  );
  const [draft, setDraft] = useState(() => cloneGeneratorConditions(conditions));
  const [numberMode, setNumberMode] = useState<'fixed' | 'excluded'>('fixed');
  const [activeHelp, setActiveHelp] = useState<ConditionHelpKey | null>(null);
  const [accessBannerVisible, setAccessBannerVisible] = useState(true);
  const [conditionLimitPromptVisible, setConditionLimitPromptVisible] = useState(false);
  const [page, setPage] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const contentScrollRef = useRef<ScrollView>(null);
  const pageRef = useRef(0);
  const pageTabsRef = useRef<ScrollView>(null);
  const pageTabLayoutsRef = useRef<({ width: number; x: number } | undefined)[]>([]);
  const pageTabsViewportWidthRef = useRef(0);
  const pageOffsetsRef = useRef<(number | undefined)[]>([]);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  const derived = useMemo(() => new Set(conditionDerivedExclusions(draft, history)), [draft, history]);
  const latest = useMemo(
    () => history.reduce((result, draw) => !result || draw.round > result.round ? draw : result, history[0]),
    [history],
  );
  const conditionHelp = useMemo(() => buildConditionHelp(history), [history]);
  const rangePresets = useMemo(() => buildGeneratorRangePresets(history), [history]);
  const recommendedPreset = useMemo(() => buildBalancedGeneratorPreset(history), [history]);
  const recommendedPresetActive = useMemo(
    () => JSON.stringify(draft) === JSON.stringify(recommendedPreset),
    [draft, recommendedPreset],
  );
  const historicalSameEnding = SAME_ENDING_OPTIONS.find(([, label]) => label === conditionHelp.sameEnding.historicalLabel)?.[0];
  const historicalConsecutive = CONSECUTIVE_OPTIONS.find(([, label]) => label === conditionHelp.consecutivePattern.historicalLabel)?.[0];
  const helpContent = activeHelp ? conditionHelp[activeHelp] : null;
  const enabledConditionCount = enabledGeneratorConditionCount(draft);
  const conditionLimitReached = conditionSelectionLimit !== null
    && enabledConditionCount >= conditionSelectionLimit;
  const commitDraft = (next: GeneratorConditions) => {
    const nextEnabledCount = enabledGeneratorConditionCount(next);
    if (
      conditionSelectionLimit !== null
      && nextEnabledCount > conditionSelectionLimit
      && nextEnabledCount > enabledConditionCount
    ) {
      setConditionLimitPromptVisible(true);
      return;
    }
    setDraft(next);
  };
  const update = (partial: Partial<GeneratorConditions>) => commitDraft({ ...draft, ...partial });
  const sectionEnabled = (key: GeneratorSectionKey) => generatorSectionEnabled(draft, key);
  const setSectionEnabled = (key: GeneratorSectionKey, enabled: boolean) => {
    commitDraft({
      ...draft,
      enabledSections: { ...draft.enabledSections, [key]: enabled },
    });
  };
  const sectionAccessProps = (key: GeneratorSectionKey) => ({
    activationLocked: conditionLimitReached && !sectionEnabled(key),
    onActivationLocked: () => setConditionLimitPromptVisible(true),
  });
  const revealPageTab = (nextPage: number) => {
    const layout = pageTabLayoutsRef.current[nextPage];
    const viewportWidth = pageTabsViewportWidthRef.current;
    if (!layout || viewportWidth <= 0) return;

    pageTabsRef.current?.scrollTo({
      animated: !reduceMotion,
      x: Math.max(0, layout.x + (layout.width / 2) - (viewportWidth / 2)),
    });
  };
  const setActivePage = (nextPage: number) => {
    const clampedPage = Math.max(0, Math.min(PAGE_LABELS.length - 1, nextPage));
    if (pageRef.current === clampedPage) return;
    pageRef.current = clampedPage;
    setPage(clampedPage);
    revealPageTab(clampedPage);
  };
  const syncPageWithScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const anchorY = event.nativeEvent.contentOffset.y + spacing.lg + 1;
    let nextPage = 0;
    pageOffsetsRef.current.forEach((offset, index) => {
      if (offset !== undefined && offset <= anchorY) nextPage = index;
    });
    setActivePage(nextPage);
  };
  const goToPage = (nextPage: number) => {
    const clampedPage = Math.max(0, Math.min(PAGE_LABELS.length - 1, nextPage));
    setActivePage(clampedPage);
    const offset = pageOffsetsRef.current[clampedPage];
    if (offset === undefined) return;
    contentScrollRef.current?.scrollTo({
      animated: !reduceMotion,
      y: Math.max(0, offset - spacing.lg),
    });
  };
  const applyRecommendedPreset = () => {
    setDraft(cloneGeneratorConditions(recommendedPreset));
  };
  const acceptRecommendedPreset = () => {
    applyRecommendedPreset();
    onRecommendationPromptDismiss?.();
  };
  const requestRecommendedPreset = () => {
    if (!canUseBalancedPreset) {
      onOpenPro();
      return;
    }
    applyRecommendedPreset();
  };
  const toggleNumber = (number: number) => {
    setDraft((current) => {
      if (numberMode === 'fixed') {
        const removing = current.fixedNumbers.includes(number);
        if (!removing && current.fixedNumbers.length >= 6) return current;
        return {
          ...current,
          excludedNumbers: current.excludedNumbers.filter((item) => item !== number),
          fixedNumbers: toggleValue(current.fixedNumbers, number).sort((left, right) => left - right),
        };
      }
      return {
        ...current,
        fixedNumbers: current.fixedNumbers.filter((item) => item !== number),
        excludedNumbers: toggleValue(current.excludedNumbers, number).sort((left, right) => left - right),
      };
    });
  };
  const renderNumber = (number: number, size: number, marginRight = 0) => (
    <PreviewNumber
      conditionExcluded={derived.has(number)}
      excluded={draft.excludedNumbers.includes(number)}
      fixed={draft.fixedNumbers.includes(number)}
      key={number}
      marginRight={marginRight}
      number={number}
      onPress={() => toggleNumber(number)}
      size={size}
    />
  );
  const applyAccessLabel = applyAccess === 'pro'
    ? '결과 바로 보기'
    : '광고 후 결과 보기';
  const handleApply = () => {
    if (
      conditionSelectionLimit !== null
      && enabledGeneratorConditionCount(draft) > conditionSelectionLimit
    ) {
      setConditionLimitPromptVisible(true);
      return;
    }
    onApply(cloneGeneratorConditions(draft));
  };
  const accessBanner = {
    action: 'Pro 보기',
    icon: 'sparkles-outline' as const,
    onPress: onOpenPro,
    title: '조건 무제한 · 추천 조건',
  };

  const editorContent = (
      <SafeAreaView edges={presentation === 'screen' ? [] : undefined} style={styles.editorSafeArea}>
        <View style={[styles.editor, { width: sheetWidth }]} testID="condition-editor">
          <SubScreenHeader
            backAccessibilityLabel="조건 선택 취소"
            onBack={onClose}
            right={(
              <Pressable
                accessibilityLabel="조건 초기화"
                accessibilityRole="button"
                onPress={() => setDraft(buildGeneratorConditionDefaults(history))}
                style={({ pressed }) => [styles.resetButton, pressed && styles.pressed]}>
                <Ionicons color={styles.resetIcon.color} name="refresh-outline" size={20} />
              </Pressable>
            )}
            title="조건 선택"
          />
          {applyAccess === 'guest' && accessBannerVisible ? (
            <View style={styles.accessBanner} testID="condition-access-banner">
              <View style={styles.accessBannerIcon}>
                <Ionicons color={styles.accessBannerIconColor.color} name={accessBanner.icon} size={18} />
              </View>
              <View style={styles.accessBannerCopy}>
                <Text style={styles.accessBannerTitle}>{accessBanner.title}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={accessBanner.onPress}
                style={({ pressed }) => [styles.accessBannerAction, pressed && styles.pressed]}>
                <Text style={styles.accessBannerActionText}>{accessBanner.action}</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="회원 혜택 안내 닫기"
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => setAccessBannerVisible(false)}
                style={({ pressed }) => [styles.accessBannerClose, pressed && styles.pressed]}>
                <Ionicons color={styles.accessBannerCloseColor.color} name="close" size={18} />
              </Pressable>
            </View>
          ) : null}
          <ScrollView
            contentContainerStyle={styles.pageTabsContent}
            horizontal
            onLayout={(event) => {
              pageTabsViewportWidthRef.current = event.nativeEvent.layout.width;
              revealPageTab(pageRef.current);
            }}
            ref={pageTabsRef}
            showsHorizontalScrollIndicator={false}
            style={styles.pageTabs}>
            {PAGE_LABELS.map((label, index) => (
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: page === index }}
                key={label}
                onLayout={(event) => {
                  pageTabLayoutsRef.current[index] = event.nativeEvent.layout;
                }}
                onPress={() => goToPage(index)}
                style={[styles.pageTab, page === index && styles.pageTabActive]}>
                <Text style={[styles.pageTabText, page === index && styles.pageTabTextActive]}>{label}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <ScrollView
            contentContainerStyle={styles.conditionContent}
            onScroll={syncPageWithScroll}
            ref={contentScrollRef}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            style={styles.conditionScroll}
            testID="condition-content">
            {canUseBalancedPreset ? (
              <View style={[
                styles.recommendedPreset,
                recommendedPresetActive && styles.recommendedPresetActive,
              ]}>
                <Text style={styles.recommendedPresetTitle}>추천 조건 적용</Text>
              <Pressable
                accessibilityLabel={recommendedPresetActive
                  ? '추천 조건 적용됨'
                  : '추천 조건 적용'}
                accessibilityRole="button"
                accessibilityState={{ selected: recommendedPresetActive }}
                onPress={requestRecommendedPreset}
                style={[
                  styles.recommendedPresetButton,
                  recommendedPresetActive && styles.recommendedPresetButtonActive,
                ]}>
                <Text style={[
                  styles.recommendedPresetButtonText,
                  recommendedPresetActive && styles.recommendedPresetButtonTextActive,
                ]}>
                  {recommendedPresetActive
                    ? '✓ 적용됨'
                    : '적용'}
                </Text>
              </Pressable>
              </View>
            ) : null}
            <View
              onLayout={(event) => { pageOffsetsRef.current[0] = event.nativeEvent.layout.y; }}
              style={styles.conditionGroup}
              testID="condition-group-0">
              <ConditionGroupHeader label={PAGE_LABELS[0]} />
              <Section
                {...sectionAccessProps('fixedExcluded')}
                enabled={sectionEnabled('fixedExcluded')}
                onEnabledChange={(enabled) => setSectionEnabled('fixedExcluded', enabled)}
                onHelpPress={() => setActiveHelp('fixedExcluded')}
                title="고정수 · 제외수">
                <View
                  onLayout={(event) => {
                    const nextWidth = event.nativeEvent.layout.width;
                    if (nextWidth > 0) {
                      setMeasuredNumberGridWidth((current) => current === nextWidth ? current : nextWidth);
                    }
                  }}
                  style={styles.fixedExcludedContent}
                  testID="fixed-excluded-content">
                  <View style={styles.modeRow}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: numberMode === 'fixed' }}
                      onPress={() => setNumberMode('fixed')}
                      style={[styles.modeButton, numberMode === 'fixed' && styles.modeButtonFixed]}>
                      <Text style={[styles.modeText, numberMode === 'fixed' && styles.modeTextActive]}>고정수</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: numberMode === 'excluded' }}
                      onPress={() => setNumberMode('excluded')}
                      style={[styles.modeButton, numberMode === 'excluded' && styles.modeButtonExcluded]}>
                      <Text style={[styles.modeText, numberMode === 'excluded' && styles.modeTextExcluded]}>제외수</Text>
                    </Pressable>
                  </View>
                  <View style={[styles.numberGrid, { width: expandedGridWidth }]} testID="number-status-grid">
                    {NUMBERS.map((number) => renderNumber(number, expandedNumberSize))}
                    {NUMBER_GRID_PLACEHOLDERS.map((placeholder) => (
                      <View
                        key={`placeholder-${placeholder}`}
                        style={{ height: expandedNumberSize, width: expandedNumberSize }}
                        testID={`number-grid-placeholder-${placeholder}`}
                      />
                    ))}
                  </View>
                  <View style={styles.numberLegend}>
                    <Text style={styles.numberLegendFixed}>● 고정수</Text>
                    <Text style={styles.numberLegendExcluded}>● 제외수</Text>
                    <Text style={styles.numberLegendDerived}>○ 조건상 제외</Text>
                  </View>
                </View>
              </Section>
            </View>

            <View
              onLayout={(event) => { pageOffsetsRef.current[1] = event.nativeEvent.layout.y; }}
              style={styles.conditionGroup}
              testID="condition-group-1">
              <ConditionGroupHeader label={PAGE_LABELS[1]} />
              <Section
                {...sectionAccessProps('sameEnding')}
                enabled={sectionEnabled('sameEnding')}
                onEnabledChange={(enabled) => setSectionEnabled('sameEnding', enabled)}
                onHelpPress={() => setActiveHelp('sameEnding')}
                title="동끝수 형태">
                <PatternSelector
                  accessibilityLabel="동끝수 형태"
                  historicalValue={historicalSameEnding}
                  kind="sameEnding"
                  onChange={(sameEndingPatterns) => update({ sameEndingPatterns })}
                  options={SAME_ENDING_OPTIONS.map(([value, label]) => ({ value, label }))}
                  selected={draft.sameEndingPatterns}
                />
              </Section>
              <RangeControl
                activationLocked={conditionLimitReached && !draft.standardDeviation.enabled}
                decimals={1}
                historicalPreset={rangePresets.standardDeviation}
                limits={{ min: 1.7, max: 21.1 }}
                onChange={(standardDeviation) => update({ standardDeviation })}
                onHelpPress={() => setActiveHelp('standardDeviation')}
                onLockedPress={() => setConditionLimitPromptVisible(true)}
                step={0.1}
                title="표준편차"
                value={draft.standardDeviation}
              />
              <RangeControl
                activationLocked={conditionLimitReached && !draft.sum.enabled}
                historicalPreset={rangePresets.sum}
                limits={{ min: 21, max: 255 }}
                onChange={(sum) => update({ sum })}
                onHelpPress={() => setActiveHelp('sum')}
                onLockedPress={() => setConditionLimitPromptVisible(true)}
                title="번호 총합"
                value={draft.sum}
              />
              <RangeControl
                activationLocked={conditionLimitReached && !draft.lastDigitSum.enabled}
                historicalPreset={rangePresets.lastDigitSum}
                limits={{ min: 2, max: 52 }}
                onChange={(lastDigitSum) => update({ lastDigitSum })}
                onHelpPress={() => setActiveHelp('lastDigitSum')}
                onLockedPress={() => setConditionLimitPromptVisible(true)}
                title="끝수 총합"
                value={draft.lastDigitSum}
              />
              <Section
                {...sectionAccessProps('oddEven')}
                enabled={sectionEnabled('oddEven')}
                onEnabledChange={(enabled) => setSectionEnabled('oddEven', enabled)}
                onHelpPress={() => setActiveHelp('oddEven')}
                title="홀짝 비율">
                <CountSelector
                  label="홀짝 비율"
                  onChange={(oddCounts) => update({ oddCounts })}
                  ratioPalette="oddEven"
                  ratioLabels={{ primary: '홀', primaryLong: '홀수', secondary: '짝', secondaryLong: '짝수' }}
                  selected={draft.oddCounts}
                />
              </Section>
              <Section
                {...sectionAccessProps('lowHigh')}
                enabled={sectionEnabled('lowHigh')}
                onEnabledChange={(enabled) => setSectionEnabled('lowHigh', enabled)}
                onHelpPress={() => setActiveHelp('lowHigh')}
                title="저고 비율">
                <CountSelector
                  label="저고 비율"
                  onChange={(highLowCounts) => update({ highLowCounts })}
                  ratioPalette="lowHigh"
                  ratioLabels={{ primary: '저', primaryLong: '저번호 1–22', secondary: '고', secondaryLong: '고번호 23–45' }}
                  selected={draft.highLowCounts}
                />
              </Section>
            </View>

            <View
              onLayout={(event) => { pageOffsetsRef.current[2] = event.nativeEvent.layout.y; }}
              style={styles.conditionGroup}
              testID="condition-group-2">
              <ConditionGroupHeader label={PAGE_LABELS[2]} />
              <Section
                {...sectionAccessProps('acValue')}
                enabled={sectionEnabled('acValue')}
                hint="과거 1,237회 본번호 기준 8~10: 70.7%"
                onEnabledChange={(enabled) => setSectionEnabled('acValue', enabled)}
                onHelpPress={() => setActiveHelp('acValue')}
                title="A/C 값">
                <OptionSelector
                  accessibilityLabel="A/C 값"
                  onChange={(acValues) => update({ acValues: acValues.sort((left, right) => left - right) })}
                  options={Array.from({ length: 10 }, (_, index) => ({ value: index + 1, label: String(index + 1) }))}
                  selected={draft.acValues}
                />
              </Section>
              <Section
                {...sectionAccessProps('primeCount')}
                enabled={sectionEnabled('primeCount')}
                onEnabledChange={(enabled) => setSectionEnabled('primeCount', enabled)}
                onHelpPress={() => setActiveHelp('primeCount')}
                title="소수 개수">
                <NumberSetGuide label="해당 번호" numbers={PRIME_NUMBERS} />
                <CountSelector label="소수 개수" onChange={(primeCounts) => update({ primeCounts })} selected={draft.primeCounts} visual />
              </Section>
              <Section
                {...sectionAccessProps('squareCount')}
                enabled={sectionEnabled('squareCount')}
                onEnabledChange={(enabled) => setSectionEnabled('squareCount', enabled)}
                onHelpPress={() => setActiveHelp('squareCount')}
                title="완전제곱수 개수">
                <NumberSetGuide label="해당 번호" numbers={SQUARE_NUMBERS} />
                <CountSelector label="완전제곱수 개수" onChange={(squareCounts) => update({ squareCounts })} selected={draft.squareCounts} visual />
              </Section>
              <Section
                {...sectionAccessProps('compositeCount')}
                enabled={sectionEnabled('compositeCount')}
                hint="1과 소수를 제외한 수"
                onEnabledChange={(enabled) => setSectionEnabled('compositeCount', enabled)}
                onHelpPress={() => setActiveHelp('compositeCount')}
                title="합성수 개수">
                <NumberSetGuide label="해당 번호" maxVisible={12} numbers={COMPOSITE_NUMBERS} />
                <CountSelector label="합성수 개수" onChange={(compositeCounts) => update({ compositeCounts })} selected={draft.compositeCounts} visual />
              </Section>
              {([3, 4, 5] as const).map((multiple) => (
                <Section
                  {...sectionAccessProps(MULTIPLE_SECTION_KEYS[multiple])}
                  enabled={sectionEnabled(MULTIPLE_SECTION_KEYS[multiple])}
                  key={multiple}
                  onEnabledChange={(enabled) => setSectionEnabled(MULTIPLE_SECTION_KEYS[multiple], enabled)}
                  onHelpPress={() => setActiveHelp(MULTIPLE_HELP_KEYS[multiple])}
                  title={`${multiple}의 배수`}>
                  <NumberSetGuide label="해당 번호" maxVisible={12} numbers={NUMBERS.filter((number) => number % multiple === 0)} />
                  <CountSelector
                    label={`${multiple}의 배수 개수`}
                    onChange={(values) => update({ multipleCounts: { ...draft.multipleCounts, [multiple]: values } })}
                    selected={draft.multipleCounts[multiple]}
                    visual
                  />
                </Section>
              ))}
            </View>

            <View
              onLayout={(event) => { pageOffsetsRef.current[3] = event.nativeEvent.layout.y; }}
              style={styles.conditionGroup}
              testID="condition-group-3">
              <ConditionGroupHeader label={PAGE_LABELS[3]} />
              <Section
                {...sectionAccessProps('carryCount')}
                enabled={sectionEnabled('carryCount')}
                headerAction={(
                  <BonusToggle
                    included={draft.carry.includeBonus}
                    onChange={(includeBonus) => update({ carry: { ...draft.carry, includeBonus } })}
                    testID="carry-bonus-toggle"
                  />
                )}
                onEnabledChange={(enabled) => setSectionEnabled('carryCount', enabled)}
                onHelpPress={() => setActiveHelp('carryCount')}
                title="이월수 개수">
                <RecentNumberGuide includeBonus={draft.carry.includeBonus} kind="carry" latest={latest} />
                <Text style={styles.selectorPrompt}>위 번호 중 조합에 다시 포함할 개수</Text>
                <CountSelector label="이월수 개수" onChange={(allowed) => update({ carry: { ...draft.carry, allowed } })} selected={draft.carry.allowed} visual />
              </Section>
              <Section
                {...sectionAccessProps('neighborCount')}
                enabled={sectionEnabled('neighborCount')}
                headerAction={(
                  <BonusToggle
                    included={draft.neighbor.includeBonus}
                    onChange={(includeBonus) => update({ neighbor: { ...draft.neighbor, includeBonus } })}
                    testID="neighbor-bonus-toggle"
                  />
                )}
                onEnabledChange={(enabled) => setSectionEnabled('neighborCount', enabled)}
                onHelpPress={() => setActiveHelp('neighborCount')}
                title="이웃수 개수">
                <RecentNumberGuide includeBonus={draft.neighbor.includeBonus} kind="neighbor" latest={latest} />
                <Text style={styles.selectorPrompt}>선택 후보 중 조합에 포함할 개수</Text>
                <CountSelector label="이웃수 개수" onChange={(allowed) => update({ neighbor: { ...draft.neighbor, allowed } })} selected={draft.neighbor.allowed} visual />
              </Section>
              <Section
                {...sectionAccessProps('consecutivePattern')}
                enabled={sectionEnabled('consecutivePattern')}
                hint="가장 긴 연속그룹 기준"
                onEnabledChange={(enabled) => setSectionEnabled('consecutivePattern', enabled)}
                onHelpPress={() => setActiveHelp('consecutivePattern')}
                title="연번 형태">
                <PatternSelector
                  accessibilityLabel="연번 형태"
                  historicalValue={historicalConsecutive}
                  kind="consecutive"
                  onChange={(consecutivePatterns) => update({ consecutivePatterns })}
                  options={CONSECUTIVE_OPTIONS.map(([value, label]) => ({ value, label }))}
                  selected={draft.consecutivePatterns}
                />
              </Section>
            </View>

            <View
              onLayout={(event) => { pageOffsetsRef.current[4] = event.nativeEvent.layout.y; }}
              style={[styles.conditionGroup, styles.conditionGroupLast]}
              testID="condition-group-4">
              <ConditionGroupHeader label={PAGE_LABELS[4]} />
              {GENERATOR_BAND_KEYS.map((band) => (
                <Section
                  {...sectionAccessProps(BAND_SECTION_KEYS[band])}
                  enabled={sectionEnabled(BAND_SECTION_KEYS[band])}
                  key={band}
                  onEnabledChange={(enabled) => setSectionEnabled(BAND_SECTION_KEYS[band], enabled)}
                  onHelpPress={() => setActiveHelp(BAND_HELP_KEYS[band])}
                  title={`${band} 번호대`}>
                  <BandGuide activeBand={band} />
                  <CountSelector
                    label={`${band} 번호대 개수`}
                    onChange={(values) => update({ bandCounts: { ...draft.bandCounts, [band]: values } })}
                    selected={draft.bandCounts[band]}
                  />
                </Section>
              ))}
              <Section
                {...sectionAccessProps('pastRanks')}
                enabled={sectionEnabled('pastRanks')}
                hint="전체 과거 회차와 비교"
                onEnabledChange={(enabled) => setSectionEnabled('pastRanks', enabled)}
                onHelpPress={() => setActiveHelp('pastRanks')}
                title="과거 등수 조합 제외">
                <OptionSelector
                  accessibilityLabel="과거 등수 제외"
                  onChange={(excludedPastRanks) => update({ excludedPastRanks: excludedPastRanks.sort() })}
                  options={[1, 2, 3].map((value) => ({ value: value as 1 | 2 | 3, label: `${value}등` }))}
                  selected={draft.excludedPastRanks}
                />
              </Section>
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.cancelButton}>
              <Text style={styles.cancelText}>취소</Text>
            </Pressable>
            <Pressable
              accessibilityLabel={`${activeConditionCount(draft)}개 조건 적용, ${applyAccessLabel}`}
              accessibilityRole="button"
              onPress={handleApply}
              style={styles.applyButton}>
              <Text style={styles.applyText}>{activeConditionCount(draft)}개 조건 적용</Text>
              <View style={styles.applyAccessBadge}>
                {applyAccess !== 'pro' ? (
                  <Ionicons color={styles.applyAccessText.color} name="play-circle-outline" size={14} />
                ) : null}
                <Text style={styles.applyAccessText}>{applyAccessLabel}</Text>
              </View>
            </Pressable>
          </View>

        {helpContent ? (
          <View accessibilityViewIsModal style={styles.helpOverlay}>
            <Pressable
              accessibilityLabel="조건 설명 닫기"
              onPress={() => setActiveHelp(null)}
              style={styles.helpBackdrop}
            />
            <View
              style={[styles.helpDialog, { width: Math.min(sheetWidth - (spacing.xl * 2), 440) }]}
              testID="condition-help-dialog">
              <View style={styles.helpHeader}>
                <View style={styles.helpHeadingCopy}>
                  <Text style={styles.helpEyebrow}>CONDITION GUIDE</Text>
                  <Text style={styles.helpTitle}>{helpContent.title}</Text>
                </View>
                <Pressable
                  accessibilityLabel="조건 설명 닫기"
                  accessibilityRole="button"
                  onPress={() => setActiveHelp(null)}
                  style={styles.helpCloseButton}>
                  <Text style={styles.helpCloseText}>×</Text>
                </Pressable>
              </View>
              <ScrollView contentContainerStyle={styles.helpBody} showsVerticalScrollIndicator={false}>
                <Text style={styles.helpDescription}>{helpContent.description}</Text>
                <View style={styles.helpExampleCard}>
                  <Text style={styles.helpLabel}>예시</Text>
                  <Text style={styles.helpExample}>{helpContent.example}</Text>
                </View>
                <View style={styles.helpHistoryCard}>
                  <Text style={styles.helpHistoryEyebrow}>{helpContent.historicalHeading}</Text>
                  <Text style={styles.helpHistoryValue} testID="condition-help-historical-value">
                    {helpContent.historicalLabel}
                  </Text>
                  <Text style={styles.helpHistoryCount}>{helpContent.historicalDetail}</Text>
                  <Text style={styles.helpSource}>{helpContent.sourceLabel}</Text>
                </View>
                <Text style={styles.helpDisclaimer}>
                  과거 출현 비율을 설명하는 참고 정보이며, 다음 회차의 당첨 가능성이나 추천을 의미하지 않습니다.
                </Text>
              </ScrollView>
              <Pressable accessibilityRole="button" onPress={() => setActiveHelp(null)} style={styles.helpConfirmButton}>
                <Text style={styles.helpConfirmText}>확인</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
        {conditionLimitPromptVisible ? (
          <View accessibilityViewIsModal style={styles.recommendationOverlay}>
            <Pressable
              accessibilityLabel="조건 선택 제한 안내 닫기"
              onPress={() => setConditionLimitPromptVisible(false)}
              style={styles.helpBackdrop}
            />
            <View
              style={[styles.recommendationDialog, { width: Math.min(sheetWidth - (spacing.xl * 2), 400) }]}
              testID="condition-limit-prompt">
              <Text style={styles.recommendationTitle}>조건은 2개까지 선택할 수 있어요</Text>
              <Text style={styles.recommendationDescription}>
                Pro에서는 제한 없이 선택하고 추천 조건도 사용할 수 있어요.
              </Text>
              <View style={styles.recommendationActions}>
                <Pressable
                  accessibilityLabel="현재 회원 조건으로 계속 설정"
                  accessibilityRole="button"
                  onPress={() => setConditionLimitPromptVisible(false)}
                  style={styles.recommendationCancelButton}>
                  <Text style={styles.recommendationCancelText}>계속 설정</Text>
                </Pressable>
                <Pressable
                  accessibilityLabel="Pro 살펴보기"
                  accessibilityRole="button"
                  onPress={() => {
                    setConditionLimitPromptVisible(false);
                    onOpenPro();
                  }}
                  style={styles.recommendationApplyButton}>
                  <Text style={styles.recommendationApplyText}>
                    Pro 살펴보기
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}
        {recommendationPromptVisible && canUseBalancedPreset ? (
          <View accessibilityViewIsModal style={styles.recommendationOverlay}>
            <View style={styles.helpBackdrop} />
            <View
              style={[styles.recommendationDialog, { width: Math.min(sheetWidth - (spacing.xl * 2), 400) }]}
              testID="recommendation-prompt">
              <Text style={styles.recommendationEyebrow}>RECOMMENDED SETTINGS</Text>
              <Text style={styles.recommendationTitle}>추천 조건을 적용할까요?</Text>
              <Text style={styles.recommendationDescription}>
                표준편차·합계·홀짝·저고·A/C·연번을 한 번에 설정해요.
              </Text>
              <Text style={styles.recommendationDisclaimer}>
                과거 통계를 참고한 탐색용 조건이며 당첨을 예측하지 않습니다.
              </Text>
              <View style={styles.recommendationActions}>
                <Pressable
                  accessibilityLabel="추천 조건 적용 없이 직접 설정"
                  accessibilityRole="button"
                  onPress={onRecommendationPromptDismiss}
                  style={styles.recommendationCancelButton}>
                  <Text style={styles.recommendationCancelText}>직접 설정</Text>
                </Pressable>
                <Pressable
                  accessibilityLabel="추천 조건 적용"
                  accessibilityRole="button"
                  onPress={acceptRecommendedPreset}
                  style={styles.recommendationApplyButton}>
                  <Text style={styles.recommendationApplyText}>적용</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}
        </View>
      </SafeAreaView>
  );

  if (presentation === 'screen') return editorContent;

  return (
    <Modal
      animationType={reduceMotion ? 'none' : 'slide'}
      onRequestClose={() => activeHelp ? setActiveHelp(null) : onClose()}
      presentationStyle="fullScreen"
      testID="condition-sheet-modal"
      visible={visible}>
      {editorContent}
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  editorSafeArea: { flex: 1, alignItems: 'center', backgroundColor: colors.background },
  editor: { flex: 1, maxWidth: 500, backgroundColor: colors.surface, overflow: 'hidden' },
  resetButton: { width: 52, height: 44, alignItems: 'center', justifyContent: 'center' },
  resetIcon: { color: colors.textSecondary },
  accessBanner: {
    minHeight: 58, flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingLeft: spacing.xl, paddingRight: spacing.sm, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.accentBorder,
    backgroundColor: colors.surfaceAccent,
  },
  accessBannerIcon: {
    width: 34, height: 34, flexShrink: 0, borderRadius: radius.round,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface,
  },
  accessBannerIconColor: { color: colors.accentPrimary },
  accessBannerCopy: { flex: 1, minWidth: 0 },
  accessBannerTitle: {
    color: colors.textPrimary, fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold, lineHeight: 18,
  },
  accessBannerAction: {
    minHeight: 34, flexShrink: 0, paddingHorizontal: spacing.md, borderRadius: radius.round,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentPrimary,
  },
  accessBannerActionText: { color: '#FFFFFF', fontSize: 10, fontWeight: typography.weights.bold },
  accessBannerClose: { width: 34, height: 40, flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  accessBannerCloseColor: { color: colors.textSecondary },
  recommendedPreset: {
    minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    marginHorizontal: spacing.xl, marginTop: spacing.lg, marginBottom: spacing.xl,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.divider, borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  recommendedPresetActive: { borderColor: colors.accentPrimary, backgroundColor: colors.surfaceAccent },
  recommendedPresetTitle: {
    flex: 1, color: colors.textPrimary,
    fontSize: typography.sizes.small, fontWeight: typography.weights.semibold,
  },
  recommendedPresetButton: {
    minHeight: 38, flexShrink: 0, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 5, paddingHorizontal: spacing.md,
    borderRadius: radius.round, borderWidth: 1, borderColor: colors.accentPrimary,
    backgroundColor: colors.background,
  },
  recommendedPresetButtonActive: { backgroundColor: colors.accentPrimary },
  recommendedPresetButtonText: { color: colors.accentPrimary, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold },
  recommendedPresetButtonTextActive: { color: colors.background },
  numberGrid: {
    flexDirection: 'row', flexWrap: 'wrap', alignSelf: 'center',
    columnGap: spacing.sm, rowGap: spacing.xs,
  },
  numberChip: {
    borderRadius: radius.round, borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  numberChipFixed: { borderColor: colors.accentPrimary, backgroundColor: colors.accentPrimary },
  numberChipExcluded: { borderColor: colors.hot, backgroundColor: colors.surfaceDanger },
  numberChipDerived: { borderStyle: 'dashed', borderColor: colors.neutral, opacity: 0.52 },
  numberChipText: { color: colors.textPrimary, fontSize: typography.sizes.small, fontWeight: typography.weights.medium },
  numberChipTextFixed: { color: colors.background, fontWeight: typography.weights.bold },
  numberChipTextExcluded: { color: colors.hot, textDecorationLine: 'line-through' },
  numberChipTextDerived: { color: colors.neutral },
  pageTabs: {
    flexGrow: 0, flexShrink: 0, height: 58,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider,
    backgroundColor: colors.surface,
  },
  pageTabsContent: { alignItems: 'stretch', paddingHorizontal: spacing.xl },
  pageTab: {
    height: 58, justifyContent: 'center', paddingHorizontal: spacing.sm, marginRight: spacing.lg,
    borderBottomWidth: 3, borderBottomColor: 'transparent',
  },
  pageTabActive: { borderBottomColor: colors.accentPrimary },
  pageTabText: { color: colors.textSecondary, fontSize: typography.sizes.small, fontWeight: typography.weights.medium },
  pageTabTextActive: { color: colors.textPrimary, fontWeight: typography.weights.bold },
  conditionScroll: { flex: 1, minHeight: 0 },
  conditionContent: { paddingBottom: spacing.huge },
  conditionGroup: { gap: spacing.md, paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl },
  conditionGroupLast: { paddingBottom: 0 },
  conditionGroupHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  conditionGroupTitle: { color: colors.textSecondary, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold },
  conditionGroupDivider: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.divider },
  section: { overflow: 'hidden', borderRadius: radius.md, borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.background, padding: spacing.md },
  sectionEnabled: { borderColor: colors.accentBorder },
  sectionContent: { paddingTop: spacing.md },
  sectionHeading: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  sectionHeadingCopy: { flex: 1, gap: spacing.xs, minWidth: 0 },
  sectionHeaderAction: { flexShrink: 0, alignItems: 'flex-end' },
  sectionHeaderActions: { flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  sectionTitle: { color: colors.textPrimary, fontSize: typography.sizes.small, fontWeight: typography.weights.semibold },
  sectionHint: { color: colors.textSecondary, fontSize: typography.sizes.caption, lineHeight: 16 },
  conditionDisabled: { opacity: 0.38, pointerEvents: 'none' },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  option: { minHeight: 40, minWidth: 46, paddingHorizontal: spacing.md, borderRadius: radius.round, borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  optionVisual: { minWidth: 76, minHeight: 58, borderRadius: radius.md, paddingVertical: spacing.sm },
  optionVisualContent: { marginTop: spacing.xs },
  optionActive: { borderColor: colors.accentPrimary, backgroundColor: colors.surfaceAccent },
  optionText: { color: colors.textSecondary, fontSize: typography.sizes.caption },
  optionTextActive: { color: colors.highlight, fontWeight: typography.weights.semibold },
  patternGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.sm },
  patternOption: {
    width: '48.7%', minHeight: 104, padding: spacing.sm,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.divider,
    backgroundColor: colors.surface,
  },
  patternOptionActive: { borderColor: colors.accentPrimary, backgroundColor: colors.surfaceAccent },
  patternOptionHeader: { minHeight: 30, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.xs },
  patternOptionText: { flex: 1, color: colors.textSecondary, fontSize: 11, lineHeight: 15 },
  patternTopBadge: {
    flexShrink: 0, color: colors.accentSecondary, fontSize: 8, fontWeight: typography.weights.semibold,
    borderRadius: radius.round, backgroundColor: colors.surfaceSuccess,
    paddingHorizontal: 5, paddingVertical: 2,
  },
  patternDiagram: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 },
  endingGroup: { alignItems: 'center', gap: 2, borderRadius: radius.sm, padding: 2 },
  endingGroupLinked: { backgroundColor: colors.surfaceAccent },
  consecutiveGroup: { flexDirection: 'row', alignItems: 'center', gap: 1, borderRadius: radius.sm, padding: 2 },
  consecutiveGroupLinked: { backgroundColor: colors.surfaceAccent },
  patternCell: {
    width: 17, height: 17, borderRadius: 5, borderWidth: 1, borderColor: colors.divider,
    backgroundColor: colors.background, color: colors.textSecondary,
    fontSize: 8, lineHeight: 15, textAlign: 'center', fontVariant: ['tabular-nums'],
  },
  patternCellLinked: { borderColor: colors.accentBorder, color: colors.highlight },
  ratioDiagram: { width: 54, height: 5, flexDirection: 'row', gap: 2 },
  ratioSegment: { flex: 1, borderRadius: 2 },
  ratioSegmentOdd: { backgroundColor: colors.accentPrimary },
  ratioSegmentEven: { backgroundColor: colors.neutral },
  ratioSegmentLow: { backgroundColor: colors.accentPrimary },
  ratioSegmentHigh: { backgroundColor: colors.neutral },
  countSelector: { gap: spacing.sm },
  countDiagram: { width: 54, height: 8, flexDirection: 'row', justifyContent: 'center', gap: 3 },
  countDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.divider },
  countDotActive: { backgroundColor: colors.accentPrimary },
  ratioLegend: {
    minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: radius.sm, backgroundColor: colors.surface, paddingHorizontal: spacing.md,
  },
  ratioLegendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  ratioLegendDot: { width: 7, height: 7, borderRadius: 4 },
  ratioLegendText: { fontSize: 10, fontWeight: typography.weights.semibold },
  ratioLegendOddDot: { backgroundColor: colors.accentPrimary },
  ratioLegendEvenDot: { backgroundColor: colors.neutral },
  ratioLegendLowDot: { backgroundColor: colors.accentPrimary },
  ratioLegendHighDot: { backgroundColor: colors.neutral },
  ratioLegendOddText: { color: colors.accentPrimary },
  ratioLegendEvenText: { color: colors.neutral },
  ratioLegendLowText: { color: colors.accentPrimary },
  ratioLegendHighText: { color: colors.neutral },
  ratioLegendOrder: { color: colors.textSecondary, fontSize: 9 },
  numberSetGuide: { gap: spacing.xs, marginBottom: spacing.sm },
  numberSetLabel: { color: colors.textSecondary, fontSize: 10, fontWeight: typography.weights.semibold },
  numberSetValues: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4 },
  numberSetChip: {
    minWidth: 25, height: 25, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center',
    borderRadius: radius.round, borderWidth: 1, borderColor: colors.accentBorder, backgroundColor: colors.surfaceAccent,
  },
  numberSetChipText: { color: colors.highlight, fontSize: 9, fontWeight: typography.weights.semibold, fontVariant: ['tabular-nums'] },
  numberSetMore: { color: colors.textSecondary, fontSize: 10, marginLeft: 2 },
  recentGuide: { gap: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surface, padding: spacing.md },
  recentGuideHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  recentGuideTitle: { color: colors.textPrimary, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold },
  recentGuideMeta: { color: colors.textSecondary, fontSize: 9 },
  selectorPrompt: { color: colors.textSecondary, fontSize: typography.sizes.caption, lineHeight: 16 },
  bandGuide: { height: 32, flexDirection: 'row', gap: 2 },
  bandGuideSegment: {
    alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.surface,
  },
  bandGuideSegmentActive: { borderColor: colors.accentPrimary, backgroundColor: colors.surfaceAccent },
  bandGuideText: { color: colors.textSecondary, fontSize: 8 },
  bandGuideTextActive: { color: colors.highlight, fontWeight: typography.weights.semibold },
  fixedExcludedContent: { gap: spacing.lg },
  modeRow: { flexDirection: 'row', gap: spacing.sm },
  modeButton: { flex: 1, minHeight: 44, borderRadius: radius.md, borderWidth: 1, borderColor: colors.divider, alignItems: 'center', justifyContent: 'center' },
  modeButtonFixed: { borderColor: colors.accentPrimary, backgroundColor: colors.surfaceAccent },
  modeButtonExcluded: { borderColor: colors.hot, backgroundColor: colors.surfaceDanger },
  modeText: { color: colors.textSecondary, fontSize: typography.sizes.small, fontWeight: typography.weights.semibold },
  modeTextActive: { color: colors.highlight },
  modeTextExcluded: { color: colors.hot },
  bonusToggle: { minHeight: 36, paddingHorizontal: spacing.md, borderRadius: radius.round, borderWidth: 1, borderColor: colors.divider, alignItems: 'center', justifyContent: 'center' },
  bonusToggleActive: { borderColor: colors.accentSecondary, backgroundColor: colors.surfaceSuccess },
  bonusText: { color: colors.textSecondary, fontSize: typography.sizes.caption },
  bonusTextActive: { color: colors.accentSecondary, fontWeight: typography.weights.semibold },
  actions: { flexDirection: 'row', flexShrink: 0, gap: spacing.sm, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider, backgroundColor: colors.surface },
  cancelButton: { width: 82, minHeight: 48, borderRadius: radius.md, borderWidth: 1, borderColor: colors.divider, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: colors.textSecondary, fontSize: typography.sizes.small, fontWeight: typography.weights.semibold },
  applyButton: {
    flex: 1, minHeight: 48, paddingHorizontal: spacing.md, flexDirection: 'row',
    borderRadius: radius.md, backgroundColor: colors.accentPrimary,
    alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
  },
  applyText: { color: colors.background, fontSize: typography.sizes.body, fontWeight: typography.weights.bold },
  applyAccessBadge: {
    minHeight: 28, flexShrink: 0, paddingHorizontal: spacing.sm, flexDirection: 'row',
    alignItems: 'center', gap: spacing.xs, borderRadius: radius.round,
    backgroundColor: '#FFFFFF26',
  },
  applyAccessText: { color: colors.background, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold },
  numberLegend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.md },
  numberLegendFixed: { color: colors.accentPrimary, fontSize: 10 },
  numberLegendExcluded: { color: colors.hot, fontSize: 10 },
  numberLegendDerived: { color: colors.neutral, fontSize: 10 },
  helpOverlay: {
    position: 'absolute', inset: 0, zIndex: 30,
    alignItems: 'center', justifyContent: 'center', padding: spacing.xl,
  },
  helpBackdrop: { position: 'absolute', inset: 0, backgroundColor: colors.backdropStrong },
  helpDialog: {
    maxHeight: '82%', borderRadius: radius.xl, borderWidth: 1, borderColor: colors.divider,
    backgroundColor: colors.surfaceElevated, overflow: 'hidden',
  },
  helpHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingTop: spacing.xl,
  },
  helpHeadingCopy: { flex: 1, paddingRight: spacing.md },
  helpEyebrow: { color: colors.accentPrimary, fontSize: 9, letterSpacing: 1.4, marginBottom: spacing.xs },
  helpTitle: { color: colors.textPrimary, fontSize: typography.sizes.section, fontWeight: typography.weights.bold },
  helpCloseButton: {
    width: 40, height: 40, borderRadius: radius.round, backgroundColor: colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  helpCloseText: { color: colors.textSecondary, fontSize: 26, lineHeight: 28 },
  helpBody: { gap: spacing.md, paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.lg },
  helpDescription: { color: colors.textPrimary, fontSize: typography.sizes.small, lineHeight: 22 },
  helpExampleCard: { gap: spacing.sm, borderRadius: radius.md, backgroundColor: colors.background, padding: spacing.md },
  helpLabel: { color: colors.textSecondary, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold },
  helpExample: { color: colors.textPrimary, fontSize: typography.sizes.caption, lineHeight: 19 },
  helpHistoryCard: {
    gap: spacing.xs, borderRadius: radius.md, borderWidth: 1, borderColor: colors.accentBorder,
    backgroundColor: colors.surfaceAccent, padding: spacing.md,
  },
  helpHistoryEyebrow: { color: colors.highlight, fontSize: typography.sizes.caption },
  helpHistoryValue: { color: colors.textPrimary, fontSize: 22, fontWeight: typography.weights.bold, marginTop: spacing.xs },
  helpHistoryCount: { color: colors.accentSecondary, fontSize: typography.sizes.small, fontWeight: typography.weights.semibold },
  helpSource: { color: colors.textSecondary, fontSize: 10, marginTop: spacing.xs },
  helpDisclaimer: { color: colors.textSecondary, fontSize: typography.sizes.caption, lineHeight: 18 },
  helpConfirmButton: {
    minHeight: 48, marginHorizontal: spacing.xl, marginBottom: spacing.xl,
    borderRadius: radius.md, backgroundColor: colors.accentPrimary,
    alignItems: 'center', justifyContent: 'center',
  },
  helpConfirmText: { color: colors.background, fontSize: typography.sizes.small, fontWeight: typography.weights.bold },
  recommendationOverlay: {
    position: 'absolute', inset: 0, zIndex: 40,
    alignItems: 'center', justifyContent: 'center', padding: spacing.xl,
  },
  recommendationDialog: {
    borderRadius: radius.xl, borderWidth: 1, borderColor: colors.divider,
    backgroundColor: colors.surfaceElevated, padding: spacing.xl,
  },
  recommendationEyebrow: {
    color: colors.accentPrimary, fontSize: 9, letterSpacing: 1.4,
    fontWeight: typography.weights.semibold, marginBottom: spacing.sm,
  },
  recommendationTitle: {
    color: colors.textPrimary, fontSize: typography.sizes.section,
    fontWeight: typography.weights.bold, lineHeight: 26,
  },
  recommendationDescription: {
    color: colors.textPrimary, fontSize: typography.sizes.small,
    lineHeight: 21, marginTop: spacing.md,
  },
  recommendationDisclaimer: {
    color: colors.textSecondary, fontSize: typography.sizes.caption,
    lineHeight: 18, marginTop: spacing.sm,
  },
  recommendationActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl },
  recommendationCancelButton: {
    flex: 1, minHeight: 48, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.divider, alignItems: 'center', justifyContent: 'center',
  },
  recommendationCancelText: {
    color: colors.textSecondary, fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
  },
  recommendationApplyButton: {
    flex: 1, minHeight: 48, borderRadius: radius.md,
    backgroundColor: colors.accentPrimary, alignItems: 'center', justifyContent: 'center',
  },
  recommendationApplyText: {
    color: colors.background, fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
  },
  pressed: { opacity: 0.66 },
});
