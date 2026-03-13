import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/services/supabase/client';
import { OpenAIRealtimeAdapter } from '@/services/voice/OpenAIRealtimeAdapter';
import { useRealtimeStore } from '@/stores/realtimeStore';
import { useAuthContext } from '@/features/auth/context/AuthContext';
import { buildSystemPrompt, shouldUpdateContext } from '@/utils/prompt-engine';
import { useSettingsStore } from '@/stores/settingsStore';
import { useMicPermission } from './useMicPermission';
import { COACH_CONTEXT_UPDATE_INTERVAL } from '@/utils/constants';
import type { VoiceContext } from '@/types/voice';

export function useVoiceCoach() {
  const adapterRef = useRef<OpenAIRealtimeAdapter | null>(null);
  const contextTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastContextRef = useRef<VoiceContext | null>(null);

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
    if (!session?.access_token) return;

    // Request mic permission
    const hasPermission = await requestMic();
    if (!hasPermission) return;

    try {
      setVoiceConnectionState('connecting');

      // Get ephemeral token from Edge Function
      const { data, error } = await supabase.functions.invoke('ai-proxy', {
        body: { model: 'gpt-4o-realtime-preview', voice: 'alloy' },
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
          const prompt = buildCurrentPrompt();
          if (prompt) {
            adapter.updateContext({ workoutType: null } as VoiceContext);
          }
        }
      });

      adapter.onTranscript((text, isFinal) => {
        if (isFinal) {
          setTranscript(text);
          setCoachState('processing');
        }
        setCoachMessage(text);
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

      await adapter.connect(data.token as string);

      // Start periodic context updates
      startContextUpdates();
    } catch (error) {
      console.error('Failed to connect voice coach:', error);
      setVoiceConnectionState('error');
    }
  }, [session?.access_token]);

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
  }, [connectionState, isListening]);

  const startContinuousListening = useCallback(() => {
    const adapter = adapterRef.current;
    if (!adapter || connectionState !== 'connected') return;

    adapter.startListening();
    setListening(true);
    setCoachState('listening');
  }, [connectionState]);

  // Build current system prompt
  const buildCurrentPrompt = useCallback((): string | null => {
    const store = useRealtimeStore.getState();
    const settings = useSettingsStore.getState();

    const context: VoiceContext = {
      workoutType: null,
      currentExercise: null,
      currentSet: null,
      totalSets: null,
      elapsedSeconds: store.elapsedSeconds,
      heartRate: store.heartRate,
      heartRateZone: store.heartRateZone,
      caloriesBurned: store.caloriesBurned,
      previousSessionSummary: null,
    };

    return buildSystemPrompt(
      {
        fitnessLevel: settings.fitnessLevel,
        coachingStyle: settings.coachStyle,
        verbosity: settings.coachVerbosity,
        units: settings.units,
      },
      context,
    );
  }, []);

  const startContextUpdates = useCallback(() => {
    stopContextUpdates();
    contextTimerRef.current = setInterval(() => {
      const adapter = adapterRef.current;
      if (!adapter || connectionState !== 'connected') return;

      const store = useRealtimeStore.getState();
      const context: VoiceContext = {
        workoutType: null,
        currentExercise: null,
        currentSet: null,
        totalSets: null,
        elapsedSeconds: store.elapsedSeconds,
        heartRate: store.heartRate,
        heartRateZone: store.heartRateZone,
        caloriesBurned: store.caloriesBurned,
        previousSessionSummary: null,
      };

      if (shouldUpdateContext(lastContextRef.current, context)) {
        const prompt = buildCurrentPrompt();
        if (prompt) {
          adapter.updateContext(context);
        }
        lastContextRef.current = context;
      }
    }, COACH_CONTEXT_UPDATE_INTERVAL);
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
