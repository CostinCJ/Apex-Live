import { Platform, TextStyle } from 'react-native';

const monoFont = Platform.select({
  ios: 'SF Mono',
  android: 'monospace',
  default: 'monospace',
});

export const typography = {
  /** Workout timer - 72sp, monospace to prevent layout shift */
  timer: {
    fontFamily: monoFont,
    fontSize: 72,
    fontWeight: '700',
    lineHeight: 80,
    letterSpacing: -1,
  } satisfies TextStyle,

  /** Primary metric during workout - 48sp */
  metricLarge: {
    fontSize: 48,
    fontWeight: '700',
    lineHeight: 56,
  } satisfies TextStyle,

  /** Secondary metric - 32sp */
  metricMedium: {
    fontSize: 32,
    fontWeight: '600',
    lineHeight: 40,
  } satisfies TextStyle,

  /** Metric label - 14sp */
  metricLabel: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    textTransform: 'uppercase',
    letterSpacing: 1,
  } satisfies TextStyle,

  /** Page title */
  title: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
  } satisfies TextStyle,

  /** Section heading */
  heading: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
  } satisfies TextStyle,

  /** Body text */
  body: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  } satisfies TextStyle,

  /** Small body / caption */
  caption: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  } satisfies TextStyle,

  /** Button text */
  button: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
  } satisfies TextStyle,
} as const;
