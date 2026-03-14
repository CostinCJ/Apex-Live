import { View, Text, StyleSheet, Pressable, Switch, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { spacing, touchTarget, borderRadius } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAuthContext } from '@/features/auth/context/AuthContext';
import { useAccountDeletion } from '@/features/profile/hooks/useAccountDeletion';

function getInitials(name?: string | null, email?: string): string {
  if (name) {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  }
  return (email?.[0] ?? '?').toUpperCase();
}

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
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Profile</Text>

        {/* Avatar + user info */}
        {user ? (
          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {getInitials(user.displayName, user.email)}
              </Text>
            </View>
            <Text style={styles.userName}>{user.displayName ?? 'Athlete'}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
          </View>
        ) : null}

        {/* Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>

          <Pressable
            style={styles.row}
            onPress={() => setUnits(units === 'imperial' ? 'metric' : 'imperial')}
            accessibilityRole="button"
            accessibilityLabel={`Units: ${units}. Tap to change.`}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="scale-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.rowLabel}>Units</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.rowValue}>
                {units === 'imperial' ? 'Imperial (lbs)' : 'Metric (kg)'}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </View>
          </Pressable>

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="phone-portrait-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.rowLabel}>Haptic Feedback</Text>
            </View>
            <Switch
              value={hapticFeedback}
              onValueChange={setHapticFeedback}
              trackColor={{ false: colors.surfaceElevated, true: colors.primaryDim }}
              thumbColor={hapticFeedback ? colors.primary : colors.textTertiary}
            />
          </View>
        </View>

        {/* Voice Coach */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Voice Coach</Text>

          <Pressable
            style={styles.row}
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
            <View style={styles.rowLeft}>
              <Ionicons name="chatbubble-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.rowLabel}>Verbosity</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.rowValue}>{coachVerbosity}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </View>
          </Pressable>
        </View>

        {/* Danger Zone */}
        <View style={styles.dangerSection}>
          <Text style={styles.dangerTitle}>Danger Zone</Text>

          <Pressable
            style={({ pressed }) => [
              styles.signOutButton,
              pressed && styles.btnPressed,
            ]}
            onPress={signOut}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
          >
            <Ionicons name="log-out-outline" size={20} color={colors.error} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.deleteButton,
              pressed && styles.btnPressed,
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

        <Text style={styles.version}>Apex Live v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
    marginBottom: spacing.xl,
  },

  // Avatar
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.background,
  },
  userName: {
    ...typography.heading,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  userEmail: {
    ...typography.caption,
    color: colors.textTertiary,
  },

  // Sections
  section: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  sectionTitle: {
    ...typography.caption,
    color: colors.textTertiary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingVertical: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
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

  // Danger
  dangerSection: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  dangerTitle: {
    ...typography.caption,
    color: colors.danger,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  signOutButton: {
    backgroundColor: colors.error + '15',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: touchTarget.standard,
    borderWidth: 1,
    borderColor: colors.error + '30',
  },
  btnPressed: {
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

  version: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
