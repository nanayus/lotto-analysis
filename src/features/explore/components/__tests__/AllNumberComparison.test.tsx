import { act, fireEvent, render } from '@testing-library/react-native';
import { describe, expect, jest, test } from '@jest/globals';

import type { GeneratedNumberAnalytics } from '@/data/numberAnalytics.types';
import type { AnalyticsSnapshot } from '@/domain/analytics/types';

import { AllNumberComparison } from '../AllNumberComparison';

const snapshot = {
  activeDrawCount: 100,
  filterKey: 'all-main',
  numbers: Object.fromEntries(
    Array.from({ length: 45 }, (_, index) => {
      const number = index + 1;
      return [
        String(number),
        {
          appearanceCount: 100 + number,
          currentGap: number,
          number,
        } as GeneratedNumberAnalytics,
      ];
    }),
  ),
  timelineDrawCount: 52,
  timelineLabel: '최근 52회',
} as AnalyticsSnapshot;

describe('AllNumberComparison', () => {
  test('renders the 1–45 grid in number order and preserves exploration actions', async () => {
    const onBack = jest.fn();
    const onBonusChange = jest.fn();
    const onPeriodChange = jest.fn();
    const onSelect = jest.fn();
    const { getAllByTestId, getByRole, getByTestId, getByText, queryByText } = await render(
      <AllNumberComparison
        bonusIncluded={false}
        firstRound={1}
        latestRound={1237}
        onBack={onBack}
        onBonusChange={onBonusChange}
        onPeriodChange={onPeriodChange}
        onSelect={onSelect}
        period={{ kind: 'preset', label: '전체' }}
        selectedNumber={23}
        snapshot={snapshot}
      />,
    );

    const items = getAllByTestId(/^all-number-item-/);
    expect(items).toHaveLength(45);
    expect(items[0].props.testID).toBe('all-number-item-1');
    expect(items[44].props.testID).toBe('all-number-item-45');
    expect(getByText('전체 번호 비교')).toBeTruthy();
    expect(getByText('101회')).toBeTruthy();
    expect(getByTestId('all-number-ball-1')).toBeTruthy();
    expect(getByTestId('all-number-item-23').props.accessibilityState).toEqual({ selected: true });
    expect(queryByText('45개 번호 비교')).toBeNull();
    expect(queryByText('순위')).toBeNull();

    await act(async () => {
      await fireEvent.press(getByRole('button', { name: '13번, 출현 횟수 113회' }));
    });
    await act(async () => {
      await fireEvent.press(getByRole('button', { name: '현재 미출현 횟수' }));
    });
    expect(getByTestId('all-number-item-13').props.accessibilityLabel)
      .toBe('13번, 현재 미출현 횟수 13회');
    expect(getByTestId('all-number-metric-currentGap').props.accessibilityState)
      .toEqual({ selected: true });
    await act(async () => {
      await fireEvent.press(getByRole('switch', { name: '보너스 번호 제외' }));
    });
    await act(async () => {
      await fireEvent.press(getByRole('button', { name: '번호분석으로 돌아가기' }));
    });

    expect(onSelect).toHaveBeenCalledWith(13);
    expect(onBonusChange).toHaveBeenCalledWith(true);
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
