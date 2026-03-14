import { ExpoConfig, ConfigContext } from 'expo/config';

const APP_ENV = process.env.APP_ENV ?? 'development';

const envConfig = {
  development: {
    name: 'Apex (Dev)',
    bundleId: 'com.apexlive.dev',
    icon: './assets/icon.png',
  },
  staging: {
    name: 'Apex (Staging)',
    bundleId: 'com.apexlive.staging',
    icon: './assets/icon.png',
  },
  production: {
    name: 'Apex Live',
    bundleId: 'com.apexlive.app',
    icon: './assets/icon.png',
  },
} as const;

type EnvKey = keyof typeof envConfig;
const env = envConfig[APP_ENV as EnvKey] ?? envConfig.development;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: env.name,
  slug: 'apex-live',
  version: '1.0.0',
  orientation: 'portrait',
  icon: env.icon,
  userInterfaceStyle: 'dark',
  scheme: 'apex-live',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#0D0D0D',
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: env.bundleId,
    infoPlist: {
      UIBackgroundModes: ['audio'],
      NSMicrophoneUsageDescription:
        'Apex needs microphone access so you can talk to your AI coach hands-free during workouts.',
      NSHealthShareUsageDescription:
        'Apex reads your workout metrics like heart rate and calories to provide real-time coaching.',
      NSHealthUpdateUsageDescription:
        'Apex logs completed workouts to Apple Health.',
    },
    entitlements: {
      'com.apple.developer.healthkit': true,
      'com.apple.developer.healthkit.background-delivery': true,
    },
  },
  android: {
    package: env.bundleId,
    adaptiveIcon: {
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
      backgroundColor: '#0D0D0D',
    },
  },
  plugins: [
    ['expo-router', { root: './src/app' }],
    [
      'expo-secure-store',
      {
        faceIDPermission:
          'Allow Apex to use Face ID to securely access your account.',
      },
    ],
    [
      '@sentry/react-native',
      {
        organization: 'student-keg',
        project: 'apex-live',
      },
    ],
  ],
  extra: {
    appEnv: APP_ENV,
    eas: {
      projectId: 'b87c63c3-e214-4d7c-9063-ba2b2bc3ceaf',
    },
  },
  updates: {
    url: 'https://u.expo.dev/b87c63c3-e214-4d7c-9063-ba2b2bc3ceaf',
  },
  runtimeVersion: {
    policy: 'appVersion' as const,
  },
});
