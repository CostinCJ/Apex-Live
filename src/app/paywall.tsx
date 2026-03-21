import { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { spacing, touchTarget, borderRadius } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import {
  getOfferings,
  purchaseProduct,
  restorePurchases,
  type ProductOffering,
} from '@/services/subscription/subscriptionService';

const FEATURES = [
  { icon: 'mic-outline' as const, text: 'Unlimited AI voice coaching sessions' },
  { icon: 'analytics-outline' as const, text: 'Advanced progress analytics' },
  { icon: 'trophy-outline' as const, text: 'Personal records & streak tracking' },
  { icon: 'heart-outline' as const, text: 'Real-time heart rate coaching' },
  { icon: 'cloud-download-outline' as const, text: 'Workout data export' },
];

export default function PaywallScreen() {
  const router = useRouter();
  const [offerings, setOfferings] = useState<ProductOffering[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const products = getOfferings();
    setOfferings(products);
    // Default select yearly (best value)
    const yearly = products.find((p) => p.period === 'yearly');
    if (yearly) setSelected(yearly.id);
  }, []);

  const handlePurchase = async () => {
    if (!selected) return;
    setError(null);
    setLoading(true);
    const result = await purchaseProduct(selected);
    setLoading(false);
    if (result.success) {
      router.back();
    } else if (result.error) {
      setError(result.error);
    }
  };

  const handleRestore = async () => {
    setError(null);
    setLoading(true);
    const result = await restorePurchases();
    setLoading(false);
    if (result.success) {
      router.back();
    } else if (result.error) {
      setError(result.error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Close button */}
        <Pressable
          style={styles.closeButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Ionicons name="close" size={28} color={colors.textSecondary} />
        </Pressable>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>APEX</Text>
          <Text style={styles.proLabel}>PRO</Text>
        </View>
        <Text style={styles.headline}>Unlock your full potential</Text>
        <Text style={styles.subheadline}>
          Get unlimited AI coaching and premium features to accelerate your fitness journey.
        </Text>

        {/* Features */}
        <View style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f.text} style={styles.featureRow}>
              <Ionicons name={f.icon} size={22} color={colors.primary} />
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>

        {/* Offerings */}
        <View style={styles.offerings}>
          {offerings.map((offering) => {
            const isSelected = selected === offering.id;
            return (
              <Pressable
                key={offering.id}
                style={[styles.offeringCard, isSelected && styles.offeringCardSelected]}
                onPress={() => setSelected(offering.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
              >
                <View style={styles.offeringLeft}>
                  <View style={[styles.radio, isSelected && styles.radioSelected]}>
                    {isSelected ? <View style={styles.radioInner} /> : null}
                  </View>
                  <View>
                    <Text style={[styles.offeringTitle, isSelected && styles.offeringTitleSelected]}>
                      {offering.title}
                    </Text>
                    <Text style={styles.offeringDesc}>{offering.description}</Text>
                  </View>
                </View>
                <View style={styles.offeringRight}>
                  <Text style={[styles.offeringPrice, isSelected && styles.offeringPriceSelected]}>
                    {offering.priceString}
                  </Text>
                  {offering.trialDays ? (
                    <Text style={styles.trialBadge}>{offering.trialDays}-day free trial</Text>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Error */}
        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={16} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* CTA */}
        <Pressable
          style={({ pressed }) => [
            styles.ctaButton,
            pressed && styles.ctaButtonPressed,
            loading && styles.ctaButtonDisabled,
          ]}
          onPress={() => void handlePurchase()}
          disabled={loading || !selected}
          accessibilityRole="button"
        >
          {loading ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={styles.ctaText}>
              {offerings.find((o) => o.id === selected)?.trialDays
                ? 'Start Free Trial'
                : 'Subscribe Now'}
            </Text>
          )}
        </Pressable>

        {/* Restore */}
        <Pressable
          style={styles.restoreButton}
          onPress={() => void handleRestore()}
          disabled={loading}
          accessibilityRole="button"
        >
          <Text style={styles.restoreText}>Restore Purchases</Text>
        </Pressable>

        <Text style={styles.legalText}>
          Payment will be charged to your App Store or Google Play account.
          Subscriptions auto-renew unless canceled at least 24 hours before the current period ends.
        </Text>
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
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  closeButton: {
    alignSelf: 'flex-end',
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  logo: {
    fontSize: 36,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 6,
  },
  proLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.background,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    letterSpacing: 2,
  },
  headline: {
    ...typography.title,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subheadline: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  features: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  featureText: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  offerings: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  offeringCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.border,
  },
  offeringCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  offeringLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.textTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  offeringTitle: {
    ...typography.heading,
    color: colors.textPrimary,
    fontSize: 16,
  },
  offeringTitleSelected: {
    color: colors.primary,
  },
  offeringDesc: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  offeringRight: {
    alignItems: 'flex-end',
  },
  offeringPrice: {
    ...typography.heading,
    color: colors.textPrimary,
    fontSize: 16,
  },
  offeringPriceSelected: {
    color: colors.primary,
  },
  trialBadge: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '600',
    fontSize: 11,
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
  ctaButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: touchTarget.workout,
  },
  ctaButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  ctaButtonDisabled: {
    opacity: 0.6,
  },
  ctaText: {
    ...typography.button,
    color: colors.background,
    fontSize: 18,
  },
  restoreButton: {
    marginTop: spacing.lg,
    alignItems: 'center',
    padding: spacing.md,
  },
  restoreText: {
    ...typography.body,
    color: colors.primary,
  },
  legalText: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.lg,
    lineHeight: 18,
    fontSize: 11,
  },
});
