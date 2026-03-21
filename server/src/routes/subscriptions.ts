import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { requireAuth, getUserId } from '../middleware/auth.js';
import { env } from '../config/env.js';

export const subscriptionsRouter = Router();

// ─── Get subscription status ──────────────────────────────────────

subscriptionsRouter.get('/me', requireAuth, async (req: Request, res: Response) => {
  const userId = getUserId(req);

  let subscription = await prisma.subscription.findUnique({ where: { userId } });

  // Auto-create free subscription if none exists
  if (!subscription) {
    subscription = await prisma.subscription.create({
      data: { userId, plan: 'free', status: 'active' },
    });
  }

  // Check if subscription has expired
  if (
    subscription.status === 'active' &&
    subscription.plan !== 'free' &&
    subscription.currentPeriodEnd &&
    subscription.currentPeriodEnd < new Date()
  ) {
    subscription = await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: 'expired' },
    });
  }

  res.json({
    data: {
      plan: subscription.plan,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      trialEnd: subscription.trialEnd,
      isActive: subscription.status === 'active' || subscription.status === 'trialing',
      isPremium: subscription.plan !== 'free' &&
        (subscription.status === 'active' || subscription.status === 'trialing'),
    },
  });
});

// ─── RevenueCat Webhook ───────────────────────────────────────────

const webhookEventSchema = z.object({
  event: z.object({
    type: z.string(),
    app_user_id: z.string(),
    product_id: z.string().optional(),
    expiration_at_ms: z.number().optional(),
  }),
});

subscriptionsRouter.post('/webhook/revenuecat', async (req: Request, res: Response) => {
  // Verify webhook authenticity — reject all requests when secret is not configured
  if (!env.REVENUECAT_WEBHOOK_SECRET) {
    res.status(503).json({ error: 'Webhook not configured' });
    return;
  }

  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${env.REVENUECAT_WEBHOOK_SECRET}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const parsed = webhookEventSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid webhook payload' });
    return;
  }

  const { event } = parsed.data;
  const userId = event.app_user_id;

  // Find the user
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    // User not found — could be a RevenueCat anonymous user
    console.warn(`[webhook] RevenueCat event for unknown user: ${userId}`);
    res.json({ success: true });
    return;
  }

  const expirationDate = event.expiration_at_ms
    ? new Date(event.expiration_at_ms)
    : null;

  // Determine plan from product ID
  const plan = event.product_id?.includes('yearly') ? 'yearly' as const : 'monthly' as const;

  switch (event.type) {
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
    case 'PRODUCT_CHANGE':
      await prisma.subscription.upsert({
        where: { userId },
        create: {
          userId,
          plan,
          status: 'active',
          provider: 'revenueCat',
          providerSubscriptionId: event.product_id ?? null,
          currentPeriodEnd: expirationDate,
          currentPeriodStart: new Date(),
        },
        update: {
          plan,
          status: 'active',
          providerSubscriptionId: event.product_id ?? null,
          currentPeriodEnd: expirationDate,
          currentPeriodStart: new Date(),
          cancelAtPeriodEnd: false,
        },
      });
      break;

    case 'CANCELLATION':
      await prisma.subscription.updateMany({
        where: { userId },
        data: { cancelAtPeriodEnd: true },
      });
      break;

    case 'EXPIRATION':
      await prisma.subscription.updateMany({
        where: { userId },
        data: { status: 'expired' },
      });
      break;

    case 'BILLING_ISSUE':
      await prisma.subscription.updateMany({
        where: { userId },
        data: { status: 'past_due' },
      });
      break;

    default:
      console.warn(`[webhook] Unhandled RevenueCat event type: ${event.type}`);
  }

  res.json({ success: true });
});

// ─── Entitlement check middleware (for use in other routes) ────────

export async function requirePremium(req: Request, res: Response, next: () => void): Promise<void> {
  const userId = getUserId(req);

  const subscription = await prisma.subscription.findUnique({ where: { userId } });

  const isPremium = subscription &&
    subscription.plan !== 'free' &&
    (subscription.status === 'active' || subscription.status === 'trialing') &&
    (!subscription.currentPeriodEnd || subscription.currentPeriodEnd > new Date());

  if (!isPremium) {
    res.status(403).json({
      error: 'Premium subscription required',
      code: 'SUBSCRIPTION_REQUIRED',
    });
    return;
  }

  next();
}
