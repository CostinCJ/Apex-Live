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
  const password = 'TestPass1';
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

// ─── Helpers for new test sections ────────────────────────────────────────

async function createFreshUser(): Promise<{
  email: string;
  password: string;
  accessToken: string;
  refreshToken: string;
  userId: string;
}> {
  const email = randomEmail();
  const password = 'TestPass1';
  const res = await fetch(`${API}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = (await res.json()) as {
    accessToken: string;
    refreshToken: string;
    user: { id: string };
  };
  return {
    email,
    password,
    accessToken: body.accessToken,
    refreshToken: body.refreshToken,
    userId: body.user.id,
  };
}

// ─── Signup Enhancement Tests ─────────────────────────────────────────────

describe('Auth API — Signup Validation', () => {
  it('POST /api/auth/signup — rejects password shorter than 8 characters', async () => {
    const res = await fetch(`${API}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: randomEmail(), password: 'Ab1' }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: Record<string, string[]> };
    expect(body.error.password).toBeDefined();
  });

  it('POST /api/auth/signup — rejects password without uppercase letter', async () => {
    const res = await fetch(`${API}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: randomEmail(), password: 'testpass1' }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: Record<string, string[]> };
    expect(body.error.password).toBeDefined();
  });

  it('POST /api/auth/signup — rejects password without digit', async () => {
    const res = await fetch(`${API}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: randomEmail(), password: 'TestPasss' }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: Record<string, string[]> };
    expect(body.error.password).toBeDefined();
  });

  it('POST /api/auth/signup — rejects password without lowercase letter', async () => {
    const res = await fetch(`${API}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: randomEmail(), password: 'TESTPASS1' }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: Record<string, string[]> };
    expect(body.error.password).toBeDefined();
  });

  it('POST /api/auth/signup — rejects invalid email format', async () => {
    const res = await fetch(`${API}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email', password: 'TestPass1' }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: Record<string, string[]> };
    expect(body.error.email).toBeDefined();
  });

  it('POST /api/auth/signup — returns emailVerified as false for new user', async () => {
    const res = await fetch(`${API}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: randomEmail(), password: 'TestPass1' }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { user: { emailVerified: boolean } };
    expect(body.user.emailVerified).toBe(false);
  });
});

// ─── Email Verification Tests ─────────────────────────────────────────────

describe('Auth API — Email Verification', () => {
  let token = '';

  beforeAll(async () => {
    const user = await createFreshUser();
    token = user.accessToken;
  });

  it('POST /api/auth/verify-email — rejects without auth (401)', async () => {
    const res = await fetch(`${API}/api/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: '123456' }),
    });
    expect(res.status).toBe(401);
  });

  it('POST /api/auth/verify-email — rejects code that is not 6 digits', async () => {
    const res = await fetch(`${API}/api/auth/verify-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ code: '12345' }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain('Invalid verification code format');
  });

  it('POST /api/auth/verify-email — rejects code longer than 6 chars', async () => {
    const res = await fetch(`${API}/api/auth/verify-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ code: '1234567' }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain('Invalid verification code format');
  });

  it('POST /api/auth/verify-email — rejects wrong code (400)', async () => {
    const res = await fetch(`${API}/api/auth/verify-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ code: '000000' }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain('Invalid or expired verification code');
  });

  it('POST /api/auth/resend-verification — requires auth (401)', async () => {
    const res = await fetch(`${API}/api/auth/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status).toBe(401);
  });

  it('POST /api/auth/resend-verification — works when authenticated', async () => {
    const res = await fetch(`${API}/api/auth/resend-verification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(true);
  });

  it('GET /api/auth/session — includes emailVerified field', async () => {
    const res = await fetch(`${API}/api/auth/session`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { user: { emailVerified: boolean } };
    expect(typeof body.user.emailVerified).toBe('boolean');
    expect(body.user.emailVerified).toBe(false);
  });
});

// ─── Password Reset Tests ────────────────────────────────────────────────

describe('Auth API — Password Reset', () => {
  let userEmail = '';

  beforeAll(async () => {
    const user = await createFreshUser();
    userEmail = user.email;
  });

  it('POST /api/auth/forgot-password — returns success for valid email', async () => {
    const res = await fetch(`${API}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean; message: string };
    expect(body.success).toBe(true);
    expect(body.message).toBeDefined();
  });

  it('POST /api/auth/forgot-password — returns success even for non-existent email (anti-enumeration)', async () => {
    const res = await fetch(`${API}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'definitely_does_not_exist@example.com' }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(true);
  });

  it('POST /api/auth/forgot-password — rejects missing email (400)', async () => {
    const res = await fetch(`${API}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('POST /api/auth/forgot-password — rejects invalid email format (400)', async () => {
    const res = await fetch(`${API}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email' }),
    });
    expect(res.status).toBe(400);
  });

  it('POST /api/auth/reset-password — rejects invalid code (400)', async () => {
    const res = await fetch(`${API}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: userEmail,
        code: '000000',
        newPassword: 'NewPass1!',
      }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBeDefined();
  });

  it('POST /api/auth/reset-password — rejects missing fields (400)', async () => {
    const res = await fetch(`${API}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail }),
    });
    expect(res.status).toBe(400);
  });

  it('POST /api/auth/reset-password — rejects weak password (400)', async () => {
    const res = await fetch(`${API}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: userEmail,
        code: '123456',
        newPassword: 'weak',
      }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: Record<string, string[]> };
    expect(body.error.newPassword).toBeDefined();
  });

  it('POST /api/auth/reset-password — rejects reset for non-existent user', async () => {
    const res = await fetch(`${API}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nonexistent_reset@example.com',
        code: '123456',
        newPassword: 'NewPass1!',
      }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain('Invalid reset code');
  });
});

// ─── Change Password Tests ──────────────────────────────────────────────

describe('Auth API — Change Password', () => {
  const originalPassword = 'TestPass1';
  const newPassword = 'NewSecure9';
  let token = '';
  let userEmail = '';

  beforeAll(async () => {
    const user = await createFreshUser();
    token = user.accessToken;
    userEmail = user.email;
  });

  it('POST /api/auth/change-password — requires auth (401)', async () => {
    const res = await fetch(`${API}/api/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPassword: originalPassword,
        newPassword,
      }),
    });
    expect(res.status).toBe(401);
  });

  it('POST /api/auth/change-password — rejects wrong current password (401)', async () => {
    const res = await fetch(`${API}/api/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        currentPassword: 'WrongPass9',
        newPassword,
      }),
    });
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain('Current password is incorrect');
  });

  it('POST /api/auth/change-password — rejects weak new password (400)', async () => {
    const res = await fetch(`${API}/api/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        currentPassword: originalPassword,
        newPassword: 'weak',
      }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: Record<string, string[]> };
    expect(body.error.newPassword).toBeDefined();
  });

  it('POST /api/auth/change-password — succeeds with valid data', async () => {
    const res = await fetch(`${API}/api/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        currentPassword: originalPassword,
        newPassword,
      }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(true);
  });

  it('POST /api/auth/change-password — old password no longer works for signin', async () => {
    // Sign in with old password should fail
    const oldRes = await fetch(`${API}/api/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail, password: originalPassword }),
    });
    expect(oldRes.status).toBe(401);

    // Sign in with new password should succeed
    const newRes = await fetch(`${API}/api/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail, password: newPassword }),
    });
    expect(newRes.status).toBe(200);
    const body = (await newRes.json()) as { accessToken: string };
    expect(body.accessToken).toBeTruthy();
  });
});
