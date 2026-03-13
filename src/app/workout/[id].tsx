import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import { colors } from '@/theme/colors';
import { spacing, touchTarget, borderRadius } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export default function ActiveWorkoutScreen() {
  useKeepAwake();

  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const handleEndWorkout = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.exerciseName}>
          {id?.replace(/_/g, ' ').toUpperCase() ?? 'WORKOUT'}
        </Text>
      </View>

      <View style={styles.timerContainer}>
        <Text style={styles.timer}>00:00</Text>
        <Text style={styles.timerLabel}>ELAPSED</Text>
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>--</Text>
          <Text style={styles.metricLabel}>BPM</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>0</Text>
          <Text style={styles.metricLabel}>CAL</Text>
        </View>
      </View>

      <View style={styles.voiceArea}>
        <View style={styles.voiceOrb}>
          <Text style={styles.voiceOrbText}>Coach</Text>
        </View>
        <Text style={styles.voiceStatus}>Tap to start coaching</Text>
      </View>

      <View style={styles.controls}>
        <Pressable
          style={[styles.controlButton, styles.endButton]}
          onPress={handleEndWorkout}
          accessibilityRole="button"
          accessibilityLabel="End workout"
        >
          <Text style={styles.endButtonText}>End Workout</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  exerciseName: {
    ...typography.heading,
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  timer: {
    ...typography.timer,
    color: colors.textPrimary,
  },
  timerLabel: {
    ...typography.metricLabel,
    color: colors.textTertiary,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricValue: {
    ...typography.metricMedium,
    color: colors.textPrimary,
  },
  metricLabel: {
    ...typography.metricLabel,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  voiceArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceOrb: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.voiceIdle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  voiceOrbText: {
    ...typography.button,
    color: colors.voiceIdle,
  },
  voiceStatus: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  controls: {
    paddingBottom: spacing.lg,
  },
  controlButton: {
    minHeight: touchTarget.workout,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endButton: {
    backgroundColor: colors.danger,
  },
  endButtonText: {
    ...typography.button,
    color: colors.white,
  },
});
