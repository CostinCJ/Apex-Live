import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ScrollView, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { spacing, borderRadius } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { useRealtimeStore } from '@/stores/realtimeStore';
import { useWorkoutStore } from '@/stores/workoutStore';
import { triggerHaptic } from '@/utils/haptics';
import { startBackgroundKeepAlive, stopBackgroundKeepAlive } from '@/services/voice/BackgroundKeepAlive';
import { useAnimatedTimer } from '@/features/workout/hooks/useAnimatedTimer';
import { useVoiceCoach } from '@/features/voice-coach/hooks/useVoiceCoach';
import { VoiceOrb } from '@/features/voice-coach/components/VoiceOrb';
import { VoiceControls } from '@/features/voice-coach/components/VoiceControls';
import { TranscriptOverlay } from '@/features/voice-coach/components/TranscriptOverlay';
import { SetTracker } from '@/features/workout/components/SetTracker';
import { RestTimer } from '@/features/workout/components/RestTimer';
import { WorkoutTimer } from '@/features/workout/components/WorkoutTimer';
import { WorkoutBottomControls } from '@/features/workout/components/WorkoutBottomControls';
import { ExerciseHeader } from '@/features/workout/components/ExerciseHeader';
import { VoiceErrorBoundary } from '@/components/VoiceErrorBoundary';
import { HealthErrorBoundary } from '@/components/HealthErrorBoundary';
import { endWorkout, abandonWorkout, getMetricsSyncService } from '@/features/workout/services/workoutLifecycle';
import { useHealthData } from '@/features/health/hooks/useHealthData';
import { useOfflineWorkout } from '@/features/workout/hooks/useOfflineWorkout';
import { WorkoutSummary } from '@/features/workout/components/WorkoutSummary';
import { saveConversation } from '@/features/voice-coach/services/conversationSync';
import { useAuthContext } from '@/features/auth/context/AuthContext';
import { useSettingsStore } from '@/stores/settingsStore';
import type { SetRecord, ExerciseRecord } from '@/types/workout';

interface TranscriptLine {
  text: string;
  role: 'user' | 'coach';
  timestamp: number;
}

