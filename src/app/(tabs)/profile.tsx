import { View, Text, StyleSheet, Pressable, Switch, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { spacing, touchTarget, borderRadius } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAuthContext } from '@/features/auth/context/AuthContext';
import { useAccountDeletion } from '@/features/profile/hooks/useAccountDeletion';

export default function ProfileScreen() {
  const { user, signOut } = useAuthContext();
  const { requestDeletion, deleting } = useAccountDeletion();
  const units = useSettingsStore((s) => s.units);
  const setUnits = useSettingsStore((s) => s.setUnits);
  const hapticFeedback = useSettingsStore((s) => s.hapticFeedback);
  const setHapticFeedback = useSettingsStore((s) => s.setHapticFeedback);
  const coachVerbosity = useSettingsStore((s) => s.coachVerbosity);
  const setCoachVerbosity = useSettingsStore((s) => s.setCoachVerbosity);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Profile & Settings</Text>

        {user ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Email</Text>
              <Text style={styles.rowValue}>{user.email}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Units</Text>
            <Pressable
              onPress={() => setUnits(units === 'imperial' ? 'metric' : 'imperial')}
              accessibilityRole="button"
              accessibilityLabel={`Units: ${units}. Tap to change.`}
            >
              <Text style={styles.rowValue}>
                {units === 'imperial' ? 'Imperial (lbs)' : 'Metric (kg)'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Haptic Feedback</Text>
            <Switch
              value={hapticFeedback}
              onValueChange={setHapticFeedback}
              trackColor={{ false: colors.surfaceElevated, true: colors.primaryDim }}
              thumbColor={hapticFeedback ? colors.primary : colors.textTertiary}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Voice Coach</Text>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Verbosity</Text>
            <Pressable
              onPress={() => {
                const next = {
                  minimal: 'moderate' as const,
                  moderate: 'verbose' as const,
                  verbose: 'minimal' as const,
                };
                setCoachVerbosity(next[coachVerbosity]);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Coach verbosity: ${coachVerbosity}. Tap to change.`}
            >
              <Text style={styles.rowValue}>{coachVerbosity}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.dangerZone}>
          <Pressable
            style={({ pressed }) => [
              styles.signOutButton,
              pressed && styles.signOutPressed,
            ]}
            onPress={signOut}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
          >
            <Text style={styles.signOutText}>Sign Out</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.deleteButton,
              pressed && styles.signOutPressed,
              deleting && styles.deleteButtonDisabled,
            ]}
            onPress={requestDeletion}
            disabled={deleting}
            accessibilityRole="button"
            accessibilityLabel="Delete account"
          >
            <Text style={styles.deleteText}>
              {deleting ? 'Deleting...' : 'Delete Account'}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
    marginBottom: spacing.xl,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    ...typography.heading,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLabel: {
    ...typography.body,
    color: colors.textPrimary,
  },
  rowValue: {
    ...typography.body,
    color: colors.primary,
    textTransform: 'capitalize',
  },
  dangerZone: {
    marginTop: 'auto' as const,
    gap: spacing.sm,
  },
  signOutButton: {
    backgroundColor: colors.error + '20',
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: touchTarget.standard,
    borderWidth: 1,
    borderColor: colors.error + '40',
  },
  signOutPressed: {
    opacity: 0.7,
  },
  signOutText: {
    ...typography.button,
    color: colors.error,
  },
  deleteButton: {
    backgroundColor: 'transparent',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  deleteText: {
    ...typography.caption,
    color: colors.textTertiary,
  },
});
