import { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';
import { spacing, borderRadius } from '@/theme/spacing';
import { typography } from '@/theme/typography';

interface DayData {
  label: string;
  value: number;
}

interface WeeklyChartProps {
  data: DayData[];
  maxValue: number;
  unit: string;
  title: string;
  barColor?: string;
}

const BAR_HEIGHT = 120;

export const WeeklyChart = memo(function WeeklyChart({
  data,
  maxValue,
  unit,
  title,
  barColor = colors.primary,
}: WeeklyChartProps) {
  const safeMax = maxValue > 0 ? maxValue : 1;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.chartRow}>
        {data.map((day, i) => {
          const height = Math.max((day.value / safeMax) * BAR_HEIGHT, 2);
          const hasValue = day.value > 0;
          return (
            <View key={`${day.label}-${i}`} style={styles.barColumn}>
              <Text style={styles.barValue}>
                {hasValue ? Math.round(day.value) : ''}
              </Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height,
                      backgroundColor: hasValue ? barColor : colors.border,
                    },
                  ]}
                />
              </View>
              <Text style={styles.barLabel}>{day.label}</Text>
            </View>
          );
        })}
      </View>
      <Text style={styles.unit}>{unit}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.heading,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  chartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: BAR_HEIGHT + 40,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
  },
  barValue: {
    ...typography.caption,
    color: colors.textTertiary,
    fontSize: 10,
    marginBottom: 4,
    height: 14,
  },
  barTrack: {
    width: '60%',
    height: BAR_HEIGHT,
    justifyContent: 'flex-end',
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderTopLeftRadius: borderRadius.sm,
    borderTopRightRadius: borderRadius.sm,
    minHeight: 2,
  },
  barLabel: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 6,
    fontSize: 11,
  },
  unit: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'right',
    marginTop: spacing.sm,
  },
});
