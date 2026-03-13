export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export const touchTarget = {
  /** Minimum during active workout (sweat-proof) */
  workout: 56,
  /** Standard minimum */
  standard: 48,
  /** Apple HIG minimum */
  minimum: 44,
} as const;

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;
