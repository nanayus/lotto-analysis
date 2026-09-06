export type AnalyticsValue = string | number | boolean;

export type AnalyticsParams = Record<string, AnalyticsValue | null | undefined>;

export type AnalyticsEventName =
  | 'analysis_gate_viewed'
  | 'analysis_requested'
  | 'analysis_result_interaction'
  | 'analysis_result_viewed'
  | 'analysis_section_viewed'
  | 'combination_generated'
  | 'generator_condition_used'
  | 'interstitial_ad_completed'
  | 'interstitial_ad_failed'
  | 'interstitial_ad_started'
  | 'login_completed'
  | 'login_prompt_closed'
  | 'login_prompt_viewed'
  | 'login_started'
  | 'new_draw_announcement_closed'
  | 'new_draw_announcement_opened'
  | 'new_draw_announcement_viewed'
  | 'paywall_closed'
  | 'paywall_viewed'
  | 'purchase_completed'
  | 'purchase_failed'
  | 'purchase_restore_failed'
  | 'purchase_restored'
  | 'purchase_started';

const SCREEN_NAMES: Record<string, string> = {
  '/': 'home',
  '/account-deletion': 'account_deletion',
  '/auth/callback': 'auth_callback',
  '/combination-analysis': 'combination_analysis',
  '/combination-generator': 'combination_generator',
  '/content': 'content',
  '/draw': 'draw',
  '/draw/random-draw': 'random_draw',
  '/my-numbers': 'my_numbers',
  '/settings': 'settings',
  '/statistics': 'statistics',
  '/statistics/explore': 'number_explore',
  '/statistics/overall-statistics': 'overall_statistics',
};

export function analyticsCollectionEnabled() {
  if (process.env.NODE_ENV === 'test') return false;
  const configured = process.env.EXPO_PUBLIC_ANALYTICS_ENABLED;
  if (configured === 'true') return true;
  if (configured === 'false') return false;
  return !__DEV__;
}

export function compactAnalyticsParams(params: AnalyticsParams = {}) {
  return Object.fromEntries(
    Object.entries(params).filter((entry): entry is [string, AnalyticsValue] => (
      entry[1] !== null && entry[1] !== undefined
    )),
  );
}

export function combinationAnalyticsParams(
  numbers: readonly number[],
  extra: AnalyticsParams = {},
) {
  const normalized = [...numbers].sort((left, right) => left - right);
  const oddCount = normalized.filter((number) => number % 2 === 1).length;
  const consecutiveLinkCount = normalized.reduce((count, number, index) => (
    index > 0 && number === normalized[index - 1] + 1 ? count + 1 : count
  ), 0);

  return compactAnalyticsParams({
    ...extra,
    combination_key: normalized.map((number) => String(number).padStart(2, '0')).join('-'),
    consecutive_link_count: consecutiveLinkCount,
    number_1: normalized[0],
    number_2: normalized[1],
    number_3: normalized[2],
    number_4: normalized[3],
    number_5: normalized[4],
    number_6: normalized[5],
    number_sum: normalized.reduce((sum, number) => sum + number, 0),
    odd_count: oddCount,
  });
}

export function analyticsScreenName(pathname: string) {
  if (pathname.startsWith('/content/')) return 'content_article';
  return SCREEN_NAMES[pathname] ?? (
    pathname
      .replace(/^\/+/, '')
      .replace(/[^a-zA-Z0-9_]+/g, '_')
      .slice(0, 100)
    || 'home'
  );
}
