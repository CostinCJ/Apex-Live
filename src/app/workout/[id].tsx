import { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import { colors } from '@/theme/colors';
import { spacing, touchTarget, borderRadius } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { useRealtimeStore } from '@/stores/realtimeStore';
import { useVoiceCoach } from '@/features/voice-coach/hooks/useVoiceCoach';
import { VoiceOrb } from '@/features/voice-coach/components/VoiceOrb';
import { VoiceControls } from '@/features/voice-coach/components/VoiceControls';
import { TranscriptOverlay } from '@/features/voice-coach/components/TranscriptOverlay';

interface TranscriptLine {
  text: string;
  role: 'user' | 'coach';
  timestamp: number;
}

function formatTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default function ActiveWorkoutScreen() {
  useKeepAwake();

  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [transcriptLines, setTranscriptLines] = useState<TranscriptLine[]>([]);
  const [showTranscript, setShowTranscript] = useState(true);

  const elapsedSeconds = useRealtimeStore((s) => s.elapsedSeconds);
  const heartRate = useRealtimeStore((s) => s.heartRate);
  const caloriesBurned = useRealtimeStore((s) => s.caloriesBurned);
  const setElapsedSeconds = useRealtimeStore((s) => s.setElapsedSeconds);
  const setTimerRunning = useRealtimeStore((s) => s.setTimerRunning);
  const resetRealtime = useRealtimeStore((s) => s.reset);

  const {
    connectionState,
    coachState,
    isListening,
    lastTranscript,
    lastCoachMessage,
    connect,
    disconnect,
    toggleListening,
  } = useVoiceCoach();

  // Start workout timer
  useEffect(() => {
    setTimerRunning(true);
    timerRef.current = setInterval(() => {
      setElapsedSeconds(useRealtimeStore.getState().elapsedSeconds + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      setTimerRunning(false);
    };
  }, []);

  // Track transcript lines
  useEffect(() => {
    if (lastTranscript) {
      setTranscriptLines((prev) => [
        ...prev,
        { text: lastTranscript, role: 'user', timestamp: Date.now() },
      ]);
    }
  }, [lastTranscript]);

  useEffect(() => {
    if (lastCoachMessage) {
      setTranscriptLines((prev) => {
        // Update last coach line if exists, otherwise add new
        const last = prev[prev.length - 1];
        if (last?.role === 'coach') {
          return [...prev.slice(0, -1), { ...last, text: lastCoachMessage }];
        }
        return [
          ...prev,
          { text: lastCoachMessage, role: 'coach', timestamp: Date.now() },
        ];
      });
    }
  }, [lastCoachMessage]);

  const handleEndWorkout = useCallback(async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await disconnect();
    resetRealtime();
    router.back();
  }, [disconnect, resetRealtime, router]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.exerciseName}>
          {id?.replace(/_/g, ' ').toUpperCase() ?? 'WORKOUT'}
        </Text>
      </View>

      <View style={styles.timerContainer}>
        <Text style={styles.timer}>{formatTime(elapsedSeconds)}</Text>
        <Text style={styles.timerLabel}>ELAPSED</Text>
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>
            {heartRate != null ? heartRate : '--'}
          </Text>
          <Text style={styles.metricLabel}>BPM</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>
            {caloriesBurned != null ? Math.round(caloriesBurned) : '0'}
          </Text>
          <Text style={styles.metricLabel}>CAL</Text>
        </View>
      </View>

      <Pressable
        style={styles.voiceArea}
        onPress={() => setShowTranscript((prev) => !prev)}
        accessibilityRole="button"
        accessibilityLabel="Toggle transcript"
      >
        <VoiceOrb state={coachState} size={120} />
      </Pressable>

      <TranscriptOverlay lines={transcriptLines} visible={showTranscript} />

      <VoiceControls
        connectionState={connectionState}
        coachState={coachState}
        isListening={isListening}
        onConnect={connect}
        onDisconnect={disconnect}
        onToggleListening={toggleListening}
      />

      <View style={styles.controls}>
        <Pressable
          style={({ pressed }) => [
            styles.controlButton,
            styles.endButton,
            pressed && styles.endButtonPressed,
          ]}
          onPress={handleEndWorkout}
          accessibilityRole="button"
          accessibilityLabel="End workout"
        >
          <Text style={styles.endButtonText}>End Workout</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  exerciseName: {
    ...typography.heading,
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  timer: {
    ...typography.timer,
    color: colors.textPrimary,
  },
  timerLabel: {
    ...typography.metricLabel,
    color: colors.textTertiary,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricValue: {
    ...typography.metricMedium,
    color: colors.textPrimary,
  },
  metricLabel: {
    ...typography.metricLabel,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  voiceArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 160,
  },
  controls: {
    paddingBottom: spacing.lg,
  },
  controlButton: {
    minHeight: touchTarget.workout,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endButton: {
    backgroundColor: colors.danger,
  },
  endButtonPressed: {
    opacity: 0.8,
  },
  endButtonText: {
    ...typography.button,
    color: colors.white,
  },
});
