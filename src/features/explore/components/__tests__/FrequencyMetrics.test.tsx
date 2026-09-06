import { render } from '@testing-library/react-native';
import { describe, expect, test } from '@jest/globals';
import { StyleSheet } from 'react-native';

import type { GeneratedNumberAnalytics } from '@/data/numberAnalytics.types';
import { colors, radius, spacing, typography } from '@/theme';

import { FrequencyMetrics } from '../FrequencyMetrics';

const analytics = {
  appearanceCount: 168,
  appearanceRank: 20,
  averageGap: 6.3,
  currentGap: 10,
  maxGap: 39,
} as GeneratedNumberAnalytics;

describe('FrequencyMetrics', () => {
  test('renders the B2 rank-first record card with design-system tokens', async () => {
    const { getByTestId, getByText, queryByText } = await render(
      <FrequencyMetrics
        analytics={{ ...analytics, currentGap: 3 } as GeneratedNumberAnalytics}
        lastAppearance={{ date: '2026-08-30', round: 1239 }}
        period={{ kind: 'preset', label: '전체' }}
      />,
    );

    expect(queryByText('출현 기록')).toBeNull();
    expect(getByText('출현 순위')).toBeTruthy();
    expect(getByText('20위')).toBeTruthy();
    expect(getByText('/ 45개 번호')).toBeTruthy();
    expect(getByText('168회 출현')).toBeTruthy();
    expect(getByText('가장 최근에는 8월 30일에 등장했어요')).toBeTruthy();
    expect(getByText('현재 3회째 미출현 / 평균 간격 6.3회 (가장 길었던 간격 39회)'))
      .toBeTruthy();

    const cardStyle = StyleSheet.flatten(getByTestId('frequency-record-card').props.style);
    expect(cardStyle.backgroundColor).toBe(colors.surface);
    expect(cardStyle.borderColor).toBe(colors.divider);
    expect(cardStyle.borderRadius).toBe(radius.md);
    expect(cardStyle.borderWidth).toBe(1);

    const rankStyle = StyleSheet.flatten(getByText('20위').props.style);
    expect(rankStyle.fontSize).toBe(typography.sizes.title);
    expect(rankStyle.fontWeight).toBe(typography.weights.semibold);

    const rankTotalStyle = StyleSheet.flatten(getByText('/ 45개 번호').props.style);
    expect(rankTotalStyle.fontSize).toBe(typography.sizes.caption);
    expect(rankTotalStyle.color).toBe(colors.textTertiary);

    const rankSectionStyle = StyleSheet.flatten(getByTestId('frequency-rank-section').props.style);
    expect(rankSectionStyle.padding).toBe(spacing.xl);
    expect(getByTestId('frequency-appearance-count')).toBeTruthy();
  });

  test('renders without nested card chrome inside the top hero', async () => {
    const { getByTestId, getByText, queryByTestId } = await render(
      <FrequencyMetrics
        analytics={analytics}
        embedded
        lastAppearance={{ date: '2026-08-30', round: 1239 }}
        period={{ kind: 'preset', label: '전체' }}
      />,
    );

    expect(getByTestId('frequency-record-hero')).toBeTruthy();
    expect(queryByTestId('frequency-record-card')).toBeNull();

    const rankSectionStyle = StyleSheet.flatten(getByTestId('frequency-rank-section').props.style);
    expect(rankSectionStyle.padding).toBe(0);
    expect(getByText('가장 최근에는 8월 30일에 등장했어요')).toBeTruthy();
  });

  test.each([
    [0, '현재 미출현 없음 / 평균 간격 6.3회 (가장 길었던 간격 39회)'],
    [1, '현재 1회째 미출현 / 평균 간격 6.3회 (가장 길었던 간격 39회)'],
    [4, '현재 4회째 미출현 / 평균 간격 6.3회 (가장 길었던 간격 39회)'],
  ])('describes a %i-draw current gap', async (currentGap, expected) => {
    const { getByText } = await render(
      <FrequencyMetrics
        analytics={{ ...analytics, currentGap } as GeneratedNumberAnalytics}
        lastAppearance={{ date: '2026-08-30', round: 1239 }}
        period={{ kind: 'preset', label: '전체' }}
      />,
    );

    expect(getByText(expected)).toBeTruthy();
  });

  test.each([
    [{ kind: 'preset', label: '전체' } as const, '전체 기간 동안 한 번도 나오지 않았어요'],
    [{ kind: 'preset', label: '최근 52회' } as const, '최근 52회 동안 한 번도 나오지 않았어요'],
    [
      { endRound: 1150, kind: 'custom', startRound: 1100 } as const,
      '1,100~1,150회 동안 한 번도 나오지 않았어요',
    ],
  ])('names the active period when no appearance exists', async (period, expected) => {
    const { getByText, queryByText } = await render(
      <FrequencyMetrics
        analytics={{ ...analytics, appearanceCount: 0 } as GeneratedNumberAnalytics}
        period={period}
      />,
    );

    expect(getByText(expected)).toBeTruthy();
    expect(queryByText(/평균 6\.3회/)).toBeNull();
  });

  test('uses the exact historical round for a custom range', async () => {
    const { getByText } = await render(
      <FrequencyMetrics
        analytics={{ ...analytics, currentGap: 4 } as GeneratedNumberAnalytics}
        lastAppearance={{ round: 1146 }}
        period={{ endRound: 1150, kind: 'custom', startRound: 1100 }}
      />,
    );

    expect(getByText('가장 최근에는 1,146회에 등장했어요')).toBeTruthy();
  });
});
