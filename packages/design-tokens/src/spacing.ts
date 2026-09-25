/** Base spacing scale (Section 3.3: "consistent base spacing scale"). */
export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export const radius = {
  sm: 6,
  md: 12,
  lg: 20,
  pill: 999,
} as const;

/** Section 4: responsive breakpoints (px, min-width). */
export const breakpoints = {
  compact: 0,
  medium: 600,
  wide: 1024,
  large: 1440,
} as const;

/** Minimum accessible touch target (Section 28: Accessibility). */
export const minTouchTarget = 44;
