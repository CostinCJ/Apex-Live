/**
 * Unit tests for the scheduler service.
 * Tests scheduled job logic with mocked Prisma client.
 */

const mockRefreshDeleteMany = jest.fn().mockResolvedValue({ count: 0 });
const mockVerifyDeleteMany = jest.fn().mockResolvedValue({ count: 0 });
const mockResetDeleteMany = jest.fn().mockResolvedValue({ count: 0 });
const mockExecuteRaw = jest.fn().mockResolvedValue(undefined);

jest.mock('../config/database', () => ({
  prisma: {
    refreshToken: { deleteMany: (...args: unknown[]) => mockRefreshDeleteMany(...args) },
    emailVerifyToken: { deleteMany: (...args: unknown[]) => mockVerifyDeleteMany(...args) },
    passwordResetToken: { deleteMany: (...args: unknown[]) => mockResetDeleteMany(...args) },
    $executeRaw: (...args: unknown[]) => mockExecuteRaw(...args),
  },
}));

import { startScheduler } from '../services/scheduler';

describe('scheduler', () => {
  // Track intervals so we can clean them up
  const originalSetInterval = global.setInterval;
  const trackedIntervals: ReturnType<typeof setInterval>[] = [];

  beforeEach(() => {
    jest.clearAllMocks();
    mockRefreshDeleteMany.mockResolvedValue({ count: 0 });
    mockVerifyDeleteMany.mockResolvedValue({ count: 0 });
    mockResetDeleteMany.mockResolvedValue({ count: 0 });
    mockExecuteRaw.mockResolvedValue(undefined);

    // Intercept setInterval to track handles
    global.setInterval = ((fn: () => void, ms: number) => {
      const handle = originalSetInterval(fn, ms);
      trackedIntervals.push(handle);
      return handle;
    }) as typeof setInterval;
  });

  afterEach(() => {
    // Clear all intervals created by startScheduler
    for (const handle of trackedIntervals) {
      clearInterval(handle);
    }
    trackedIntervals.length = 0;
    global.setInterval = originalSetInterval;
  });

  it('calls all three cleanup functions on startup', () => {
    startScheduler();

    expect(mockRefreshDeleteMany).toHaveBeenCalledTimes(1);
    expect(mockVerifyDeleteMany).toHaveBeenCalledTimes(1);
    expect(mockResetDeleteMany).toHaveBeenCalledTimes(1);
  });

  it('passes correct where clause for refresh token cleanup', () => {
    const before = new Date();
    startScheduler();

    const arg = mockRefreshDeleteMany.mock.calls[0]?.[0] as { where: { expiresAt: { lt: Date } } };
    expect(arg.where.expiresAt.lt).toBeInstanceOf(Date);
    expect(arg.where.expiresAt.lt.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });

  it('passes correct where clause for email verify token cleanup', () => {
    startScheduler();

    const arg = mockVerifyDeleteMany.mock.calls[0]?.[0] as { where: { expiresAt: { lt: Date } } };
    expect(arg.where.expiresAt.lt).toBeInstanceOf(Date);
  });

  it('passes correct where clause for password reset token cleanup (expired OR used)', () => {
    startScheduler();

    const arg = mockResetDeleteMany.mock.calls[0]?.[0] as {
      where: { OR: Array<Record<string, unknown>> };
    };
    expect(arg.where.OR).toHaveLength(2);
    expect(arg.where.OR[0]).toHaveProperty('expiresAt');
    expect(arg.where.OR[1]).toEqual({ usedAt: { not: null } });
  });

  it('sets up two intervals (hourly and 6-hourly)', () => {
    startScheduler();

    // Our interceptor tracks the intervals
    expect(trackedIntervals).toHaveLength(2);
  });

  it('does not throw when cleanup encounters DB errors', () => {
    mockRefreshDeleteMany.mockRejectedValueOnce(new Error('DB down'));
    mockVerifyDeleteMany.mockRejectedValueOnce(new Error('DB down'));
    mockResetDeleteMany.mockRejectedValueOnce(new Error('DB down'));

    expect(() => startScheduler()).not.toThrow();
  });
});
