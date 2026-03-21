import { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { spacing, touchTarget, borderRadius } from '@/theme/spacing';
import { typography } from '@/theme/typography';

interface WorkoutBottomControlsProps {
  status: string;
  onPauseResume: () => void;
  onEnd: () => void;
  onAbandon: () => void;
}

export const WorkoutBottomControls = memo(function WorkoutBottomControls({
  status,
  onPauseResume,
  onEnd,
  onAbandon,
}: WorkoutBottomControlsProps) {
  return (
    <View style={styles.controls}>
      <Pressable
        style={({ pressed }) => [styles.controlBtn, styles.pauseBtn, pressed && styles.btnPressed]}
        onPress={onPauseResume}
        accessibilityRole="button"
        accessibilityLabel={status === 'paused' ? 'Resume workout' : 'Pause workout'}
      >
        <Ionicons
          name={status === 'paused' ? 'play' : 'pause'}
          size={22}
          color={colors.textPrimary}
        />
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.controlBtn, styles.endBtn, pressed && styles.btnPressed]}
        onPress={onEnd}
        accessibilityRole="button"
        accessibilityLabel="End workout"
      >
        <Ionicons name="checkmark-circle" size={20} color={colors.white} />
        <Text style={styles.endBtnText}>End Workout</Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.controlBtn, styles.abandonBtn, pressed && styles.btnPressed]}
        onPress={onAbandon}
        accessibilityRole="button"
        accessibilityLabel="Abandon workout"
      >
        <Ionicons name="close" size={22} color={colors.danger} />
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  controls: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
  },
  controlBtn: {
    minHeight: touchTarget.workout,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pauseBtn: {
    width: touchTarget.workout,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  endBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
  },
  endBtnText: {
    ...typography.button,
    color: colors.white,
  },
  abandonBtn: {
    width: touchTarget.workout,
    backgroundColor: colors.danger + '15',
    borderWidth: 1,
    borderColor: colors.danger + '30',
  },
  btnPressed: {
    opacity: 0.8,
  },
});
