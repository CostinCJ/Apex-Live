import { useCallback, useEffect, useRef } from 'react';
import { api } from '@/services/api/client';
import { OpenAIRealtimeAdapter } from '@/services/voice/OpenAIRealtimeAdapter';
import { useRealtimeStore } from '@/stores/realtimeStore';
import { useWorkoutStore } from '@/stores/workoutStore';
import { useAuthContext } from '@/features/auth/context/AuthContext';
import { buildSystemPrompt, shouldUpdateContext } from '@/utils/prompt-engine';
import { useSettingsStore } from '@/stores/settingsStore';
import { useMicPermission } from './useMicPermission';
import { COACH_CONTEXT_UPDATE_INTERVAL } from '@/utils/constants';
import type { VoiceContext } from '@/types/voice';

interface PreviousWorkoutData {
  id: string;
  startedAt: string;
  completedAt: string | null;
  durationSeconds: number | null;
  metricsSummary: Record<string, unknown> | null;
}

function formatPreviousSession(data: PreviousWorkoutData): string {
  const lines: string[] = [];
  const date = new Date(data.startedAt).toLocaleDateString();
  lines.push(`Last session date: ${date}`);

  if (data.durationSeconds) {
    const mins = Math.floor(data.durationSeconds / 60);
    lines.push(`Last session duration: ${mins} minutes`);
  }

  if (data.metricsSummary) {
    const summary = data.metricsSummary;
    if (summary.total_sets) lines.push(`Last session total sets: ${summary.total_sets}`);
    if (summary.total_reps) lines.push(`Last session total reps: ${summary.total_reps}`);
    if (summary.total_volume) lines.push(`Last session total volume: ${summary.total_volume}`);
    if (summary.total_calories) lines.push(`Last session calories: ${summary.total_calories}`);
    if (summary.avg_heart_rate) lines.push(`Last session avg HR: ${summary.avg_heart_rate} BPM`);
    if (summary.exercises && Array.isArray(summary.exercises)) {
      lines.push('Last session exercises:');
      for (const ex of summary.exercises as Array<Record<string, unknown>>) {
        if (ex.name && ex.sets) {
          const sets = ex.sets as Array<Record<string, unknown>>;
          const setDetails = sets
            .map((s) => `${s.weight ?? '?'}x${s.reps ?? '?'}`)
            .join(', ');
          lines.push(`  - ${ex.name}: ${setDetails}`);
        }
      }
    }
  }

  return lines.join('\n');
}

