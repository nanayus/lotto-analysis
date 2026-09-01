import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent, type ViewStyle } from 'react-native';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import { SafeAreaView } from 'react-native-safe-area-context';

import lottoHistoryJson from '@/data/generated/lotto_history.json';
import { SubScreenHeader } from '@/components/ui/AppTopBar';
import {
  buildOverallStatistics,
  type OverallDistributionItem,
  type OverallStatistics,
} from '@/domain/analytics/buildOverallStatistics';
import type { LottoHistoryDraw } from '@/domain/analytics/types';
import type { NumberBandKey } from '@/domain/generator/types';
import { type ThemeColors, radius, spacing, typography, useThemedStyles } from '@/theme';

const lottoHistory = lottoHistoryJson as LottoHistoryDraw[];
const STAT_TABS = ['번호', '분포', '수 성격', '직전·연번', '번호대·과거'] as const;
type StatisticsTab = (typeof STAT_TABS)[number];

function topItem(items: readonly OverallDistributionItem[]) {
  return [...items].sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, 'ko', { numeric: true }))[0];
}

function ChoiceRow<T extends string>({
  accessibilityLabel,
  onChange,
  options,
  value,
}: {
  accessibilityLabel: string;
  onChange: (value: T) => void;
  options: readonly { label: string; value: T }[];
  value: T;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <ScrollView
      accessibilityLabel={accessibilityLabel}
      contentContainerStyle={styles.choiceContent}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.choiceScroll}>
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.choice, selected && styles.choiceSelected]}>
            <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function ChartHeading({ description, items, title }: {
  description: string;
  items: readonly OverallDistributionItem[];
  title: string;
}) {
  const styles = useThemedStyles(createStyles);
  const top = topItem(items);
  return (
    <View style={styles.chartHeading}>
      <View style={styles.chartHeadingCopy}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionDescription}>{description}</Text>
      </View>
      {top ? (
        <View style={styles.topValue}>
          <Text style={styles.topValueLabel}>최다 {top.label}</Text>
          <Text style={styles.topValueDetail}>{top.count.toLocaleString()}회 · {top.percentage.toFixed(1)}%</Text>
        </View>
      ) : null}
    </View>
  );
}

function compactAxisLabel(label: string) {
  return label.includes('–') ? label.split('–')[0] : label;
}

function SelectedDetail({ item }: { item: OverallDistributionItem | undefined }) {
  const styles = useThemedStyles(createStyles);
  if (!item) return null;
  return (
    <View accessibilityLiveRegion="polite" style={styles.selectedDetail}>
      <Text style={styles.selectedDetailLabel}>{item.label}</Text>
      <Text style={styles.selectedDetailValue}>{item.count.toLocaleString()}회 · {item.percentage.toFixed(1)}%</Text>
    </View>
  );
}

type ChartDatum = {
  key: string;
  label: string;
  percentage: number;
  rawCount: number;
  tooltipLabel: string;
  value: number;
};

const CHART_TOOLTIP_WIDTH = 104;

function tooltipShift(index: number, itemCount: number, width: number) {
  if (!width || !itemCount) return 0;
  const slotWidth = width / itemCount;
  const centeredLeft = ((index + 0.5) * slotWidth) - (CHART_TOOLTIP_WIDTH / 2);
  const clampedLeft = Math.max(4, Math.min(centeredLeft, width - CHART_TOOLTIP_WIDTH - 4));
  return centeredLeft - clampedLeft;
}

function ChartAxisLabel({ label, selected, slotWidth }: { label: string; selected: boolean; slotWidth: number }) {
  const styles = useThemedStyles(createStyles);
  if (!label) return null;
  return (
    <View style={[styles.giftedAxisLabelSlot, { transform: [{ translateX: -((40 - slotWidth) / 2) }] }]}>
      <Text style={[styles.giftedAxisLabel, selected && styles.giftedAxisLabelSelected]}>{label}</Text>
    </View>
  );
}

function ChartTooltip({ item }: { item: ChartDatum }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View pointerEvents="none" style={styles.chartTooltip}>
      <Text numberOfLines={1} style={styles.chartTooltipLabel}>{item.tooltipLabel}</Text>
      <Text numberOfLines={1} style={styles.chartTooltipValue}>
        {item.rawCount.toLocaleString()}회 · {item.percentage.toFixed(1)}%
      </Text>
    </View>
  );
}

function useChartWidth() {
  const [width, setWidth] = useState(0);
  const onLayout = (event: LayoutChangeEvent) => {
    const nextWidth = Math.floor(event.nativeEvent.layout.width);
    if (nextWidth > 0 && nextWidth !== width) setWidth(nextWidth);
  };
  return { onLayout, width };
}

