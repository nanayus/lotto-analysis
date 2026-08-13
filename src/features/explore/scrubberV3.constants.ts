export const NUMBER_STEP = 48;
// Normalized viewport Y shared by the number scale, focus tick, and rail accent.
export const FOCUS_Y = 0.5;

export const SELECTED_SCALE = 1;
export const NEAR_SCALE = 0.65;
export const FAR_SCALE = 0.36;

export const SELECTED_OPACITY = 1;
export const NEAR_OPACITY = 0.64;
export const FAR_OPACITY = 0.1;

export const FISHEYE_X_OFFSET = 3;
export const LABEL_RAIL_SAFE_GAP = 28;

export const RAIL_X = 0.71;
export const RAIL_ACCENT_REST_LENGTH = 92;
export const RAIL_ACCENT_MAX_LENGTH = 118;

export const SCROLL_END_DEBOUNCE_MS = 140;
export const FINAL_SNAP_DURATION = 180;
export const PROGRAMMATIC_SCROLL_GUARD_MS = 320;
export const RAIL_MAX_VISUAL_VELOCITY = 1350;
export const VELOCITY_FOR_MAX_DEFORMATION = RAIL_MAX_VISUAL_VELOCITY;
export const SLOW_HAPTIC_VELOCITY = 260;
export const SCROLL_DECELERATION_RATE = 'fast' as const;
export const INTERACTION_EMPHASIS_DURATION = 190;
export const INTERACTION_IDLE_DELAY = 260;

export const RAIL_RECOVERY_CONFIG = {
  damping: 24,
  mass: 0.7,
  overshootClamping: true,
  stiffness: 210,
} as const;

export const USE_NUMBER_SCRUBBER_V3 = true;
