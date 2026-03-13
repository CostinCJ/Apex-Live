import { useEffect, useRef, useCallback } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

interface AppStateCallbacks {
  onForeground?: () => void;
  onBackground?: () => void;
}

export function useAppState({ onForeground, onBackground }: AppStateCallbacks = {}) {
  const appState = useRef(AppState.currentState);

  const handleChange = useCallback(
    (nextState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextState === 'active'
      ) {
        onForeground?.();
      } else if (
        appState.current === 'active' &&
        nextState.match(/inactive|background/)
      ) {
        onBackground?.();
      }
      appState.current = nextState;
    },
    [onForeground, onBackground],
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', handleChange);
    return () => sub.remove();
  }, [handleChange]);

  return appState;
}