function VerticalChart({ items }: { items: readonly OverallDistributionItem[] }) {
  const styles = useThemedStyles(createStyles);
  const maxCount = Math.max(1, ...items.map((item) => item.count));
  const top = topItem(items);
  const [selectedKey, setSelectedKey] = useState<string | undefined>(top?.key);
  const selected = items.find((item) => item.key === selectedKey) ?? top;
  const selectedIndex = Math.max(0, items.findIndex((item) => item.key === selected?.key));
  const labelEvery = items.length > 14 ? Math.ceil(items.length / 6) : 1;
  const { onLayout, width } = useChartWidth();
  const data = items.map(
    (item, index): ChartDatum & {
      frontColor: string;
      labelComponent: () => React.ReactNode;
      leftShiftForTooltip: number;
      onPress: () => void;
    } => {
      const highlighted = item.key === selected?.key;
      const axisLabel = labelEvery === 1 || index % labelEvery === 0 || index === items.length - 1 || item.key === top?.key
        ? compactAxisLabel(item.label)
        : '';
      return {
        key: item.key,
        label: '',
        labelComponent: () => <ChartAxisLabel label={axisLabel} selected={highlighted} slotWidth={width / items.length} />,
        leftShiftForTooltip: tooltipShift(index, items.length, width),
        percentage: item.percentage,
        rawCount: item.count,
        tooltipLabel: item.label,
        value: item.count,
        frontColor: highlighted ? styles.chartAccent.color : styles.chartBar.color,
        onPress: () => setSelectedKey(item.key),
      };
    },
  );
  return (
    <>
      <View
        accessibilityLabel={`${selected?.label ?? ''}, ${selected?.count ?? 0}회 선택됨. 막대를 누르면 상세 수치가 표시됩니다.`}
        onLayout={onLayout}
        style={styles.giftedChartFrame}>
        {width > 0 ? (
          <BarChart
            adjustToWidth
            animationDuration={420}
            autoCenterTooltip
            backgroundColor="transparent"
            barBorderTopLeftRadius={4}
            barBorderTopRightRadius={4}
            data={data}
            disableScroll
            endSpacing={0}
            focusBarOnPress
            focusedBarConfig={{ color: styles.chartAccent.color }}
            focusedBarIndex={selectedIndex}
            frontColor={styles.chartBar.color}
            height={150}
            hideRules
            hideYAxisText
            initialSpacing={0}
            isAnimated
            labelsDistanceFromXaxis={6}
            labelsExtraHeight={24}
            lowlightOpacity={0.76}
            maxValue={maxCount * 1.08}
            noOfSections={4}
            overflowTop={56}
            parentWidth={width}
            renderTooltip={(item: ChartDatum) => <ChartTooltip item={item} />}
            width={width}
            xAxisColor={styles.chartAxis.color}
            xAxisLabelTextStyle={styles.giftedAxisLabel}
            xAxisTextNumberOfLines={1}
            xAxisThickness={StyleSheet.hairlineWidth}
            yAxisLabelWidth={0}
            yAxisThickness={0}
          />
        ) : null}
      </View>
      <SelectedDetail item={selected} />
    </>
  );
}

type RatioKind = 'oddEven' | 'lowHigh';

function ratioLabel(label: string, kind: RatioKind) {
  const [left, right] = label.split(':');
  return kind === 'oddEven' ? `홀${left} : 짝${right}` : `저${left} : 고${right}`;
}

