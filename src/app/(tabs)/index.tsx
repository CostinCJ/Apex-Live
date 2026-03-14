import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { spacing, touchTarget, borderRadius } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { WORKOUT_TYPE_META } from '@/data/workoutTypes';
import { getQuickStartPlan } from '@/data/defaultExercises';
import { createAndStartWorkout } from '@/features/workout/services/workoutLifecycle';
import { useCrashRecovery } from '@/features/workout/hooks/useCrashRecovery';
import type { WorkoutType } from '@/types/workout';

const quickStartWorkouts: { type: WorkoutType; label: string }[] = [
  { type: 'push', label: 'Push Day' },
  { type: 'pull', label: 'Pull Day' },
  { type: 'legs', label: 'Leg Day' },
  { type: 'hiit', label: 'HIIT' },
  { type: 'cardio_run', label: 'Run' },
  { type: 'cardio_cycle', label: 'Cycle' },
  { type: 'boxing', label: 'Boxing' },
  { type: 'custom', label: 'Custom' },
];

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function WorkoutIcon({ type, size = 28 }: { type: WorkoutType; size?: number }) {
  const meta = WORKOUT_TYPE_META[type];
  if (meta.iconFamily === 'Ionicons') {
    return <Ionicons name={meta.icon as keyof typeof Ionicons.glyphMap} size={size} color={meta.color} />;
  }
  return <MaterialCommunityIcons name={meta.icon as keyof typeof MaterialCommunityIcons.glyphMap} size={size} color={meta.color} />;
}

export default function HomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { hasRecovery, recoveryInfo, resumeWorkout, discardWorkout } = useCrashRecovery();

  const handleQuickStart = useCallback(async (type: WorkoutType) => {
    if (loading) return;

    // Custom workout goes to the builder screen
    if (type === 'custom') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.push('/workout/custom-builder');
      return;
    }

    setError(null);
    setLoading(type);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const plan = getQuickStartPlan(type);
      const serverId = await createAndStartWorkout(plan);
      router.push(`/workout/${serverId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start workout';
      setError(msg);
    } finally {
      setLoading(null);
    }
  }, [loading, router]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.greeting}>{getGreeting()}</Text>
        <Text style={styles.subtitle}>What are we training today?</Text>

        {hasRecovery && recoveryInfo ? (
          <View style={styles.recoveryBanner}>
            <View style={styles.recoveryInfo}>
              <Ionicons name="refresh-circle" size={20} color={colors.warning} />
              <Text style={styles.recoveryText}>
                Workout in progress ({recoveryInfo.elapsedMinutes}m ago)
              </Text>
            </View>
            <View style={styles.recoveryActions}>
              <Pressable style={styles.recoveryResume} onPress={resumeWorkout}>
                <Text style={styles.recoveryResumeText}>Resume</Text>
              </Pressable>
              <Pressable style={styles.recoveryDiscard} onPress={discardWorkout}>
                <Text style={styles.recoveryDiscardText}>Discard</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.grid}>
          {quickStartWorkouts.map((workout) => {
            const meta = WORKOUT_TYPE_META[workout.type];
            const isLoading = loading === workout.type;
            return (
              <Pressable
                key={workout.type}
                style={({ pressed }) => [
                  styles.card,
                  pressed && styles.cardPressed,
                  { borderLeftColor: meta.color, borderLeftWidth: 3 },
                ]}
                onPress={() => void handleQuickStart(workout.type)}
                disabled={loading !== null}
                accessibilityRole="button"
                accessibilityLabel={`Start ${workout.label} workout`}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={meta.color} />
                ) : (
                  <View style={styles.cardIconContainer}>
                    <WorkoutIcon type={workout.type} />
                  </View>
                )}
                <Text style={styles.cardLabel}>{workout.label}</Text>
                <Text style={[styles.cardCategory, { color: meta.color }]}>
                  {meta.category.toUpperCase()}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.todaySummary}>
          <View style={styles.sectionHeader}>
            <Ionicons name="today-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.sectionTitle}>Today</Text>
          </View>
          <Text style={styles.emptyText}>No workouts yet today</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  greeting: {
    ...typography.title,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.error + '15',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.error + '30',
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  card: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: touchTarget.workout * 2,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  cardPressed: {
    backgroundColor: colors.surfacePressed,
    transform: [{ scale: 0.97 }],
  },
  cardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceGlass,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  cardLabel: {
    ...typography.button,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  cardCategory: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  todaySummary: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  emptyText: {
    ...typography.body,
    color: colors.textTertiary,
  },
  recoveryBanner: {
    backgroundColor: colors.warning + '15',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.warning + '30',
  },
  recoveryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  recoveryText: {
    ...typography.body,
    color: colors.warning,
    fontWeight: '600',
    flex: 1,
  },
  recoveryActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  recoveryResume: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    alignItems: 'center',
  },
  recoveryResumeText: {
    ...typography.button,
    color: colors.background,
    fontSize: 14,
  },
  recoveryDiscard: {
    flex: 1,
    backgroundColor: colors.surfaceGlass,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  recoveryDiscardText: {
    ...typography.button,
    color: colors.textSecondary,
    fontSize: 14,
  },
});
