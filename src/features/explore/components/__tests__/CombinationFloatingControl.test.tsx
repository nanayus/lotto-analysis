import { act, fireEvent, render } from '@testing-library/react-native';
import { describe, expect, jest, test } from '@jest/globals';

import { CombinationFloatingControl } from '../CombinationFloatingControl';

describe('CombinationFloatingControl', () => {
  test('moves from add to selected and then to the analysis action', async () => {
    const onAnalyze = jest.fn();
    const onToggle = jest.fn();
    const view = await render(
      <CombinationFloatingControl
        currentNumber={16}
        currentSelected={false}
        onAnalyze={onAnalyze}
        onToggle={onToggle}
        selectedCount={0}
      />,
    );

    expect(view.getByText('+')).toBeTruthy();
    expect(view.queryByText('0/6')).toBeNull();
    await act(async () => {
      await fireEvent.press(view.getByRole('button', { name: '16번 조합에 담기' }));
    });
    expect(onToggle).toHaveBeenCalledTimes(1);

    await act(async () => {
      await view.rerender(
        <CombinationFloatingControl
          currentNumber={16}
          currentSelected
          onAnalyze={onAnalyze}
          onToggle={onToggle}
          selectedCount={3}
        />,
      );
    });
    expect(view.getByText('✓')).toBeTruthy();
    expect(view.getByText('3/6')).toBeTruthy();

    await act(async () => {
      await view.rerender(
        <CombinationFloatingControl
          currentNumber={16}
          currentSelected
          onAnalyze={onAnalyze}
          onToggle={onToggle}
          selectedCount={6}
        />,
      );
    });
    expect(view.getByText('6/6')).toBeTruthy();
    expect(view.getByText('분석하기 →')).toBeTruthy();
    await act(async () => {
      await fireEvent.press(view.getByRole('button', { name: '선택한 조합 분석하기' }));
    });
    expect(onAnalyze).toHaveBeenCalledTimes(1);
  });
});
