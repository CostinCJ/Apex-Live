import { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import type { VoiceCoachState } from '@/types/voice';
import { colors } from '@/theme/colors';

interface VoiceOrbProps {
  state: VoiceCoachState;
  size?: number;
}

const stateColors: Record<VoiceCoachState, string> = {
  idle: colors.voiceIdle,
  listening: colors.voiceListening,
  processing: colors.voiceProcessing,
  speaking: colors.voiceSpeaking,
  error: colors.voiceError,
};

export function VoiceOrb({ state, size = 120 }: VoiceOrbProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    scaleAnim.stopAnimation();
    opacityAnim.stopAnimation();

    if (state === 'listening') {
      // Pulsing animation for listening
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(scaleAnim, {
              toValue: 1.2,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 0.6,
              duration: 800,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(scaleAnim, {
              toValue: 1,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 0.3,
              duration: 800,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ).start();
    } else if (state === 'speaking') {
      // Faster pulse for speaking
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.15,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ).start();
      Animated.timing(opacityAnim, {
        toValue: 0.5,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else if (state === 'processing') {
      // Steady glow for processing
      Animated.timing(opacityAnim, {
        toValue: 0.4,
        duration: 300,
        useNativeDriver: true,
      }).start();
      Animated.timing(scaleAnim, {
        toValue: 1.05,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // Reset for idle/error
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      Animated.timing(opacityAnim, {
        toValue: 0.2,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [state]);

  const orbColor = stateColors[state];

  return (
    <View
      style={[styles.container, { width: size, height: size }]}
      accessibilityRole="image"
      accessibilityLabel={`Voice coach ${state}`}
    >
      <Animated.View
        style={[
          styles.glow,
          {
            width: size * 1.5,
            height: size * 1.5,
            borderRadius: (size * 1.5) / 2,
            backgroundColor: orbColor,
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      />
      <View
        style={[
          styles.orb,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: orbColor,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
  },
  orb: {
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
