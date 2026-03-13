import { useState, useCallback, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { supabase } from '@/services/supabase/client';
import { useAuthContext } from '@/features/auth/context/AuthContext';
import { WorkoutHistoryRow } from '@/features/history/components/WorkoutHistoryRow';
import type { Tables } from '@/types/database';

type WorkoutRow = Tables<'workouts'>;

const PAGE_SIZE = 20;

export default function HistoryScreen() {
  const { user } = useAuthContext();
  const [workouts, setWorkouts] = useState<WorkoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const fetchWorkouts = useCallback(
    async (offset = 0, refresh = false) => {
      if (!user) return;

      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('started_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) {
        console.error('Fetch workouts error:', error);
        setLoading(false);
        return;
      }

      if (refresh) {
        setWorkouts(data ?? []);
      } else {
        setWorkouts((prev) => [...prev, ...(data ?? [])]);
      }

      setHasMore((data?.length ?? 0) === PAGE_SIZE);
      setLoading(false);
      setRefreshing(false);
    },
    [user],
  );

  useEffect(() => {
    void fetchWorkouts(0, true);
  }, [fetchWorkouts]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    void fetchWorkouts(0, true);
  }, [fetchWorkouts]);

  const handleEndReached = useCallback(() => {
    if (!hasMore || loading) return;
    void fetchWorkouts(workouts.length);
  }, [hasMore, loading, workouts.length, fetchWorkouts]);

  const handleWorkoutPress = useCallback((_id: string) => {
    // TODO: Navigate to workout detail screen
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: WorkoutRow }) => (
      <WorkoutHistoryRow
        id={item.id}
        workoutType={item.workout_type}
        title={item.title}
        startedAt={item.started_at}
        durationSeconds={item.duration_seconds}
        totalCalories={
          typeof item.metrics_summary === 'object' &&
          item.metrics_summary !== null &&
          'total_calories' in item.metrics_summary
            ? Number(item.metrics_summary.total_calories)
            : undefined
        }
        onPress={handleWorkoutPress}
      />
    ),
    [handleWorkoutPress],
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Training History</Text>

      {workouts.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No workouts yet</Text>
          <Text style={styles.emptySubtext}>
            Complete a workout to see it here
          </Text>
        </View>
      ) : (
        <FlatList
          data={workouts}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    ...typography.heading,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    ...typography.body,
    color: colors.textTertiary,
  },
});
