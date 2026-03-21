/**
 * Unit tests for middleware: rate limiting and requestId.
 * Tests the middleware functions directly without hitting the server.
 */

import type { Request, Response, NextFunction } from 'express';
import { rateLimit } from '../middleware/rateLimit';
import { requestId } from '../middleware/requestId';

/** Create a minimal mock Request with the given IP */
function mockRequest(ip: string): Partial<Request> {
  return {
    ip,
    socket: { remoteAddress: ip } as Request['socket'],
  };
}

/** Create a mock Response that captures status and json calls */
function mockResponse(): {
  res: Partial<Response>;
  getStatus: () => number | undefined;
  getBody: () => Record<string, unknown> | undefined;
} {
  let statusCode: number | undefined;
  let body: Record<string, unknown> | undefined;

  const res: Partial<Response> = {
    status(code: number) {
      statusCode = code;
      return this as Response;
    },
    json(data: Record<string, unknown>) {
      body = data;
      return this as Response;
    },
  };

  return {
    res,
    getStatus: () => statusCode,
    getBody: () => body,
  };
}

describe('rateLimit middleware', () => {
  it('allows requests under the limit', () => {
    const limiter = rateLimit({ windowMs: 60_000, max: 3 });
    const req = mockRequest('10.0.0.1');
    const nextFn = jest.fn();

    // First request should pass
    const { res: res1 } = mockResponse();
    limiter(req as Request, res1 as Response, nextFn as NextFunction);
    expect(nextFn).toHaveBeenCalledTimes(1);

    // Second request should pass
    const { res: res2 } = mockResponse();
    limiter(req as Request, res2 as Response, nextFn as NextFunction);
    expect(nextFn).toHaveBeenCalledTimes(2);

    // Third request should pass (exactly at the limit)
    const { res: res3 } = mockResponse();
    limiter(req as Request, res3 as Response, nextFn as NextFunction);
    expect(nextFn).toHaveBeenCalledTimes(3);
  });

  it('blocks requests over the limit', () => {
    const limiter = rateLimit({ windowMs: 60_000, max: 2 });
    const req = mockRequest('10.0.0.2');
    const nextFn = jest.fn();

    // Use up the limit
    for (let i = 0; i < 2; i++) {
      const { res } = mockResponse();
      limiter(req as Request, res as Response, nextFn as NextFunction);
    }
    expect(nextFn).toHaveBeenCalledTimes(2);

    // Third request should be blocked
    const { res: blockedRes, getStatus, getBody } = mockResponse();
    limiter(req as Request, blockedRes as Response, nextFn as NextFunction);
    expect(nextFn).toHaveBeenCalledTimes(2); // NOT called again
    expect(getStatus()).toBe(429);
    expect(getBody()).toEqual({
      error: 'Too many requests, please try again later.',
    });
  });

  it('uses custom error message when provided', () => {
    const limiter = rateLimit({
      windowMs: 60_000,
      max: 1,
      message: 'Slow down!',
    });
    const req = mockRequest('10.0.0.3');
    const nextFn = jest.fn();

    // Use up the limit
    const { res: res1 } = mockResponse();
    limiter(req as Request, res1 as Response, nextFn as NextFunction);

    // Second request should show custom message
    const { res: res2, getBody } = mockResponse();
    limiter(req as Request, res2 as Response, nextFn as NextFunction);
    expect(getBody()).toEqual({ error: 'Slow down!' });
  });

  it('resets after window expires', () => {
    jest.useFakeTimers();

    const windowMs = 1000; // 1 second window
    const limiter = rateLimit({ windowMs, max: 1 });
    const req = mockRequest('10.0.0.4');
    const nextFn = jest.fn();

    // First request passes
    const { res: res1 } = mockResponse();
    limiter(req as Request, res1 as Response, nextFn as NextFunction);
    expect(nextFn).toHaveBeenCalledTimes(1);

    // Second request is blocked
    const { res: res2, getStatus: getStatus2 } = mockResponse();
    limiter(req as Request, res2 as Response, nextFn as NextFunction);
    expect(nextFn).toHaveBeenCalledTimes(1);
    expect(getStatus2()).toBe(429);

    // Advance time past the window
    jest.advanceTimersByTime(windowMs + 1);

    // Now the request should pass again
    const { res: res3 } = mockResponse();
    limiter(req as Request, res3 as Response, nextFn as NextFunction);
    expect(nextFn).toHaveBeenCalledTimes(2);

    jest.useRealTimers();
  });

  it('tracks different IPs independently', () => {
    const limiter = rateLimit({ windowMs: 60_000, max: 1 });
    const nextFn = jest.fn();

    // IP A uses its limit
    const reqA = mockRequest('192.168.1.1');
    const { res: resA } = mockResponse();
    limiter(reqA as Request, resA as Response, nextFn as NextFunction);
    expect(nextFn).toHaveBeenCalledTimes(1);

    // IP A is blocked
    const { res: resA2, getStatus: getStatusA2 } = mockResponse();
    limiter(reqA as Request, resA2 as Response, nextFn as NextFunction);
    expect(getStatusA2()).toBe(429);

    // IP B should still be allowed
    const reqB = mockRequest('192.168.1.2');
    const { res: resB } = mockResponse();
    limiter(reqB as Request, resB as Response, nextFn as NextFunction);
    expect(nextFn).toHaveBeenCalledTimes(2);
  });
});

