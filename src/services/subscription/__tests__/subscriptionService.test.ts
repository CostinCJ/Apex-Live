/**
 * Unit tests for the subscription service.
 * Tests the client-side subscription logic without hitting a real server.
 */

import { getOfferings, type ProductOffering } from '../subscriptionService';

// Mock the API client
const mockGet = jest.fn();
const mockPost = jest.fn();

jest.mock('@/services/api/client', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
  },
}));

const mockPatch = jest.fn();

describe('subscriptionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getOfferings', () => {
    it('returns an array of product offerings', () => {
      const offerings = getOfferings();
      expect(Array.isArray(offerings)).toBe(true);
      expect(offerings.length).toBeGreaterThan(0);
    });

    it('each offering has required fields', () => {
      const offerings = getOfferings();
      for (const offering of offerings) {
        expect(offering.id).toBeDefined();
        expect(typeof offering.id).toBe('string');
        expect(offering.title).toBeDefined();
        expect(typeof offering.title).toBe('string');
        expect(offering.description).toBeDefined();
        expect(typeof offering.description).toBe('string');
        expect(offering.priceString).toBeDefined();
        expect(typeof offering.priceString).toBe('string');
        expect(['monthly', 'yearly']).toContain(offering.period);
      }
    });

    it('includes a monthly plan', () => {
      const offerings = getOfferings();
      const monthly = offerings.find((o: ProductOffering) => o.period === 'monthly');
      expect(monthly).toBeDefined();
      expect(monthly!.id).toContain('monthly');
    });

    it('includes a yearly plan', () => {
      const offerings = getOfferings();
      const yearly = offerings.find((o: ProductOffering) => o.period === 'yearly');
      expect(yearly).toBeDefined();
      expect(yearly!.id).toContain('yearly');
    });

    it('yearly plan has trial days', () => {
      const offerings = getOfferings();
      const yearly = offerings.find((o: ProductOffering) => o.period === 'yearly');
      expect(yearly!.trialDays).toBeDefined();
      expect(yearly!.trialDays).toBeGreaterThan(0);
    });

    it('returns consistent results on repeated calls', () => {
      const first = getOfferings();
      const second = getOfferings();
      expect(first).toEqual(second);
    });
  });

  describe('getSubscriptionInfo', () => {
    it('returns default free info on API error', async () => {
      mockGet.mockResolvedValueOnce({ data: null, error: { message: 'Network error', status: 0 } });

      // Dynamic import to avoid hoisting issues
      const { getSubscriptionInfo } = await import('../subscriptionService');
      const info = await getSubscriptionInfo();

      expect(info.plan).toBe('free');
      expect(info.isActive).toBe(true);
      expect(info.isPremium).toBe(false);
    });

    it('returns server data on success', async () => {
      const serverData = {
        plan: 'monthly',
        status: 'active',
        isActive: true,
        isPremium: true,
        currentPeriodEnd: '2026-04-17T00:00:00Z',
        cancelAtPeriodEnd: false,
        trialEnd: null,
      };
      mockGet.mockResolvedValueOnce({ data: { data: serverData }, error: null });

      const { getSubscriptionInfo } = await import('../subscriptionService');
      const info = await getSubscriptionInfo();

      expect(info.plan).toBe('monthly');
      expect(info.isPremium).toBe(true);
      expect(info.isActive).toBe(true);
    });

    it('returns default when server returns null data', async () => {
      mockGet.mockResolvedValueOnce({ data: null, error: null });

      const { getSubscriptionInfo } = await import('../subscriptionService');
      const info = await getSubscriptionInfo();

      expect(info.plan).toBe('free');
      expect(info.isPremium).toBe(false);
    });
  });

  describe('purchaseProduct', () => {
    it('returns failure since RevenueCat is not yet configured', async () => {
      const { purchaseProduct } = await import('../subscriptionService');
      const result = await purchaseProduct('apex_monthly');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
    });
  });

  describe('restorePurchases', () => {
    it('returns failure since RevenueCat is not yet configured', async () => {
      const { restorePurchases } = await import('../subscriptionService');
      const result = await restorePurchases();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
