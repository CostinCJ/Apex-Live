import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors } from '@/theme/colors';
import { spacing, touchTarget, borderRadius } from '@/theme/spacing';
import { typography } from '@/theme/typography';

interface AuthFormProps {
  mode: 'login' | 'register';
  loading: boolean;
  error: string | null;
  onSubmit: (email: string, password: string) => void;
  onSwitchMode: () => void;
  onClearError: () => void;
}

export function AuthForm({
  mode,
  loading,
  error,
  onSubmit,
  onSwitchMode,
  onClearError,
}: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = () => {
    setLocalError(null);
    onClearError();

    if (!email.trim() || !password.trim()) {
      setLocalError('Email and password are required');
      return;
    }

    if (mode === 'register' && password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters');
      return;
    }

    onSubmit(email.trim(), password);
  };

  const displayError = localError ?? error;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <Text style={styles.logo}>APEX</Text>
        <Text style={styles.subtitle}>
          {mode === 'login' ? 'Welcome back' : 'Create your account'}
        </Text>

        {displayError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{displayError}</Text>
          </View>
        ) : null}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.textTertiary}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Email address"
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.textTertiary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          accessibilityLabel="Password"
          editable={!loading}
        />

        {mode === 'register' ? (
          <TextInput
            style={styles.input}
            placeholder="Confirm password"
            placeholderTextColor={colors.textTertiary}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
            accessibilityLabel="Confirm password"
            editable={!loading}
          />
        ) : null}

        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
            loading && styles.buttonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel={mode === 'login' ? 'Sign in' : 'Create account'}
        >
          {loading ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={styles.buttonText}>
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </Text>
          )}
        </Pressable>

        <Pressable
          style={styles.switchButton}
          onPress={onSwitchMode}
          accessibilityRole="button"
        >
          <Text style={styles.switchText}>
            {mode === 'login'
              ? "Don't have an account? Sign up"
              : 'Already have an account? Sign in'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  logo: {
    fontSize: 48,
    fontWeight: '900',
    color: colors.primary,
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xxxl,
  },
  errorContainer: {
    backgroundColor: colors.error + '20',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.error + '40',
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    textAlign: 'center',
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    color: colors.textPrimary,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: touchTarget.standard,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: touchTarget.workout,
    marginTop: spacing.md,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    ...typography.button,
    color: colors.background,
    fontSize: 18,
  },
  switchButton: {
    marginTop: spacing.xl,
    alignItems: 'center',
    padding: spacing.md,
  },
  switchText: {
    ...typography.body,
    color: colors.primary,
  },
});
