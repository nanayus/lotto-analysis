import { act, fireEvent, render } from '@testing-library/react-native';
import { describe, expect, jest, test } from '@jest/globals';
import { StyleSheet } from 'react-native';

import type { GeneratedNumberAnalytics } from '@/data/numberAnalytics.types';
import { colors, radius, spacing } from '@/theme';

import { NumberProfile } from '../NumberProfile';

const analytics = {
  appearanceCount: 168,
  appearanceRank: 20,
  number: 16,
  status: 'NEUTRAL',
} as GeneratedNumberAnalytics;

describe('NumberProfile', () => {
  test('centers the profile on the number and compact rank summary', async () => {
    const onOpenComparison = jest.fn();
    const { getByRole, getByTestId, getByText, queryByText } = await render(
      <NumberProfile analytics={analytics} onOpenComparison={onOpenComparison} />,
    );

    expect(getByText('16')).toBeTruthy();
    expect(getByText('20위')).toBeTruthy();
    expect(queryByText('전체 20위')).toBeNull();
    expect(queryByText('168회 출현')).toBeNull();
    expect(queryByText('번호')).toBeNull();
    expect(queryByText('NEUTRAL')).toBeNull();
    expect(queryByText('전체 출현')).toBeNull();
    expect(queryByText('출현 순위')).toBeNull();

    await act(async () => {
      fireEvent.press(getByRole('button', { name: /전체 번호 보기/ }));
    });

    expect(onOpenComparison).toHaveBeenCalledTimes(1);

    const badgeStyle = StyleSheet.flatten(getByTestId('rank-badge').props.style);
    expect(badgeStyle.paddingHorizontal).toBe(spacing.sm);
    expect(badgeStyle.paddingVertical).toBe(5);
    expect(badgeStyle.borderRadius).toBe(radius.round);
    expect(badgeStyle.borderWidth).toBe(1);
  });

  test.each([
    [6, colors.hot],
    [7, colors.neutral],
    [39, colors.neutral],
    [40, colors.cold],
  ])('restores the colored dot rank pill for rank %i', async (appearanceRank, color) => {
    const { getByTestId, getByText } = await render(
      <NumberProfile
        analytics={{ ...analytics, appearanceRank } as GeneratedNumberAnalytics}
        onOpenComparison={jest.fn()}
      />,
    );

    expect(StyleSheet.flatten(getByTestId('rank-badge-dot').props.style).backgroundColor)
      .toBe(color);
    expect(StyleSheet.flatten(getByText(`${appearanceRank}위`).props.style).color)
      .toBe(color);
    expect(StyleSheet.flatten(getByTestId('rank-badge').props.style).borderColor)
      .toBe(`${color}5C`);
  });
});
