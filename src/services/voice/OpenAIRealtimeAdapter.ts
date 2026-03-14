import type { VoiceConnectionState, VoiceError } from '@/types/voice';
import type {
  IVoiceService,
  TranscriptCallback,
  AudioResponseCallback,
  ErrorCallback,
  ConnectionStateCallback,
  Unsubscribe,
} from './IVoiceService';
import { RealtimeWebSocket } from './RealtimeWebSocket';
import { AudioCaptureService } from './AudioCaptureService';
import { AudioPlaybackService } from './AudioPlaybackService';

export class OpenAIRealtimeAdapter implements IVoiceService {
  private ws: RealtimeWebSocket;
  private capture: AudioCaptureService;
  private playback: AudioPlaybackService;
  private _connectionState: VoiceConnectionState = 'disconnected';

  private transcriptCallbacks = new Set<TranscriptCallback>();
  private audioResponseCallbacks = new Set<AudioResponseCallback>();
  private connectionStateCallbacks = new Set<ConnectionStateCallback>();
  private errorCallbacks = new Set<ErrorCallback>();

  private pendingTranscript = '';

  constructor() {
    this.ws = new RealtimeWebSocket();
    this.capture = new AudioCaptureService();
    this.playback = new AudioPlaybackService();

    this.setupWebSocketHandlers();
  }

  get connectionState(): VoiceConnectionState {
    return this._connectionState;
  }

  async connect(token: string): Promise<void> {
    const url = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview';

    const initialized = await this.capture.initialize();
    if (!initialized) {
      this.emitError({
        code: 'CONNECTION_FAILED',
        message: 'Failed to initialize audio capture',
        recoverable: false,
      });
      return;
    }

    await this.playback.initialize();

    this.playback.setSpeakingCallback((speaking) => {
      if (!speaking && this._connectionState === 'connected') {
        // Coach finished speaking — could auto-resume listening
      }
    });

    this.ws.connect(url, token);
  }

  async disconnect(): Promise<void> {
    await this.capture.cleanup();
    await this.playback.cleanup();
    this.ws.disconnect();
  }

  startListening(): void {
    if (this._connectionState !== 'connected') return;

    // Interrupt any current playback
    void this.playback.interrupt();

    void this.capture.startCapture((base64Audio) => {
      this.ws.sendAudioChunk(base64Audio);
    });
  }

  stopListening(): void {
    void this.capture.stopCapture();
    this.ws.commitAudioBuffer();
  }

  updateContext(systemPrompt: string): void {
    // Send session.update with the pre-built system prompt string
    this.ws.updateSession(systemPrompt);
  }

  onTranscript(callback: TranscriptCallback): Unsubscribe {
    this.transcriptCallbacks.add(callback);
    return () => this.transcriptCallbacks.delete(callback);
  }

  onAudioResponse(callback: AudioResponseCallback): Unsubscribe {
    this.audioResponseCallbacks.add(callback);
    return () => this.audioResponseCallbacks.delete(callback);
  }

  onConnectionStateChange(callback: ConnectionStateCallback): Unsubscribe {
    this.connectionStateCallbacks.add(callback);
    return () => this.connectionStateCallbacks.delete(callback);
  }

  onError(callback: ErrorCallback): Unsubscribe {
    this.errorCallbacks.add(callback);
    return () => this.errorCallbacks.delete(callback);
  }

  private setupWebSocketHandlers(): void {
    this.ws.onStateChange((state) => {
      this._connectionState = state;
      this.connectionStateCallbacks.forEach((cb) => cb(state));
    });

    this.ws.onEvent((event) => {
      switch (event.type) {
        case 'conversation.item.input_audio_transcription.completed':
          this.transcriptCallbacks.forEach((cb) => cb(event.transcript, true));
          break;

        case 'response.audio_transcript.delta':
          this.pendingTranscript += event.delta;
          this.transcriptCallbacks.forEach((cb) =>
            cb(this.pendingTranscript, false),
          );
          break;

        case 'response.audio_transcript.done':
          this.pendingTranscript = '';
          this.transcriptCallbacks.forEach((cb) => cb(event.transcript, true));
          break;

        case 'response.audio.delta':
          this.playback.enqueueAudio(event.delta);
          this.audioResponseCallbacks.forEach((cb) => cb(event.delta));
          break;

        case 'response.audio.done':
          break;

        case 'input_audio_buffer.speech_started':
          void this.playback.interrupt();
          this.pendingTranscript = '';
          break;

        case 'error':
          this.emitError({
            code: 'UNKNOWN',
            message: event.error.message,
            recoverable: true,
          });
          break;
      }
    });
  }

  private emitError(error: VoiceError): void {
    this.errorCallbacks.forEach((cb) => cb(error));
  }
}
