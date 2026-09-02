import { describe, expect, it } from '@jest/globals';

import {
  analyticsScreenName,
  combinationAnalyticsParams,
  compactAnalyticsParams,
} from '../events';

describe('analytics events', () => {
  it('normalizes a combination into stable, queryable fields', () => {
    expect(combinationAnalyticsParams([45, 3, 4, 22, 13, 27], { source: 'manual' })).toEqual({
      combination_key: '03-04-13-22-27-45',
      consecutive_link_count: 1,
      number_1: 3,
      number_2: 4,
      number_3: 13,
      number_4: 22,
      number_5: 27,
      number_6: 45,
      number_sum: 114,
      odd_count: 4,
      source: 'manual',
    });
  });

  it('removes parameters GA cannot accept', () => {
    expect(compactAnalyticsParams({ empty: null, missing: undefined, valid: 3 })).toEqual({ valid: 3 });
  });

  it('keeps article URLs from creating a screen name per slug', () => {
    expect(analyticsScreenName('/content/how-to-read-data')).toBe('content_article');
    expect(analyticsScreenName('/combination-analysis')).toBe('combination_analysis');
  });
});
