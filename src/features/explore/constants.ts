export const MIN_NUMBER = 1;
export const MAX_NUMBER = 45;
export const NUMBER_STEP = 48;
export const FLING_VELOCITY_THRESHOLD = 620;
export const DECELERATION = 0.975;
export const MAX_FLING_DISTANCE = 8;
export const HANDLE_SIZE = 46;
export const CURVE_RADIUS = 72;
export const RAIL_BASE_OFFSET = 58;

export const SNAP_SPRING_CONFIG = {
  damping: 22,
  mass: 0.62,
  overshootClamping: true,
  stiffness: 285,
} as const;
