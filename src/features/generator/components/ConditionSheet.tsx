import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  Modal,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import type { LottoHistoryDraw } from '@/domain/analytics/types';
import {
  activeConditionCount,
  cloneGeneratorConditions,
  conditionDerivedExclusions,
  CONSECUTIVE_LABELS,
  DEFAULT_GENERATOR_CONDITIONS,
  GENERATOR_BAND_KEYS,
  GENERATOR_COUNT_VALUES,
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
  SameEndingPattern,
} from '@/domain/generator/types';
import { type ThemeColors, radius, spacing, typography, useThemedStyles } from '@/theme';

import { ConditionInfoButton } from './ConditionInfoButton';
import { RangeControl } from './RangeControl';

const NUMBERS = Array.from({ length: 45 }, (_, index) => index + 1);
const NUMBER_GRID_PLACEHOLDERS = Array.from({ length: 4 }, (_, index) => index);
const PREVIEW_SHEET_GAP = spacing.sm;
const PREVIEW_TRANSITION_DURATION = 200;
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

type ConditionSheetProps = {
  conditions: GeneratorConditions;
  history: readonly LottoHistoryDraw[];
  onApply: (conditions: GeneratorConditions) => void;
  onClose: () => void;
  visible: boolean;
};

type Option<T extends string | number> = { label: string; value: T };
type PagerTouchStart = {
  interactive: boolean;
  page: number;
  x: number;
  y: number;
};

export function pageIndexFromHorizontalSwipe({
  deltaX,
  deltaY,
  page,
}: {
  deltaX: number;
  deltaY: number;
  page: number;
}) {
  const horizontalDistance = Math.abs(deltaX);
  const isHorizontalSwipe = horizontalDistance >= 44 && horizontalDistance > Math.abs(deltaY) * 1.15;
  if (!isHorizontalSwipe) return page;
  return Math.max(0, Math.min(PAGE_LABELS.length - 1, page + (deltaX < 0 ? 1 : -1)));
}

function isInteractiveWebTarget(target: unknown) {
  if (Platform.OS !== 'web' || typeof Element === 'undefined' || !(target instanceof Element)) return false;
  return Boolean(target.closest('input, textarea, [role="adjustable"], [role="slider"]'));
}

