import { Component, type ReactNode, type ErrorInfo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { colors } from '@/theme/colors';
import { spacing, borderRadius } from '@/theme/spacing';
import { typography } from '@/theme/typography';

interface HealthErrorBoundaryProps {
  children: ReactNode;
}

interface HealthErrorBoundaryState {
  hasError: boolean;
}

/**
 * Wraps health metric components (HeartRateDisplay, HealthMetricsBar).
 * A health data crash must NEVER stop the voice coach or workout.
 * Shows "--" placeholder values on error.
 */
export class HealthErrorBoundary extends Component<HealthErrorBoundaryProps, HealthErrorBoundaryState> {
  constructor(props: HealthErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): HealthErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('HealthErrorBoundary:', error, errorInfo);
    Sentry.captureException(error, {
      contexts: {
        react: { componentStack: errorInfo.componentStack ?? undefined },
      },
      tags: { boundary_level: 'health' },
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>--</Text>
            <Text style={styles.metricLabel}>BPM</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>--</Text>
            <Text style={styles.metricLabel}>CAL</Text>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
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
    color: colors.textTertiary,
  },
  metricLabel: {
    ...typography.metricLabel,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
});
