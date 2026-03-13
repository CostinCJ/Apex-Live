import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './client';

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
          result = await supabase.from(op.table as 'workouts').insert(op.data as never);
        } else if (op.type === 'update') {
          const { id, ...rest } = op.data;
          result = await supabase
            .from(op.table as 'workouts')
            .update(rest as never)
            .eq('id', id as string);
        } else {
          result = await supabase.from(op.table as 'workouts').upsert(op.data as never);
        }

        if (result.error) {
          throw result.error;
        }

        // Remove from queue on success
        this.queue = this.queue.filter((q) => q.id !== op.id);
      } catch (error) {
        console.error(`Sync failed for ${op.table}:`, error);
        op.retryCount++;

        if (op.retryCount < MAX_RETRIES) {
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
