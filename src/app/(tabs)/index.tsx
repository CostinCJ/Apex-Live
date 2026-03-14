import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { colors } from '@/theme/colors';
import { spacing, touchTarget, borderRadius } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import type { WorkoutType } from '@/types/workout';

const quickStartWorkouts: { type: WorkoutType; label: string; emoji: string }[] = [
  { type: 'strength', label: 'Push Day', emoji: '💪' },
  { type: 'strength', label: 'Pull Day', emoji: '🏋️' },
  { type: 'strength', label: 'Legs', emoji: '🦵' },
  { type: 'hiit', label: 'HIIT', emoji: '🔥' },
  { type: 'running', label: 'Run', emoji: '🏃' },
  { type: 'cycling', label: 'Cycle', emoji: '🚴' },
  { type: 'yoga', label: 'Yoga', emoji: '🧘' },
  { type: 'custom', label: 'Custom', emoji: '⚡' },
];

export default function HomeScreen() {
  const router = useRouter();

  const handleQuickStart = (type: WorkoutType, _label: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/workout/${type}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.greeting}>Ready to train?</Text>
        <Text style={styles.subtitle}>Choose a workout to get started</Text>

        <View style={styles.grid}>
          {quickStartWorkouts.map((workout) => (
            <Pressable
              key={workout.label}
              style={({ pressed }) => [
                styles.card,
                pressed && styles.cardPressed,
              ]}
              onPress={() => handleQuickStart(workout.type, workout.label)}
              accessibilityRole="button"
              accessibilityLabel={`Start ${workout.label} workout`}
            >
              <Text style={styles.cardEmoji}>{workout.emoji}</Text>
              <Text style={styles.cardLabel}>{workout.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.todaySummary}>
          <Text style={styles.sectionTitle}>Today</Text>
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
    borderColor: colors.border,
  },
  cardPressed: {
    backgroundColor: colors.surfacePressed,
    transform: [{ scale: 0.97 }],
  },
  cardEmoji: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  cardLabel: {
    ...typography.button,
    color: colors.textPrimary,
  },
  todaySummary: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    ...typography.heading,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  emptyText: {
    ...typography.body,
    color: colors.textTertiary,
  },
});
