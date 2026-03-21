import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { spacing, borderRadius } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { api } from '@/services/api/client';
import { useAuthContext } from '@/features/auth/context/AuthContext';
import { WeeklyChart } from '@/features/progress/components/WeeklyChart';
import type { Tables } from '@/types/database';

type DailySummary = Tables<'daily_workout_summaries'>;
type PersonalRecord = Tables<'personal_records'>;

type TimeRange = '7d' | '30d' | '90d';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getLast7DaysLabels(): string[] {
  const labels: string[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    labels.push(DAY_LABELS[d.getDay() === 0 ? 6 : d.getDay() - 1] ?? '');
  }
  return labels;
}

function bucketByDay(data: DailySummary[], field: 'total_duration' | 'total_calories' | 'workout_count'): { label: string; value: number }[] {
  const labels = getLast7DaysLabels();
  const today = new Date();
  const buckets = new Map<string, number>();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    buckets.set(d.toISOString().split('T')[0] ?? '', 0);
  }

  for (const row of data) {
    const dateKey = typeof row.date === 'string' ? row.date.split('T')[0] ?? '' : '';
    if (buckets.has(dateKey)) {
      buckets.set(dateKey, Number(row[field]) || 0);
    }
  }

  const values = [...buckets.values()];
  return labels.map((label, i) => ({ label, value: values[i] ?? 0 }));
}

export default function ProgressScreen() {
  const { user } = useAuthContext();
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [summaries, setSummaries] = useState<DailySummary[]>([]);
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;

    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [summaryResult, recordsResult] = await Promise.all([
      api.get<{ data: DailySummary[] }>(
        `/api/progress/summaries?since=${since.toISOString().split('T')[0] ?? ''}`,
      ),
      api.get<{ data: PersonalRecord[] }>(
        '/api/progress/records?limit=10',
      ),
    ]);

    setSummaries(summaryResult.data?.data ?? []);
    setRecords(recordsResult.data?.data ?? []);
    setLoading(false);
  }, [user, timeRange]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const totalWorkouts = useMemo(
    () => summaries.reduce((sum, d) => sum + d.workout_count, 0),
    [summaries],
  );
  const totalDuration = useMemo(
    () => summaries.reduce((sum, d) => sum + d.total_duration, 0),
    [summaries],
  );
  const totalCalories = useMemo(
    () => summaries.reduce((sum, d) => sum + Number(d.total_calories), 0),
    [summaries],
  );

  const last7 = useMemo(() => {
    const since = new Date();
    since.setDate(since.getDate() - 7);
    return summaries.filter((s) => {
      const d = typeof s.date === 'string' ? s.date.split('T')[0] ?? '' : '';
      return d >= (since.toISOString().split('T')[0] ?? '');
    });
  }, [summaries]);

  const durationChart = useMemo(() => {
    const data = bucketByDay(last7, 'total_duration');
    return data.map((d) => ({ ...d, value: Math.round(d.value / 60) }));
  }, [last7]);

  const caloriesChart = useMemo(() => bucketByDay(last7, 'total_calories'), [last7]);

  const maxDuration = useMemo(() => Math.max(...durationChart.map((d) => d.value), 1), [durationChart]);
  const maxCalories = useMemo(() => Math.max(...caloriesChart.map((d) => d.value), 1), [caloriesChart]);

  const formatDuration = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading progress...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
          <View style={[styles.statCard, { borderTopColor: colors.primary, borderTopWidth: 3 }]}>
            <Text style={styles.statValue}>{totalWorkouts}</Text>
            <Text style={styles.statLabel}>Workouts</Text>
          </View>
          <View style={[styles.statCard, { borderTopColor: colors.secondary, borderTopWidth: 3 }]}>
            <Text style={styles.statValue}>{formatDuration(totalDuration)}</Text>
            <Text style={styles.statLabel}>Time</Text>
          </View>
          <View style={[styles.statCard, { borderTopColor: colors.warning, borderTopWidth: 3 }]}>
            <Text style={styles.statValue}>
              {totalCalories > 0 ? Math.round(totalCalories).toLocaleString() : '0'}
            </Text>
            <Text style={styles.statLabel}>Calories</Text>
          </View>
        </View>

        <WeeklyChart
          title="Duration (last 7 days)"
          data={durationChart}
          maxValue={maxDuration}
          unit="minutes"
          barColor={colors.secondary}
        />

        <WeeklyChart
          title="Calories (last 7 days)"
          data={caloriesChart}
          maxValue={maxCalories}
          unit="kcal"
          barColor={colors.warning}
        />

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trophy" size={20} color={colors.warning} />
            <Text style={styles.sectionTitle}>Personal Records</Text>
          </View>
          {records.length > 0 ? (
            records.map((pr) => (
              <View key={pr.id} style={styles.prRow}>
                <View style={styles.prLeft}>
                  <Text style={styles.prExercise}>{pr.exercise_name}</Text>
                  <Text style={styles.prType}>{pr.record_type.replace(/_/g, ' ')}</Text>
                </View>
                <View style={styles.prRight}>
                  <Text style={styles.prValue}>
                    {pr.value} {pr.unit}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyPr}>
              <Ionicons name="trophy-outline" size={32} color={colors.textTertiary} />
              <Text style={styles.emptyText}>No records yet — keep training!</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  loadingText: { ...typography.body, color: colors.textSecondary },
  scrollContent: { padding: spacing.lg },
  title: { ...typography.title, color: colors.textPrimary, marginBottom: spacing.lg },
  rangeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
  rangeButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  rangeButtonActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  rangeText: { ...typography.caption, color: colors.textTertiary, fontWeight: '600' },
  rangeTextActive: { color: colors.primary },
  statsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  statValue: { ...typography.metricMedium, color: colors.textPrimary, fontSize: 26 },
  statLabel: { ...typography.metricLabel, color: colors.textTertiary, marginTop: spacing.xs, fontSize: 11 },
  section: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: { ...typography.heading, color: colors.textPrimary },
  prRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  prLeft: { flex: 1 },
  prExercise: { ...typography.body, color: colors.textPrimary, fontWeight: '500' },
  prType: { ...typography.caption, color: colors.textTertiary, textTransform: 'capitalize' },
  prRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  prValue: { ...typography.body, color: colors.warning, fontWeight: '700' },
  emptyPr: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  emptyText: { ...typography.body, color: colors.textTertiary },
});