function toggleValue<T>(values: readonly T[], value: T) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function Section({
  children,
  headerAction,
  hint,
  onHelpPress,
  title,
}: {
  children: React.ReactNode;
  headerAction?: React.ReactNode;
  hint?: string;
  onHelpPress?: () => void;
  title: string;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeading}>
        <View style={styles.sectionHeadingCopy}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {onHelpPress ? <ConditionInfoButton onPress={onHelpPress} title={title} /> : null}
          </View>
          {hint ? <Text style={styles.sectionHint}>{hint}</Text> : null}
        </View>
        {headerAction ? <View style={styles.sectionHeaderAction}>{headerAction}</View> : null}
      </View>
      {children}
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
            accessibilityRole="checkbox"
            accessibilityState={{ checked: active }}
            key={String(option.value)}
            onPress={() => onChange(toggleValue(selected, option.value))}
            style={[styles.option, active && styles.optionActive]}>
            <Text style={[styles.optionText, active && styles.optionTextActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function CountSelector({
  label,
  ratio,
  selected,
  onChange,
}: {
  label: string;
  onChange: (values: CountValue[]) => void;
  ratio?: boolean;
  selected: readonly CountValue[];
}) {
  return (
    <OptionSelector
      accessibilityLabel={label}
      onChange={(values) => onChange(values as CountValue[])}
      options={GENERATOR_COUNT_VALUES.map((value) => ({
        value,
        label: ratio ? `${value}:${6 - value}` : `${value}개`,
      }))}
      selected={selected}
    />
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

export function ConditionSheet({ conditions, history, onApply, onClose, visible }: ConditionSheetProps) {
  const styles = useThemedStyles(createStyles);
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const sheetWidth = Math.min(windowWidth, 500);
  const previewTop = Platform.OS === 'web' ? 16 : 44;
  const collapsedSheetHeight = Math.min(windowHeight * 0.72, 720);
  const gridMaximumSize = sheetWidth >= 460 ? 52 : 47;
  const gridAvailableWidth = sheetWidth - (spacing.md * 2);
  const expandedNumberSize = Math.min(gridMaximumSize, (gridAvailableWidth - (spacing.xs * 6)) / 7);
  const expandedGridWidth = Math.min(
    gridAvailableWidth - 2,
    (expandedNumberSize * 7) + (spacing.sm * 6),
  );
  const [draft, setDraft] = useState(() => cloneGeneratorConditions(conditions));
  const [numberMode, setNumberMode] = useState<'fixed' | 'excluded'>('fixed');
  const [numbersExpanded, setNumbersExpanded] = useState(false);
  const [activeHelp, setActiveHelp] = useState<ConditionHelpKey | null>(null);
  const [page, setPage] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [translateY] = useState(() => new Animated.Value(680));
  const [previewHeight] = useState(() => new Animated.Value(180));
  const [sheetHeight] = useState(() => new Animated.Value(collapsedSheetHeight));
  const activePreviewHeightRef = useRef<number | null>(null);
  const numbersExpandedRef = useRef(false);
  const previewMeasuredRef = useRef(false);
  const pagerRef = useRef<ScrollView>(null);
  const pageRef = useRef(0);
  const pageTabsRef = useRef<ScrollView>(null);
  const pageTabLayoutsRef = useRef<Array<{ width: number; x: number } | undefined>>([]);
  const pageTabsViewportWidthRef = useRef(0);
  const pagerTouchStartRef = useRef<PagerTouchStart | null>(null);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);
  useEffect(() => {
    translateY.setValue(reduceMotion ? 0 : 680);
    Animated.timing(translateY, {
      duration: reduceMotion ? 0 : 210,
      toValue: 0,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [reduceMotion, translateY]);
  useEffect(() => {
    const previewContentHeight = activePreviewHeightRef.current;
    const nextHeight = numbersExpandedRef.current && previewContentHeight
      ? Math.min(collapsedSheetHeight, Math.max(0, windowHeight - previewTop - previewContentHeight - PREVIEW_SHEET_GAP))
      : collapsedSheetHeight;
    sheetHeight.setValue(nextHeight);
  }, [collapsedSheetHeight, previewTop, sheetHeight, windowHeight]);

  const derived = useMemo(() => new Set(conditionDerivedExclusions(draft, history)), [draft, history]);
  const latest = useMemo(
    () => history.reduce((result, draw) => !result || draw.round > result.round ? draw : result, history[0]),
    [history],
  );
  const conditionHelp = useMemo(() => buildConditionHelp(history), [history]);
  const helpContent = activeHelp ? conditionHelp[activeHelp] : null;
  const update = (partial: Partial<GeneratorConditions>) => setDraft((current) => ({ ...current, ...partial }));
  const closeAnimated = (complete: () => void) => {
    Animated.timing(translateY, {
      duration: reduceMotion ? 0 : 170,
      toValue: 680,
      useNativeDriver: Platform.OS !== 'web',
    }).start(complete);
  };
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
  const syncPageWithPager = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const viewportWidth = event.nativeEvent.layoutMeasurement.width || sheetWidth;
    if (viewportWidth <= 0) return;
    setActivePage(Math.round(event.nativeEvent.contentOffset.x / viewportWidth));
  };
  const goToPage = (nextPage: number) => {
    setActivePage(nextPage);
    pagerRef.current?.scrollTo({ animated: !reduceMotion, x: nextPage * sheetWidth });
  };
  const handlePagerTouchStart = (event: GestureResponderEvent) => {
    if (Platform.OS !== 'web') return;
    const touch = event.nativeEvent.touches[0] ?? event.nativeEvent.changedTouches[0];
    if (!touch) return;
    pagerTouchStartRef.current = {
      interactive: isInteractiveWebTarget(event.target),
      page: pageRef.current,
      x: touch.pageX,
      y: touch.pageY,
    };
  };
  const handlePagerTouchEnd = (event: GestureResponderEvent) => {
    if (Platform.OS !== 'web') return;
    const start = pagerTouchStartRef.current;
    pagerTouchStartRef.current = null;
    if (!start || start.interactive) return;

    const touch = event.nativeEvent.changedTouches[0] ?? event.nativeEvent.touches[0];
    if (!touch) return;
    goToPage(pageIndexFromHorizontalSwipe({
      deltaX: touch.pageX - start.x,
      deltaY: touch.pageY - start.y,
      page: start.page,
    }));
  };
  const webPagerTouchProps = Platform.OS === 'web' ? ({
    onTouchCancel: () => { pagerTouchStartRef.current = null; },
    onTouchEndCapture: handlePagerTouchEnd,
    onTouchStartCapture: handlePagerTouchStart,
  } as unknown as React.ComponentProps<typeof View>) : {};
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
  const handlePreviewLayout = (event: LayoutChangeEvent) => {
    const nextPreviewHeight = Math.ceil(event.nativeEvent.layout.height);
    if (nextPreviewHeight <= 0) return;

    activePreviewHeightRef.current = nextPreviewHeight;
    const nextSheetHeight = numbersExpanded
      ? Math.min(collapsedSheetHeight, Math.max(0, windowHeight - previewTop - nextPreviewHeight - PREVIEW_SHEET_GAP))
      : collapsedSheetHeight;

    if (!previewMeasuredRef.current || reduceMotion) {
      previewMeasuredRef.current = true;
      previewHeight.setValue(nextPreviewHeight);
      sheetHeight.setValue(nextSheetHeight);
      return;
    }

    Animated.parallel([
      Animated.timing(previewHeight, {
        duration: PREVIEW_TRANSITION_DURATION,
        toValue: nextPreviewHeight,
        useNativeDriver: false,
      }),
      Animated.timing(sheetHeight, {
        duration: PREVIEW_TRANSITION_DURATION,
        toValue: nextSheetHeight,
        useNativeDriver: false,
      }),
    ]).start();
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

  return (
    <Modal
      animationType="fade"
      onRequestClose={() => activeHelp ? setActiveHelp(null) : closeAnimated(onClose)}
      transparent
      visible={visible}>
      <View style={styles.modalRoot}>
        <Pressable accessibilityLabel="조건 패널 닫기" onPress={() => closeAnimated(onClose)} style={styles.backdrop} />
        <Animated.View style={[styles.numberPreview, { height: previewHeight, top: previewTop, width: sheetWidth }]}>
          <View onLayout={handlePreviewLayout} style={styles.previewContent} testID="number-preview-content">
            <View style={styles.previewHeader}>
              <View>
                <Text style={styles.previewEyebrow}>CONDITION PREVIEW</Text>
                <Text style={styles.previewTitle}>번호 상태</Text>
              </View>
              <Text style={styles.previewCount}>{activeConditionCount(draft)}개 조건</Text>
            </View>
            <Text numberOfLines={2} style={styles.numberSummary}>
              고정 {draft.fixedNumbers.length ? draft.fixedNumbers.join(', ') : '없음'}  ·  제외 {draft.excludedNumbers.length ? draft.excludedNumbers.join(', ') : '없음'}
            </Text>
            {numbersExpanded ? (
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
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.numberRail}
                testID="number-status-rail">
                {NUMBERS.map((number) => renderNumber(number, 44, spacing.sm))}
              </ScrollView>
            )}
            <Pressable
              accessibilityLabel={numbersExpanded ? '번호 접기' : '번호 전체 펼치기'}
              accessibilityRole="button"
              accessibilityState={{ expanded: numbersExpanded }}
              onPress={() => setNumbersExpanded((current) => {
                numbersExpandedRef.current = !current;
                return !current;
              })}
              style={styles.expandToggle}
              testID="number-status-toggle">
              <View style={numbersExpanded ? styles.triangleUp : styles.triangleDown} />
            </Pressable>
          </View>
        </Animated.View>

        <Animated.View style={{ width: sheetWidth, transform: [{ translateY }] }}>
          <Animated.View style={[styles.sheet, { height: sheetHeight }]} testID="condition-sheet">
          <View style={styles.handle} />
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>조건 선택하기</Text>
              <Text style={styles.sheetSubtitle}>선택 안 함은 제한 없음으로 적용돼요.</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => setDraft(cloneGeneratorConditions(DEFAULT_GENERATOR_CONDITIONS))}
              style={styles.resetButton}>
              <Text style={styles.resetText}>초기화</Text>
            </Pressable>
          </View>
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

          <View
            {...webPagerTouchProps}
            style={[styles.pagerContainer, styles.pagerWebTouch]}
            testID="condition-pages-touch-area">
            <ScrollView
              horizontal
              onMomentumScrollEnd={syncPageWithPager}
              onScroll={syncPageWithPager}
              onScrollEndDrag={syncPageWithPager}
              pagingEnabled
              ref={pagerRef}
              scrollEventThrottle={16}
              showsHorizontalScrollIndicator={false}
              style={styles.pager}
              testID="condition-pages">
            <ScrollView contentContainerStyle={styles.pageContent} style={{ width: sheetWidth }}>
              <Section
                hint="번호 레일을 눌러 설정"
                onHelpPress={() => setActiveHelp('fixedExcluded')}
                title="고정수 · 제외수">
                <View style={styles.modeRow}>
                  <Pressable onPress={() => setNumberMode('fixed')} style={[styles.modeButton, numberMode === 'fixed' && styles.modeButtonFixed]}>
                    <Text style={[styles.modeText, numberMode === 'fixed' && styles.modeTextActive]}>고정수</Text>
                  </Pressable>
                  <Pressable onPress={() => setNumberMode('excluded')} style={[styles.modeButton, numberMode === 'excluded' && styles.modeButtonExcluded]}>
                    <Text style={[styles.modeText, numberMode === 'excluded' && styles.modeTextExcluded]}>제외수</Text>
                  </Pressable>
                </View>
                <Text style={styles.helper}>고정수는 최대 6개이며 고정수와 제외수는 자동으로 겹치지 않게 처리됩니다.</Text>
              </Section>
            </ScrollView>

            <ScrollView contentContainerStyle={styles.pageContent} style={{ width: sheetWidth }}>
              <Section onHelpPress={() => setActiveHelp('sameEnding')} title="동끝수 형태">
                <OptionSelector
                  accessibilityLabel="동끝수 형태"
                  onChange={(sameEndingPatterns) => update({ sameEndingPatterns })}
                  options={SAME_ENDING_OPTIONS.map(([value, label]) => ({ value, label }))}
                  selected={draft.sameEndingPatterns}
                />
              </Section>
              <RangeControl
                decimals={1}
                limits={{ min: 1.7, max: 21.1 }}
                onChange={(standardDeviation) => update({ standardDeviation })}
                onHelpPress={() => setActiveHelp('standardDeviation')}
                step={0.1}
                title="표준편차"
                value={draft.standardDeviation}
              />
              <RangeControl
                limits={{ min: 21, max: 255 }}
                onChange={(sum) => update({ sum })}
                onHelpPress={() => setActiveHelp('sum')}
                title="번호 총합"
                value={draft.sum}
              />
              <RangeControl
                limits={{ min: 2, max: 52 }}
                onChange={(lastDigitSum) => update({ lastDigitSum })}
                onHelpPress={() => setActiveHelp('lastDigitSum')}
                title="끝수 총합"
                value={draft.lastDigitSum}
              />
              <Section onHelpPress={() => setActiveHelp('oddEven')} title="홀짝 비율">
                <CountSelector label="홀짝 비율" onChange={(oddCounts) => update({ oddCounts })} ratio selected={draft.oddCounts} />
              </Section>
              <Section onHelpPress={() => setActiveHelp('lowHigh')} title="저고 비율">
                <CountSelector label="저고 비율" onChange={(highLowCounts) => update({ highLowCounts })} ratio selected={draft.highLowCounts} />
              </Section>
            </ScrollView>

            <ScrollView contentContainerStyle={styles.pageContent} style={{ width: sheetWidth }}>
              <Section
                hint="과거 1,237회 본번호 기준 8~10: 70.7%"
                onHelpPress={() => setActiveHelp('acValue')}
                title="A/C 값">
                <OptionSelector
                  accessibilityLabel="A/C 값"
                  onChange={(acValues) => update({ acValues: acValues.sort((left, right) => left - right) })}
                  options={Array.from({ length: 10 }, (_, index) => ({ value: index + 1, label: String(index + 1) }))}
                  selected={draft.acValues}
                />
              </Section>
              <Section onHelpPress={() => setActiveHelp('primeCount')} title="소수 개수">
                <CountSelector label="소수 개수" onChange={(primeCounts) => update({ primeCounts })} selected={draft.primeCounts} />
              </Section>
              <Section hint="4 · 9 · 16 · 25 · 36" onHelpPress={() => setActiveHelp('squareCount')} title="완전제곱수 개수">
                <CountSelector label="완전제곱수 개수" onChange={(squareCounts) => update({ squareCounts })} selected={draft.squareCounts} />
              </Section>
              <Section hint="1과 소수를 제외한 수" onHelpPress={() => setActiveHelp('compositeCount')} title="합성수 개수">
                <CountSelector label="합성수 개수" onChange={(compositeCounts) => update({ compositeCounts })} selected={draft.compositeCounts} />
              </Section>
              {([3, 4, 5] as const).map((multiple) => (
                <Section
                  key={multiple}
                  onHelpPress={() => setActiveHelp(MULTIPLE_HELP_KEYS[multiple])}
                  title={`${multiple}의 배수`}>
                  <CountSelector
                    label={`${multiple}의 배수 개수`}
                    onChange={(values) => update({ multipleCounts: { ...draft.multipleCounts, [multiple]: values } })}
                    selected={draft.multipleCounts[multiple]}
                  />
                </Section>
              ))}
            </ScrollView>

            <ScrollView contentContainerStyle={styles.pageContent} style={{ width: sheetWidth }}>
              <Section
                headerAction={(
                  <BonusToggle
                    included={draft.carry.includeBonus}
                    onChange={(includeBonus) => update({ carry: { ...draft.carry, includeBonus } })}
                    testID="carry-bonus-toggle"
                  />
                )}
                hint={`${latest?.round ?? '-'}회 기준`}
                onHelpPress={() => setActiveHelp('carryCount')}
                title="이월수 개수">
                <CountSelector label="이월수 개수" onChange={(allowed) => update({ carry: { ...draft.carry, allowed } })} selected={draft.carry.allowed} />
              </Section>
              <Section
                headerAction={(
                  <BonusToggle
                    included={draft.neighbor.includeBonus}
                    onChange={(includeBonus) => update({ neighbor: { ...draft.neighbor, includeBonus } })}
                    testID="neighbor-bonus-toggle"
                  />
                )}
                hint="직전 번호의 ±1 · 중복 제외"
                onHelpPress={() => setActiveHelp('neighborCount')}
                title="이웃수 개수">
                <CountSelector label="이웃수 개수" onChange={(allowed) => update({ neighbor: { ...draft.neighbor, allowed } })} selected={draft.neighbor.allowed} />
              </Section>
              <Section
                hint="가장 긴 연속그룹 기준"
                onHelpPress={() => setActiveHelp('consecutivePattern')}
                title="연번 형태">
                <OptionSelector
                  accessibilityLabel="연번 형태"
                  onChange={(consecutivePatterns) => update({ consecutivePatterns })}
                  options={CONSECUTIVE_OPTIONS.map(([value, label]) => ({ value, label }))}
                  selected={draft.consecutivePatterns}
                />
              </Section>
            </ScrollView>

            <ScrollView contentContainerStyle={styles.pageContent} style={{ width: sheetWidth }}>
              {GENERATOR_BAND_KEYS.map((band) => (
                <Section
                  key={band}
                  onHelpPress={() => setActiveHelp(BAND_HELP_KEYS[band])}
                  title={`${band} 번호대`}>
                  <CountSelector
                    label={`${band} 번호대 개수`}
                    onChange={(values) => update({ bandCounts: { ...draft.bandCounts, [band]: values } })}
                    selected={draft.bandCounts[band]}
                  />
                </Section>
              ))}
              <Section
                hint="전체 과거 회차와 비교"
                onHelpPress={() => setActiveHelp('pastRanks')}
                title="과거 등수 조합 제외">
                <OptionSelector
                  accessibilityLabel="과거 등수 제외"
                  onChange={(excludedPastRanks) => update({ excludedPastRanks: excludedPastRanks.sort() })}
                  options={[1, 2, 3].map((value) => ({ value: value as 1 | 2 | 3, label: `${value}등` }))}
                  selected={draft.excludedPastRanks}
                />
              </Section>
            </ScrollView>
            </ScrollView>
          </View>

          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={() => closeAnimated(onClose)} style={styles.cancelButton}>
              <Text style={styles.cancelText}>취소</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => closeAnimated(() => onApply(cloneGeneratorConditions(draft)))}
              style={styles.applyButton}>
              <Text style={styles.applyText}>{activeConditionCount(draft)}개 조건 적용</Text>
            </Pressable>
          </View>
          </Animated.View>
        </Animated.View>

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
      </View>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  modalRoot: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', inset: 0, backgroundColor: colors.backdropStrong },
  numberPreview: {
    position: 'absolute', overflow: 'hidden',
    borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg,
    borderWidth: 1, borderTopWidth: 0, borderColor: colors.divider,
    backgroundColor: colors.background,
  },
  previewContent: {
    paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.lg,
  },
  previewHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  previewEyebrow: { color: colors.textSecondary, fontSize: 9, letterSpacing: 1.5, marginBottom: spacing.xs },
  previewTitle: { color: colors.textPrimary, fontSize: typography.sizes.section, fontWeight: typography.weights.semibold },
  previewCount: { color: colors.accentPrimary, fontSize: typography.sizes.small, fontWeight: typography.weights.semibold },
  numberSummary: { color: colors.textSecondary, fontSize: typography.sizes.caption, marginTop: spacing.sm, lineHeight: 16 },
  numberRail: { marginTop: spacing.md, flexGrow: 0 },
  numberGrid: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between',
    alignSelf: 'center', rowGap: spacing.sm, marginTop: spacing.md,
  },
  expandToggle: {
    width: 44, height: 44, alignItems: 'center', justifyContent: 'center', alignSelf: 'center',
  },
  triangleDown: {
    width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 7,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: colors.textSecondary,
  },
  triangleUp: {
    width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderBottomWidth: 7,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: colors.textSecondary,
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
  sheet: {
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    borderWidth: 1, borderBottomWidth: 0, borderColor: colors.divider,
    backgroundColor: colors.surface, overflow: 'hidden',
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.divider, alignSelf: 'center', marginTop: spacing.sm },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingTop: spacing.md },
  sheetTitle: { color: colors.textPrimary, fontSize: typography.sizes.section, fontWeight: typography.weights.semibold },
  sheetSubtitle: { color: colors.textSecondary, fontSize: typography.sizes.caption, marginTop: spacing.xs },
  resetButton: { minHeight: 40, justifyContent: 'center', paddingHorizontal: spacing.sm },
  resetText: { color: colors.hot, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold },
  pageTabs: { flexGrow: 0, flexShrink: 0, height: 48, marginTop: spacing.sm },
  pageTabsContent: { alignItems: 'center', paddingHorizontal: spacing.xl },
  pageTab: { height: 38, justifyContent: 'center', paddingHorizontal: spacing.md, marginRight: spacing.sm, borderRadius: radius.round, backgroundColor: colors.background },
  pageTabActive: { backgroundColor: colors.surfaceAccent, borderWidth: 1, borderColor: colors.accentPrimary },
  pageTabText: { color: colors.textSecondary, fontSize: typography.sizes.caption, fontWeight: typography.weights.medium },
  pageTabTextActive: { color: colors.highlight },
  pagerContainer: { flex: 1, minHeight: 0 },
  pager: { flex: 1, minHeight: 0 },
  pagerWebTouch: Platform.select({ web: { touchAction: 'pan-y' } }) as never,
  pageContent: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.md },
  section: { gap: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.background, padding: spacing.md },
  sectionHeading: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  sectionHeadingCopy: { flex: 1, gap: spacing.xs, minWidth: 0 },
  sectionHeaderAction: { flexShrink: 0, alignItems: 'flex-end' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  sectionTitle: { color: colors.textPrimary, fontSize: typography.sizes.small, fontWeight: typography.weights.semibold },
  sectionHint: { color: colors.textSecondary, fontSize: typography.sizes.caption, lineHeight: 16 },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  option: { minHeight: 40, minWidth: 46, paddingHorizontal: spacing.md, borderRadius: radius.round, borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  optionActive: { borderColor: colors.accentPrimary, backgroundColor: colors.surfaceAccent },
  optionText: { color: colors.textSecondary, fontSize: typography.sizes.caption },
  optionTextActive: { color: colors.highlight, fontWeight: typography.weights.semibold },
  modeRow: { flexDirection: 'row', gap: spacing.sm },
  modeButton: { flex: 1, minHeight: 44, borderRadius: radius.md, borderWidth: 1, borderColor: colors.divider, alignItems: 'center', justifyContent: 'center' },
  modeButtonFixed: { borderColor: colors.accentPrimary, backgroundColor: colors.surfaceAccent },
  modeButtonExcluded: { borderColor: colors.hot, backgroundColor: colors.surfaceDanger },
  modeText: { color: colors.textSecondary, fontSize: typography.sizes.small, fontWeight: typography.weights.semibold },
  modeTextActive: { color: colors.highlight },
  modeTextExcluded: { color: colors.hot },
  helper: { color: colors.textSecondary, fontSize: typography.sizes.caption, lineHeight: 17 },
  bonusToggle: { minHeight: 36, paddingHorizontal: spacing.md, borderRadius: radius.round, borderWidth: 1, borderColor: colors.divider, alignItems: 'center', justifyContent: 'center' },
  bonusToggleActive: { borderColor: colors.accentSecondary, backgroundColor: colors.surfaceSuccess },
  bonusText: { color: colors.textSecondary, fontSize: typography.sizes.caption },
  bonusTextActive: { color: colors.accentSecondary, fontWeight: typography.weights.semibold },
  actions: { flexDirection: 'row', flexShrink: 0, gap: spacing.sm, paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.xl, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider, backgroundColor: colors.surface },
  cancelButton: { width: 82, minHeight: 48, borderRadius: radius.md, borderWidth: 1, borderColor: colors.divider, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: colors.textSecondary, fontSize: typography.sizes.small, fontWeight: typography.weights.semibold },
  applyButton: { flex: 1, minHeight: 48, borderRadius: radius.md, backgroundColor: colors.accentPrimary, alignItems: 'center', justifyContent: 'center' },
  applyText: { color: colors.background, fontSize: typography.sizes.body, fontWeight: typography.weights.bold },
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
});