export default function ActiveWorkoutScreen() {
  useKeepAwake();

  useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthContext();
  const [transcriptLines, setTranscriptLines] = useState<TranscriptLine[]>([]);
  const [showTranscript, setShowTranscript] = useState(true);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState<{
    duration: number;
    exercises: ExerciseRecord[];
    calories: number | null;
  } | null>(null);

  const heartRate = useRealtimeStore((s) => s.heartRate);
  const caloriesBurned = useRealtimeStore((s) => s.caloriesBurned);
  const setTimerRunning = useRealtimeStore((s) => s.setTimerRunning);
  const resetRealtime = useRealtimeStore((s) => s.reset);

  // Workout state
  const status = useWorkoutStore((s) => s.status);
  const exercises = useWorkoutStore((s) => s.exercises);
  const currentExerciseIndex = useWorkoutStore((s) => s.currentExerciseIndex);
  const currentExercise = useWorkoutStore((s) => s.getCurrentExercise());
  const workoutId = useWorkoutStore((s) => s.workoutId);
  const completeSet = useWorkoutStore((s) => s.completeSet);
  const nextExercise = useWorkoutStore((s) => s.nextExercise);
  const previousExercise = useWorkoutStore((s) => s.previousExercise);
  const pauseWorkout = useWorkoutStore((s) => s.pauseWorkout);
  const resumeWorkout = useWorkoutStore((s) => s.resumeWorkout);
  const [showRestTimer, setShowRestTimer] = useState(false);

  // Health data pipeline
  const { requestAndStart: startHealthData, stop: stopHealthData } = useHealthData();

  // Offline detection
  const { isOffline } = useOfflineWorkout();
  const units = useSettingsStore((s) => s.units);

  // Prevent Android back button from navigating away without confirmation
  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (status === 'active' || status === 'paused') {
        Alert.alert(
          'Leave Workout?',
          'Your workout progress will be saved. You can resume later.',
          [
            { text: 'Stay', style: 'cancel' },
            { text: 'Leave', style: 'destructive', onPress: () => router.back() },
          ],
        );
        return true; // prevent default back
      }
      return false;
    });
    return () => handler.remove();
  }, [status, router]);

  // Animated timer
  const { start: startTimer, stop: stopTimer } = useAnimatedTimer();
  const elapsedSeconds = useRealtimeStore((s) => s.elapsedSeconds);

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

  // Start timer, health data, and background keepalive on mount
  useEffect(() => {
    setTimerRunning(true);
    startTimer();
    void startBackgroundKeepAlive();
    void startHealthData();
    triggerHaptic('voice_activated');

    return () => {
      setTimerRunning(false);
      stopTimer();
      void stopBackgroundKeepAlive();
      void stopHealthData();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable refs, runs once
  }, []);

  // Handle pause/resume
  useEffect(() => {
    if (status === 'paused') {
      stopTimer();
    } else if (status === 'active') {
      startTimer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable refs
  }, [status]);

  // Feed health metrics to metrics sync service
  useEffect(() => {
    const service = getMetricsSyncService();
    if (!service || !workoutId) return;

    if (heartRate != null) {
      service.addMetric({
        workout_id: workoutId,
        metric_type: 'heart_rate',
        value: heartRate,
        unit: 'bpm',
        recorded_at: new Date().toISOString(),
      });
    }
  }, [heartRate, workoutId]);

  useEffect(() => {
    const service = getMetricsSyncService();
    if (!service || !workoutId) return;

    if (caloriesBurned != null && caloriesBurned > 0) {
      service.addMetric({
        workout_id: workoutId,
        metric_type: 'calories',
        value: caloriesBurned,
        unit: 'kcal',
        recorded_at: new Date().toISOString(),
      });
    }
  }, [caloriesBurned, workoutId]);

  // Transcript tracking
  useEffect(() => {
    if (lastTranscript) {
      setTranscriptLines((prev) => {
        const next = [...prev, { text: lastTranscript, role: 'user' as const, timestamp: Date.now() }];
        return next.length > 100 ? next.slice(-100) : next;
      });
    }
  }, [lastTranscript]);

  useEffect(() => {
    if (lastCoachMessage) {
      setTranscriptLines((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === 'coach') {
          return [...prev.slice(0, -1), { ...last, text: lastCoachMessage }];
        }
        const next = [
          ...prev,
          { text: lastCoachMessage, role: 'coach' as const, timestamp: Date.now() },
        ];
        return next.length > 100 ? next.slice(-100) : next;
      });
    }
  }, [lastCoachMessage]);

  const handleCompleteSet = useCallback((set: SetRecord) => {
    completeSet(set);
    triggerHaptic('set_complete');
    setShowRestTimer(true);
  }, [completeSet]);

  const handleRestComplete = useCallback(() => {
    setShowRestTimer(false);
    triggerHaptic('rest_end');
  }, []);

  const handlePauseResume = useCallback(() => {
    if (status === 'active') {
      pauseWorkout();
      triggerHaptic('button_press');
    } else if (status === 'paused') {
      resumeWorkout();
      triggerHaptic('button_press');
    }
  }, [status, pauseWorkout, resumeWorkout]);

  const handleEndWorkout = useCallback(() => {
    Alert.alert(
      'End Workout',
      'Are you sure you want to end this workout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End',
          style: 'destructive',
          onPress: async () => {
            triggerHaptic('workout_complete');

            // Snapshot data for summary BEFORE endWorkout resets state
            const state = useWorkoutStore.getState();
            const snapExercises = [...state.exercises];
            const snapDuration = Math.floor(state.getElapsedMs() / 1000);
            const snapCalories = useRealtimeStore.getState().caloriesBurned;
            const snapWorkoutId = state.workoutId;

            await endWorkout();
            await disconnect();
            void stopHealthData();

            // Save coaching conversation
            if (transcriptLines.length > 0 && user?.id) {
              void saveConversation(
                user.id,
                snapWorkoutId,
                transcriptLines.map((l) => ({
                  role: l.role === 'coach' ? 'assistant' as const : 'user' as const,
                  content: l.text,
                  timestamp: l.timestamp,
                })),
              );
            }

            // Show summary instead of navigating away
            setSummaryData({
              duration: snapDuration,
              exercises: snapExercises,
              calories: snapCalories,
            });
            setShowSummary(true);
            resetRealtime();
          },
        },
      ],
    );
  }, [disconnect, resetRealtime, transcriptLines, user, stopHealthData]);

  const handleAbandon = useCallback(() => {
    Alert.alert(
      'Abandon Workout',
      'This workout will not be saved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Abandon',
          style: 'destructive',
          onPress: async () => {
            await abandonWorkout();
            await disconnect();
            resetRealtime();
            router.back();
          },
        },
      ],
    );
  }, [disconnect, resetRealtime, router]);

  // Show workout summary after completion
  if (showSummary && summaryData) {
    return (
      <WorkoutSummary
        duration={summaryData.duration}
        exercises={summaryData.exercises}
        caloriesBurned={summaryData.calories}
        onDone={() => {
          setShowSummary(false);
          router.back();
        }}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Offline badge */}
      {isOffline ? (
        <View style={styles.offlineBadge}>
          <Ionicons name="cloud-offline" size={14} color={colors.warning} />
          <Text style={styles.offlineText}>Offline Mode</Text>
        </View>
      ) : null}

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <ExerciseHeader
          exerciseName={currentExercise?.exerciseName}
          currentIndex={currentExerciseIndex}
          totalExercises={exercises.length}
          onPrevious={previousExercise}
          onNext={nextExercise}
        />

        <WorkoutTimer elapsedSeconds={elapsedSeconds} isPaused={status === 'paused'} />

        {/* Health metrics */}
        <HealthErrorBoundary>
          <View style={styles.metricsRow}>
            <View
              style={[styles.metricCard, { borderLeftColor: colors.danger, borderLeftWidth: 3 }]}
              accessibilityLabel={`Heart rate ${heartRate != null ? `${heartRate} beats per minute` : 'not available'}`}
              accessibilityRole="text"
            >
              <Ionicons name="heart" size={16} color={colors.danger} style={styles.metricIcon} accessible={false} />
              <Text style={styles.metricValue}>
                {heartRate != null ? heartRate : '--'}
              </Text>
              <Text style={styles.metricLabel}>BPM</Text>
            </View>
            <View
              style={[styles.metricCard, { borderLeftColor: colors.warning, borderLeftWidth: 3 }]}
              accessibilityLabel={`Calories burned ${caloriesBurned != null ? Math.round(caloriesBurned) : 0}`}
              accessibilityRole="text"
            >
              <Ionicons name="flame" size={16} color={colors.warning} style={styles.metricIcon} accessible={false} />
              <Text style={styles.metricValue}>
                {caloriesBurned != null ? Math.round(caloriesBurned) : '0'}
              </Text>
              <Text style={styles.metricLabel}>CAL</Text>
            </View>
          </View>
        </HealthErrorBoundary>

        {/* Set tracker */}
        {currentExercise && !showRestTimer ? (
          <SetTracker
            exerciseName={currentExercise.exerciseName}
            completedSets={[...currentExercise.sets]}
            onCompleteSet={handleCompleteSet}
            units={units}
          />
        ) : null}

        {/* Rest timer overlay */}
        {showRestTimer ? (
          <RestTimer
            onComplete={handleRestComplete}
            onSkip={handleRestComplete}
          />
        ) : null}

        {/* Voice coach */}
        <VoiceErrorBoundary>
          <Pressable
            style={styles.voiceArea}
            onPress={() => setShowTranscript((prev) => !prev)}
            accessibilityRole="button"
            accessibilityLabel="Toggle transcript"
          >
            <VoiceOrb state={coachState} size={64} />
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
        </VoiceErrorBoundary>
      </ScrollView>

      <WorkoutBottomControls
        status={status}
        onPauseResume={handlePauseResume}
        onEnd={handleEndWorkout}
        onAbandon={handleAbandon}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },

  // Metrics
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  metricIcon: {
    marginBottom: 4,
  },
  metricValue: {
    ...typography.metricMedium,
    color: colors.textPrimary,
    fontSize: 28,
    lineHeight: 34,
  },
  metricLabel: {
    ...typography.metricLabel,
    color: colors.textTertiary,
    fontSize: 12,
    marginTop: 2,
  },

  // Voice
  voiceArea: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xxl,
    marginBottom: spacing.xl,
  },

  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.warning + '20',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.warning + '30',
  },
  offlineText: {
    ...typography.caption,
    color: colors.warning,
    fontWeight: '600',
  },
});
