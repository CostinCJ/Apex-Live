import { useState, useCallback } from 'react';
import { Alert, Linking } from 'react-native';

type PermissionStatus = 'undetermined' | 'granted' | 'denied';

export function useMicPermission() {
  const [status, setStatus] = useState<PermissionStatus>('undetermined');

  const request = useCallback(async (): Promise<boolean> => {
    try {
      const { Audio } = await import('expo-av');

      const { status: currentStatus } = await Audio.getPermissionsAsync();

      if (currentStatus === 'granted') {
        setStatus('granted');
        return true;
      }

      const { status: newStatus } = await Audio.requestPermissionsAsync();

      if (newStatus === 'granted') {
        setStatus('granted');
        return true;
      }

      setStatus('denied');

      Alert.alert(
        'Microphone Required',
        'Apex needs microphone access for voice coaching. Please enable it in Settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ],
      );

      return false;
    } catch {
      console.warn('expo-av not available — mic permission check skipped');
      return false;
    }
  }, []);

  return { status, request };
}
