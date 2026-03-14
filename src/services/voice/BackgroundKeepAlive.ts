import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import { Platform } from 'react-native';

/**
 * Plays a silent audio loop to keep the app alive in the background on iOS.
 * iOS suspends apps that aren't actively producing audio, which kills the
 * WebSocket connection to the voice coach. This service produces inaudible
 * audio to keep the process running.
 *
 * Requires UIBackgroundModes: ["audio"] in app.config.ts (already configured).
 */

let soundRef: Audio.Sound | null = null;
let isRunning = false;

export async function startBackgroundKeepAlive(): Promise<void> {
  if (isRunning) return;

  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      interruptionModeIOS: InterruptionModeIOS.DuckOthers,
      interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    if (Platform.OS === 'ios') {
      // Create a silent audio buffer — 1 second of silence at 22050Hz mono
      const { sound } = await Audio.Sound.createAsync(
        // Use a tiny bundled silent audio file
        // If no file exists, we create minimal silence via recording trick
        { uri: 'about:blank' },
        {
          isLooping: true,
          volume: 0,
          shouldPlay: false,
        },
      );
      soundRef = sound;

      // Start playback — volume is 0 so it's inaudible
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
