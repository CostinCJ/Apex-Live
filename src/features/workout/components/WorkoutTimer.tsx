import { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

interface WorkoutTimerProps {
  elapsedSeconds: number;
  isPaused: boolean;
}

export const WorkoutTimer = memo(function WorkoutTimer({ elapsedSeconds, isPaused }: WorkoutTimerProps) {
  const minutes = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
  const seconds = String(elapsedSeconds % 60).padStart(2, '0');

  return (
    <View style={styles.container} accessibilityLabel={`${minutes} minutes ${seconds} seconds elapsed`}>
      <View style={styles.ring}>
        <Text style={styles.timer}>
          {minutes}:{seconds}
        </Text>
      </View>
      <Text style={styles.label}>
        {isPaused ? 'PAUSED' : 'ELAPSED'}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  ring: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: colors.primary + '30',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  timer: {
    ...typography.timer,
    color: colors.textPrimary,
    fontSize: 32,
    lineHeight: 38,
  },
  label: {
    ...typography.metricLabel,
    color: colors.textTertiary,
    marginTop: spacing.xs,
    fontSize: 11,
  },
});