export function useVoiceCoach() {
  const adapterRef = useRef<OpenAIRealtimeAdapter | null>(null);
  const contextTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastContextRef = useRef<VoiceContext | null>(null);
  const previousSessionRef = useRef<string | null>(null);

  const { session } = useAuthContext();
  const { request: requestMic } = useMicPermission();

  const connectionState = useRealtimeStore((s) => s.voiceConnectionState);
  const coachState = useRealtimeStore((s) => s.coachState);
  const isListening = useRealtimeStore((s) => s.isListening);
  const lastTranscript = useRealtimeStore((s) => s.lastTranscript);
  const lastCoachMessage = useRealtimeStore((s) => s.lastCoachMessage);

  const setVoiceConnectionState = useRealtimeStore((s) => s.setVoiceConnectionState);
  const setCoachState = useRealtimeStore((s) => s.setCoachState);
  const setListening = useRealtimeStore((s) => s.setListening);
  const setSpeaking = useRealtimeStore((s) => s.setSpeaking);
  const setTranscript = useRealtimeStore((s) => s.setTranscript);
  const setCoachMessage = useRealtimeStore((s) => s.setCoachMessage);

  const connect = useCallback(async () => {
    if (!session) return;

    // Request mic permission
    const hasPermission = await requestMic();
    if (!hasPermission) return;

    try {
      setVoiceConnectionState('connecting');

      // Get ephemeral token from API server
      const { data, error } = await api.post<{
        token: string;
        url: string;
        expires_at: string;
        session_id: string;
      }>('/api/ai/session', {
        model: 'gpt-4o-realtime-preview',
        voice: 'alloy',
      });

      if (error || !data?.token) {
        setVoiceConnectionState('error');
        return;
      }

      // Create adapter and connect
      const adapter = new OpenAIRealtimeAdapter();
      adapterRef.current = adapter;

      // Set up event handlers
      adapter.onConnectionStateChange((state) => {
        setVoiceConnectionState(state);
        if (state === 'connected') {
          setCoachState('idle');
          // Send initial system prompt
          const { prompt } = buildCurrentContext();
          if (prompt) {
            adapter.updateContext(prompt);
          }
        }
      });

      adapter.onTranscript((text, isFinal) => {
        // input_audio_transcription.completed = user's speech (always final)
        // response.audio_transcript.delta/done = coach's response
        // The adapter fires with isFinal=true for both user transcription
        // and coach transcript done; distinguish by checking if we're in
        // 'processing' state (user just spoke) vs not
        if (isFinal && coachState === 'listening') {
          // User's final transcript
          setTranscript(text);
          setCoachState('processing');
        } else {
          // Coach's streaming/final transcript
          setCoachMessage(text);
        }
      });

      adapter.onAudioResponse(() => {
        setCoachState('speaking');
        setSpeaking(true);
      });

      adapter.onError((error) => {
        console.error('Voice error:', error);
        if (!error.recoverable) {
          setCoachState('error');
        }
      });

      await adapter.connect(data.token);

      // Fetch previous workout data for progressive overload context
      const workoutType = useWorkoutStore.getState().workoutType;
      const workoutId = useWorkoutStore.getState().workoutId;
      if (workoutType) {
        const excludeParam = workoutId ? `&excludeId=${workoutId}` : '';
        const { data: prevData } = await api.get<{ data: PreviousWorkoutData | null }>(
          `/api/progress/previous-workout?workoutType=${workoutType}${excludeParam}`,
        );
        if (prevData?.data) {
          previousSessionRef.current = formatPreviousSession(prevData.data);
          // Immediately update context with previous session data
          const { prompt } = buildCurrentContext();
          if (prompt) {
            adapter.updateContext(prompt);
          }
        }
      }

      // Auto-start continuous listening if voiceActivation is always_on
      const voiceActivation = useSettingsStore.getState().voiceActivation;
      if (voiceActivation === 'always_on') {
        adapter.startListening();
        setListening(true);
        setCoachState('listening');
      }

      // Start periodic context updates
      startContextUpdates();
    } catch (error: unknown) {
      console.error('Failed to connect voice coach:', error);
      setVoiceConnectionState('error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Zustand actions and refs are stable
  }, [session]);

  const disconnect = useCallback(async () => {
    stopContextUpdates();
    if (adapterRef.current) {
      await adapterRef.current.disconnect();
      adapterRef.current = null;
    }
    setVoiceConnectionState('disconnected');
    setCoachState('idle');
    setListening(false);
    setSpeaking(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Zustand actions are stable refs
  }, []);

  const toggleListening = useCallback(() => {
    const adapter = adapterRef.current;
    if (!adapter || connectionState !== 'connected') return;

    if (isListening) {
      adapter.stopListening();
      setListening(false);
      setCoachState('processing');
    } else {
      adapter.startListening();
      setListening(true);
      setCoachState('listening');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Zustand actions are stable refs
  }, [connectionState, isListening]);

  const startContinuousListening = useCallback(() => {
    const adapter = adapterRef.current;
    if (!adapter || connectionState !== 'connected') return;

    adapter.startListening();
    setListening(true);
    setCoachState('listening');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Zustand actions are stable refs
  }, [connectionState]);

  // Build current system prompt with workout context
  const buildCurrentContext = useCallback((): { context: VoiceContext; prompt: string | null } => {
    const store = useRealtimeStore.getState();
    const settings = useSettingsStore.getState();
    const workout = useWorkoutStore.getState();
    const currentExercise = workout.getCurrentExercise();

    const context: VoiceContext = {
      workoutType: workout.workoutType,
      currentExercise: currentExercise?.exerciseName ?? null,
      currentSet: currentExercise ? currentExercise.sets.length + 1 : null,
      totalSets: null,
      elapsedSeconds: store.elapsedSeconds,
      heartRate: store.heartRate,
      heartRateZone: store.heartRateZone,
      caloriesBurned: store.caloriesBurned,
      previousSessionSummary: previousSessionRef.current,
    };

    const prompt = buildSystemPrompt(
      {
        fitnessLevel: settings.fitnessLevel ?? 'intermediate',
        coachingStyle: settings.coachStyle,
        verbosity: settings.coachVerbosity,
        units: settings.units,
      },
      context,
    );

    return { context, prompt };
  }, []);

  const startContextUpdates = useCallback(() => {
    stopContextUpdates();
    contextTimerRef.current = setInterval(() => {
      const adapter = adapterRef.current;
      const currentConnectionState = useRealtimeStore.getState().voiceConnectionState;
      if (!adapter || currentConnectionState !== 'connected') return;

      const { context, prompt } = buildCurrentContext();

      if (shouldUpdateContext(lastContextRef.current, context)) {
        if (prompt) {
          adapter.updateContext(prompt);
        }
        lastContextRef.current = context;
      }
    }, COACH_CONTEXT_UPDATE_INTERVAL);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reads state from store directly, Zustand actions are stable
  }, [connectionState]);

  const stopContextUpdates = useCallback(() => {
    if (contextTimerRef.current) {
      clearInterval(contextTimerRef.current);
      contextTimerRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      void disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cleanup only on unmount
  }, []);

  return {
    connectionState,
    coachState,
    isListening,
    lastTranscript,
    lastCoachMessage,
    connect,
    disconnect,
    toggleListening,
    startContinuousListening,
  };
}
