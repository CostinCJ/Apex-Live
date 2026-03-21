import { memo } from 'react';
import { View, Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { spacing, touchTarget, borderRadius } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import type { VoiceConnectionState, VoiceCoachState } from '@/types/voice';

interface VoiceControlsProps {
  connectionState: VoiceConnectionState;
  coachState: VoiceCoachState;
  isListening: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onToggleListening: () => void;
}

export const VoiceControls = memo(function VoiceControls({
  connectionState,
  coachState,
  isListening,
  onConnect,
  onDisconnect,
  onToggleListening,
}: VoiceControlsProps) {
  const isConnected = connectionState === 'connected';
  const isConnecting = connectionState === 'connecting';

  const handleMicPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onToggleListening();
  };

  const handleConnectionPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (isConnected) {
      onDisconnect();
    } else {
      onConnect();
    }
  };

  return (
    <View style={styles.container}>
      {isConnected ? (
        <View style={styles.controls}>
          <Pressable
            style={({ pressed }) => [
              styles.micButton,
              isListening && styles.micButtonActive,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleMicPress}
            accessibilityRole="button"
            accessibilityLabel={isListening ? 'Mute microphone' : 'Unmute microphone'}
            accessibilityState={{ selected: isListening }}
          >
            <Ionicons
              name={isListening ? 'mic' : 'mic-off'}
              size={24}
              color={isListening ? colors.primary : colors.textTertiary}
              accessible={false}
            />
            <Text style={[styles.micLabel, isListening && styles.micLabelActive]}>
              {isListening ? 'Listening' : 'Muted'}
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.endButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleConnectionPress}
            accessibilityRole="button"
            accessibilityLabel="End coaching session"
          >
            <Text style={styles.endButtonText}>End Session</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          style={({ pressed }) => [
            styles.connectButton,
            pressed && styles.buttonPressed,
            isConnecting && styles.connectButtonDisabled,
          ]}
          onPress={handleConnectionPress}
          disabled={isConnecting}
          accessibilityRole="button"
          accessibilityLabel="Start voice coaching"
        >
          <Text style={styles.connectButtonText}>
            {isConnecting ? 'Connecting...' : 'Start Coaching'}
          </Text>
        </Pressable>
      )}

      {isConnected ? (
        <Text style={styles.statusText}>
          {coachState === 'listening'
            ? 'Listening to you...'
            : coachState === 'processing'
              ? 'Thinking...'
              : coachState === 'speaking'
                ? 'Coach is speaking'
                : 'Ready'}
        </Text>
      ) : connectionState === 'reconnecting' ? (
        <View style={styles.reconnectingRow}>
          <ActivityIndicator size="small" color={colors.warning} />
          <Text style={[styles.statusText, { color: colors.warning }]}>Reconnecting...</Text>
        </View>
      ) : connectionState === 'error' ? (
        <Text style={[styles.statusText, { color: colors.error }]}>Connection lost. Tap to retry.</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: spacing.md,
  },
  controls: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  micButton: {
    width: touchTarget.workout,
    height: touchTarget.workout,
    borderRadius: touchTarget.workout / 2,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  micButtonActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  micLabel: {
    ...typography.caption,
    color: colors.textTertiary,
    fontSize: 10,
    marginTop: 2,
  },
  micLabelActive: {
    color: colors.primary,
  },
  endButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.error + '20',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.error + '40',
    minHeight: touchTarget.standard,
    justifyContent: 'center',
  },
  endButtonText: {
    ...typography.button,
    color: colors.error,
  },
  connectButton: {
    paddingHorizontal: spacing.xxxl,
    paddingVertical: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    minHeight: touchTarget.workout,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectButtonDisabled: {
    opacity: 0.6,
  },
  connectButtonText: {
    ...typography.button,
    color: colors.background,
    fontSize: 18,
  },
  statusText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  reconnectingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
