import { Platform } from 'react-native';

/**
 * Plays a silent audio loop to keep the app alive in the background on iOS.
 * iOS suspends apps that aren't actively producing audio, which kills the
 * WebSocket connection to the voice coach. This service produces inaudible
 * audio to keep the process running.
 *
 * Uses dynamic import for expo-av so the app doesn't crash in Expo Go
 * (where native modules aren't available).
 *
 * Requires UIBackgroundModes: ["audio"] in app.config.ts (already configured).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let soundRef: any = null;
let isRunning = false;

export async function startBackgroundKeepAlive(): Promise<void> {
  if (isRunning) return;

  try {
    const ExpoAV = await import('expo-av');
    const { Audio } = ExpoAV;

    // Probe: check if native module is actually available
    if (!Audio || typeof Audio.setAudioModeAsync !== 'function') {
      console.warn('BackgroundKeepAlive: expo-av native module not available');
      return;
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      interruptionModeIOS: ExpoAV.InterruptionModeIOS.DuckOthers,
      interruptionModeAndroid: ExpoAV.InterruptionModeAndroid.DuckOthers,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    if (Platform.OS === 'ios') {
      // Generate a minimal valid WAV file (1 second of silence at 22050Hz mono 16-bit)
      const sampleRate = 22050;
      const numSamples = sampleRate;
      const dataSize = numSamples * 2;
      const fileSize = 36 + dataSize;

      const buffer = new ArrayBuffer(44 + dataSize);
      const view = new DataView(buffer);
      view.setUint32(0, 0x52494646, false); // 'RIFF'
      view.setUint32(4, fileSize, true);
      view.setUint32(8, 0x57415645, false); // 'WAVE'
      view.setUint32(12, 0x666d7420, false); // 'fmt '
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true); // PCM
      view.setUint16(22, 1, true); // mono
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * 2, true);
      view.setUint16(32, 2, true);
      view.setUint16(34, 16, true);
      view.setUint32(36, 0x64617461, false); // 'data'
      view.setUint32(40, dataSize, true);

      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]!);
      }
      const base64 = btoa(binary);
      const silentUri = `data:audio/wav;base64,${base64}`;

      const { sound } = await Audio.Sound.createAsync(
        { uri: silentUri },
        { isLooping: true, volume: 0, shouldPlay: false },
      );
      soundRef = sound;

      await sound.setVolumeAsync(0);
      await sound.setIsLoopingAsync(true);
      await sound.playAsync();
    }

    isRunning = true;
  } catch (err) {
    console.warn('BackgroundKeepAlive start failed:', err);
    // Non-critical — the app will still work, just might suspend in background
  }
}

export async function stopBackgroundKeepAlive(): Promise<void> {
  if (!isRunning) return;

  try {
    if (soundRef) {
      await soundRef.stopAsync();
      await soundRef.unloadAsync();
      soundRef = null;
    }
  } catch {
    // Ignore cleanup errors
  }

  isRunning = false;
}

export function isBackgroundKeepAliveRunning(): boolean {
  return isRunning;
}
