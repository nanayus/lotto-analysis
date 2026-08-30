import { describe, expect, test } from '@jest/globals';

import { buildCombinationReturnDestination } from '../combinationNavigation';

describe('combination analysis return navigation', () => {
  test.each([
    ['draw', '/(tabs)/draw'],
    ['my-numbers', '/(tabs)/my-numbers'],
    ['explore', '/(tabs)/explore'],
    ['statistics', '/(tabs)/statistics'],
    [undefined, '/(tabs)/statistics'],
  ])('returns %s analysis to its explicit parent', (target, expected) => {
    expect(buildCombinationReturnDestination({ target })).toBe(expected);
  });

  test('returns random analysis to the same random draw route', () => {
    expect(buildCombinationReturnDestination({
      gameCount: '5',
      target: 'random-draw',
      token: 'draw-token',
    })).toEqual({
      pathname: '/(tabs)/draw/random-draw',
      params: {
        count: '5',
        draw: 'draw-token',
      },
    });
  });

  test('returns generated analysis to a freshly opened condition selector', () => {
    expect(buildCombinationReturnDestination({
      gameCount: '3',
      sessionToken: 'generator-session',
      target: 'combination-generator',
      token: 'conditions-token',
    })).toEqual({
      pathname: '/(tabs)/draw/combination-generator',
      params: {
        count: '3',
        openConditions: 'conditions-token',
        sessionToken: 'generator-session',
      },
    });
  });
});
