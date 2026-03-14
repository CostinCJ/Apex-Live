/**
 * Integration tests for the auth API endpoints.
 * Tests run against the live server at localhost:3001.
 */

const API = 'http://localhost:3001';

function randomEmail(): string {
  return `test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@apex.dev`;
}

describe('Auth API', () => {
  const email = randomEmail();
  const password = 'testpass123';
  let accessToken = '';
  let refreshToken = '';

  it('POST /api/auth/signup — creates a new user', async () => {
    const res = await fetch(`${API}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.user.email).toBe(email);
    expect(body.accessToken).toBeDefined();
    expect(body.refreshToken).toBeDefined();
    expect(body.expiresIn).toBe(3600);
  });

  it('POST /api/auth/signup — rejects duplicate email', async () => {
    const res = await fetch(`${API}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    expect(res.status).toBe(409);
  });

  it('POST /api/auth/signin — returns tokens for valid credentials', async () => {
    const res = await fetch(`${API}/api/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    accessToken = body.accessToken;
    refreshToken = body.refreshToken;
    expect(accessToken).toBeTruthy();
    expect(refreshToken).toBeTruthy();
  });

  it('POST /api/auth/signin — rejects wrong password', async () => {
    const res = await fetch(`${API}/api/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'wrong' }),
    });

    expect(res.status).toBe(401);
  });

  it('GET /api/auth/session — returns user for valid token', async () => {
    const res = await fetch(`${API}/api/auth/session`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.email).toBe(email);
  });

  it('GET /api/auth/session — rejects missing token', async () => {
    const res = await fetch(`${API}/api/auth/session`);
    expect(res.status).toBe(401);
  });

  it('POST /api/auth/refresh — rotates tokens', async () => {
    const res = await fetch(`${API}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.accessToken).toBeTruthy();
    expect(body.refreshToken).toBeTruthy();
    // Old refresh token should be invalidated
    expect(body.refreshToken).not.toBe(refreshToken);

    accessToken = body.accessToken;
    refreshToken = body.refreshToken;
  });

  it('POST /api/auth/refresh — rejects used token (single use)', async () => {
    // The previous refresh token was already consumed
    const res = await fetch(`${API}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: 'already-used-fake-token' }),
    });

    expect(res.status).toBe(401);
  });

  it('POST /api/auth/signout — revokes all tokens', async () => {
    const res = await fetch(`${API}/api/auth/signout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    expect(res.status).toBe(200);

    // Refresh token should no longer work
    const refreshRes = await fetch(`${API}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    expect(refreshRes.status).toBe(401);
  });
});