function RatioDonutChart({ items, kind }: { items: readonly OverallDistributionItem[]; kind: RatioKind }) {
  const styles = useThemedStyles(createStyles);
  const top = topItem(items);
  const [selectedKey, setSelectedKey] = useState<string | undefined>(top?.key);
  const [tooltipKey, setTooltipKey] = useState<string>();
  const selected = items.find((item) => item.key === selectedKey) ?? top;
  const tooltipItem = items.find((item) => item.key === tooltipKey);
  const selectedIndex = Math.max(0, items.findIndex((item) => item.key === selected?.key));
  const totalCount = items.reduce((total, item) => total + item.count, 0);
  const selectItem = (item: OverallDistributionItem) => {
    setSelectedKey(item.key);
    setTooltipKey(item.key);
  };
  const data = items.map((item) => ({
    value: item.count,
    color: item.key === selected?.key ? styles.chartAccent.color : styles.chartBar.color,
  }));

  return (
    <View style={styles.ratioChart}>
      <View
        accessibilityLabel={`${selected ? ratioLabel(selected.label, kind) : ''}, ${selected?.count ?? 0}회, ${selected?.percentage.toFixed(1) ?? '0.0'}% 선택됨. 도넛 조각을 누르면 상세 수치가 표시됩니다.`}
        style={styles.ratioDonutFrame}>
        <PieChart
          animationDuration={420}
          centerLabelComponent={() => selected ? (
            <View accessibilityLiveRegion="polite" style={styles.ratioDonutCenter}>
              <Text numberOfLines={1} style={styles.ratioDonutCenterLabel}>{ratioLabel(selected.label, kind)}</Text>
              <Text style={styles.ratioDonutCenterCount}>{selected.count.toLocaleString()}회</Text>
              <Text style={styles.ratioDonutCenterPercentage}>{selected.percentage.toFixed(1)}%</Text>
            </View>
          ) : null}
          data={data}
          donut
          extraRadius={4}
          focusOnPress
          focusedPieIndex={selectedIndex}
          innerCircleColor={styles.ratioInnerCircle.backgroundColor}
          innerRadius={52}
          isAnimated
          paddingHorizontal={62}
          paddingVertical={34}
          radius={82}
          strokeColor={styles.ratioSliceGap.color}
          strokeWidth={2}
          toggleFocusOnPress={false}
        />
        <Pressable
          accessibilityElementsHidden
          focusable={false}
          importantForAccessibility="no-hide-descendants"
          onPress={(event) => {
            const nativeEvent = event.nativeEvent as typeof event.nativeEvent & { offsetX?: number; offsetY?: number };
            const locationX = nativeEvent.locationX ?? nativeEvent.offsetX;
            const locationY = nativeEvent.locationY ?? nativeEvent.offsetY;
            if (locationX === undefined || locationY === undefined) return;
            const center = 106;
            const dx = locationX - center;
            const dy = locationY - center;
            const distance = Math.sqrt((dx * dx) + (dy * dy));
            if (distance < 52 || distance > 88 || totalCount <= 0) return;
            const angle = (Math.atan2(dy, dx) + (Math.PI / 2) + (Math.PI * 2)) % (Math.PI * 2);
            const targetCount = (angle / (Math.PI * 2)) * totalCount;
            let cumulativeCount = 0;
            const pressedItem = items.find((item) => {
              cumulativeCount += item.count;
              return targetCount <= cumulativeCount;
            });
            if (pressedItem) selectItem(pressedItem);
          }}
          style={[
            styles.ratioDonutTouchTarget,
            Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as ViewStyle) : null,
          ]}
        />
        {tooltipItem ? (
          <View pointerEvents="none" style={styles.ratioTooltipPopup}>
            <Text numberOfLines={1} style={styles.ratioTooltipLabel}>{ratioLabel(tooltipItem.label, kind)}</Text>
            <Text numberOfLines={1} style={styles.ratioTooltipValue}>
              {tooltipItem.count.toLocaleString()}회 · {tooltipItem.percentage.toFixed(1)}%
            </Text>
            <View style={styles.ratioTooltipPointer} />
          </View>
        ) : null}
      </View>

      <View style={styles.ratioLegend}>
        {items.map((item) => {
          const highlighted = item.key === selected?.key;
          return (
            <Pressable
              accessibilityLabel={`${ratioLabel(item.label, kind)}, ${item.count.toLocaleString()}회, ${item.percentage.toFixed(1)}%`}
              accessibilityRole="button"
              accessibilityState={{ selected: highlighted }}
              key={item.key}
              onPress={() => selectItem(item)}
              style={[styles.ratioLegendItem, highlighted && styles.ratioLegendItemSelected]}>
              <View style={[styles.ratioLegendDot, highlighted && styles.ratioLegendDotSelected]} />
              <Text numberOfLines={1} style={[styles.ratioLegendLabel, highlighted && styles.ratioLegendLabelSelected]}>
                {ratioLabel(item.label, kind)}
              </Text>
              <Text style={[styles.ratioLegendValue, highlighted && styles.ratioLegendValueSelected]}>
                {item.percentage.toFixed(1)}%
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function HorizontalChart({ items }: { items: readonly OverallDistributionItem[] }) {
  const styles = useThemedStyles(createStyles);
  const sorted = [...items].sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, 'ko', { numeric: true }));
  const maxCount = Math.max(1, sorted[0]?.count ?? 0);
  const [selectedKey, setSelectedKey] = useState<string | undefined>(sorted[0]?.key);
  const selected = sorted.find((item) => item.key === selectedKey) ?? sorted[0];
  return (
    <>
      <View style={styles.horizontalChart}>
        {sorted.map((item, index) => {
          const highlighted = item.key === selected?.key;
          return (
            <Pressable
              accessibilityLabel={`${item.label}, ${item.count}회, ${item.percentage.toFixed(1)}%`}
              accessibilityRole="button"
              accessibilityState={{ selected: highlighted }}
              key={item.key}
              onPress={() => setSelectedKey(item.key)}
              style={styles.horizontalRow}>
              <View style={styles.horizontalLabels}>
                <Text numberOfLines={1} style={[styles.horizontalName, index === 0 && styles.horizontalNameTop]}>{item.label}</Text>
                <Text style={styles.horizontalValue}>{item.count.toLocaleString()}</Text>
              </View>
              <View style={styles.horizontalTrack}>
                <View style={[styles.horizontalBar, { width: `${(item.count / maxCount) * 100}%` }, highlighted && styles.horizontalBarTop]} />
              </View>
            </Pressable>
          );
        })}
      </View>
      <SelectedDetail item={selected} />
    </>
  );
}

function patternGroups(pattern: string) {
  const linked = pattern === 'none' ? [] : pattern.split('+').map(Number);
  const singles = Math.max(0, 6 - linked.reduce((total, size) => total + size, 0));
  return [...linked, ...Array.from({ length: singles }, () => 1)];
}

function SameEndingDiagram({ pattern }: { pattern: string }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View aria-hidden accessibilityElementsHidden style={styles.patternDiagram}>
      {patternGroups(pattern).map((size, groupIndex) => (
        <View key={`${pattern}-${groupIndex}`} style={[styles.patternGroup, size > 1 && styles.patternGroupLinked]}>
          {Array.from({ length: size }, (_, index) => (
            <View key={index} style={[styles.patternDot, size > 1 && styles.patternDotLinked]}>
              <Text style={[styles.patternDotText, size > 1 && styles.patternDotTextLinked]}>{(groupIndex + 2) + (index * 10)}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function SameEndingChart({ items }: { items: readonly OverallDistributionItem[] }) {
  const styles = useThemedStyles(createStyles);
  const sorted = [...items].sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, 'ko', { numeric: true }));
  const maxCount = Math.max(1, sorted[0]?.count ?? 0);
  const [selectedKey, setSelectedKey] = useState<string | undefined>(sorted[0]?.key);
  const selected = sorted.find((item) => item.key === selectedKey) ?? sorted[0];
  return (
    <>
      <View style={styles.patternChart}>
        {sorted.map((item, index) => {
          const highlighted = item.key === selected?.key;
          return (
            <Pressable
              accessibilityLabel={`${item.label}, ${item.count}회, ${item.percentage.toFixed(1)}%`}
              accessibilityRole="button"
              accessibilityState={{ selected: highlighted }}
              key={item.key}
              onPress={() => setSelectedKey(item.key)}
              style={styles.patternRow}>
              <View style={styles.patternIdentity}>
                <Text numberOfLines={1} style={[styles.patternName, index === 0 && styles.horizontalNameTop]}>{item.label}</Text>
                <SameEndingDiagram pattern={item.key} />
              </View>
              <View style={styles.patternBarColumn}>
                <View style={styles.patternBarMeta}>
                  <Text style={styles.patternPercentage}>{item.percentage.toFixed(1)}%</Text>
                  <Text style={styles.patternCount}>{item.count.toLocaleString()}회</Text>
                </View>
                <View style={styles.patternTrack}>
                  <View style={[styles.horizontalBar, { width: `${(item.count / maxCount) * 100}%` }, highlighted && styles.horizontalBarTop]} />
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
      <SelectedDetail item={selected} />
    </>
  );
}

function StatCard({ children }: { children: React.ReactNode }) {
  const styles = useThemedStyles(createStyles);
  return <View style={styles.chartCard}>{children}</View>;
}

function NumberFrequency({ statistics }: { statistics: OverallStatistics }) {
  const styles = useThemedStyles(createStyles);
  const maxCount = Math.max(1, statistics.topNumbers[0]?.count ?? 0);
  const minCount = statistics.numberFrequencies.length
    ? Math.min(...statistics.numberFrequencies.map((item) => item.count))
    : 0;
  const visibleRange = Math.max(1, maxCount - minCount);
  const topNumber = statistics.topNumbers[0]?.number;
  const [selectedNumber, setSelectedNumber] = useState(topNumber);
  const selectedFrequency = statistics.numberFrequencies.find((item) => item.number === selectedNumber)
    ?? statistics.topNumbers[0];
  const selectedIndex = Math.max(0, statistics.numberFrequencies.findIndex((item) => item.number === selectedFrequency?.number));
  const { onLayout, width } = useChartWidth();
  const yAxisOffset = Math.max(0, minCount - Math.max(8, Math.ceil(visibleRange * 0.18)));
  const data = statistics.numberFrequencies.map(
    (item, index): ChartDatum & {
      frontColor: string;
      labelComponent: () => React.ReactNode;
      leftShiftForTooltip: number;
      onPress: () => void;
    } => {
      const highlighted = item.number === selectedFrequency?.number;
      const axisLabel = item.number === 1 || item.number % 5 === 0 ? String(item.number) : '';
      return {
        key: String(item.number),
        label: '',
        labelComponent: () => (
          <ChartAxisLabel
            label={axisLabel}
            selected={highlighted}
            slotWidth={width / statistics.numberFrequencies.length}
          />
        ),
        leftShiftForTooltip: tooltipShift(index, statistics.numberFrequencies.length, width),
        percentage: item.percentage,
        rawCount: item.count,
        tooltipLabel: `${item.number}번`,
        value: item.count,
        frontColor: highlighted ? styles.chartAccent.color : styles.chartBar.color,
        onPress: () => setSelectedNumber(item.number),
      };
    },
  );
  return (
    <>
      <StatCard>
        <View style={styles.chartHeading}>
          <View style={styles.chartHeadingCopy}>
            <Text style={styles.sectionTitle}>1–45 번호 출현 분포</Text>
            <Text style={styles.sectionDescription}>전체 회차의 메인 당첨번호 기준</Text>
          </View>
          {statistics.topNumbers[0] ? (
            <View style={styles.topValue}>
              <Text style={styles.topValueLabel}>최다 {statistics.topNumbers[0].number}번</Text>
              <Text style={styles.topValueDetail}>{statistics.topNumbers[0].count}회 · {statistics.topNumbers[0].percentage.toFixed(1)}%</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.numberRangeRow}>
          <Text style={styles.numberRangeLabel}>출현 차이 확대</Text>
          <Text style={styles.numberRangeValue}>최저 {minCount.toLocaleString()}회 · 최고 {maxCount.toLocaleString()}회</Text>
        </View>
        <View
          accessibilityLabel={`${selectedFrequency?.number ?? ''}번, ${selectedFrequency?.count ?? 0}회 선택됨. 막대를 누르면 상세 수치가 표시됩니다.`}
          onLayout={onLayout}
          style={styles.numberGiftedChartFrame}>
          {width > 0 ? (
            <BarChart
              adjustToWidth
              animationDuration={460}
              autoCenterTooltip
              backgroundColor="transparent"
              barBorderTopLeftRadius={3}
              barBorderTopRightRadius={3}
              data={data}
              disableScroll
              endSpacing={0}
              focusBarOnPress
              focusedBarConfig={{ color: styles.chartAccent.color }}
              focusedBarIndex={selectedIndex}
              frontColor={styles.chartBar.color}
              height={174}
              hideRules
              hideYAxisText
              initialSpacing={0}
              isAnimated
              labelsDistanceFromXaxis={6}
              labelsExtraHeight={24}
              lowlightOpacity={0.76}
              maxValue={(maxCount - yAxisOffset) * 1.04}
              noOfSections={4}
              overflowTop={56}
              parentWidth={width}
              renderTooltip={(item: ChartDatum) => <ChartTooltip item={item} />}
              width={width}
              xAxisColor={styles.chartAxis.color}
              xAxisLabelTextStyle={styles.giftedAxisLabel}
              xAxisTextNumberOfLines={1}
              xAxisThickness={StyleSheet.hairlineWidth}
              yAxisLabelWidth={0}
              yAxisOffset={yAxisOffset}
              yAxisThickness={0}
            />
          ) : null}
        </View>
        {selectedFrequency ? (
          <View accessibilityLiveRegion="polite" style={styles.numberSelectedDetail}>
            <View style={styles.selectedNumberCircle}>
              <Text style={styles.selectedNumberCircleText}>{selectedFrequency.number}</Text>
            </View>
            <View style={styles.selectedNumberCopy}>
              <Text style={styles.selectedDetailLabel}>{selectedFrequency.number}번</Text>
              <Text style={styles.selectedNumberCaption}>선택한 막대의 상세 수치</Text>
            </View>
            <Text style={styles.selectedDetailValue}>{selectedFrequency.count.toLocaleString()}회 · {selectedFrequency.percentage.toFixed(1)}%</Text>
          </View>
        ) : null}
      </StatCard>
      <StatCard>
        <Text style={styles.sectionTitle}>출현 상위 번호</Text>
        <View style={styles.topNumberGrid}>
          {statistics.topNumbers.map((item, index) => (
            <View key={item.number} style={[styles.topNumberItem, index === 0 && styles.topNumberItemFirst]}>
              <Text style={[styles.topNumberRank, index === 0 && styles.topNumberRankFirst]}>{index + 1}위</Text>
              <View style={[styles.topNumberCircle, index === 0 && styles.topNumberCircleFirst]}>
                <Text style={[styles.topNumberValue, index === 0 && styles.topNumberValueFirst]}>{item.number}</Text>
              </View>
              <Text style={styles.topNumberCount}>{item.count}회</Text>
              <Text style={styles.topNumberPercentage}>출현 {item.percentage.toFixed(1)}%</Text>
            </View>
          ))}
        </View>
      </StatCard>
    </>
  );
}

function DistributionStatistics({ statistics }: { statistics: OverallStatistics }) {
  const [range, setRange] = useState<'sum' | 'lastDigit' | 'deviation'>('sum');
  const [ratio, setRatio] = useState<RatioKind>('oddEven');
  const rangeItems = range === 'sum' ? statistics.sumDistribution : range === 'lastDigit' ? statistics.lastDigitSumDistribution : statistics.standardDeviationDistribution;
  const rangeTitle = range === 'sum' ? '번호 총합' : range === 'lastDigit' ? '끝수 총합' : '표준편차';
  const ratioItems = ratio === 'oddEven' ? statistics.oddEvenDistribution : statistics.lowHighDistribution;
  return (
    <>
      <StatCard>
        <ChartHeading description="같은 끝자리가 겹치는 형태별 회차 수" items={statistics.sameEndingDistribution} title="동끝수 형태" />
        <SameEndingChart items={statistics.sameEndingDistribution} />
      </StatCard>
      <StatCard>
        <ChoiceRow accessibilityLabel="수치 분포 선택" onChange={setRange} options={[
          { label: '번호 총합', value: 'sum' },
          { label: '끝수 총합', value: 'lastDigit' },
          { label: '표준편차', value: 'deviation' },
        ]} value={range} />
        <ChartHeading description="구간별 과거 당첨 조합 수" items={rangeItems} title={rangeTitle} />
        <VerticalChart items={rangeItems} />
      </StatCard>
      <StatCard>
        <ChoiceRow accessibilityLabel="비율 분포 선택" onChange={setRatio} options={[
          { label: '홀짝', value: 'oddEven' },
          { label: '저고', value: 'lowHigh' },
        ]} value={ratio} />
        <ChartHeading description={ratio === 'oddEven' ? '홀수:짝수 순서' : '저번호(1–22):고번호(23–45) 순서'} items={ratioItems} title={ratio === 'oddEven' ? '홀짝 비율' : '저고 비율'} />
        <RatioDonutChart items={ratioItems} kind={ratio} />
      </StatCard>
    </>
  );
}

type TraitKey = 'prime' | 'square' | 'composite' | 'multiple3' | 'multiple4' | 'multiple5';
function TraitStatistics({ statistics }: { statistics: OverallStatistics }) {
  const [trait, setTrait] = useState<TraitKey>('prime');
  const traits: Record<TraitKey, { items: OverallDistributionItem[]; label: string }> = {
    prime: { items: statistics.primeCountDistribution, label: '소수' },
    square: { items: statistics.squareCountDistribution, label: '완전제곱수' },
    composite: { items: statistics.compositeCountDistribution, label: '합성수' },
    multiple3: { items: statistics.multipleCountDistributions[3], label: '3의 배수' },
    multiple4: { items: statistics.multipleCountDistributions[4], label: '4의 배수' },
    multiple5: { items: statistics.multipleCountDistributions[5], label: '5의 배수' },
  };
  return (
    <>
      <StatCard>
        <ChartHeading description="두 수 차이의 다양성을 나타내는 값" items={statistics.acValueDistribution} title="A/C 값" />
        <VerticalChart items={statistics.acValueDistribution} />
      </StatCard>
      <StatCard>
        <ChoiceRow accessibilityLabel="수 성격 선택" onChange={setTrait} options={[
          { label: '소수', value: 'prime' }, { label: '제곱수', value: 'square' }, { label: '합성수', value: 'composite' },
          { label: '3의 배수', value: 'multiple3' }, { label: '4의 배수', value: 'multiple4' }, { label: '5의 배수', value: 'multiple5' },
        ]} value={trait} />
        <ChartHeading description="한 회차의 6개 번호에 포함된 개수" items={traits[trait].items} title={`${traits[trait].label} 개수`} />
        <VerticalChart items={traits[trait].items} />
      </StatCard>
    </>
  );
}

function RecentStatistics({ statistics }: { statistics: OverallStatistics }) {
  const styles = useThemedStyles(createStyles);
  const [metric, setMetric] = useState<'carry' | 'neighbor' | 'consecutive'>('carry');
  const [includeBonus, setIncludeBonus] = useState(false);
  const items = metric === 'consecutive'
    ? statistics.consecutiveDistribution
    : metric === 'carry'
      ? statistics.carryDistributions[includeBonus ? 'bonusIncluded' : 'bonusExcluded']
      : statistics.neighborDistributions[includeBonus ? 'bonusIncluded' : 'bonusExcluded'];
  const title = metric === 'carry' ? '이월수 개수' : metric === 'neighbor' ? '이웃수 개수' : '연번 형태';
  return (
    <StatCard>
      <ChoiceRow accessibilityLabel="직전 회차와 연번 통계 선택" onChange={setMetric} options={[
        { label: '이월수', value: 'carry' }, { label: '이웃수', value: 'neighbor' }, { label: '연번', value: 'consecutive' },
      ]} value={metric} />
      {metric !== 'consecutive' ? (
        <ChoiceRow accessibilityLabel="보너스 포함 기준" onChange={(value) => setIncludeBonus(value === 'included')} options={[
          { label: '본번호만', value: 'excluded' }, { label: '보너스 포함', value: 'included' },
        ]} value={includeBonus ? 'included' : 'excluded'} />
      ) : null}
      <ChartHeading
        description={metric === 'consecutive' ? '연속된 번호 그룹의 형태별 분포' : `직전 회차와 비교한 ${statistics.comparisonDrawCount.toLocaleString()}개 회차 기준`}
        items={items}
        title={title}
      />
      {metric === 'consecutive' ? <HorizontalChart items={items} /> : <VerticalChart items={items} />}
      {metric !== 'consecutive' ? <Text style={styles.cardNote}>이월수와 이웃수의 보너스 기준은 서로 독립적으로 확인할 수 있어요.</Text> : null}
    </StatCard>
  );
}

function BandStatistics({ statistics }: { statistics: OverallStatistics }) {
  const styles = useThemedStyles(createStyles);
  const [band, setBand] = useState<NumberBandKey>('1-9');
  return (
    <>
      <StatCard>
        <ChoiceRow accessibilityLabel="번호대 선택" onChange={setBand} options={[
          { label: '1–9', value: '1-9' }, { label: '10–19', value: '10-19' }, { label: '20–29', value: '20-29' },
          { label: '30–39', value: '30-39' }, { label: '40–45', value: '40-45' },
        ]} value={band} />
        <ChartHeading description="한 회차의 6개 번호에 포함된 개수" items={statistics.bandDistributions[band]} title={`${band} 번호대`} />
        <VerticalChart items={statistics.bandDistributions[band]} />
      </StatCard>
      <View style={styles.ruleCard}>
        <Ionicons color={styles.ruleIcon.color} name="information-circle-outline" size={20} />
        <View style={styles.ruleCopy}>
          <Text style={styles.ruleTitle}>과거 등수 조합 제외</Text>
          <Text style={styles.ruleText}>분포 통계가 아니라 조합 생성 시 과거 1–3등 상당 기록과 대조하는 제외 규칙이에요.</Text>
        </View>
      </View>
    </>
  );
}

export function OverallStatisticsScreen() {
  const styles = useThemedStyles(createStyles);
  const statistics = useMemo(() => buildOverallStatistics(lottoHistory), []);
  const [activeTab, setActiveTab] = useState<StatisticsTab>('번호');
  const summary = [
    { label: '번호 최다', value: statistics.topNumbers[0] ? `${statistics.topNumbers[0].number}번` : '—' },
    { label: '합계 최다', value: topItem(statistics.sumDistribution)?.label ?? '—' },
    { label: '홀짝 최다', value: topItem(statistics.oddEvenDistribution)?.label ?? '—' },
    { label: 'A/C 최다', value: topItem(statistics.acValueDistribution)?.label ?? '—' },
  ];

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.container}>
        <SubScreenHeader
          backAccessibilityLabel="통계보기로 돌아가기"
          onBack={() => router.back()}
          title="종합 통계"
        />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.eyebrow}>ALL DRAW DATA</Text>
          <Text style={styles.title}>당첨데이터 종합 통계</Text>

          <View style={styles.rangeRow}>
            <Text style={styles.rangeLabel}>분석 범위</Text>
            <Text style={styles.rangeValue}>{statistics.firstRound.toLocaleString()}–{statistics.latestRound.toLocaleString()}회 · 보너스 제외</Text>
          </View>

          <View style={styles.summaryGrid}>
            {summary.map((item, index) => (
              <View key={item.label} style={[styles.summaryItem, index === 0 && styles.summaryItemPrimary]}>
                <Text style={[styles.summaryLabel, index === 0 && styles.summaryLabelPrimary]}>{item.label}</Text>
                <Text style={[styles.summaryValue, index === 0 && styles.summaryValuePrimary]}>{item.value}</Text>
              </View>
            ))}
          </View>

          <ScrollView
            accessibilityRole="tablist"
            contentContainerStyle={styles.tabContent}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabs}>
            {STAT_TABS.map((tab) => {
              const selected = tab === activeTab;
              return (
                <Pressable
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={[styles.tab, selected && styles.tabSelected]}>
                  <Text style={[styles.tabText, selected && styles.tabTextSelected]}>{tab}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.tabPanel}>
            {activeTab === '번호' ? <NumberFrequency statistics={statistics} /> : null}
            {activeTab === '분포' ? <DistributionStatistics statistics={statistics} /> : null}
            {activeTab === '수 성격' ? <TraitStatistics statistics={statistics} /> : null}
            {activeTab === '직전·연번' ? <RecentStatistics statistics={statistics} /> : null}
            {activeTab === '번호대·과거' ? <BandStatistics statistics={statistics} /> : null}
          </View>

          <View style={styles.insightCard}>
            <View style={styles.insightIcon}><Ionicons color={styles.chartIcon.color} name="information" size={18} /></View>
            <Text style={styles.insightText}>강조된 최다값은 과거 기록에서 가장 많이 관찰된 값입니다. 다음 회차의 당첨 가능성이나 유리함을 뜻하지 않아요.</Text>
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
  headerCopy: { flex: 1, marginLeft: spacing.md },
  eyebrow: { color: colors.accentSecondary, fontSize: 9, fontWeight: typography.weights.bold, letterSpacing: 1.5, marginBottom: spacing.xs },
  title: { color: colors.textPrimary, fontSize: 22, fontWeight: typography.weights.bold, letterSpacing: -0.6 },
  rangeRow: { marginTop: spacing.xxl, paddingBottom: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.divider },
  rangeLabel: { color: colors.textSecondary, fontSize: typography.sizes.caption },
  rangeValue: { color: colors.textPrimary, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold },
  summaryGrid: { marginTop: spacing.xl, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  summaryItem: { width: '48.5%', minHeight: 82, padding: spacing.lg, justifyContent: 'space-between', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.surface },
  summaryItemPrimary: { borderColor: colors.accentPrimary, backgroundColor: colors.surfaceAccent },
  summaryLabel: { color: colors.textSecondary, fontSize: typography.sizes.caption },
  summaryLabelPrimary: { color: colors.accentPrimary },
  summaryValue: { marginTop: spacing.sm, color: colors.textPrimary, fontSize: typography.sizes.section, fontWeight: typography.weights.bold, fontVariant: ['tabular-nums'] },
  summaryValuePrimary: { color: colors.highlight },
  tabs: { marginTop: spacing.xxl, marginHorizontal: -spacing.xl, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
  tabContent: { paddingHorizontal: spacing.xl, gap: spacing.xl },
  tab: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabSelected: { borderBottomColor: colors.accentPrimary },
  tabText: { color: colors.textSecondary, fontSize: typography.sizes.small, fontWeight: typography.weights.medium },
  tabTextSelected: { color: colors.textPrimary, fontWeight: typography.weights.bold },
  tabPanel: { gap: spacing.lg },
  chartCard: { marginTop: spacing.lg, padding: spacing.lg, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.surface, boxShadow: colors.cardShadow, elevation: 2 },
  chartHeading: { marginTop: spacing.sm, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  chartHeadingCopy: { flex: 1 },
  sectionTitle: { color: colors.textPrimary, fontSize: typography.sizes.label, fontWeight: typography.weights.bold },
  sectionDescription: { color: colors.textSecondary, fontSize: typography.sizes.caption, lineHeight: 17, marginTop: spacing.xs },
  topValue: { alignItems: 'flex-end', maxWidth: '46%' },
  topValueLabel: { color: colors.accentPrimary, fontSize: typography.sizes.caption, fontWeight: typography.weights.bold, textAlign: 'right' },
  topValueDetail: { color: colors.textSecondary, fontSize: 10, marginTop: spacing.xs, fontVariant: ['tabular-nums'] },
  choiceScroll: { marginHorizontal: -spacing.lg, marginBottom: spacing.md },
  choiceContent: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  choice: { minHeight: 32, paddingHorizontal: spacing.md, alignItems: 'center', justifyContent: 'center', borderRadius: radius.round, backgroundColor: colors.surfaceElevated },
  choiceSelected: { backgroundColor: colors.surfaceAccent, borderWidth: 1, borderColor: colors.accentBorder },
  choiceText: { color: colors.textSecondary, fontSize: typography.sizes.caption, fontWeight: typography.weights.medium },
  choiceTextSelected: { color: colors.accentPrimary, fontWeight: typography.weights.bold },
  chartBar: { color: colors.textTertiary },
  chartAccent: { color: colors.accentPrimary },
  chartAxis: { color: colors.borderStrong },
  giftedChartFrame: { minHeight: 280, marginTop: spacing.lg, marginBottom: -94, overflow: 'visible' },
  numberGiftedChartFrame: { minHeight: 280, marginTop: spacing.xs, marginBottom: -52, overflow: 'visible' },
  giftedAxisLabelSlot: { width: 40, alignItems: 'center', overflow: 'visible' },
  giftedAxisLabel: { width: 40, color: colors.textTertiary, fontSize: 8, lineHeight: 11, textAlign: 'center', fontVariant: ['tabular-nums'] },
  giftedAxisLabelSelected: { color: colors.accentPrimary, fontWeight: typography.weights.bold },
  chartTooltip: { width: CHART_TOOLTIP_WIDTH, paddingHorizontal: spacing.sm, paddingVertical: 7, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surfaceElevated, boxShadow: colors.cardShadow, elevation: 5 },
  chartTooltipLabel: { color: colors.textPrimary, fontSize: 10, fontWeight: typography.weights.bold, textAlign: 'center' },
  chartTooltipValue: { marginTop: 2, color: colors.textSecondary, fontSize: 9, fontWeight: typography.weights.semibold, textAlign: 'center', fontVariant: ['tabular-nums'] },
  ratioChart: { marginTop: spacing.lg },
  ratioDonutFrame: { minHeight: 244, alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  ratioInnerCircle: { backgroundColor: colors.surface },
  ratioSliceGap: { color: colors.surface },
  ratioDonutCenter: { width: 102, alignItems: 'center', justifyContent: 'center' },
  ratioDonutCenterLabel: { color: colors.textPrimary, fontSize: 11, fontWeight: typography.weights.bold, textAlign: 'center' },
  ratioDonutCenterCount: { marginTop: 5, color: colors.textPrimary, fontSize: typography.sizes.caption, fontWeight: typography.weights.bold, fontVariant: ['tabular-nums'] },
  ratioDonutCenterPercentage: { marginTop: 2, color: colors.accentPrimary, fontSize: 10, fontWeight: typography.weights.bold, fontVariant: ['tabular-nums'] },
  ratioDonutTouchTarget: { position: 'absolute', left: '50%', top: '50%', width: 212, height: 212, marginLeft: -106, marginTop: -106, borderRadius: 106, zIndex: 2 },
  ratioTooltipPopup: { position: 'absolute', top: 0, left: '50%', width: 124, marginLeft: -62, paddingHorizontal: spacing.sm, paddingVertical: 8, alignItems: 'center', borderRadius: radius.sm, backgroundColor: colors.accentPrimary, boxShadow: colors.cardShadow, elevation: 6, zIndex: 3 },
  ratioTooltipLabel: { color: '#FFFFFF', fontSize: 10, fontWeight: typography.weights.bold, textAlign: 'center' },
  ratioTooltipValue: { marginTop: 2, color: '#FFFFFF', fontSize: 9, fontWeight: typography.weights.semibold, textAlign: 'center', fontVariant: ['tabular-nums'], opacity: 0.9 },
  ratioTooltipPointer: { position: 'absolute', bottom: -4, width: 8, height: 8, backgroundColor: colors.accentPrimary, transform: [{ rotate: '45deg' }] },
  ratioLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  ratioLegendItem: { width: '48.5%', minHeight: 40, paddingHorizontal: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.md, borderWidth: 1, borderColor: 'transparent', backgroundColor: colors.surfaceElevated },
  ratioLegendItemSelected: { borderColor: colors.accentBorder, backgroundColor: colors.surfaceAccent },
  ratioLegendDot: { width: 7, height: 7, borderRadius: radius.round, backgroundColor: colors.textTertiary },
  ratioLegendDotSelected: { backgroundColor: colors.accentPrimary },
  ratioLegendLabel: { flex: 1, color: colors.textSecondary, fontSize: 10, fontWeight: typography.weights.medium },
  ratioLegendLabelSelected: { color: colors.textPrimary, fontWeight: typography.weights.bold },
  ratioLegendValue: { color: colors.textTertiary, fontSize: 9, fontVariant: ['tabular-nums'] },
  ratioLegendValueSelected: { color: colors.accentPrimary, fontWeight: typography.weights.bold },
  horizontalChart: { marginTop: spacing.xl, gap: spacing.md },
  horizontalRow: { gap: 5 },
  horizontalLabels: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  horizontalName: { flex: 1, color: colors.textSecondary, fontSize: typography.sizes.caption },
  horizontalNameTop: { color: colors.textPrimary, fontWeight: typography.weights.bold },
  horizontalValue: { color: colors.textSecondary, fontSize: 10, fontVariant: ['tabular-nums'] },
  horizontalTrack: { height: 7, overflow: 'hidden', borderRadius: radius.round, backgroundColor: colors.surfaceElevated },
  horizontalBar: { height: '100%', borderRadius: radius.round, backgroundColor: colors.textTertiary },
  horizontalBarTop: { backgroundColor: colors.accentPrimary },
  selectedDetail: { minHeight: 42, marginTop: spacing.lg, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceElevated },
  selectedDetailLabel: { flex: 1, color: colors.textPrimary, fontSize: typography.sizes.caption, fontWeight: typography.weights.bold },
  selectedDetailValue: { color: colors.accentPrimary, fontSize: typography.sizes.caption, fontWeight: typography.weights.bold, fontVariant: ['tabular-nums'] },
  numberSelectedDetail: { minHeight: 56, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceElevated },
  selectedNumberCircle: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: radius.round, backgroundColor: colors.accentPrimary },
  selectedNumberCircleText: { color: '#FFFFFF', fontSize: 11, fontWeight: typography.weights.bold, fontVariant: ['tabular-nums'] },
  selectedNumberCopy: { flex: 1, gap: 2 },
  selectedNumberCaption: { color: colors.textTertiary, fontSize: 9 },
  patternChart: { marginTop: spacing.xl, gap: spacing.xl },
  patternRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  patternIdentity: { width: 150, gap: spacing.sm },
  patternName: { color: colors.textSecondary, fontSize: typography.sizes.caption, lineHeight: 16, fontWeight: typography.weights.semibold },
  patternDiagram: { minHeight: 25, flexDirection: 'row', alignItems: 'center', gap: 3 },
  patternGroup: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  patternGroupLinked: { padding: 2, borderRadius: 7, backgroundColor: colors.surfaceAccent },
  patternDot: { width: 21, height: 21, alignItems: 'center', justifyContent: 'center', borderRadius: radius.round, borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.surfaceElevated },
  patternDotLinked: { borderColor: colors.accentBorder, backgroundColor: colors.surfaceAccent },
  patternDotText: { color: colors.textTertiary, fontSize: 9, fontWeight: typography.weights.bold, fontVariant: ['tabular-nums'] },
  patternDotTextLinked: { color: colors.accentPrimary },
  patternBarColumn: { flex: 1, alignSelf: 'stretch', justifyContent: 'center', gap: spacing.sm },
  patternBarMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  patternPercentage: { color: colors.textTertiary, fontSize: 10, fontVariant: ['tabular-nums'] },
  patternCount: { color: colors.textPrimary, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold, fontVariant: ['tabular-nums'] },
  patternTrack: { width: '100%', height: 10, overflow: 'hidden', borderRadius: radius.round, backgroundColor: colors.surfaceElevated },
  numberRangeRow: { marginTop: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  numberRangeLabel: { color: colors.accentPrimary, fontSize: 10, fontWeight: typography.weights.bold },
  numberRangeValue: { color: colors.textTertiary, fontSize: 10, fontVariant: ['tabular-nums'] },
  topNumberGrid: { marginTop: spacing.lg, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  topNumberItem: { width: '31.5%', minHeight: 138, padding: spacing.sm, alignItems: 'center', borderRadius: radius.md, backgroundColor: colors.surfaceElevated },
  topNumberItemFirst: { backgroundColor: colors.surfaceAccent, borderWidth: 1, borderColor: colors.accentBorder },
  topNumberRank: { alignSelf: 'flex-start', color: colors.textSecondary, fontSize: 11, fontWeight: typography.weights.bold },
  topNumberRankFirst: { color: colors.accentPrimary },
  topNumberCircle: { width: 46, height: 46, marginTop: spacing.sm, alignItems: 'center', justifyContent: 'center', borderRadius: radius.round, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface },
  topNumberCircleFirst: { borderColor: colors.accentPrimary, backgroundColor: colors.accentPrimary },
  topNumberValue: { color: colors.textPrimary, fontSize: typography.sizes.section, fontWeight: typography.weights.bold },
  topNumberValueFirst: { color: '#FFFFFF' },
  topNumberCount: { color: colors.textPrimary, fontSize: 11, fontWeight: typography.weights.bold, marginTop: spacing.sm, fontVariant: ['tabular-nums'] },
  topNumberPercentage: { color: colors.textTertiary, fontSize: 9, marginTop: 2, fontVariant: ['tabular-nums'] },
  cardNote: { color: colors.textTertiary, fontSize: 10, lineHeight: 15, marginTop: spacing.lg },
  ruleCard: { marginTop: spacing.lg, padding: spacing.lg, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface },
  ruleIcon: { color: colors.accentPrimary },
  ruleCopy: { flex: 1 },
  ruleTitle: { color: colors.textPrimary, fontSize: typography.sizes.small, fontWeight: typography.weights.bold },
  ruleText: { color: colors.textSecondary, fontSize: typography.sizes.caption, lineHeight: 18, marginTop: spacing.xs },
  chartIcon: { color: colors.accentPrimary },
  insightCard: { marginTop: spacing.lg, padding: spacing.lg, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface },
  insightIcon: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: radius.round, backgroundColor: colors.surfaceAccent },
  insightText: { flex: 1, color: colors.textSecondary, fontSize: typography.sizes.caption, lineHeight: 18 },
});
