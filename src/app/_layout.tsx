import { useEffect, useState, useCallback } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Sentry from '@sentry/react-native';
import { colors } from '@/theme/colors';
import { AuthProvider, useAuthContext } from '@/features/auth/context/AuthContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Toast } from '@/components/Toast';
import type { ToastMessage } from '@/components/Toast';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAppState } from '@/hooks/useAppState';
import { syncQueue } from '@/services/api/SyncQueue';

// expo-av native module may not be in dev build — code handles this gracefully
// but the error surfaces in LogBox. Suppress it to avoid red screen.
LogBox.ignoreLogs([
  'Cannot find native module',
  'expo-av native module not available',
  'Expo AV has been deprecated',
]);

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
  enabled: !__DEV__,
  tracesSampleRate: 0.2,
  attachScreenshot: true,
  enableNativeFramesTracking: true,
});

// Initialize SyncQueue on app load (restores pending operations from storage)
void syncQueue.initialize().then(() => {
  void syncQueue.processQueue();
});

function RootNavigator() {
  const { session, loading } = useAuthContext();
  const hasCompletedOnboarding = useSettingsStore((s) => s.hasCompletedOnboarding);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[0] === 'onboarding';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      if (!hasCompletedOnboarding) {
        router.replace('/onboarding');
      } else {
        router.replace('/(tabs)');
      }
    } else if (session && !hasCompletedOnboarding && !inOnboarding) {
      router.replace('/onboarding');
    }
  }, [session, loading, segments, hasCompletedOnboarding, router]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="(auth)"
        options={{ animation: 'fade' }}
      />
      <Stack.Screen
        name="onboarding"
        options={{ animation: 'fade', gestureEnabled: false }}
      />
      <Stack.Screen
        name="workout/[id]"
        options={{
          presentation: 'fullScreenModal',
          animation: 'slide_from_bottom',
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="workout/custom-builder"
        options={{
          presentation: 'fullScreenModal',
          animation: 'slide_from_bottom',
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="workout/detail/[id]"
        options={{
          animation: 'slide_from_right',
        }}
      />
    </Stack>
  );
}

function RootLayout() {
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const dismissToast = useCallback(() => setToast(null), []);

  // Process SyncQueue when app returns to foreground
  useAppState({
    onForeground: () => {
      void syncQueue.processQueue();
    },
  });

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <ErrorBoundary level="root">
          <AuthProvider>
            <RootNavigator />
            <Toast message={toast} onDismiss={dismissToast} />
          </AuthProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
