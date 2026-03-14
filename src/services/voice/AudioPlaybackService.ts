// Lazy-loaded expo-av and expo-file-system to avoid crash in Expo Go
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let modules: { Audio: any; File: any; Paths: any } | null = null;

let modulesUnavailable = false;

async function getModules() {
  if (modulesUnavailable) return null;
  if (!modules) {
    try {
      const [av, fs] = await Promise.all([
        import('expo-av'),
        import('expo-file-system'),
      ]);
      // Probe: verify native modules are usable
      await av.Audio.getPermissionsAsync();
      modules = { Audio: av.Audio, File: fs.File, Paths: fs.Paths };
    } catch {
      console.warn('expo-av/expo-file-system native modules not available (Expo Go?)');
      modulesUnavailable = true;
      return null;
    }
  }
  return modules;
}

export class AudioPlaybackService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private currentSound: any = null;
  private audioQueue: string[] = [];
  private isPlaying = false;
  private onSpeakingChange: ((speaking: boolean) => void) | null = null;
  private fileCounter = 0;
  private consecutiveErrors = 0;

  async initialize(): Promise<void> {
    const mods = await getModules();
    if (!mods) return;
    const { Audio } = mods;
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
    this.consecutiveErrors = 0;

    try {
      const mods = await getModules();
      if (!mods) {
        this.isPlaying = false;
        this.onSpeakingChange?.(false);
        return;
      }
      const { Audio, File, Paths } = mods;

      // Write base64 audio to a temp file using new expo-file-system API
      this.fileCounter++;
      const file = new File(Paths.cache, `coach_audio_${this.fileCounter}.wav`);
      file.write(base64, { encoding: 'base64' });

      const { sound } = await Audio.Sound.createAsync(
        { uri: file.uri },
        { shouldPlay: true },
      );
      this.currentSound = sound;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.isLoaded && status.didJustFinish) {
          void this.onPlaybackFinished(sound, file);
        }
      });
    } catch (error: unknown) {
      console.error('Playback error:', error);
      this.consecutiveErrors++;
      if (this.consecutiveErrors >= 3) {
        this.isPlaying = false;
        this.audioQueue = [];
        this.onSpeakingChange?.(false);
        return;
      }
      this.isPlaying = false;
      this.onSpeakingChange?.(false);
      setTimeout(() => void this.playNext(), 0);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async onPlaybackFinished(sound: any, file: any): Promise<void> {
    try {
      await sound.unloadAsync();
    } catch {
      // Ignore unload errors
    }

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
