import { render } from '@testing-library/react-native';
import { describe, expect, jest, test } from '@jest/globals';
import { StyleSheet } from 'react-native';

import { darkColors } from '@/theme';

import { LibraryStatusActions } from '../components/LibraryStatusActions';

describe('LibraryStatusActions', () => {
  test('uses the filled active treatment for purchased and favorite states', async () => {
    const screen = await render(
      <LibraryStatusActions
        favorite
        onToggleFavorite={jest.fn()}
        onTogglePurchased={jest.fn()}
        purchased
      />,
    );

    const purchasedButton = screen.getByRole('button', { name: '구매 표시 해제' });
    const favoriteButton = screen.getByRole('button', { name: '즐겨찾기 해제' });

    expect(purchasedButton.props.accessibilityState).toEqual({ selected: true });
    expect(favoriteButton.props.accessibilityState).toEqual({ selected: true });
    expect(StyleSheet.flatten(purchasedButton.props.style).backgroundColor)
      .toBe(darkColors.surfaceAccent);
    expect(StyleSheet.flatten(favoriteButton.props.style).backgroundColor)
      .toBe(darkColors.surfaceAccent);
  });
});
