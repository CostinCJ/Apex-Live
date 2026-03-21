import { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { spacing, borderRadius } from '@/theme/spacing';
import { typography } from '@/theme/typography';

interface ExerciseHeaderProps {
  exerciseName: string | undefined;
  currentIndex: number;
  totalExercises: number;
  onPrevious: () => void;
  onNext: () => void;
}

export const ExerciseHeader = memo(function ExerciseHeader({
  exerciseName,
  currentIndex,
  totalExercises,
  onPrevious,
  onNext,
}: ExerciseHeaderProps) {
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < totalExercises - 1;

  return (
    <View style={styles.header}>
      <View style={styles.exerciseNav}>
        <Pressable
          onPress={onPrevious}
          disabled={!hasPrevious}
          style={[styles.navButton, !hasPrevious && styles.navButtonDisabled]}
          accessibilityLabel="Previous exercise"
        >
          <Ionicons name="chevron-back" size={24} color={hasPrevious ? colors.textPrimary : colors.textTertiary} />
        </Pressable>

        <View style={styles.exerciseInfo}>
          <Text style={styles.exerciseName} numberOfLines={1}>
            {exerciseName ?? 'WORKOUT'}
          </Text>
          {totalExercises > 0 ? (
            <Text style={styles.exerciseProgress}>
              Exercise {currentIndex + 1} of {totalExercises}
            </Text>
          ) : null}
        </View>

        <Pressable
          onPress={onNext}
          disabled={!hasNext}
          style={[styles.navButton, !hasNext && styles.navButtonDisabled]}
          accessibilityLabel="Next exercise"
        >
          <Ionicons name="chevron-forward" size={24} color={hasNext ? colors.textPrimary : colors.textTertiary} />
        </Pressable>
      </View>

      {totalExercises > 1 ? (
        <View style={styles.progressBar} accessibilityLabel={`Exercise ${currentIndex + 1} of ${totalExercises}`}>
          {Array.from({ length: totalExercises }, (_, i) => (
            <View
              key={i}
              style={[
                styles.progressDot,
                i <= currentIndex && styles.progressDotActive,
                i === currentIndex && styles.progressDotCurrent,
              ]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
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
});
