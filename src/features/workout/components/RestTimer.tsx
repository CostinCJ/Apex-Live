import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { triggerHaptic } from '@/utils/haptics';
import { colors } from '@/theme/colors';
import { spacing, touchTarget, borderRadius } from '@/theme/spacing';
import { typography } from '@/theme/typography';

interface RestTimerProps {
  defaultDuration?: number;
  onComplete: () => void;
  onSkip: () => void;
}

export const RestTimer = memo(function RestTimer({
  defaultDuration = 90,
  onComplete,
  onSkip,
}: RestTimerProps) {
  const [remaining, setRemaining] = useState(defaultDuration);
  const [isActive, setIsActive] = useState(true);
  const hasNotifiedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const progress = remaining / defaultDuration;

  useEffect(() => {
    if (!isActive) return;

    const timer = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (!hasNotifiedRef.current) {
            hasNotifiedRef.current = true;
            void triggerHaptic('rest_end');
            onCompleteRef.current();
          }
          return 0;
        }

        if (prev === 11) {
          void triggerHaptic('rest_warning');
        }

        return prev - 1;
      });
    }, 1000);

    void triggerHaptic('rest_start');

    return () => clearInterval(timer);
  }, [isActive]);

  const handleSkip = useCallback(() => {
    setIsActive(false);
    void triggerHaptic('button_press');
    onSkip();
  }, [onSkip]);

  const handleAddTime = useCallback((seconds: number) => {
    setRemaining((prev) => Math.max(0, prev + seconds));
    void triggerHaptic('button_press');
  }, []);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const isWarning = remaining <= 10 && remaining > 0;

  // Ring dimensions
  const ringSize = 200;
  const ringBorder = 6;

  return (
    <View style={styles.overlay}>
      <View style={styles.content}>
        <Text style={styles.label}>REST</Text>

        {/* Countdown ring */}
        <View style={[styles.ring, { width: ringSize, height: ringSize, borderRadius: ringSize / 2 }]}>
          <View
            style={[
              styles.ringProgress,
              {
                width: ringSize - ringBorder * 2,
                height: ringSize - ringBorder * 2,
                borderRadius: (ringSize - ringBorder * 2) / 2,
                borderWidth: ringBorder,
                borderColor: isWarning ? colors.warning : colors.primary,
                opacity: progress,
              },
            ]}
          />
          <View style={styles.ringCenter}>
            <Text style={[styles.timer, isWarning && styles.timerWarning]}>
              {mins}:{secs.toString().padStart(2, '0')}
            </Text>
          </View>
        </View>

        <View style={styles.adjustRow}>
          <Pressable
            style={({ pressed }) => [styles.adjustButton, pressed && styles.adjustPressed]}
            onPress={() => handleAddTime(-15)}
            accessibilityLabel="Remove 15 seconds"
          >
            <Text style={styles.adjustText}>-15s</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.adjustButton, pressed && styles.adjustPressed]}
            onPress={() => handleAddTime(15)}
            accessibilityLabel="Add 15 seconds"
          >
            <Text style={styles.adjustText}>+15s</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.adjustButton, pressed && styles.adjustPressed]}
            onPress={() => handleAddTime(30)}
            accessibilityLabel="Add 30 seconds"
          >
            <Text style={styles.adjustText}>+30s</Text>
          </Pressable>
        </View>

        <Pressable
          style={({ pressed }) => [styles.skipButton, pressed && styles.skipPressed]}
          onPress={handleSkip}
          accessibilityRole="button"
          accessibilityLabel="Skip rest"
        >
          <Text style={styles.skipButtonText}>Skip Rest</Text>
        </Pressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13, 13, 13, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  content: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  label: {
    ...typography.metricLabel,
    color: colors.textSecondary,
    letterSpacing: 6,
    marginBottom: spacing.xl,
    fontSize: 16,
  },
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    marginBottom: spacing.xl,
  },
  ringProgress: {
    position: 'absolute',
  },
  ringCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  timer: {
    ...typography.timer,
    color: colors.textPrimary,
    fontSize: 56,
    lineHeight: 64,
  },
  timerWarning: {
    color: colors.warning,
  },
  adjustRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  adjustButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.surfaceGlass,
    borderRadius: borderRadius.full,
    minHeight: touchTarget.minimum,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  adjustPressed: {
    backgroundColor: colors.surfacePressed,
  },
  adjustText: {
    ...typography.button,
    color: colors.textSecondary,
    fontSize: 14,
  },
  skipButton: {
    paddingHorizontal: spacing.xxxl,
    paddingVertical: spacing.lg,
    backgroundColor: colors.primary + '20',
    borderRadius: borderRadius.full,
    minHeight: touchTarget.workout,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  skipPressed: {
    backgroundColor: colors.primary + '35',
  },
  skipButtonText: {
    ...typography.button,
    color: colors.primary,
    fontSize: 18,
  },
});
