import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors } from '@/theme/colors';
import { spacing, borderRadius } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { api } from '@/services/api/client';
import type { Tables, Json } from '@/types/database';

type Workout = Tables<'workouts'>;

const typeLabels: Record<string, string> = {
  push: 'Push', pull: 'Pull', legs: 'Legs', upper: 'Upper', lower: 'Lower',
  full_body: 'Full Body', hiit: 'HIIT', cardio_run: 'Run', cardio_cycle: 'Cycle',
  cardio_row: 'Row', boxing: 'Boxing', mobility: 'Mobility', custom: 'Custom',
};

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

interface ExerciseEntry {
  name: string;
  sets?: Array<{ weight?: number; reps?: number; rpe?: number }>;
  best_set?: string;
}

function parseExercises(exercises: Json): ExerciseEntry[] {
  if (!Array.isArray(exercises)) return [];
  return exercises as unknown as ExerciseEntry[];
}

interface MetricsSummary {
  avg_heart_rate?: number;
  max_heart_rate?: number;
  total_calories?: number;
  total_volume_kg?: number;
  total_distance_m?: number;
  total_sets?: number;
  total_reps?: number;
}

function parseSummary(summary: Json): MetricsSummary {
  if (typeof summary === 'object' && summary !== null && !Array.isArray(summary)) {
    return summary as unknown as MetricsSummary;
  }
  return {};
}

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api.get<{ data: Workout }>(`/api/workouts/${id}`).then(({ data }) => {
      setWorkout(data?.data ?? null);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!workout) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Workout not found</Text>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const summary = parseSummary(workout.metrics_summary);
  const exercises = parseExercises(workout.exercises);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <Pressable onPress={() => router.back()} style={styles.backRow}>
          <Text style={styles.backArrow}>{'<'}</Text>
          <Text style={styles.backLabel}>History</Text>
        </Pressable>

        <Text style={styles.title}>
          {workout.title ?? typeLabels[workout.workout_type] ?? workout.workout_type}
        </Text>
        <Text style={styles.date}>
          {formatDate(workout.started_at)} at {formatTime(workout.started_at)}
        </Text>

        {/* Duration bar */}
        <View style={styles.durationCard}>
          <Text style={styles.durationValue}>
            {workout.duration_seconds != null ? formatDuration(workout.duration_seconds) : '--'}
          </Text>
          <Text style={styles.durationLabel}>Duration</Text>
        </View>

        {/* Metrics grid */}
        <View style={styles.metricsGrid}>
          {summary.total_calories != null && summary.total_calories > 0 && (
            <MetricCard label="Calories" value={`${Math.round(summary.total_calories)}`} unit="kcal" />
          )}
          {summary.avg_heart_rate != null && (
            <MetricCard label="Avg HR" value={`${Math.round(summary.avg_heart_rate)}`} unit="bpm" />
          )}
          {summary.max_heart_rate != null && (
            <MetricCard label="Max HR" value={`${Math.round(summary.max_heart_rate)}`} unit="bpm" />
          )}
          {summary.total_volume_kg != null && summary.total_volume_kg > 0 && (
            <MetricCard label="Volume" value={`${Math.round(summary.total_volume_kg)}`} unit="kg" />
          )}
          {summary.total_distance_m != null && summary.total_distance_m > 0 && (
            <MetricCard label="Distance" value={`${(summary.total_distance_m / 1000).toFixed(1)}`} unit="km" />
          )}
          {summary.total_sets != null && (
            <MetricCard label="Sets" value={`${summary.total_sets}`} />
          )}
          {summary.total_reps != null && (
            <MetricCard label="Reps" value={`${summary.total_reps}`} />
          )}
        </View>

        {/* Exercises */}
        {exercises.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Exercises</Text>
            {exercises.map((ex, i) => (
              <View key={`${ex.name}-${i}`} style={styles.exerciseRow}>
                <Text style={styles.exerciseName}>{ex.name}</Text>
                {ex.best_set && (
                  <Text style={styles.exerciseStat}>{ex.best_set}</Text>
                )}
                {ex.sets && ex.sets.length > 0 && (
                  <View style={styles.setsList}>
                    {ex.sets.map((s, si) => (
                      <Text key={si} style={styles.setText}>
                        Set {si + 1}:{' '}
                        {s.weight != null ? `${s.weight}kg ` : ''}
                        {s.reps != null ? `x${s.reps}` : ''}
                        {s.rpe != null ? ` @RPE ${s.rpe}` : ''}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Notes */}
        {workout.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notesText}>{workout.notes}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricCard({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricValueRow}>
        <Text style={styles.metricValue}>{value}</Text>
        {unit && <Text style={styles.metricUnit}>{unit}</Text>}
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  backRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
  backArrow: { ...typography.heading, color: colors.primary, marginRight: spacing.sm },
  backLabel: { ...typography.body, color: colors.primary },
  title: { ...typography.title, color: colors.textPrimary, marginBottom: spacing.xs },
  date: { ...typography.body, color: colors.textTertiary, marginBottom: spacing.xl },
  durationCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.xl,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg,
  },
  durationValue: { ...typography.timer, color: colors.primary },
  durationLabel: { ...typography.metricLabel, color: colors.textTertiary, marginTop: spacing.xs },
  metricsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg,
  },
  metricCard: {
    width: '48%', flexGrow: 1, backgroundColor: colors.surface, borderRadius: borderRadius.md,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  metricValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  metricValue: { ...typography.metricMedium, color: colors.textPrimary },
  metricUnit: { ...typography.caption, color: colors.textTertiary },
  metricLabel: { ...typography.metricLabel, color: colors.textTertiary, marginTop: spacing.xs },
  section: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg,
  },
  sectionTitle: { ...typography.heading, color: colors.textPrimary, marginBottom: spacing.md },
  exerciseRow: {
    paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  exerciseName: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
  exerciseStat: { ...typography.caption, color: colors.primary, marginTop: 2 },
  setsList: { marginTop: spacing.xs },
  setText: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  notesText: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },
  emptyText: { ...typography.heading, color: colors.textSecondary, marginBottom: spacing.lg },
  backButton: {
    backgroundColor: colors.primary, borderRadius: borderRadius.md, paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  backButtonText: { ...typography.button, color: colors.background },
});
