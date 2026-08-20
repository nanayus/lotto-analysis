import { render } from '@testing-library/react-native';
import { describe, expect, test } from '@jest/globals';
import { StyleSheet } from 'react-native';

import type { GeneratedNumberAnalytics } from '@/data/numberAnalytics.types';

import { FrequencyMetrics } from '../FrequencyMetrics';

const analytics = {
  appearanceCount: 168,
  averageGap: 6.3,
  currentGap: 10,
  maxGap: 39,
} as GeneratedNumberAnalytics;

describe('FrequencyMetrics', () => {
  test('renders four metrics without internal card decoration', async () => {
    const { getByTestId, getByText } = await render(<FrequencyMetrics analytics={analytics} />);

    expect(getByText('출현 기록')).toBeTruthy();
    expect(getByText('총 출현')).toBeTruthy();
    expect(getByText('168회')).toBeTruthy();
    expect(getByText('6.3회')).toBeTruthy();
    expect(getByText('10회')).toBeTruthy();
    expect(getByText('39회')).toBeTruthy();
    expect(StyleSheet.flatten(getByTestId('frequency-metric-평균 간격').props.style))
      .not.toHaveProperty('backgroundColor');
    expect(StyleSheet.flatten(getByTestId('frequency-metric-평균 간격').props.style))
      .not.toHaveProperty('borderWidth');
    expect(getByTestId('frequency-metric-총 출현')).toBeTruthy();
  });
});
