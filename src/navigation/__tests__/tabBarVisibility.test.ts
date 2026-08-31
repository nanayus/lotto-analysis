import { describe, expect, test } from '@jest/globals';

import {
  createTabBarScrollTracker,
  type TabBarScrollAction,
  trackTabBarScroll,
} from '../tabBarScrollTracker';

function scroll(offsets: number[]) {
  let tracker = createTabBarScrollTracker();
  let action: TabBarScrollAction = null;

  offsets.forEach((offset) => {
    const result = trackTabBarScroll(tracker, offset);
    tracker = result.tracker;
    action = result.action ?? action;
  });

  return action;
}

describe('tab bar scroll visibility', () => {
  test('hides only after downward travel passes the threshold', () => {
    expect(scroll([13, 20, 27])).toBeNull();
    expect(scroll([13, 24, 42])).toBe('hide');
  });

  test('shows sooner when the scroll direction changes upward', () => {
    expect(scroll([50, 75, 68, 59])).toBe('show');
  });

  test('always shows near the top, including iOS overscroll', () => {
    expect(scroll([50, 80, 8])).toBe('show');
    expect(scroll([50, 80, -12])).toBe('show');
  });

  test('resets accumulated travel when direction changes', () => {
    expect(scroll([13, 25, 20, 31, 37])).toBeNull();
  });
});
