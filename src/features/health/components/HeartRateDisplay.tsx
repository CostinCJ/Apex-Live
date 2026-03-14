import { memo, useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';
import { spacing, borderRadius } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import type { HeartRateZone } from '@/types/health';

interface HeartRateDisplayProps {
  bpm: number | null;
  zone: HeartRateZone | null;
}

const zoneColors: Record<HeartRateZone, string> = {
  rest: colors.hrZone1,
  warmup: colors.hrZone2,
  fat_burn: colors.hrZone3,
  cardio: colors.hrZone4,
  peak: colors.hrZone5,
};

const zoneLabels: Record<HeartRateZone, string> = {
  rest: 'Rest',
  warmup: 'Warm Up',
  fat_burn: 'Fat Burn',
  cardio: 'Cardio',
  peak: 'Peak',
};

export const HeartRateDisplay = memo(function HeartRateDisplay({
  bpm,
  zone,
}: HeartRateDisplayProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (bpm == null || bpm === 0) return;

    // Pulse animation speed matches heart rate
    const interval = 60000 / bpm;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: interval * 0.3,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: interval * 0.7,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();

    return () => animation.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pulseAnim is a stable Animated.Value ref
  }, [bpm]);

  const color = zone ? zoneColors[zone] : colors.textTertiary;

  return (
    <View
      style={styles.container}
      accessibilityRole="text"
      accessibilityLabel={
        bpm != null
          ? `Heart rate ${bpm} beats per minute, ${zone ? zoneLabels[zone] : 'unknown'} zone`
          : 'Heart rate not available'
      }
    >
      <Animated.Text
        style={[
          styles.bpm,
          { color, transform: [{ scale: pulseAnim }] },
        ]}
      >
        {bpm != null ? bpm : '--'}
      </Animated.Text>
      <Text style={styles.unit}>BPM</Text>
      {zone ? (
        <View style={[styles.zoneBadge, { backgroundColor: color + '30' }]}>
          <Text style={[styles.zoneText, { color }]}>{zoneLabels[zone]}</Text>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bpm: {
    ...typography.metricLarge,
    color: colors.textPrimary,
  },
  unit: {
    ...typography.metricLabel,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  zoneBadge: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  zoneText: {
    ...typography.caption,
    fontWeight: '600',
  },
});
