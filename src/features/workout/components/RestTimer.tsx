import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '@/theme/colors';
import { spacing, touchTarget, borderRadius } from '@/theme/spacing';
import { typography } from '@/theme/typography';

interface RestTimerProps {
  defaultDuration?: number; // seconds
  onComplete: () => void;
  onSkip: () => void;
}

export function RestTimer({
  defaultDuration = 90,
  onComplete,
  onSkip,
}: RestTimerProps) {
  const [remaining, setRemaining] = useState(defaultDuration);
  const [isActive, setIsActive] = useState(true);
  const hasNotifiedRef = useRef(false);

  useEffect(() => {
    if (!isActive) return;

    const timer = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (!hasNotifiedRef.current) {
            hasNotifiedRef.current = true;
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onComplete();
          }
          return 0;
        }

        // Warning haptic at 10 seconds
        if (prev === 11) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }

        return prev - 1;
      });
    }, 1000);

    // Initial haptic
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    return () => clearInterval(timer);
  }, [isActive, onComplete]);

  const handleSkip = useCallback(() => {
    setIsActive(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSkip();
  }, [onSkip]);

  const handleAddTime = useCallback((seconds: number) => {
    setRemaining((prev) => prev + seconds);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const isWarning = remaining <= 10 && remaining > 0;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>REST</Text>

      <Text style={[styles.timer, isWarning && styles.timerWarning]}>
        {mins}:{secs.toString().padStart(2, '0')}
      </Text>

      <View style={styles.adjustRow}>
        <Pressable
          style={styles.adjustButton}
          onPress={() => handleAddTime(-15)}
          accessibilityLabel="Remove 15 seconds"
        >
          <Text style={styles.adjustText}>-15s</Text>
        </Pressable>

        <Pressable
          style={styles.adjustButton}
          onPress={() => handleAddTime(15)}
          accessibilityLabel="Add 15 seconds"
        >
          <Text style={styles.adjustText}>+15s</Text>
        </Pressable>

        <Pressable
          style={styles.adjustButton}
          onPress={() => handleAddTime(30)}
          accessibilityLabel="Add 30 seconds"
        >
          <Text style={styles.adjustText}>+30s</Text>
        </Pressable>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.skipButton,
          pressed && styles.skipButtonPressed,
        ]}
        onPress={handleSkip}
        accessibilityRole="button"
        accessibilityLabel="Skip rest"
      >
        <Text style={styles.skipButtonText}>Skip Rest</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    ...typography.metricLabel,
    color: colors.textTertiary,
    letterSpacing: 4,
    marginBottom: spacing.sm,
  },
  timer: {
    fontSize: 56,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  timerWarning: {
    color: colors.warning,
  },
  adjustRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  adjustButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    minHeight: touchTarget.minimum,
    justifyContent: 'center',
  },
  adjustText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  skipButton: {
    paddingHorizontal: spacing.xxxl,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary + '20',
    borderRadius: borderRadius.md,
    minHeight: touchTarget.standard,
    justifyContent: 'center',
  },
  skipButtonPressed: {
    opacity: 0.7,
  },
  skipButtonText: {
    ...typography.button,
    color: colors.primary,
  },
});
