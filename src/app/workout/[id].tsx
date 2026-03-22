import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, BackHandler } from 'react-native';
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
import { useAnimatedTimer } from '@/features/workout/hooks/useAnimatedTimer';
import { SetTracker } from '@/features/workout/components/SetTracker';
import { RestTimer } from '@/features/workout/components/RestTimer';
import { WorkoutTimer } from '@/features/workout/components/WorkoutTimer';
import { WorkoutBottomControls } from '@/features/workout/components/WorkoutBottomControls';
import { ExerciseHeader } from '@/features/workout/components/ExerciseHeader';
import { HealthErrorBoundary } from '@/components/HealthErrorBoundary';
import { endWorkout, abandonWorkout, getMetricsSyncService } from '@/features/workout/services/workoutLifecycle';
import { useHealthData } from '@/features/health/hooks/useHealthData';
import { useOfflineWorkout } from '@/features/workout/hooks/useOfflineWorkout';
import { WorkoutSummary } from '@/features/workout/components/WorkoutSummary';
import { useSettingsStore } from '@/stores/settingsStore';
import type { SetRecord, ExerciseRecord } from '@/types/workout';

export default function ActiveWorkoutScreen() {
  useKeepAwake();

  useLocalSearchParams<{ id: string }>();
  const router = useRouter();
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

  // Health data pipeline — captures wearable data and pushes to server
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
        return true;
      }
      return false;
    });
    return () => handler.remove();
  }, [status, router]);

  // Animated timer
  const { start: startTimer, stop: stopTimer } = useAnimatedTimer();
  const elapsedSeconds = useRealtimeStore((s) => s.elapsedSeconds);

  // Start timer and health data on mount
  useEffect(() => {
    setTimerRunning(true);
    startTimer();
    void startHealthData();
    triggerHaptic('voice_activated');

    return () => {
      setTimerRunning(false);
      stopTimer();
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

  // Stream health metrics to server (real-time relay to OpenClaw)
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

            const state = useWorkoutStore.getState();
            const snapExercises = [...state.exercises];
            const snapDuration = Math.floor(state.getElapsedMs() / 1000);
            const snapCalories = useRealtimeStore.getState().caloriesBurned;

            await endWorkout();
            void stopHealthData();

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
  }, [resetRealtime, stopHealthData]);

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
            resetRealtime();
            router.back();
          },
        },
      ],
    );
  }, [resetRealtime, router]);

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

      {/* OpenClaw relay indicator */}
      <View style={styles.relayBadge}>
        <Ionicons name="radio" size={14} color={colors.primary} />
        <Text style={styles.relayText}>Streaming to OpenClaw</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <ExerciseHeader
          exerciseName={currentExercise?.exerciseName}
          currentIndex={currentExerciseIndex}
          totalExercises={exercises.length}
          onPrevious={previousExercise}
          onNext={nextExercise}
        />

        <WorkoutTimer elapsedSeconds={elapsedSeconds} isPaused={status === 'paused'} />

        {/* Health metrics from wearables */}
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
  relayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary + '15',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary + '30',
  },
  relayText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
});
