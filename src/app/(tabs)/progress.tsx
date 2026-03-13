import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { spacing, borderRadius } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { supabase } from '@/services/supabase/client';
import { useAuthContext } from '@/features/auth/context/AuthContext';
import type { Tables } from '@/types/database';

type DailySummary = Tables<'daily_workout_summaries'>;
type PersonalRecord = Tables<'personal_records'>;

type TimeRange = '7d' | '30d' | '90d';

export default function ProgressScreen() {
  const { user } = useAuthContext();
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [totalWorkouts, setTotalWorkouts] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [totalCalories, setTotalCalories] = useState(0);
  const [records, setRecords] = useState<PersonalRecord[]>([]);

  const fetchData = useCallback(async () => {
    if (!user) return;

    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [summaryResult, recordsResult] = await Promise.all([
      supabase
        .from('daily_workout_summaries')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', since.toISOString().split('T')[0] ?? '')
        .order('date', { ascending: false }),
      supabase
        .from('personal_records')
        .select('*')
        .eq('user_id', user.id)
        .order('achieved_at', { ascending: false })
        .limit(10),
    ]);

    const data: DailySummary[] = summaryResult.data ?? [];
    setRecords(recordsResult.data ?? []);
    setTotalWorkouts(data.reduce((sum, d) => sum + d.workout_count, 0));
    setTotalDuration(data.reduce((sum, d) => sum + d.total_duration, 0));
    setTotalCalories(data.reduce((sum, d) => sum + d.total_calories, 0));
  }, [user, timeRange]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const formatDuration = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Progress</Text>

        <View style={styles.rangeRow}>
          {(['7d', '30d', '90d'] as const).map((range) => (
            <Pressable
              key={range}
              style={[
                styles.rangeButton,
                timeRange === range && styles.rangeButtonActive,
              ]}
              onPress={() => setTimeRange(range)}
              accessibilityRole="button"
              accessibilityState={{ selected: timeRange === range }}
            >
              <Text
                style={[
                  styles.rangeText,
                  timeRange === range && styles.rangeTextActive,
                ]}
              >
                {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalWorkouts}</Text>
            <Text style={styles.statLabel}>Workouts</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatDuration(totalDuration)}</Text>
            <Text style={styles.statLabel}>Time</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {totalCalories > 0 ? Math.round(totalCalories).toLocaleString() : '0'}
            </Text>
            <Text style={styles.statLabel}>Calories</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Records</Text>
          {records.length > 0 ? (
            records.map((pr) => (
              <View key={pr.id} style={styles.prRow}>
                <View>
                  <Text style={styles.prExercise}>{pr.exercise_name}</Text>
                  <Text style={styles.prType}>{pr.record_type}</Text>
                </View>
                <Text style={styles.prValue}>
                  {pr.value} {pr.unit}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No records yet — keep training!</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  rangeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  rangeButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  rangeButtonActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  rangeText: {
    ...typography.caption,
    color: colors.textTertiary,
    fontWeight: '600',
  },
  rangeTextActive: {
    color: colors.primary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    ...typography.metricMedium,
    color: colors.textPrimary,
  },
  statLabel: {
    ...typography.metricLabel,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    ...typography.heading,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  prRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  prExercise: {
    ...typography.body,
    color: colors.textPrimary,
  },
  prType: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  prValue: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '700',
  },
  emptyText: {
    ...typography.body,
    color: colors.textTertiary,
  },
});
