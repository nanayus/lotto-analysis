import { describe, expect, test } from '@jest/globals';

import { isAnalysisAuthorized } from '../types';

describe('isAnalysisAuthorized', () => {
  test('accepts Pro authorization', () => {
    expect(isAnalysisAuthorized('AUTHORIZED_PRO')).toBe(true);
  });

  test('rejects a request that needs a reward or Pro', () => {
    expect(isAnalysisAuthorized('REWARD_OR_PRO_REQUIRED')).toBe(false);
  });
});
