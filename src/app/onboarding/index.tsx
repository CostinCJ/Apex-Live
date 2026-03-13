import { useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { colors } from '@/theme/colors';
import { spacing, touchTarget, borderRadius } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { useSettingsStore } from '@/stores/settingsStore';

type Step = 'welcome' | 'fitness_level' | 'voice_prefs' | 'permissions' | 'ready';

const STEPS: Step[] = ['welcome', 'fitness_level', 'voice_prefs', 'permissions', 'ready'];

export default function OnboardingScreen() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex] ?? 'welcome';

  const setFitnessLevel = useSettingsStore((s) => s.setFitnessLevel);
  const setCoachVerbosity = useSettingsStore((s) => s.setCoachVerbosity);
  const setCoachStyle = useSettingsStore((s) => s.setCoachStyle);
  const setHasCompletedOnboarding = useSettingsStore((s) => s.setHasCompletedOnboarding);

  const next = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (stepIndex < STEPS.length - 1) {
      setStepIndex(stepIndex + 1);
    }
  }, [stepIndex]);

  const finish = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setHasCompletedOnboarding(true);
    router.replace('/(tabs)');
  }, [router, setHasCompletedOnboarding]);

  const selectFitnessLevel = useCallback(
    (level: 'beginner' | 'intermediate' | 'advanced') => {
      setFitnessLevel(level);
      next();
    },
    [setFitnessLevel, next],
  );

  const selectStyle = useCallback(
    (style: 'motivational' | 'technical' | 'balanced') => {
      setCoachStyle(style);
      next();
    },
    [setCoachStyle, next],
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress dots */}
      <View style={styles.progress}>
        {STEPS.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i <= stepIndex && styles.dotActive]}
          />
        ))}
      </View>

      {step === 'welcome' ? (
        <View style={styles.content}>
          <Text style={styles.logo}>APEX</Text>
          <Text style={styles.tagline}>Your AI Voice Fitness Coach</Text>
          <Text style={styles.description}>
            Real-time voice coaching powered by AI. Get personalized guidance,
            track your progress, and crush your goals.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
            onPress={next}
            accessibilityRole="button"
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </Pressable>
        </View>
      ) : step === 'fitness_level' ? (
        <View style={styles.content}>
          <Text style={styles.title}>What's your fitness level?</Text>
          <Text style={styles.subtitle}>
            This helps your coach tailor guidance to you
          </Text>

          {([
            { level: 'beginner' as const, label: 'Beginner', desc: 'New to working out or getting back into it' },
            { level: 'intermediate' as const, label: 'Intermediate', desc: 'Regular training, familiar with exercises' },
            { level: 'advanced' as const, label: 'Advanced', desc: 'Experienced lifter, training for specific goals' },
          ]).map(({ level, label, desc }) => (
            <Pressable
              key={level}
              style={({ pressed }) => [styles.optionCard, pressed && styles.optionCardPressed]}
              onPress={() => selectFitnessLevel(level)}
              accessibilityRole="button"
              accessibilityLabel={`${label}: ${desc}`}
            >
              <Text style={styles.optionLabel}>{label}</Text>
              <Text style={styles.optionDesc}>{desc}</Text>
            </Pressable>
          ))}
        </View>
      ) : step === 'voice_prefs' ? (
        <View style={styles.content}>
          <Text style={styles.title}>How should your coach talk?</Text>

          {([
            { style: 'motivational' as const, label: 'Motivational', desc: 'Energetic, encouraging, celebrates wins' },
            { style: 'technical' as const, label: 'Technical', desc: 'Form cues, precise, instructional' },
            { style: 'balanced' as const, label: 'Balanced', desc: 'Mix of motivation and technique' },
          ]).map(({ style, label, desc }) => (
            <Pressable
              key={style}
              style={({ pressed }) => [styles.optionCard, pressed && styles.optionCardPressed]}
              onPress={() => selectStyle(style)}
              accessibilityRole="button"
              accessibilityLabel={`${label}: ${desc}`}
            >
              <Text style={styles.optionLabel}>{label}</Text>
              <Text style={styles.optionDesc}>{desc}</Text>
            </Pressable>
          ))}
        </View>
      ) : step === 'permissions' ? (
        <View style={styles.content}>
          <Text style={styles.title}>Almost there!</Text>
          <Text style={styles.description}>
            Apex needs microphone access for voice coaching, and health data access
            to show your heart rate and calories during workouts.
            {'\n\n'}
            You'll be asked for these permissions when you start your first workout.
            You can change them anytime in Settings.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
            onPress={next}
            accessibilityRole="button"
          >
            <Text style={styles.primaryButtonText}>Continue</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.content}>
          <Text style={styles.title}>You're all set!</Text>
          <Text style={styles.description}>
            Start your first workout and let Apex guide you with real-time
            voice coaching.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
            onPress={finish}
            accessibilityRole="button"
          >
            <Text style={styles.primaryButtonText}>Start Training</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  progress: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceElevated,
  },
  dotActive: {
    backgroundColor: colors.primary,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  logo: {
    fontSize: 64,
    fontWeight: '900',
    color: colors.primary,
    textAlign: 'center',
    letterSpacing: 12,
    marginBottom: spacing.md,
  },
  tagline: {
    ...typography.heading,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xxxl,
    lineHeight: 24,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    minHeight: touchTarget.workout,
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  primaryButtonText: {
    ...typography.button,
    color: colors.background,
    fontSize: 18,
  },
  optionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: touchTarget.workout,
    justifyContent: 'center',
  },
  optionCardPressed: {
    backgroundColor: colors.surfacePressed,
    borderColor: colors.primary,
  },
  optionLabel: {
    ...typography.heading,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  optionDesc: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
