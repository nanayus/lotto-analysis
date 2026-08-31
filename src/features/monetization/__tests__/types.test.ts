import { describe, expect, test } from '@jest/globals';

import { isAnalysisAuthorized } from '../types';

describe('isAnalysisAuthorized', () => {
  test.each([
    'UNLOCKED_EXISTING',
    'AUTHORIZED_PRO',
    'AUTHORIZED_WEEKLY',
    'AUTHORIZED_CREDIT',
  ] as const)('accepts %s', (decision) => {
    expect(isAnalysisAuthorized(decision)).toBe(true);
  });

  test('rejects a request that needs a reward or Pro', () => {
    expect(isAnalysisAuthorized('REWARD_OR_PRO_REQUIRED')).toBe(false);
  });
});
