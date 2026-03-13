import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { VoiceConnectionState, VoiceCoachState } from '@/types/voice';
import type { HeartRateZone } from '@/types/health';

interface RealtimeState {
  // Audio / Voice
  voiceConnectionState: VoiceConnectionState;
  coachState: VoiceCoachState;
  isListening: boolean;
  isSpeaking: boolean;
  lastTranscript: string | null;
  lastCoachMessage: string | null;

  // Health metrics (fast-updating)
  heartRate: number | null;
  heartRateZone: HeartRateZone | null;
  caloriesBurned: number | null;
  steps: number | null;

  // Workout timer
  elapsedSeconds: number;
  isTimerRunning: boolean;
}

interface RealtimeActions {
  setVoiceConnectionState: (state: VoiceConnectionState) => void;
  setCoachState: (state: VoiceCoachState) => void;
  setListening: (listening: boolean) => void;
  setSpeaking: (speaking: boolean) => void;
  setTranscript: (transcript: string) => void;
  setCoachMessage: (message: string) => void;

  updateHealthMetrics: (metrics: {
    heartRate?: number | null;
    heartRateZone?: HeartRateZone | null;
    caloriesBurned?: number | null;
    steps?: number | null;
  }) => void;

  setElapsedSeconds: (seconds: number) => void;
  setTimerRunning: (running: boolean) => void;

  reset: () => void;
}

const initialState: RealtimeState = {
  voiceConnectionState: 'disconnected',
  coachState: 'idle',
  isListening: false,
  isSpeaking: false,
  lastTranscript: null,
  lastCoachMessage: null,

  heartRate: null,
  heartRateZone: null,
  caloriesBurned: null,
  steps: null,

  elapsedSeconds: 0,
  isTimerRunning: false,
};

export const useRealtimeStore = create<RealtimeState & RealtimeActions>()(
  subscribeWithSelector((set) => ({
    ...initialState,

    setVoiceConnectionState: (voiceConnectionState) =>
      set({ voiceConnectionState }),
    setCoachState: (coachState) => set({ coachState }),
    setListening: (isListening) => set({ isListening }),
    setSpeaking: (isSpeaking) => set({ isSpeaking }),
    setTranscript: (lastTranscript) => set({ lastTranscript }),
    setCoachMessage: (lastCoachMessage) => set({ lastCoachMessage }),

    updateHealthMetrics: (metrics) =>
      set((state) => ({
        heartRate: metrics.heartRate ?? state.heartRate,
        heartRateZone: metrics.heartRateZone ?? state.heartRateZone,
        caloriesBurned: metrics.caloriesBurned ?? state.caloriesBurned,
        steps: metrics.steps ?? state.steps,
      })),

    setElapsedSeconds: (elapsedSeconds) => set({ elapsedSeconds }),
    setTimerRunning: (isTimerRunning) => set({ isTimerRunning }),

    reset: () => set(initialState),
  })),
);
