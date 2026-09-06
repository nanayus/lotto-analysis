import { render } from '@testing-library/react-native';
import { describe, expect, jest, test } from '@jest/globals';
import { StyleSheet } from 'react-native';

import { darkColors } from '@/theme';

import { LibraryStatusActions } from '../components/LibraryStatusActions';

describe('LibraryStatusActions', () => {
  test('uses the filled active treatment for the favorite state', async () => {
    const screen = await render(
      <LibraryStatusActions
        favorite
        onToggleFavorite={jest.fn()}
      />,
    );

    const favoriteButton = screen.getByRole('button', { name: '즐겨찾기 해제' });

    expect(favoriteButton.props.accessibilityState).toEqual({ selected: true });
    expect(StyleSheet.flatten(favoriteButton.props.style).backgroundColor)
      .toBe(darkColors.surfaceAccent);
    expect(screen.queryByRole('button', { name: /구매/ })).toBeNull();
  });
});
