export type VoiceConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

export type VoiceCoachState =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'speaking'
  | 'error';

export type VoiceErrorCode =
  | 'MIC_PERMISSION_DENIED'
  | 'NETWORK_TIMEOUT'
  | 'API_RATE_LIMIT'
  | 'AUDIO_DECODE_ERROR'
  | 'SESSION_EXPIRED'
  | 'CONNECTION_FAILED'
  | 'UNKNOWN';

export interface VoiceConfig {
  readonly language: string;
  readonly voiceId: string;
  readonly coachingStyle: 'motivational' | 'technical' | 'balanced';
  readonly verbosity: 'minimal' | 'moderate' | 'verbose';
}

export interface VoiceCoachSession {
  readonly sessionId: string;
  readonly connectionState: VoiceConnectionState;
  readonly coachState: VoiceCoachState;
  readonly lastTranscript: string | null;
  readonly lastResponse: string | null;
  readonly error: VoiceError | null;
  readonly isListening: boolean;
  readonly isSpeaking: boolean;
}

export interface VoiceError {
  readonly code: VoiceErrorCode;
  readonly message: string;
  readonly recoverable: boolean;
}

export interface VoiceContext {
  readonly workoutType: string | null;
  readonly currentExercise: string | null;
  readonly currentSet: number | null;
  readonly totalSets: number | null;
  readonly elapsedSeconds: number;
  readonly heartRate: number | null;
  readonly heartRateZone: string | null;
  readonly caloriesBurned: number | null;
  readonly previousSessionSummary: string | null;
}
