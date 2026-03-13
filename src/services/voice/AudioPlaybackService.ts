import { Audio, type AVPlaybackStatus } from 'expo-av';
import { File, Paths } from 'expo-file-system';

export class AudioPlaybackService {
  private currentSound: Audio.Sound | null = null;
  private audioQueue: string[] = [];
  private isPlaying = false;
  private onSpeakingChange: ((speaking: boolean) => void) | null = null;
  private fileCounter = 0;

  async initialize(): Promise<void> {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
    });
  }

  setSpeakingCallback(callback: (speaking: boolean) => void): void {
    this.onSpeakingChange = callback;
  }

  enqueueAudio(base64Audio: string): void {
    this.audioQueue.push(base64Audio);
    if (!this.isPlaying) {
      void this.playNext();
    }
  }

  async interrupt(): Promise<void> {
    this.audioQueue = [];
    await this.stopCurrent();
  }

  async cleanup(): Promise<void> {
    await this.interrupt();
    this.onSpeakingChange = null;
  }

  private async playNext(): Promise<void> {
    const base64 = this.audioQueue.shift();
    if (!base64) {
      this.isPlaying = false;
      this.onSpeakingChange?.(false);
      return;
    }

    this.isPlaying = true;
    this.onSpeakingChange?.(true);

    try {
      // Write base64 audio to a temp file using new expo-file-system API
      this.fileCounter++;
      const file = new File(Paths.cache, `coach_audio_${this.fileCounter}.wav`);
      file.write(base64, { encoding: 'base64' });

      const { sound } = await Audio.Sound.createAsync(
        { uri: file.uri },
        { shouldPlay: true },
      );
      this.currentSound = sound;

      sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
        if (status.isLoaded && status.didJustFinish) {
          void this.onPlaybackFinished(sound, file);
        }
      });
    } catch (error) {
      console.error('Playback error:', error);
      this.isPlaying = false;
      this.onSpeakingChange?.(false);
      void this.playNext();
    }
  }

  private async onPlaybackFinished(sound: Audio.Sound, file: File): Promise<void> {
    try {
      await sound.unloadAsync();
    } catch {
      // Ignore unload errors
    }

    // Clean up temp file
    try {
      file.delete();
    } catch {
      // Ignore cleanup errors
    }

    if (this.currentSound === sound) {
      this.currentSound = null;
    }

    void this.playNext();
  }

  private async stopCurrent(): Promise<void> {
    if (this.currentSound) {
      try {
        await this.currentSound.stopAsync();
        await this.currentSound.unloadAsync();
      } catch {
        // Ignore errors during cleanup
      }
      this.currentSound = null;
    }
    this.isPlaying = false;
    this.onSpeakingChange?.(false);
  }
}
