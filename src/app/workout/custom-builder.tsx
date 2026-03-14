import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { spacing, touchTarget, borderRadius } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { createAndStartWorkout } from '@/features/workout/services/workoutLifecycle';
import type { PlannedExercise, WorkoutPlan } from '@/types/workout';

interface ExerciseFormRow {
  id: string;
  name: string;
  targetSets: string;
  targetReps: string;
  restSeconds: string;
}

function makeId(): string {
  return `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createEmptyExercise(): ExerciseFormRow {
  return {
    id: makeId(),
    name: '',
    targetSets: '3',
    targetReps: '10',
    restSeconds: '60',
  };
}

export default function CustomBuilderScreen() {
  const router = useRouter();
  const [workoutName, setWorkoutName] = useState('');
  const [exercises, setExercises] = useState<ExerciseFormRow[]>([createEmptyExercise()]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addExercise = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExercises((prev) => [...prev, createEmptyExercise()]);
  }, []);

  const removeExercise = useCallback((id: string) => {
    setExercises((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((e) => e.id !== id);
    });
  }, []);

  const updateExercise = useCallback(
    (id: string, field: keyof ExerciseFormRow, value: string) => {
      setExercises((prev) =>
        prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)),
      );
    },
    [],
  );

  const validate = useCallback((): string | null => {
    const trimmedName = workoutName.trim();
    if (!trimmedName) return 'Please enter a workout name.';

    for (let i = 0; i < exercises.length; i++) {
      const ex = exercises[i];
      if (!ex) continue;
      if (!ex.name.trim()) return `Exercise ${i + 1} needs a name.`;

      const sets = parseInt(ex.targetSets, 10);
      if (isNaN(sets) || sets < 1) return `Exercise ${i + 1}: sets must be at least 1.`;

      const reps = parseInt(ex.targetReps, 10);
      if (isNaN(reps) || reps < 1) return `Exercise ${i + 1}: reps must be at least 1.`;

      const rest = parseInt(ex.restSeconds, 10);
      if (isNaN(rest) || rest < 0) return `Exercise ${i + 1}: rest must be 0 or more.`;
    }

    return null;
  }, [workoutName, exercises]);

  const handleStart = useCallback(async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const plannedExercises: PlannedExercise[] = exercises.map((ex, i) => ({
        id: `custom_ex_${i + 1}`,
        name: ex.name.trim(),
        targetSets: parseInt(ex.targetSets, 10) || 3,
        targetReps: parseInt(ex.targetReps, 10) || 10,
        restSeconds: parseInt(ex.restSeconds, 10) || 60,
      }));

      const totalSets = plannedExercises.reduce((sum, ex) => sum + ex.targetSets, 0);
      const estimatedMinutes = Math.ceil((totalSets * 90) / 60); // ~90s per set

      const plan: WorkoutPlan = {
        id: `custom_${Date.now()}`,
        name: workoutName.trim(),
        type: 'custom',
        exercises: plannedExercises,
        estimatedDurationMinutes: estimatedMinutes,
      };

      const serverId = await createAndStartWorkout(plan);
      router.replace(`/workout/${serverId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start workout';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [validate, exercises, workoutName, router]);

  const handleBack = useCallback(() => {
    if (exercises.some((e) => e.name.trim())) {
      Alert.alert(
        'Discard Workout?',
        'Your custom workout plan will be lost.',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => router.back() },
        ],
      );
    } else {
      router.back();
    }
  }, [exercises, router]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton} accessibilityLabel="Go back">
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Build Custom Workout</Text>
          <View style={styles.backButton} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Error banner */}
          {error ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Workout name */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>WORKOUT NAME</Text>
            <TextInput
              style={styles.nameInput}
              placeholder="e.g., My Upper Body Day"
              placeholderTextColor={colors.textTertiary}
              value={workoutName}
              onChangeText={setWorkoutName}
              maxLength={60}
              returnKeyType="next"
              autoFocus
            />
          </View>

          {/* Exercise list */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>EXERCISES</Text>

            {exercises.map((ex, index) => (
              <View key={ex.id} style={styles.exerciseCard}>
                <View style={styles.exerciseHeader}>
                  <Text style={styles.exerciseNumber}>{index + 1}</Text>
                  {exercises.length > 1 ? (
                    <Pressable
                      onPress={() => removeExercise(ex.id)}
                      style={styles.removeButton}
                      accessibilityLabel={`Remove exercise ${index + 1}`}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    </Pressable>
                  ) : null}
                </View>

                <TextInput
                  style={styles.exerciseNameInput}
                  placeholder="Exercise name"
                  placeholderTextColor={colors.textTertiary}
                  value={ex.name}
                  onChangeText={(v) => updateExercise(ex.id, 'name', v)}
                  maxLength={50}
                  returnKeyType="next"
                />

                <View style={styles.numberRow}>
                  <View style={styles.numberField}>
                    <Text style={styles.numberLabel}>Sets</Text>
                    <TextInput
                      style={styles.numberInput}
                      value={ex.targetSets}
                      onChangeText={(v) => updateExercise(ex.id, 'targetSets', v)}
                      keyboardType="number-pad"
                      maxLength={3}
                      selectTextOnFocus
                    />
                  </View>
                  <View style={styles.numberField}>
                    <Text style={styles.numberLabel}>Reps</Text>
                    <TextInput
                      style={styles.numberInput}
                      value={ex.targetReps}
                      onChangeText={(v) => updateExercise(ex.id, 'targetReps', v)}
                      keyboardType="number-pad"
                      maxLength={3}
                      selectTextOnFocus
                    />
                  </View>
                  <View style={styles.numberField}>
                    <Text style={styles.numberLabel}>Rest (s)</Text>
                    <TextInput
                      style={styles.numberInput}
                      value={ex.restSeconds}
                      onChangeText={(v) => updateExercise(ex.id, 'restSeconds', v)}
                      keyboardType="number-pad"
                      maxLength={4}
                      selectTextOnFocus
                    />
                  </View>
                </View>
              </View>
            ))}

            <Pressable
              style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
              onPress={addExercise}
              accessibilityRole="button"
              accessibilityLabel="Add exercise"
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
              <Text style={styles.addButtonText}>Add Exercise</Text>
            </Pressable>
          </View>
        </ScrollView>

        {/* Start button */}
        <View style={styles.bottomBar}>
          <Pressable
            style={({ pressed }) => [styles.startButton, pressed && styles.startButtonPressed]}
            onPress={() => void handleStart()}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Start workout"
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <Ionicons name="play" size={20} color={colors.white} />
                <Text style={styles.startButtonText}>Start Workout</Text>
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.heading,
    color: colors.textPrimary,
  },

  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },

  // Error
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

  // Sections
  section: {
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    ...typography.metricLabel,
    color: colors.textTertiary,
    fontSize: 12,
    marginBottom: spacing.sm,
  },

  // Workout name
  nameInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
  },

  // Exercise card
  exerciseCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  exerciseNumber: {
    ...typography.heading,
    color: colors.primary,
    fontSize: 16,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary + '20',
    textAlign: 'center',
    lineHeight: 28,
    overflow: 'hidden',
  },
  removeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.sm,
    backgroundColor: colors.danger + '15',
  },
  exerciseNameInput: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: spacing.sm,
    ...typography.body,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  numberRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  numberField: {
    flex: 1,
  },
  numberLabel: {
    ...typography.caption,
    color: colors.textTertiary,
    marginBottom: 4,
  },
  numberInput: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: spacing.sm,
    ...typography.body,
    color: colors.textPrimary,
    textAlign: 'center',
  },

  // Add button
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary + '40',
    borderStyle: 'dashed',
  },
  addButtonPressed: {
    backgroundColor: colors.primary + '10',
  },
  addButtonText: {
    ...typography.button,
    color: colors.primary,
  },

  // Bottom bar
  bottomBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    minHeight: touchTarget.workout,
    paddingHorizontal: spacing.xl,
  },
  startButtonPressed: {
    opacity: 0.8,
  },
  startButtonText: {
    ...typography.button,
    color: colors.white,
    fontSize: 18,
  },
});
