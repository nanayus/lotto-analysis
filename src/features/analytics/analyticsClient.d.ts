import type { AnalyticsEventName, AnalyticsParams } from './events';

export function trackEvent(name: AnalyticsEventName, params?: AnalyticsParams): void;
export function trackScreen(pathname: string): void;
