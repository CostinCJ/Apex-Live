import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors } from '@/theme/colors';
import { spacing, touchTarget, borderRadius } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import type { ExerciseRecord } from '@/types/workout';

interface WorkoutSummaryProps {
  duration: number; // seconds
  exercises: ExerciseRecord[];
  caloriesBurned: number | null;
  onDone: () => void;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
}

function calculateTotalVolume(exercises: ExerciseRecord[], _units: string): number {
  return exercises.reduce((total, ex) => {
    return total + ex.sets.reduce((setTotal, set) => {
      return setTotal + (set.weight ?? 0) * (set.reps ?? 0);
    }, 0);
  }, 0);
}

function countTotalSets(exercises: ExerciseRecord[]): number {
  return exercises.reduce((total, ex) => total + ex.sets.length, 0);
}

export function WorkoutSummary({
  duration,
  exercises,
  caloriesBurned,
  onDone,
}: WorkoutSummaryProps) {
  const totalVolume = calculateTotalVolume(exercises, 'lbs');
  const totalSets = countTotalSets(exercises);
  const exercisesCompleted = exercises.filter((e) => e.sets.length > 0).length;

  const handleDone = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onDone();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Workout Complete!</Text>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatDuration(duration)}</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{exercisesCompleted}</Text>
            <Text style={styles.statLabel}>Exercises</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalSets}</Text>
            <Text style={styles.statLabel}>Sets</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {totalVolume > 0 ? `${Math.round(totalVolume).toLocaleString()}` : '--'}
            </Text>
            <Text style={styles.statLabel}>Volume</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {caloriesBurned != null ? Math.round(caloriesBurned) : '--'}
            </Text>
            <Text style={styles.statLabel}>Calories</Text>
          </View>
        </View>

        {exercises.filter((e) => e.sets.length > 0).map((ex, i) => (
          <View key={i} style={styles.exerciseRow}>
            <Text style={styles.exerciseRowName}>{ex.exerciseName}</Text>
            <Text style={styles.exerciseRowSets}>
              {ex.sets.length} set{ex.sets.length !== 1 ? 's' : ''}
            </Text>
          </View>
        ))}

        <Pressable
          style={({ pressed }) => [
            styles.doneButton,
            pressed && styles.doneButtonPressed,
          ]}
          onPress={handleDone}
          accessibilityRole="button"
          accessibilityLabel="Done"
        >
          <Text style={styles.doneButtonText}>Done</Text>
        </Pressable>
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
    padding: spacing.xl,
    alignItems: 'center',
  },
  title: {
    ...typography.title,
    color: colors.primary,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
    justifyContent: 'center',
  },
  statCard: {
    width: '45%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    ...typography.metricMedium,
    color: colors.textPrimary,
  },
  statLabel: {
    ...typography.metricLabel,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  exerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  exerciseRowName: {
    ...typography.body,
    color: colors.textPrimary,
  },
  exerciseRowSets: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  doneButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.xxxl,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    minHeight: touchTarget.workout,
    justifyContent: 'center',
    marginTop: spacing.xl,
    width: '100%',
  },
  doneButtonPressed: {
    opacity: 0.85,
  },
  doneButtonText: {
    ...typography.button,
    color: colors.background,
    fontSize: 18,
  },
});
