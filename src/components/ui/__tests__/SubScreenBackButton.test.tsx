import { act, fireEvent, render } from '@testing-library/react-native';
import { describe, expect, jest, test } from '@jest/globals';

import { SubScreenBackButton } from '../SubScreenBackButton';

describe('SubScreenBackButton', () => {
  test('calls the previous-screen action when pressed', async () => {
    const onPress = jest.fn();
    const screen = await render(<SubScreenBackButton onPress={onPress} />);

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: '이전 화면으로 돌아가기' }));
    });

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
