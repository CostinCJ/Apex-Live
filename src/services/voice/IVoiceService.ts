import type { VoiceConnectionState, VoiceContext, VoiceError } from '@/types/voice';

export type TranscriptCallback = (text: string, isFinal: boolean) => void;
export type AudioResponseCallback = (audioBase64: string) => void;
export type ErrorCallback = (error: VoiceError) => void;
export type ConnectionStateCallback = (state: VoiceConnectionState) => void;
export type Unsubscribe = () => void;

export interface IVoiceService {
  connect(token: string): Promise<void>;
  disconnect(): Promise<void>;

  startListening(): void;
  stopListening(): void;

  updateContext(context: VoiceContext): void;

  onTranscript(callback: TranscriptCallback): Unsubscribe;
  onAudioResponse(callback: AudioResponseCallback): Unsubscribe;
  onConnectionStateChange(callback: ConnectionStateCallback): Unsubscribe;
  onError(callback: ErrorCallback): Unsubscribe;

  readonly connectionState: VoiceConnectionState;
}
