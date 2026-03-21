/**
 * Integration tests for the subscription API endpoints.
 * Tests run against the live server at localhost:3001.
 */

const API = 'http://localhost:3001';

async function createTestUser(): Promise<{
  email: string;
  token: string;
  userId: string;
}> {
  const email = `sub_test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@apex.dev`;
  const res = await fetch(`${API}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'TestPass1' }),
  });
  const body = (await res.json()) as {
    accessToken: string;
    user: { id: string };
  };
  return { email, token: body.accessToken, userId: body.user.id };
}

describe('Subscriptions API', () => {
  let token = '';
  let userId = '';

  beforeAll(async () => {
    const user = await createTestUser();
    token = user.token;
    userId = user.userId;
  });

  // ─── GET /api/subscriptions/me ──────────────────────────────────────

  describe('GET /api/subscriptions/me', () => {
    it('returns 401 without auth', async () => {
      const res = await fetch(`${API}/api/subscriptions/me`);
      expect(res.status).toBe(401);
    });

    it('auto-creates free subscription for new user', async () => {
      const res = await fetch(`${API}/api/subscriptions/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: Record<string, unknown> };
      expect(body.data).toBeDefined();
      expect(body.data.plan).toBe('free');
      expect(body.data.status).toBe('active');
      expect(body.data.isActive).toBe(true);
      expect(body.data.isPremium).toBe(false);
      expect(body.data.cancelAtPeriodEnd).toBe(false);
    });

    it('returns consistent data on repeated calls', async () => {
      const res1 = await fetch(`${API}/api/subscriptions/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const res2 = await fetch(`${API}/api/subscriptions/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);

      const body1 = (await res1.json()) as { data: Record<string, unknown> };
      const body2 = (await res2.json()) as { data: Record<string, unknown> };
      expect(body1.data.plan).toBe(body2.data.plan);
      expect(body1.data.status).toBe(body2.data.status);
      expect(body1.data.isActive).toBe(body2.data.isActive);
      expect(body1.data.isPremium).toBe(body2.data.isPremium);
    });

    it('includes all expected fields in response', async () => {
      const res = await fetch(`${API}/api/subscriptions/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: Record<string, unknown> };
      expect(body.data).toHaveProperty('plan');
      expect(body.data).toHaveProperty('status');
      expect(body.data).toHaveProperty('currentPeriodEnd');
      expect(body.data).toHaveProperty('cancelAtPeriodEnd');
      expect(body.data).toHaveProperty('trialEnd');
      expect(body.data).toHaveProperty('isActive');
      expect(body.data).toHaveProperty('isPremium');
    });
  });

  // ─── POST /api/subscriptions/webhook/revenuecat ────────────────────

  describe('POST /api/subscriptions/webhook/revenuecat', () => {
    it('rejects invalid payload (400)', async () => {
      const res = await fetch(`${API}/api/subscriptions/webhook/revenuecat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bad: 'data' }),
      });
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: string };
      expect(body.error).toContain('Invalid webhook payload');
    });

    it('rejects payload missing event.type (400)', async () => {
      const res = await fetch(`${API}/api/subscriptions/webhook/revenuecat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: { app_user_id: userId } }),
      });
      expect(res.status).toBe(400);
    });

    it('rejects payload missing event.app_user_id (400)', async () => {
      const res = await fetch(`${API}/api/subscriptions/webhook/revenuecat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: { type: 'INITIAL_PURCHASE' } }),
      });
      expect(res.status).toBe(400);
    });

    it('handles INITIAL_PURCHASE event — upgrades to monthly', async () => {
      const expirationMs = Date.now() + 30 * 24 * 60 * 60 * 1000;
      const res = await fetch(`${API}/api/subscriptions/webhook/revenuecat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: {
            type: 'INITIAL_PURCHASE',
            app_user_id: userId,
            product_id: 'apex_monthly',
            expiration_at_ms: expirationMs,
          },
        }),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { success: boolean };
      expect(body.success).toBe(true);

      // Verify subscription was upgraded
      const checkRes = await fetch(`${API}/api/subscriptions/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(checkRes.status).toBe(200);
      const checkBody = (await checkRes.json()) as { data: Record<string, unknown> };
      expect(checkBody.data.plan).toBe('monthly');
      expect(checkBody.data.status).toBe('active');
      expect(checkBody.data.isPremium).toBe(true);
      expect(checkBody.data.isActive).toBe(true);
      expect(checkBody.data.cancelAtPeriodEnd).toBe(false);
    });

    it('handles RENEWAL event — keeps subscription active', async () => {
      const newExpirationMs = Date.now() + 60 * 24 * 60 * 60 * 1000;
      const res = await fetch(`${API}/api/subscriptions/webhook/revenuecat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: {
            type: 'RENEWAL',
            app_user_id: userId,
            product_id: 'apex_monthly',
            expiration_at_ms: newExpirationMs,
          },
        }),
      });
      expect(res.status).toBe(200);

      const checkRes = await fetch(`${API}/api/subscriptions/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const checkBody = (await checkRes.json()) as { data: Record<string, unknown> };
      expect(checkBody.data.plan).toBe('monthly');
      expect(checkBody.data.status).toBe('active');
      expect(checkBody.data.isPremium).toBe(true);
    });

    it('handles PRODUCT_CHANGE event — switches to yearly', async () => {
      const res = await fetch(`${API}/api/subscriptions/webhook/revenuecat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: {
            type: 'PRODUCT_CHANGE',
            app_user_id: userId,
            product_id: 'apex_yearly',
            expiration_at_ms: Date.now() + 365 * 24 * 60 * 60 * 1000,
          },
        }),
      });
      expect(res.status).toBe(200);

      const checkRes = await fetch(`${API}/api/subscriptions/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const checkBody = (await checkRes.json()) as { data: Record<string, unknown> };
      expect(checkBody.data.plan).toBe('yearly');
      expect(checkBody.data.isPremium).toBe(true);
    });

    it('handles CANCELLATION event — marks cancelAtPeriodEnd', async () => {
      const res = await fetch(`${API}/api/subscriptions/webhook/revenuecat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: {
            type: 'CANCELLATION',
            app_user_id: userId,
          },
        }),
      });
      expect(res.status).toBe(200);

      const checkRes = await fetch(`${API}/api/subscriptions/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const checkBody = (await checkRes.json()) as { data: Record<string, unknown> };
      expect(checkBody.data.cancelAtPeriodEnd).toBe(true);
      // Still premium until period end
      expect(checkBody.data.isPremium).toBe(true);
    });

    it('handles BILLING_ISSUE event — sets status to past_due', async () => {
      const res = await fetch(`${API}/api/subscriptions/webhook/revenuecat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: {
            type: 'BILLING_ISSUE',
            app_user_id: userId,
          },
        }),
      });
      expect(res.status).toBe(200);

      const checkRes = await fetch(`${API}/api/subscriptions/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const checkBody = (await checkRes.json()) as { data: Record<string, unknown> };
      expect(checkBody.data.status).toBe('past_due');
      // past_due is neither active nor trialing, so isPremium should be false
      expect(checkBody.data.isPremium).toBe(false);
      expect(checkBody.data.isActive).toBe(false);
    });

    it('handles EXPIRATION event — expires the subscription', async () => {
      // First restore to active so expiration test is meaningful
      await fetch(`${API}/api/subscriptions/webhook/revenuecat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: {
            type: 'INITIAL_PURCHASE',
            app_user_id: userId,
            product_id: 'apex_monthly',
            expiration_at_ms: Date.now() + 30 * 24 * 60 * 60 * 1000,
          },
        }),
      });

      const res = await fetch(`${API}/api/subscriptions/webhook/revenuecat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: {
            type: 'EXPIRATION',
            app_user_id: userId,
          },
        }),
      });
      expect(res.status).toBe(200);

      const checkRes = await fetch(`${API}/api/subscriptions/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const checkBody = (await checkRes.json()) as { data: Record<string, unknown> };
      expect(checkBody.data.status).toBe('expired');
      expect(checkBody.data.isPremium).toBe(false);
      expect(checkBody.data.isActive).toBe(false);
    });

    it('returns 200 for unknown user (graceful handling)', async () => {
      const res = await fetch(`${API}/api/subscriptions/webhook/revenuecat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: {
            type: 'INITIAL_PURCHASE',
            app_user_id: '00000000-0000-0000-0000-000000000000',
            product_id: 'apex_monthly',
          },
        }),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { success: boolean };
      expect(body.success).toBe(true);
    });

    it('handles unknown event type gracefully', async () => {
      const res = await fetch(`${API}/api/subscriptions/webhook/revenuecat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: {
            type: 'SOME_FUTURE_EVENT',
            app_user_id: userId,
          },
        }),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { success: boolean };
      expect(body.success).toBe(true);
    });
  });

  // ─── Subscription lifecycle with a fresh user ──────────────────────

  describe('Full subscription lifecycle (fresh user)', () => {
    let freshToken = '';
    let freshUserId = '';

    beforeAll(async () => {
      const user = await createTestUser();
      freshToken = user.token;
      freshUserId = user.userId;
    });

    it('starts with free plan, upgrades, then expires', async () => {
      // Step 1: Verify starts as free
      const freeRes = await fetch(`${API}/api/subscriptions/me`, {
        headers: { Authorization: `Bearer ${freshToken}` },
      });
      const freeBody = (await freeRes.json()) as { data: Record<string, unknown> };
      expect(freeBody.data.plan).toBe('free');
      expect(freeBody.data.isPremium).toBe(false);

      // Step 2: Purchase
      const purchaseRes = await fetch(`${API}/api/subscriptions/webhook/revenuecat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: {
            type: 'INITIAL_PURCHASE',
            app_user_id: freshUserId,
            product_id: 'apex_yearly',
            expiration_at_ms: Date.now() + 365 * 24 * 60 * 60 * 1000,
          },
        }),
      });
      expect(purchaseRes.status).toBe(200);

      const premRes = await fetch(`${API}/api/subscriptions/me`, {
        headers: { Authorization: `Bearer ${freshToken}` },
      });
      const premBody = (await premRes.json()) as { data: Record<string, unknown> };
      expect(premBody.data.plan).toBe('yearly');
      expect(premBody.data.isPremium).toBe(true);
      expect(premBody.data.currentPeriodEnd).toBeDefined();

      // Step 3: Cancel
      const cancelRes = await fetch(`${API}/api/subscriptions/webhook/revenuecat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: { type: 'CANCELLATION', app_user_id: freshUserId },
        }),
      });
      expect(cancelRes.status).toBe(200);

      const cancelCheck = await fetch(`${API}/api/subscriptions/me`, {
        headers: { Authorization: `Bearer ${freshToken}` },
      });
      const cancelBody = (await cancelCheck.json()) as { data: Record<string, unknown> };
      expect(cancelBody.data.cancelAtPeriodEnd).toBe(true);
      // Still active until period end
      expect(cancelBody.data.isPremium).toBe(true);

      // Step 4: Expire
      const expireRes = await fetch(`${API}/api/subscriptions/webhook/revenuecat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: { type: 'EXPIRATION', app_user_id: freshUserId },
        }),
      });
      expect(expireRes.status).toBe(200);

      const expireCheck = await fetch(`${API}/api/subscriptions/me`, {
        headers: { Authorization: `Bearer ${freshToken}` },
      });
      const expireBody = (await expireCheck.json()) as { data: Record<string, unknown> };
      expect(expireBody.data.status).toBe('expired');
      expect(expireBody.data.isPremium).toBe(false);
      expect(expireBody.data.isActive).toBe(false);
    });
  });
});
