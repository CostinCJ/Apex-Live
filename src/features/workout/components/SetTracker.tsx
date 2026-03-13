import { useState, useCallback } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '@/theme/colors';
import { spacing, touchTarget, borderRadius } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import type { SetRecord } from '@/types/workout';

interface SetTrackerProps {
  exerciseName: string;
  completedSets: SetRecord[];
  targetSets?: number;
  previousSets?: SetRecord[];
  onCompleteSet: (set: SetRecord) => void;
  units: 'imperial' | 'metric';
}

export function SetTracker({
  exerciseName,
  completedSets,
  targetSets,
  previousSets,
  onCompleteSet,
  units,
}: SetTrackerProps) {
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [rpe, setRpe] = useState('');

  const currentSetNumber = completedSets.length + 1;
  const weightUnit = units === 'imperial' ? 'lbs' : 'kg';

  // Get previous set data for comparison
  const previousSet = previousSets?.[completedSets.length];

  const handleCompleteSet = useCallback(() => {
    const weightNum = parseFloat(weight);
    const repsNum = parseInt(reps, 10);

    if (isNaN(weightNum) || isNaN(repsNum) || repsNum <= 0) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    onCompleteSet({
      setNumber: currentSetNumber,
      weight: weightNum,
      reps: repsNum,
      rpe: rpe ? parseFloat(rpe) : undefined,
      completedAt: Date.now(),
    });

    // Keep weight for next set, clear reps
    setReps('');
    setRpe('');
  }, [weight, reps, rpe, currentSetNumber, onCompleteSet]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.exerciseName}>{exerciseName}</Text>
        <Text style={styles.setCount}>
          Set {currentSetNumber}{targetSets ? ` / ${targetSets}` : ''}
        </Text>
      </View>

      {previousSet ? (
        <View style={styles.previousRow}>
          <Text style={styles.previousLabel}>Last time:</Text>
          <Text style={styles.previousValue}>
            {previousSet.weight}{weightUnit} x {previousSet.reps}
          </Text>
        </View>
      ) : null}

      <View style={styles.inputRow}>
        <View style={styles.inputGroup}>
          <TextInput
            style={styles.input}
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
            placeholder="Weight"
            placeholderTextColor={colors.textTertiary}
            accessibilityLabel={`Weight in ${weightUnit}`}
          />
          <Text style={styles.inputUnit}>{weightUnit}</Text>
        </View>

        <View style={styles.inputGroup}>
          <TextInput
            style={styles.input}
            value={reps}
            onChangeText={setReps}
            keyboardType="number-pad"
            placeholder="Reps"
            placeholderTextColor={colors.textTertiary}
            accessibilityLabel="Number of reps"
          />
          <Text style={styles.inputUnit}>reps</Text>
        </View>

        <View style={[styles.inputGroup, styles.inputGroupSmall]}>
          <TextInput
            style={styles.input}
            value={rpe}
            onChangeText={setRpe}
            keyboardType="decimal-pad"
            placeholder="RPE"
            placeholderTextColor={colors.textTertiary}
            accessibilityLabel="Rate of perceived exertion"
          />
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.completeButton,
          pressed && styles.completeButtonPressed,
          (!weight || !reps) && styles.completeButtonDisabled,
        ]}
        onPress={handleCompleteSet}
        disabled={!weight || !reps}
        accessibilityRole="button"
        accessibilityLabel="Complete set"
      >
        <Text style={styles.completeButtonText}>Complete Set</Text>
      </Pressable>

      {completedSets.length > 0 ? (
        <View style={styles.history}>
          {completedSets.map((s, i) => (
            <View key={i} style={styles.historyRow}>
              <Text style={styles.historySet}>Set {s.setNumber}</Text>
              <Text style={styles.historyValue}>
                {s.weight}{weightUnit} x {s.reps}
                {s.rpe != null ? ` @ RPE ${s.rpe}` : ''}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  exerciseName: {
    ...typography.heading,
    color: colors.textPrimary,
    flex: 1,
  },
  setCount: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  previousRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.sm,
  },
  previousLabel: {
    ...typography.caption,
    color: colors.textTertiary,
    marginRight: spacing.sm,
  },
  previousValue: {
    ...typography.caption,
    color: colors.secondary,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  inputGroup: {
    flex: 1,
  },
  inputGroupSmall: {
    flex: 0.6,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.textPrimary,
    fontSize: 18,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: touchTarget.standard,
  },
  inputUnit: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: 4,
  },
  completeButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    minHeight: touchTarget.workout,
    justifyContent: 'center',
  },
  completeButtonPressed: {
    opacity: 0.85,
  },
  completeButtonDisabled: {
    opacity: 0.4,
  },
  completeButtonText: {
    ...typography.button,
    color: colors.background,
    fontSize: 16,
  },
  history: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  historySet: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  historyValue: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