// ─── requestId middleware ────────────────────────────────────────────

describe('requestId middleware', () => {
  it('generates a UUID when no X-Request-Id header is present', () => {
    const req = {
      headers: {},
    } as Partial<Request>;
    const headers = new Map<string, string>();
    const res = {
      setHeader(key: string, value: string) { headers.set(key, value); },
    } as Partial<Response>;
    const next = jest.fn();

    requestId(req as Request, res as Response, next as NextFunction);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.headers!['x-request-id']).toBeDefined();
    expect(typeof req.headers!['x-request-id']).toBe('string');
    expect(headers.get('X-Request-Id')).toBe(req.headers!['x-request-id']);
    // Verify it's a valid UUID format
    expect(req.headers!['x-request-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it('uses existing X-Request-Id header when present', () => {
    const existingId = 'my-custom-request-id-123';
    const req = {
      headers: { 'x-request-id': existingId },
    } as Partial<Request>;
    const headers = new Map<string, string>();
    const res = {
      setHeader(key: string, value: string) { headers.set(key, value); },
    } as Partial<Response>;
    const next = jest.fn();

    requestId(req as Request, res as Response, next as NextFunction);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.headers!['x-request-id']).toBe(existingId);
    expect(headers.get('X-Request-Id')).toBe(existingId);
  });

  it('sets the response header to match the request header', () => {
    const req = {
      headers: {},
    } as Partial<Request>;
    const headers = new Map<string, string>();
    const res = {
      setHeader(key: string, value: string) { headers.set(key, value); },
    } as Partial<Response>;
    const next = jest.fn();

    requestId(req as Request, res as Response, next as NextFunction);

    expect(headers.get('X-Request-Id')).toBe(req.headers!['x-request-id']);
  });

  it('generates unique IDs for different requests', () => {
    const req1 = { headers: {} } as Partial<Request>;
    const req2 = { headers: {} } as Partial<Request>;
    const headers1 = new Map<string, string>();
    const headers2 = new Map<string, string>();
    const res1 = {
      setHeader(key: string, value: string) { headers1.set(key, value); },
    } as Partial<Response>;
    const res2 = {
      setHeader(key: string, value: string) { headers2.set(key, value); },
    } as Partial<Response>;
    const next = jest.fn();

    requestId(req1 as Request, res1 as Response, next as NextFunction);
    requestId(req2 as Request, res2 as Response, next as NextFunction);

    expect(req1.headers!['x-request-id']).not.toBe(req2.headers!['x-request-id']);
  });

  it('always calls next()', () => {
    const next = jest.fn();

    // Without existing header
    const req1 = { headers: {} } as Partial<Request>;
    const res1 = { setHeader: jest.fn() } as Partial<Response>;
    requestId(req1 as Request, res1 as Response, next as NextFunction);

    // With existing header
    const req2 = { headers: { 'x-request-id': 'test-id' } } as Partial<Request>;
    const res2 = { setHeader: jest.fn() } as Partial<Response>;
    requestId(req2 as Request, res2 as Response, next as NextFunction);

    expect(next).toHaveBeenCalledTimes(2);
  });
});

