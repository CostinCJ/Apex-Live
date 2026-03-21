import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';

/**
 * Lightweight offline detection hook.
 * Uses fetch-based connectivity check since @react-native-community/netinfo
 * is not installed. Falls back to AppState-based detection.
 *
 * Does NOT show blocking modals during active workout (Phase 9 rule).
 * Exposes state for the UI to render an "Offline Mode" badge.
 */
export function useOfflineWorkout() {
  const [isOffline, setIsOffline] = useState(false);
  const [offlineSince, setOfflineSince] = useState<number | null>(null);
  const checkTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkConnectivity = useCallback(async () => {
    try {
      // Use a lightweight HEAD request to check connectivity
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001'}/health`,
        {
          method: 'HEAD',
          signal: controller.signal,
        },
      );
      clearTimeout(timeout);

      // Any response (even 401) means we're online
      if (res) {
        if (isOffline) {
          setIsOffline(false);
          setOfflineSince(null);
        }
      }
    } catch {
      if (!isOffline) {
        setIsOffline(true);
        setOfflineSince(Date.now());
      }
    }
  }, [isOffline]);

  useEffect(() => {
    // Initial check
    void checkConnectivity();

    // Periodic check every 30s
    checkTimerRef.current = setInterval(() => {
      void checkConnectivity();
    }, 30_000);

    // Also re-check when app comes to foreground
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void checkConnectivity();
      }
    });

    return () => {
      if (checkTimerRef.current) {
        clearInterval(checkTimerRef.current);
        checkTimerRef.current = null;
      }
      subscription.remove();
    };
  }, [checkConnectivity]);

  return {
    isOffline,
    offlineSince,
    offlineMinutes: offlineSince ? Math.floor((Date.now() - offlineSince) / 60_000) : 0,
  };
}
