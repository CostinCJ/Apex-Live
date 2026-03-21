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
import { Ionicons } from '@expo/vector-icons';
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
  onForgotPassword?: () => void;
}

export function AuthForm({
  mode,
  loading,
  error,
  onSubmit,
  onSwitchMode,
  onClearError,
  onForgotPassword,
}: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);

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

    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters');
      return;
    }

    if (mode === 'register') {
      if (!/[A-Z]/.test(password)) {
        setLocalError('Password must contain at least one uppercase letter');
        return;
      }
      if (!/[a-z]/.test(password)) {
        setLocalError('Password must contain at least one lowercase letter');
        return;
      }
      if (!/[0-9]/.test(password)) {
        setLocalError('Password must contain at least one digit');
        return;
      }
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
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>APEX</Text>
          <View style={styles.logoLine} />
          <Text style={styles.tagline}>AI Voice Fitness Coach</Text>
        </View>

        <Text style={styles.subtitle}>
          {mode === 'login' ? 'Welcome back' : 'Create your account'}
        </Text>

        {displayError ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={16} color={colors.error} />
            <Text style={styles.errorText}>{displayError}</Text>
          </View>
        ) : null}

        {/* Email */}
        <View style={[styles.inputWrapper, emailFocused && styles.inputWrapperFocused]}>
          <Ionicons name="mail-outline" size={18} color={emailFocused ? colors.primary : colors.textTertiary} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.textTertiary}
            value={email}
            onChangeText={setEmail}
            onFocus={() => setEmailFocused(true)}
            onBlur={() => setEmailFocused(false)}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Email address"
            editable={!loading}
          />
        </View>

        {/* Password */}
        <View style={[styles.inputWrapper, passwordFocused && styles.inputWrapperFocused]}>
          <Ionicons name="lock-closed-outline" size={18} color={passwordFocused ? colors.primary : colors.textTertiary} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.textTertiary}
            value={password}
            onChangeText={setPassword}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
            secureTextEntry
            autoCapitalize="none"
            accessibilityLabel="Password"
            editable={!loading}
          />
        </View>

        {/* Forgot Password */}
        {mode === 'login' && onForgotPassword ? (
          <Pressable
            style={styles.forgotButton}
            onPress={onForgotPassword}
            accessibilityRole="button"
          >
            <Text style={styles.forgotText}>Forgot password?</Text>
          </Pressable>
        ) : null}

        {/* Confirm Password */}
        {mode === 'register' ? (
          <View style={[styles.inputWrapper, confirmFocused && styles.inputWrapperFocused]}>
            <Ionicons name="lock-closed-outline" size={18} color={confirmFocused ? colors.primary : colors.textTertiary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Confirm password"
              placeholderTextColor={colors.textTertiary}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              onFocus={() => setConfirmFocused(true)}
              onBlur={() => setConfirmFocused(false)}
              secureTextEntry
              autoCapitalize="none"
              accessibilityLabel="Confirm password"
              editable={!loading}
            />
          </View>
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

  // Logo
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  logo: {
    fontSize: 52,
    fontWeight: '900',
    color: colors.primary,
    textAlign: 'center',
    letterSpacing: 10,
  },
  logoLine: {
    width: 60,
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: 2,
    marginVertical: spacing.sm,
  },
  tagline: {
    ...typography.caption,
    color: colors.textTertiary,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xxxl,
    marginTop: spacing.md,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.error + '15',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.error + '30',
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    flex: 1,
  },

  // Inputs
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    minHeight: touchTarget.standard,
  },
  inputWrapperFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceGlass,
  },
  inputIcon: {
    marginLeft: spacing.lg,
  },
  input: {
    flex: 1,
    padding: spacing.lg,
    color: colors.textPrimary,
    fontSize: 16,
  },

  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: touchTarget.workout,
    marginTop: spacing.md,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    ...typography.button,
    color: colors.background,
    fontSize: 18,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: spacing.sm,
    marginTop: -spacing.xs,
    padding: spacing.xs,
  },
  forgotText: {
    ...typography.caption,
    color: colors.primary,
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
