export const colors = {
  // Backgrounds
  background: '#0D0D0D',
  surface: '#1A1A1A',
  surfaceElevated: '#262626',
  surfacePressed: '#333333',

  // Text
  textPrimary: '#F0F0F0',
  textSecondary: '#A0A0A0',
  textTertiary: '#707070',
  textInverse: '#0D0D0D',

  // Accent
  primary: '#4ADE80',
  primaryDim: '#22C55E',
  secondary: '#60A5FA',
  secondaryDim: '#3B82F6',

  // Semantic
  success: '#34D399',
  warning: '#FBBF24',
  danger: '#F87171',
  error: '#F87171',
  info: '#60A5FA',

  // Heart rate zones
  hrZone1: '#60A5FA', // Rest / Warm-up (blue)
  hrZone2: '#4ADE80', // Fat burn (green)
  hrZone3: '#FBBF24', // Cardio (yellow)
  hrZone4: '#FB923C', // Hard (orange)
  hrZone5: '#F87171', // Peak (red)

  // Voice coach states
  voiceIdle: '#707070',
  voiceListening: '#4ADE80',
  voiceProcessing: '#FBBF24',
  voiceSpeaking: '#60A5FA',
  voiceError: '#F87171',

  // Misc
  border: '#333333',
  overlay: 'rgba(0, 0, 0, 0.7)',
  transparent: 'transparent',
  white: '#FFFFFF',
  black: '#000000',
} as const;

export type ColorToken = keyof typeof colors;
