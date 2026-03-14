import { useState, useCallback, memo } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

export const SetTracker = memo(function SetTracker({
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
  const [weightFocused, setWeightFocused] = useState(false);
  const [repsFocused, setRepsFocused] = useState(false);

  const currentSetNumber = completedSets.length + 1;
  const weightUnit = units === 'imperial' ? 'lbs' : 'kg';

  const previousSet = previousSets?.[completedSets.length];
  const setsRemaining = targetSets ? targetSets - completedSets.length : null;

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

    setReps('');
    setRpe('');
  }, [weight, reps, rpe, currentSetNumber, onCompleteSet]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.exerciseName} numberOfLines={1}>{exerciseName}</Text>
        <View style={styles.setIndicator}>
          <Text style={styles.setCount}>
            Set {currentSetNumber}
          </Text>
          {targetSets ? (
            <Text style={styles.setTarget}> / {targetSets}</Text>
          ) : null}
        </View>
      </View>

      {/* Set progress dots */}
      {targetSets ? (
        <View style={styles.setProgress}>
          {Array.from({ length: targetSets }, (_, i) => (
            <View
              key={i}
              style={[
                styles.setDot,
                i < completedSets.length && styles.setDotDone,
                i === completedSets.length && styles.setDotCurrent,
              ]}
            >
              {i < completedSets.length ? (
                <Ionicons name="checkmark" size={10} color={colors.background} />
              ) : null}
            </View>
          ))}
          {setsRemaining != null && setsRemaining > 0 ? (
            <Text style={styles.setsRemaining}>{setsRemaining} left</Text>
          ) : null}
        </View>
      ) : null}

      {previousSet ? (
        <View style={styles.previousRow}>
          <Ionicons name="time-outline" size={14} color={colors.textTertiary} />
          <Text style={styles.previousLabel}>Last:</Text>
          <Text style={styles.previousValue}>
            {previousSet.weight}{weightUnit} x {previousSet.reps}
          </Text>
        </View>
      ) : null}

      <View style={styles.inputRow}>
        <View style={styles.inputGroup}>
          <TextInput
            style={[styles.input, weightFocused && styles.inputFocused]}
            value={weight}
            onChangeText={setWeight}
            onFocus={() => setWeightFocused(true)}
            onBlur={() => setWeightFocused(false)}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={colors.textTertiary}
            accessibilityLabel={`Weight in ${weightUnit}`}
          />
          <Text style={styles.inputUnit}>{weightUnit}</Text>
        </View>

        <View style={styles.inputGroup}>
          <TextInput
            style={[styles.input, repsFocused && styles.inputFocused]}
            value={reps}
            onChangeText={setReps}
            onFocus={() => setRepsFocused(true)}
            onBlur={() => setRepsFocused(false)}
            keyboardType="number-pad"
            placeholder="0"
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
        <Ionicons name="checkmark-circle" size={22} color={colors.background} />
        <Text style={styles.completeButtonText}>Complete Set</Text>
      </Pressable>

      {completedSets.length > 0 ? (
        <View style={styles.history}>
          {completedSets.map((s, i) => (
            <View key={i} style={styles.historyRow}>
              <View style={styles.historyBadge}>
                <Ionicons name="checkmark" size={12} color={colors.primary} />
              </View>
              <Text style={styles.historySet}>Set {s.setNumber}</Text>
              <Text style={styles.historyValue}>
                {s.weight}{weightUnit} x {s.reps}
                {s.rpe != null ? ` @ ${s.rpe}` : ''}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  exerciseName: {
    ...typography.heading,
    color: colors.textPrimary,
    flex: 1,
  },
  setIndicator: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  setCount: {
    ...typography.button,
    color: colors.primary,
    fontSize: 18,
  },
  setTarget: {
    ...typography.caption,
    color: colors.textTertiary,
  },

  // Progress dots
  setProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.md,
  },
  setDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setDotDone: {
    backgroundColor: colors.primary,
  },
  setDotCurrent: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.background,
  },
  setsRemaining: {
    ...typography.caption,
    color: colors.textTertiary,
    marginLeft: spacing.xs,
  },

  previousRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surfaceGlass,
    borderRadius: borderRadius.sm,
  },
  previousLabel: {
    ...typography.caption,
    color: colors.textTertiary,
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
    fontSize: 22,
    textAlign: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    minHeight: touchTarget.workout,
    fontWeight: '600',
  },
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  inputUnit: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: 4,
  },
  completeButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: touchTarget.workout,
  },
  completeButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  completeButtonDisabled: {
    opacity: 0.4,
  },
  completeButtonText: {
    ...typography.button,
    color: colors.background,
    fontSize: 17,
  },
  history: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.xs,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  historyBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historySet: {
    ...typography.caption,
    color: colors.textTertiary,
    width: 50,
  },
  historyValue: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    flex: 1,
  },
});
