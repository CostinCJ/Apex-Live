import { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';
import { spacing, touchTarget, borderRadius } from '@/theme/spacing';
import { typography } from '@/theme/typography';

interface WorkoutHistoryRowProps {
  id: string;
  workoutType: string;
  title: string | null;
  startedAt: string;
  durationSeconds: number | null;
  totalVolume?: number;
  totalCalories?: number;
  onPress: (id: string) => void;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

const typeLabels: Record<string, string> = {
  push: 'Push',
  pull: 'Pull',
  legs: 'Legs',
  upper: 'Upper',
  lower: 'Lower',
  full_body: 'Full Body',
  hiit: 'HIIT',
  cardio_run: 'Run',
  cardio_cycle: 'Cycle',
  cardio_row: 'Row',
  yoga: 'Yoga',
  mobility: 'Mobility',
  custom: 'Custom',
};

export const WorkoutHistoryRow = memo(function WorkoutHistoryRow({
  id,
  workoutType,
  title,
  startedAt,
  durationSeconds,
  totalVolume: _totalVolume,
  totalCalories,
  onPress,
}: WorkoutHistoryRowProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed,
      ]}
      onPress={() => onPress(id)}
      accessibilityRole="button"
      accessibilityLabel={`${title ?? typeLabels[workoutType] ?? workoutType} workout on ${formatDate(startedAt)}`}
    >
      <View style={styles.left}>
        <Text style={styles.title}>
          {title ?? typeLabels[workoutType] ?? workoutType}
        </Text>
        <Text style={styles.date}>
          {formatDate(startedAt)} at {formatTime(startedAt)}
        </Text>
      </View>

      <View style={styles.right}>
        {durationSeconds != null ? (
          <Text style={styles.stat}>{formatDuration(durationSeconds)}</Text>
        ) : null}
        {totalCalories != null && totalCalories > 0 ? (
          <Text style={styles.statSmall}>{Math.round(totalCalories)} cal</Text>
        ) : null}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: touchTarget.workout,
  },
  pressed: {
    backgroundColor: colors.surfacePressed,
  },
  left: {
    flex: 1,
  },
  title: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  date: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  right: {
    alignItems: 'flex-end',
  },
  stat: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  statSmall: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },
});
