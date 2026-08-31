const TOP_EDGE_OFFSET = 12;
const HIDE_DISTANCE = 28;
const SHOW_DISTANCE = 14;

type ScrollDirection = 'down' | 'up' | null;

export type TabBarScrollTracker = {
  accumulatedDistance: number;
  direction: ScrollDirection;
  lastOffset: number;
};

export type TabBarScrollAction = 'hide' | 'show' | null;

export function createTabBarScrollTracker(offset = 0): TabBarScrollTracker {
  return {
    accumulatedDistance: 0,
    direction: null,
    lastOffset: Math.max(0, offset),
  };
}

export function trackTabBarScroll(
  tracker: TabBarScrollTracker,
  rawOffset: number,
): { action: TabBarScrollAction; tracker: TabBarScrollTracker } {
  const offset = Math.max(0, rawOffset);

  if (offset <= TOP_EDGE_OFFSET) {
    return { action: 'show', tracker: createTabBarScrollTracker(offset) };
  }

  const delta = offset - tracker.lastOffset;
  if (Math.abs(delta) < 1) {
    return { action: null, tracker: { ...tracker, lastOffset: offset } };
  }

  const direction: Exclude<ScrollDirection, null> = delta > 0 ? 'down' : 'up';
  const accumulatedDistance = tracker.direction === direction
    ? tracker.accumulatedDistance + Math.abs(delta)
    : Math.abs(delta);
  const threshold = direction === 'down' ? HIDE_DISTANCE : SHOW_DISTANCE;

  return {
    action: accumulatedDistance >= threshold ? direction === 'down' ? 'hide' : 'show' : null,
    tracker: {
      accumulatedDistance: accumulatedDistance >= threshold ? 0 : accumulatedDistance,
      direction,
      lastOffset: offset,
    },
  };
}
