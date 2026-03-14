import { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { spacing, touchTarget, borderRadius } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { WORKOUT_TYPE_META } from '@/data/workoutTypes';
import type { WorkoutType } from '@/types/workout';

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

function TypeIcon({ type }: { type: string }) {
  const meta = WORKOUT_TYPE_META[type as WorkoutType];
  if (!meta) return null;

  if (meta.iconFamily === 'Ionicons') {
    return <Ionicons name={meta.icon as keyof typeof Ionicons.glyphMap} size={20} color={meta.color} />;
  }
  return <MaterialCommunityIcons name={meta.icon as keyof typeof MaterialCommunityIcons.glyphMap} size={20} color={meta.color} />;
}

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
  const meta = WORKOUT_TYPE_META[workoutType as WorkoutType];
  const accentColor = meta?.color ?? colors.textTertiary;
  const displayTitle = title ?? meta?.label ?? workoutType;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        { borderLeftColor: accentColor, borderLeftWidth: 3 },
        pressed && styles.pressed,
      ]}
      onPress={() => onPress(id)}
      accessibilityRole="button"
      accessibilityLabel={`${displayTitle} workout on ${formatDate(startedAt)}`}
    >
      <View style={styles.iconCol}>
        <TypeIcon type={workoutType} />
      </View>

      <View style={styles.info}>
        <Text style={styles.title}>{displayTitle}</Text>
        <Text style={styles.date}>
          {formatDate(startedAt)} at {formatTime(startedAt)}
        </Text>
      </View>

      <View style={styles.stats}>
        {durationSeconds != null ? (
          <Text style={styles.stat}>{formatDuration(durationSeconds)}</Text>
        ) : null}
        {totalCalories != null && totalCalories > 0 ? (
          <Text style={styles.statSmall}>{Math.round(totalCalories)} cal</Text>
        ) : null}
      </View>

      <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    minHeight: touchTarget.workout,
    gap: spacing.md,
  },
  pressed: {
    backgroundColor: colors.surfacePressed,
  },
  iconCol: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceGlass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  title: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: 2,
  },
  date: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  stats: {
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
