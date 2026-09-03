import { fireEvent, render } from '@testing-library/react-native';
import { describe, expect, jest, test } from '@jest/globals';

import type { TrioDatum } from '@/data/numberAnalytics.types';

import { TrioSection } from '../TrioSection';

const trios = [
  { count: 8, numbers: [15, 24] },
  { count: 7, numbers: [34, 42] },
] as TrioDatum[];

describe('TrioSection', () => {
  test('selects the pressed number in a trio', async () => {
    const onSelectNumber = jest.fn();
    const { getAllByRole } = await render(
      <TrioSection
        onSelectNumber={onSelectNumber}
        selectedNumber={12}
        trios={trios}
      />,
    );

    await fireEvent.press(getAllByRole('button', { name: '24번 탐색' })[0]);

    expect(onSelectNumber).toHaveBeenCalledWith(24);
  });

  test('marks the current number as selected in every trio', async () => {
    const { getAllByRole } = await render(
      <TrioSection
        onSelectNumber={jest.fn()}
        selectedNumber={12}
        trios={trios}
      />,
    );

    const selectedActions = getAllByRole('button', { name: '12번 탐색' });
    expect(selectedActions).toHaveLength(2);
    selectedActions.forEach((action) => {
      expect(action.props.accessibilityState.selected).toBe(true);
    });
  });
});
