import * as SecureStore from 'expo-secure-store';
import { syncQueue } from './SyncQueue';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

const ACCESS_TOKEN_KEY = 'apex_access_token';
const REFRESH_TOKEN_KEY = 'apex_refresh_token';

// ─── Token storage ──────────────────────────────────────────────────

async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function setTokens(accessToken: string, refreshToken: string): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

// ─── Auth state listeners ───────────────────────────────────────────

type AuthListener = (event: 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED') => void;
const authListeners = new Set<AuthListener>();

export function onAuthStateChange(listener: AuthListener): () => void {
  authListeners.add(listener);
  return () => { authListeners.delete(listener); };
}

function notifyAuthListeners(event: 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED'): void {
  authListeners.forEach((fn) => fn(event));
}

// ─── Token refresh ──────────────────────────────────────────────────

let refreshPromise: Promise<boolean> | null = null;
let consecutiveRefreshFailures = 0;
const MAX_REFRESH_FAILURES = 3;

async function refreshAccessToken(): Promise<boolean> {
  // Deduplicate concurrent refresh attempts
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) return false;

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) {
        await clearTokens();
        notifyAuthListeners('SIGNED_OUT');
        consecutiveRefreshFailures = 0;
        return false;
      }

      const data = (await res.json()) as { accessToken: string; refreshToken: string };
      await setTokens(data.accessToken, data.refreshToken);
      notifyAuthListeners('TOKEN_REFRESHED');
      consecutiveRefreshFailures = 0;
      return true;
    } catch {
      // Network error — don't clear tokens immediately (user might be offline)
      consecutiveRefreshFailures++;
      if (consecutiveRefreshFailures >= MAX_REFRESH_FAILURES) {
        await clearTokens();
        notifyAuthListeners('SIGNED_OUT');
        consecutiveRefreshFailures = 0;
      }
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// ─── Core fetch wrapper ─────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T | null;
  error: { message: string; status: number } | null;
}

interface FetchOptions extends RequestInit {
  /** If true, queue to SyncQueue on network failure for later retry */
  offlineQueue?: boolean;
}

async function apiFetch<T>(
  path: string,
  options: FetchOptions = {},
): Promise<ApiResponse<T>> {
  const { offlineQueue, ...fetchOptions } = options;
  const token = await getAccessToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res: Response;

  try {
    res = await fetch(`${API_BASE_URL}${path}`, { ...fetchOptions, headers });
  } catch {
    // Queue mutating requests for offline retry
    if (offlineQueue && fetchOptions.method && fetchOptions.method !== 'GET') {
      const body = fetchOptions.body ? JSON.parse(fetchOptions.body as string) : undefined;
      syncQueue.enqueue(
        path,
        fetchOptions.method as 'POST' | 'PATCH' | 'PUT' | 'DELETE',
        body,
      );
    }
    return { data: null, error: { message: 'Network error', status: 0 } };
  }

  // Auto-refresh on 401
  if (res.status === 401 && token) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      const newToken = await getAccessToken();
      headers['Authorization'] = `Bearer ${newToken}`;
      try {
        res = await fetch(`${API_BASE_URL}${path}`, { ...fetchOptions, headers });
      } catch {
        return { data: null, error: { message: 'Network error', status: 0 } };
      }
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText })) as Record<string, unknown>;
    return {
      data: null,
      error: { message: (body.error as string) ?? 'Request failed', status: res.status },
    };
  }

  const body = (await res.json()) as T;
  return { data: body, error: null };
}

// ─── Public API methods ─────────────────────────────────────────────

interface MutationOptions {
  offlineQueue?: boolean;
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),

  post: <T>(path: string, body?: unknown, opts?: MutationOptions) =>
    apiFetch<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      offlineQueue: opts?.offlineQueue,
    }),

  patch: <T>(path: string, body?: unknown, opts?: MutationOptions) =>
    apiFetch<T>(path, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
      offlineQueue: opts?.offlineQueue,
    }),

  put: <T>(path: string, body?: unknown, opts?: MutationOptions) =>
    apiFetch<T>(path, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
      offlineQueue: opts?.offlineQueue,
    }),

  delete: <T>(path: string) =>
    apiFetch<T>(path, { method: 'DELETE' }),
};

// ─── Auth convenience methods ───────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
}

export interface AuthResult {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export const auth = {
  signUp: async (email: string, password: string): Promise<ApiResponse<AuthResult>> => {
    const result = await api.post<AuthResult>('/api/auth/signup', { email, password });
    if (result.data) {
      await setTokens(result.data.accessToken, result.data.refreshToken);
      notifyAuthListeners('SIGNED_IN');
    }
    return result;
  },

  signIn: async (email: string, password: string): Promise<ApiResponse<AuthResult>> => {
    const result = await api.post<AuthResult>('/api/auth/signin', { email, password });
    if (result.data) {
      await setTokens(result.data.accessToken, result.data.refreshToken);
      notifyAuthListeners('SIGNED_IN');
    }
    return result;
  },

  signOut: async (): Promise<void> => {
    try {
      await api.post('/api/auth/signout');
    } finally {
      await clearTokens();
      notifyAuthListeners('SIGNED_OUT');
    }
  },

  getSession: async (): Promise<ApiResponse<{ user: AuthUser }>> => {
    return api.get<{ user: AuthUser }>('/api/auth/session');
  },

  hasSession: async (): Promise<boolean> => {
    const token = await getAccessToken();
    return token !== null;
  },
};
