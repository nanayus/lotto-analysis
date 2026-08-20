import { act, fireEvent, render } from '@testing-library/react-native';
import { describe, expect, jest, test } from '@jest/globals';
import { StyleSheet } from 'react-native';

import type { PairDatum } from '@/data/numberAnalytics.types';
import { PairSection } from '../PairSection';

const pairs = Array.from({ length: 10 }, (_, index) => ({
  count: 20 - index,
  number: index + 1,
})) as PairDatum[];

describe('PairSection', () => {
  test('reserves end space and uses a borderless edge overlay', async () => {
    const { getByTestId } = await render(
      <PairSection onSelectNumber={jest.fn()} pairs={pairs} />,
    );
    const viewport = getByTestId('pair-viewport');
    const scroll = getByTestId('pair-horizontal-scroll');

    await act(async () => {
      fireEvent(viewport, 'layout', { nativeEvent: { layout: { width: 180 } } });
    });
    await act(async () => {
      fireEvent(scroll, 'contentSizeChange', 600, 64);
    });

    const contentStyle = StyleSheet.flatten(scroll.props.contentContainerStyle);
    const edgeStyle = StyleSheet.flatten(getByTestId('pair-right-edge').props.style);

    expect(contentStyle.paddingRight).toBe(56);
    expect(edgeStyle.width).toBe(40);
    expect(edgeStyle).not.toHaveProperty('borderRadius');
    expect(edgeStyle).not.toHaveProperty('borderWidth');
  });

  test('selects the pressed pair number', async () => {
    const onSelectNumber = jest.fn();
    const { getByRole } = await render(
      <PairSection onSelectNumber={onSelectNumber} pairs={pairs} />,
    );

    fireEvent.press(getByRole('button', { name: '4번 탐색' }));

    expect(onSelectNumber).toHaveBeenCalledWith(4);
  });

});
