import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './client';

interface QueuedOperation {
  id: string;
  table: string;
  type: 'insert' | 'update' | 'upsert';
  data: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
}

const QUEUE_KEY = 'apex_sync_queue';
const MAX_RETRIES = 5;

export class SyncQueue {
  private queue: QueuedOperation[] = [];
  private processing = false;

  async initialize(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(QUEUE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored) as QueuedOperation[];
      }
    } catch {
      this.queue = [];
    }
  }

  async enqueue(
    table: string,
    type: 'insert' | 'update' | 'upsert',
    data: Record<string, unknown>,
  ): Promise<void> {
    const op: QueuedOperation = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      table,
      type,
      data,
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.queue.push(op);
    await this.persist();
  }

  async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    const toProcess = [...this.queue];
    const failed: QueuedOperation[] = [];

    for (const op of toProcess) {
      try {
        let result;

        if (op.type === 'insert') {
          result = await api.post(`/api/${op.table}`, op.data);
        } else if (op.type === 'update') {
          const { id, ...rest } = op.data;
          result = await api.patch(`/api/${op.table}/${id as string}`, rest);
        } else {
          // upsert
          const id = op.data.id as string | undefined;
          result = id
            ? await api.put(`/api/${op.table}/${id}`, op.data)
            : await api.post(`/api/${op.table}`, op.data);
        }

        if (result.error) {
          throw new Error(result.error.message);
        }

        // Remove from queue on success
        this.queue = this.queue.filter((q) => q.id !== op.id);
      } catch (error) {
        console.error(`Sync failed for ${op.table}:`, error);
        op.retryCount++;

        if (op.retryCount < MAX_RETRIES) {
          // Exponential backoff before next retry
          const delay = Math.min(1000 * Math.pow(2, op.retryCount), 30000);
          await new Promise((r) => setTimeout(r, delay));
          failed.push(op);
        } else {
          console.error(`Dropping operation after ${MAX_RETRIES} retries:`, op);
          this.queue = this.queue.filter((q) => q.id !== op.id);
        }
      }
    }

    this.queue = [...this.queue.filter((q) => !toProcess.includes(q)), ...failed];
    await this.persist();
    this.processing = false;
  }

  getPendingCount(): number {
    return this.queue.length;
  }

  private async persist(): Promise<void> {
    try {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
    } catch {
      // Ignore persistence errors
    }
  }
}

export const syncQueue = new SyncQueue();
