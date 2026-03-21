import { SyncQueue } from '../SyncQueue';

// Mock the api client module used by SyncQueue.processQueue
const mockPost = jest.fn();
const mockPatch = jest.fn();
const mockPut = jest.fn();
const mockDelete = jest.fn();

jest.mock('../client', () => ({
  api: {
    post: (...args: unknown[]) => mockPost(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
    put: (...args: unknown[]) => mockPut(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

function createQueue(): SyncQueue {
  return new SyncQueue();
}

describe('SyncQueue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('enqueue', () => {
    it('adds an item to the queue', () => {
      const queue = createQueue();
      expect(queue.getPendingCount()).toBe(0);

      queue.enqueue('/api/workouts', 'POST', { name: 'Leg Day' });
      expect(queue.getPendingCount()).toBe(1);
    });

    it('adds multiple items to the queue', () => {
      const queue = createQueue();
      queue.enqueue('/api/workouts', 'POST', { name: 'Push' });
      queue.enqueue('/api/workouts', 'POST', { name: 'Pull' });
      queue.enqueue('/api/metrics', 'PATCH', { heartRate: 140 });
      expect(queue.getPendingCount()).toBe(3);
    });

    it('supports all HTTP methods', () => {
      const queue = createQueue();
      queue.enqueue('/api/a', 'POST');
      queue.enqueue('/api/b', 'PATCH');
      queue.enqueue('/api/c', 'PUT');
      queue.enqueue('/api/d', 'DELETE');
      expect(queue.getPendingCount()).toBe(4);
    });
  });

  describe('processQueue', () => {
    it('does nothing when queue is empty', async () => {
      const queue = createQueue();
      await queue.processQueue();
      expect(mockPost).not.toHaveBeenCalled();
    });

    it('processes a POST item and removes it on success', async () => {
      mockPost.mockResolvedValueOnce({ data: { id: 1 }, error: null });
      const queue = createQueue();

      queue.enqueue('/api/workouts', 'POST', { name: 'Push' });
      expect(queue.getPendingCount()).toBe(1);

      await queue.processQueue();
      expect(mockPost).toHaveBeenCalledWith('/api/workouts', { name: 'Push' });
      expect(queue.getPendingCount()).toBe(0);
    });

    it('processes a PATCH item', async () => {
      mockPatch.mockResolvedValueOnce({ data: {}, error: null });
      const queue = createQueue();

      queue.enqueue('/api/metrics/1', 'PATCH', { heartRate: 150 });
      await queue.processQueue();

      expect(mockPatch).toHaveBeenCalledWith('/api/metrics/1', { heartRate: 150 });
      expect(queue.getPendingCount()).toBe(0);
    });

    it('processes a PUT item', async () => {
      mockPut.mockResolvedValueOnce({ data: {}, error: null });
      const queue = createQueue();

      queue.enqueue('/api/users/profile', 'PUT', { displayName: 'John' });
      await queue.processQueue();

      expect(mockPut).toHaveBeenCalledWith('/api/users/profile', { displayName: 'John' });
      expect(queue.getPendingCount()).toBe(0);
    });

    it('processes a DELETE item', async () => {
      mockDelete.mockResolvedValueOnce({ data: {}, error: null });
      const queue = createQueue();

      queue.enqueue('/api/workouts/5', 'DELETE');
      await queue.processQueue();

      expect(mockDelete).toHaveBeenCalledWith('/api/workouts/5');
      expect(queue.getPendingCount()).toBe(0);
    });

    it('processes multiple items in order', async () => {
      mockPost
        .mockResolvedValueOnce({ data: {}, error: null })
        .mockResolvedValueOnce({ data: {}, error: null });

      const queue = createQueue();
      queue.enqueue('/api/workouts', 'POST', { name: 'A' });
      queue.enqueue('/api/workouts', 'POST', { name: 'B' });

      await queue.processQueue();

      expect(mockPost).toHaveBeenCalledTimes(2);
      expect(mockPost).toHaveBeenNthCalledWith(1, '/api/workouts', { name: 'A' });
      expect(mockPost).toHaveBeenNthCalledWith(2, '/api/workouts', { name: 'B' });
      expect(queue.getPendingCount()).toBe(0);
    });

    it('treats 409 Conflict as success (server has newer data)', async () => {
      mockPost.mockResolvedValueOnce({
        data: null,
        error: { message: 'Conflict', status: 409 },
      });
      const queue = createQueue();

      queue.enqueue('/api/workouts', 'POST', { name: 'Stale' });
      await queue.processQueue();

      expect(queue.getPendingCount()).toBe(0);
    });
  });

  describe('retry logic', () => {
    it('keeps item in queue on failure and increments retryCount', async () => {
      mockPost.mockResolvedValueOnce({
        data: null,
        error: { message: 'Server error', status: 500 },
      });

      const queue = createQueue();
      queue.enqueue('/api/workouts', 'POST', { name: 'Retry Me' });

      await queue.processQueue();
      expect(queue.getPendingCount()).toBe(1);
    });

    it('keeps item on network error (thrown exception)', async () => {
      mockPost.mockRejectedValueOnce(new Error('Network error'));
      const queue = createQueue();

      queue.enqueue('/api/workouts', 'POST', { name: 'Offline' });
      await queue.processQueue();

      expect(queue.getPendingCount()).toBe(1);
    });

    it('drops item after MAX_RETRIES (5) failures', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const queue = createQueue();
      queue.enqueue('/api/workouts', 'POST', { name: 'Doomed' });

      // Each processQueue call: fails, increments retryCount, but backoff may
      // prevent processing on subsequent calls. We simulate by calling processQueue
      // enough times, advancing Date.now to bypass backoff.
      const originalDateNow = Date.now;
      let fakeNow = originalDateNow();

      jest.spyOn(Date, 'now').mockImplementation(() => fakeNow);

      for (let i = 0; i < 5; i++) {
        mockPost.mockRejectedValueOnce(new Error('fail'));
        // Advance time past any backoff: 2^retryCount * 1000, capped at 30000
        fakeNow += 60_000;
        await queue.processQueue();
      }

      expect(queue.getPendingCount()).toBe(0);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Dropping operation after 5 retries:'),
        '/api/workouts',
      );

      consoleSpy.mockRestore();
      jest.spyOn(Date, 'now').mockRestore();
    });

    it('succeeds after retries when server recovers', async () => {
      const queue = createQueue();
      queue.enqueue('/api/workouts', 'POST', { name: 'Resilient' });

      const originalDateNow = Date.now;
      let fakeNow = originalDateNow();
      jest.spyOn(Date, 'now').mockImplementation(() => fakeNow);

      // First attempt fails
      mockPost.mockRejectedValueOnce(new Error('fail'));
      await queue.processQueue();
      expect(queue.getPendingCount()).toBe(1);

      // Second attempt succeeds (advance past backoff)
      fakeNow += 60_000;
      mockPost.mockResolvedValueOnce({ data: { id: 1 }, error: null });
      await queue.processQueue();
      expect(queue.getPendingCount()).toBe(0);

      jest.spyOn(Date, 'now').mockRestore();
    });
  });

  describe('getPendingCount', () => {
    it('returns 0 for a new queue', () => {
      const queue = createQueue();
      expect(queue.getPendingCount()).toBe(0);
    });

    it('reflects current queue size', () => {
      const queue = createQueue();
      queue.enqueue('/api/a', 'POST');
      expect(queue.getPendingCount()).toBe(1);
      queue.enqueue('/api/b', 'POST');
      expect(queue.getPendingCount()).toBe(2);
    });
  });

  describe('concurrent processQueue calls', () => {
    it('does not process concurrently (second call is a no-op)', async () => {
      let resolveFirst: (value: unknown) => void;
      const firstCallPromise = new Promise((resolve) => {
        resolveFirst = resolve;
      });

      mockPost.mockImplementationOnce(() => firstCallPromise);
      mockPost.mockResolvedValueOnce({ data: {}, error: null });

      const queue = createQueue();
      queue.enqueue('/api/a', 'POST', { n: 1 });
      queue.enqueue('/api/b', 'POST', { n: 2 });

      const p1 = queue.processQueue();
      const p2 = queue.processQueue(); // Should bail out since processing=true

      // Resolve the first call
      resolveFirst!({ data: {}, error: null });
      await p1;
      await p2;

      // Only items from the first processQueue call should have been processed
      // The second call returned early because processing was already true
      expect(mockPost).toHaveBeenCalledTimes(2);
    });
  });

  describe('initialize', () => {
    it('starts with empty queue when no stored data', async () => {
      const queue = createQueue();
      await queue.initialize();
      expect(queue.getPendingCount()).toBe(0);
    });
  });
});
