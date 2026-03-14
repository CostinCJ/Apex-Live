import AsyncStorage from '@react-native-async-storage/async-storage';

interface QueuedOperation {
  id: string;
  path: string;
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  timestamp: number;
  retryCount: number;
}

const QUEUE_KEY = 'apex_sync_queue';
const MAX_RETRIES = 5;

// Try MMKV for fast synchronous persistence, fall back to AsyncStorage
let storage: {
  getItem: (key: string) => string | null | Promise<string | null>;
  setItem: (key: string, value: string) => void;
};

try {
  const { createMMKV } = require('react-native-mmkv');
  const mmkv = createMMKV({ id: 'sync-queue' });
  storage = {
    getItem: (key: string) => mmkv.getString(key) ?? null,
    setItem: (key: string, value: string) => mmkv.set(key, value),
  };
} catch {
  storage = {
    getItem: (key: string) => AsyncStorage.getItem(key) as unknown as string | null,
    setItem: (key: string, value: string) => { void AsyncStorage.setItem(key, value); },
  };
}

export class SyncQueue {
  private queue: QueuedOperation[] = [];
  private processing = false;

  async initialize(): Promise<void> {
    try {
      const stored = await Promise.resolve(storage.getItem(QUEUE_KEY));
      if (stored) {
        this.queue = JSON.parse(stored) as QueuedOperation[];
      }
    } catch {
      this.queue = [];
    }
  }

  enqueue(
    path: string,
    method: 'POST' | 'PATCH' | 'PUT' | 'DELETE',
    body?: unknown,
  ): void {
    const op: QueuedOperation = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      path,
      method,
      body,
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.queue.push(op);
    this.persist();
  }

  async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    // Lazy import to break circular dependency (client.ts <-> SyncQueue.ts)
    const { api } = await import('./client');

    // Process items one at a time, skip items whose retry backoff hasn't elapsed
    const now = Date.now();
    const remaining: QueuedOperation[] = [];

    for (const op of this.queue) {
      // Check backoff delay
      const nextRetryAt = op.timestamp + Math.min(1000 * Math.pow(2, op.retryCount), 30_000);
      if (op.retryCount > 0 && now < nextRetryAt) {
        remaining.push(op);
        continue;
      }

      try {
        let result;

        switch (op.method) {
          case 'POST':
            result = await api.post(op.path, op.body);
            break;
          case 'PATCH':
            result = await api.patch(op.path, op.body);
            break;
          case 'PUT':
            result = await api.put(op.path, op.body);
            break;
          case 'DELETE':
            result = await api.delete(op.path);
            break;
        }

        if (result.error) {
          // 409 Conflict = server has newer data, treat as success
          if (result.error.status === 409) continue;
          throw new Error(result.error.message);
        }
        // Success — item is dropped (not added to remaining)
      } catch {
        op.retryCount++;
        op.timestamp = now;

        if (op.retryCount < MAX_RETRIES) {
          remaining.push(op);
        } else {
          console.error(`Dropping operation after ${MAX_RETRIES} retries:`, op.path);
        }
      }
    }

    this.queue = remaining;
    this.persist();
    this.processing = false;
  }

  getPendingCount(): number {
    return this.queue.length;
  }

  private persist(): void {
    try {
      storage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
    } catch {
      // Ignore persistence errors
    }
  }
}

export const syncQueue = new SyncQueue();
