import { act, fireEvent, render } from '@testing-library/react-native';
import { describe, expect, jest, test } from '@jest/globals';
import { StyleSheet, Text } from 'react-native';

import { SubScreenHeader, TOP_BAR_HEIGHT } from '../AppTopBar';

describe('SubScreenHeader', () => {
  test('keeps every sub screen on the shared 58px header and routes its actions', async () => {
    const onBack = jest.fn();
    const onRight = jest.fn();
    const screen = await render(
      <SubScreenHeader
        onBack={onBack}
        right={<Text onPress={onRight}>도움말</Text>}
        title="상세 화면"
      />,
    );

    expect(StyleSheet.flatten(screen.getByTestId('sub-screen-header').props.style).height)
      .toBe(TOP_BAR_HEIGHT);
    expect(TOP_BAR_HEIGHT).toBe(58);
    expect(screen.getByText('상세 화면')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: '이전 화면으로 돌아가기' }));
      fireEvent.press(screen.getByText('도움말'));
    });

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onRight).toHaveBeenCalledTimes(1);
  });
});
