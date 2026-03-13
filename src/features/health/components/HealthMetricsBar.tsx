import { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';
import { spacing, borderRadius } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import type { HeartRateZone } from '@/types/health';

interface HealthMetricsBarProps {
  heartRate: number | null;
  heartRateZone: HeartRateZone | null;
  caloriesBurned: number | null;
  elapsedSeconds: number;
}

const zoneColors: Record<HeartRateZone, string> = {
  rest: colors.hrZone1,
  warmup: colors.hrZone2,
  fat_burn: colors.hrZone3,
  cardio: colors.hrZone4,
  peak: colors.hrZone5,
};

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const HealthMetricsBar = memo(function HealthMetricsBar({
  heartRate,
  heartRateZone,
  caloriesBurned,
  elapsedSeconds,
}: HealthMetricsBarProps) {
  const hrColor = heartRateZone ? zoneColors[heartRateZone] : colors.textTertiary;

  return (
    <View style={styles.container} accessibilityRole="summary">
      <View style={styles.metric}>
        <Text style={[styles.value, { color: hrColor }]}>
          {heartRate != null ? heartRate : '--'}
        </Text>
        <Text style={styles.label}>BPM</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.metric}>
        <Text style={styles.value}>
          {caloriesBurned != null ? Math.round(caloriesBurned) : '0'}
        </Text>
        <Text style={styles.label}>CAL</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.metric}>
        <Text style={styles.value}>{formatDuration(elapsedSeconds)}</Text>
        <Text style={styles.label}>TIME</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  metric: {
    flex: 1,
    alignItems: 'center',
  },
  value: {
    ...typography.metricMedium,
    color: colors.textPrimary,
  },
  label: {
    ...typography.metricLabel,
    color: colors.textTertiary,
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
});
