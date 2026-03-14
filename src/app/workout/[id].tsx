import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { spacing, touchTarget, borderRadius } from '@/theme/spacing';
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
      setTranscriptLines((prev) => [
        ...prev,
        { text: lastTranscript, role: 'user', timestamp: Date.now() },
      ]);
    }
  }, [lastTranscript]);

  useEffect(() => {
    if (lastCoachMessage) {
      setTranscriptLines((prev) => {
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

  const exerciseCount = exercises.length;
  const timerMinutes = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
  const timerSeconds = String(elapsedSeconds % 60).padStart(2, '0');

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
        {/* Header with exercise name + navigation */}
        <View style={styles.header}>
          <View style={styles.exerciseNav}>
            <Pressable
              onPress={previousExercise}
              disabled={currentExerciseIndex === 0}
              style={[styles.navButton, currentExerciseIndex === 0 && styles.navButtonDisabled]}
              accessibilityLabel="Previous exercise"
            >
              <Ionicons name="chevron-back" size={24} color={currentExerciseIndex === 0 ? colors.textTertiary : colors.textPrimary} />
            </Pressable>

            <View style={styles.exerciseInfo}>
              <Text style={styles.exerciseName} numberOfLines={1}>
                {currentExercise?.exerciseName ?? 'WORKOUT'}
              </Text>
              {exerciseCount > 0 ? (
                <Text style={styles.exerciseProgress}>
                  Exercise {currentExerciseIndex + 1} of {exerciseCount}
                </Text>
              ) : null}
            </View>

            <Pressable
              onPress={nextExercise}
              disabled={currentExerciseIndex >= exerciseCount - 1}
              style={[styles.navButton, currentExerciseIndex >= exerciseCount - 1 && styles.navButtonDisabled]}
              accessibilityLabel="Next exercise"
            >
              <Ionicons name="chevron-forward" size={24} color={currentExerciseIndex >= exerciseCount - 1 ? colors.textTertiary : colors.textPrimary} />
            </Pressable>
          </View>

          {/* Exercise progress bar */}
          {exerciseCount > 1 ? (
            <View style={styles.progressBar}>
              {exercises.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.progressDot,
                    i <= currentExerciseIndex && styles.progressDotActive,
                    i === currentExerciseIndex && styles.progressDotCurrent,
                  ]}
                />
              ))}
            </View>
          ) : null}
        </View>

        {/* Timer */}
        <View style={styles.timerContainer}>
          <View style={styles.timerRing}>
            <Text style={styles.timer}>
              {timerMinutes}:{timerSeconds}
            </Text>
          </View>
          <Text style={styles.timerLabel}>
            {status === 'paused' ? 'PAUSED' : 'ELAPSED'}
          </Text>
        </View>

        {/* Health metrics */}
        <HealthErrorBoundary>
          <View style={styles.metricsRow}>
            <View style={[styles.metricCard, { borderLeftColor: colors.danger, borderLeftWidth: 3 }]}>
              <Ionicons name="heart" size={16} color={colors.danger} style={styles.metricIcon} />
              <Text style={styles.metricValue}>
                {heartRate != null ? heartRate : '--'}
              </Text>
              <Text style={styles.metricLabel}>BPM</Text>
            </View>
            <View style={[styles.metricCard, { borderLeftColor: colors.warning, borderLeftWidth: 3 }]}>
              <Ionicons name="flame" size={16} color={colors.warning} style={styles.metricIcon} />
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

      {/* Bottom controls */}
      <View style={styles.controls}>
        <Pressable
          style={({ pressed }) => [styles.controlBtn, styles.pauseBtn, pressed && styles.btnPressed]}
          onPress={handlePauseResume}
          accessibilityRole="button"
          accessibilityLabel={status === 'paused' ? 'Resume workout' : 'Pause workout'}
        >
          <Ionicons
            name={status === 'paused' ? 'play' : 'pause'}
            size={22}
            color={colors.textPrimary}
          />
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.controlBtn, styles.endBtn, pressed && styles.btnPressed]}
          onPress={handleEndWorkout}
          accessibilityRole="button"
          accessibilityLabel="End workout"
        >
          <Ionicons name="checkmark-circle" size={20} color={colors.white} />
          <Text style={styles.endBtnText}>End Workout</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.controlBtn, styles.abandonBtn, pressed && styles.btnPressed]}
          onPress={handleAbandon}
          accessibilityRole="button"
          accessibilityLabel="Abandon workout"
        >
          <Ionicons name="close" size={22} color={colors.danger} />
        </Pressable>
      </View>
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

  // Header / exercise nav
  header: {
    marginBottom: spacing.lg,
  },
  exerciseNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  exerciseInfo: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  exerciseName: {
    ...typography.heading,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  exerciseProgress: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },
  progressBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.md,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  progressDotActive: {
    backgroundColor: colors.primary + '60',
  },
  progressDotCurrent: {
    backgroundColor: colors.primary,
    width: 24,
    borderRadius: 4,
  },

  // Timer
  timerContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  timerRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: colors.primary + '30',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  timer: {
    ...typography.timer,
    color: colors.textPrimary,
    fontSize: 32,
    lineHeight: 38,
  },
  timerLabel: {
    ...typography.metricLabel,
    color: colors.textTertiary,
    marginTop: spacing.xs,
    fontSize: 11,
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

  // Bottom controls
  controls: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
  },
  controlBtn: {
    minHeight: touchTarget.workout,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pauseBtn: {
    width: touchTarget.workout,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  endBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
  },
  endBtnText: {
    ...typography.button,
    color: colors.white,
  },
  abandonBtn: {
    width: touchTarget.workout,
    backgroundColor: colors.danger + '15',
    borderWidth: 1,
    borderColor: colors.danger + '30',
  },
  btnPressed: {
    opacity: 0.8,
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
