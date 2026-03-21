/**
 * Subscription service — wraps RevenueCat SDK.
 *
 * Setup required:
 * 1. Install: npx expo install react-native-purchases
 * 2. Configure in app.config.ts plugins
 * 3. Set EXPO_PUBLIC_REVENUECAT_API_KEY in .env
 *
 * Until RevenueCat is installed, this service provides a stub implementation
 * that queries the server for subscription status.
 */

import { api } from '@/services/api/client';

export interface SubscriptionInfo {
  plan: 'free' | 'monthly' | 'yearly';
  status: 'active' | 'past_due' | 'canceled' | 'expired' | 'trialing';
  isActive: boolean;
  isPremium: boolean;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  trialEnd: string | null;
}

const DEFAULT_INFO: SubscriptionInfo = {
  plan: 'free',
  status: 'active',
  isActive: true,
  isPremium: false,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  trialEnd: null,
};

/** Fetch current subscription status from the server */
export async function getSubscriptionInfo(): Promise<SubscriptionInfo> {
  const { data, error } = await api.get<{ data: SubscriptionInfo }>('/api/subscriptions/me');
  if (error || !data?.data) return DEFAULT_INFO;
  return data.data;
}

/** Product offerings shown in the paywall */
export interface ProductOffering {
  id: string;
  title: string;
  description: string;
  priceString: string;
  period: 'monthly' | 'yearly';
  trialDays?: number;
}

/** Get available product offerings.
 * When RevenueCat is integrated, this will fetch from their SDK.
 * For now, returns static offerings. */
export function getOfferings(): ProductOffering[] {
  return [
    {
      id: 'apex_monthly',
      title: 'Monthly',
      description: 'Billed monthly',
      priceString: '$9.99/mo',
      period: 'monthly',
      trialDays: 7,
    },
    {
      id: 'apex_yearly',
      title: 'Yearly',
      description: 'Save 40% — billed annually',
      priceString: '$71.99/yr',
      period: 'yearly',
      trialDays: 7,
    },
  ];
}

/** Purchase a subscription.
 * When RevenueCat is integrated, this triggers the native purchase flow.
 * For now, this is a placeholder. */
export async function purchaseProduct(_productId: string): Promise<{ success: boolean; error?: string }> {
  // TODO: Replace with RevenueCat Purchases.purchaseProduct()
  // import Purchases from 'react-native-purchases';
  // const { customerInfo } = await Purchases.purchaseProduct(productId);
  // Then sync with server via webhook

  return {
    success: false,
    error: 'In-app purchases are not yet configured. Please check back soon.',
  };
}

/** Restore previous purchases */
export async function restorePurchases(): Promise<{ success: boolean; error?: string }> {
  // TODO: Replace with RevenueCat Purchases.restorePurchases()
  return {
    success: false,
    error: 'Purchase restoration is not yet configured.',
  };
}
