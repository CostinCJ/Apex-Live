import { Component, type ReactNode, type ErrorInfo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { colors } from '@/theme/colors';
import { spacing, touchTarget, borderRadius } from '@/theme/spacing';
import { typography } from '@/theme/typography';

interface VoiceErrorBoundaryProps {
  children: ReactNode;
}

interface VoiceErrorBoundaryState {
  hasError: boolean;
}

/**
 * Wraps voice coach components (VoiceOrb, VoiceControls, TranscriptOverlay).
 * A voice crash must NEVER take down the active workout.
 * Shows a "Coach unavailable" fallback with a retry button.
 */
export class VoiceErrorBoundary extends Component<VoiceErrorBoundaryProps, VoiceErrorBoundaryState> {
  constructor(props: VoiceErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): VoiceErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('VoiceErrorBoundary:', error, errorInfo);
    Sentry.captureException(error, {
      contexts: {
        react: { componentStack: errorInfo.componentStack ?? undefined },
      },
      tags: { boundary_level: 'voice' },
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.label}>Coach unavailable</Text>
          <Pressable
            style={({ pressed }) => [
              styles.retryButton,
              pressed && styles.retryButtonPressed,
            ]}
            onPress={this.handleRetry}
            accessibilityRole="button"
            accessibilityLabel="Retry voice coach"
          >
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    margin: spacing.md,
  },
  label: {
    ...typography.body,
    color: colors.textTertiary,
    marginBottom: spacing.md,
  },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minHeight: touchTarget.minimum,
    justifyContent: 'center',
  },
  retryButtonPressed: {
    opacity: 0.85,
  },
  retryText: {
    ...typography.button,
    color: colors.background,
    fontSize: 14,
  },
});
