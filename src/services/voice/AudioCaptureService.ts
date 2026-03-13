import { Audio } from 'expo-av';
import { AUDIO_CHUNK_DURATION } from '@/utils/constants';

type AudioChunkCallback = (base64Audio: string) => void;

export class AudioCaptureService {
  private recording: Audio.Recording | null = null;
  private chunkTimer: ReturnType<typeof setInterval> | null = null;
  private onChunk: AudioChunkCallback | null = null;
  private isCapturing = false;

  async initialize(): Promise<boolean> {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });
      return true;
    } catch (error) {
      console.error('Audio init failed:', error);
      return false;
    }
  }

  async startCapture(onChunk: AudioChunkCallback): Promise<void> {
    if (this.isCapturing) return;

    this.onChunk = onChunk;
    this.isCapturing = true;

    await this.startNewRecording();

    // Chunked stop-read-restart pattern
    this.chunkTimer = setInterval(async () => {
      if (!this.isCapturing) return;

      try {
        const base64 = await this.stopAndReadRecording();
        if (base64 && this.onChunk) {
          this.onChunk(base64);
        }

        if (this.isCapturing) {
          await this.startNewRecording();
        }
      } catch (error) {
        console.error('Chunk capture error:', error);
      }
    }, AUDIO_CHUNK_DURATION);
  }

  async stopCapture(): Promise<void> {
    this.isCapturing = false;
    this.onChunk = null;

    if (this.chunkTimer) {
      clearInterval(this.chunkTimer);
      this.chunkTimer = null;
    }

    await this.stopAndReadRecording();
  }

  async cleanup(): Promise<void> {
    await this.stopCapture();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
    });
  }

  private async startNewRecording(): Promise<void> {
    try {
      const { recording } = await Audio.Recording.createAsync({
        isMeteringEnabled: false,
        android: {
          extension: '.wav',
          outputFormat: Audio.AndroidOutputFormat.DEFAULT,
          audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
          sampleRate: 24000,
          numberOfChannels: 1,
          bitRate: 384000,
        },
        ios: {
          extension: '.wav',
          outputFormat: Audio.IOSOutputFormat.LINEARPCM,
          audioQuality: Audio.IOSAudioQuality.LOW,
          sampleRate: 24000,
          numberOfChannels: 1,
          bitRate: 384000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {},
      });
      this.recording = recording;
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  }

  private async stopAndReadRecording(): Promise<string | null> {
    if (!this.recording) return null;

    try {
      const currentRecording = this.recording;
      this.recording = null;

      await currentRecording.stopAndUnloadAsync();
      const uri = currentRecording.getURI();

      if (!uri) return null;

      // Read file as base64
      const response = await fetch(uri);
      const blob = await response.blob();
      return await this.blobToBase64(blob);
    } catch (error) {
      console.error('Failed to read recording:', error);
      return null;
    }
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Strip data URI prefix if present
        const base64 = result.includes(',') ? result.split(',')[1] ?? '' : result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}
