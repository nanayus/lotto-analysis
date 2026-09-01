import { act, fireEvent, render } from '@testing-library/react-native';
import { describe, expect, jest, test } from '@jest/globals';
import { router } from 'expo-router';

import { ContentHomeScreen } from '../ContentHomeScreen';

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

const mockPush = router.push as jest.Mock;

describe('ContentHomeScreen', () => {
  test('shows the editorial disclaimer and opens an article', async () => {
    mockPush.mockClear();
    const screen = await render(<ContentHomeScreen />);

    expect(screen.queryByText('콘텐츠')).toBeNull();
    expect(screen.getByText(/당첨을 예측하거나 보장하지 않습니다/)).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: '로또의 허와 실: 우리는 무엇을 사고 있는가' }));
    });

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/content/[slug]',
      params: { slug: 'lotto-myths-and-reality' },
    });
  });
});
