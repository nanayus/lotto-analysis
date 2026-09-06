import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { describe, expect, test } from '@jest/globals';

import { CollapsibleConditionContent } from '../CollapsibleConditionContent';

describe('CollapsibleConditionContent', () => {
  test('mounts controls when enabled and removes them when disabled', async () => {
    const screen = await render(
      <CollapsibleConditionContent expanded={false}>
        <Text>조건 선택 컨트롤</Text>
      </CollapsibleConditionContent>,
    );

    expect(screen.queryByText('조건 선택 컨트롤')).toBeNull();

    await screen.rerender(
      <CollapsibleConditionContent expanded>
        <Text>조건 선택 컨트롤</Text>
      </CollapsibleConditionContent>,
    );

    expect(screen.getByText('조건 선택 컨트롤')).toBeTruthy();

    await screen.rerender(
      <CollapsibleConditionContent expanded={false}>
        <Text>조건 선택 컨트롤</Text>
      </CollapsibleConditionContent>,
    );

    expect(screen.queryByText('조건 선택 컨트롤')).toBeNull();
  });
});
