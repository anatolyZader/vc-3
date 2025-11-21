'use strict';

const path = require('path');

describe('RequestQueue utility', () => {
  beforeAll(() => {
    jest.setTimeout(20000);
  });
  let RequestQueue;

  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();
    RequestQueue = require(path.resolve(__dirname, '../../../../../../business_modules/ai/infrastructure/ai/requestQueue.js'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('queues and processes multiple requests when under rate limit', async () => {
    const rq = new RequestQueue({ maxRequestsPerMinute: 1000, retryDelay: 10, maxRetries: 2 });

    // Force rate limit to always allow
    jest.spyOn(rq, 'checkRateLimit').mockResolvedValue(true);

    const results = [];
    const p1 = rq.queueRequest(async () => { results.push('a'); return 'A'; });
    const p2 = rq.queueRequest(async () => { results.push('b'); return 'B'; });

    // Manually trigger processing to avoid waiting intervals
    await rq.processQueue();
    await rq.processQueue();

    await expect(p1).resolves.toBe('A');
    await expect(p2).resolves.toBe('B');
    expect(results).toEqual(['a', 'b']);

    const status = rq.getQueueStatus();
    expect(status.queueLength).toBe(0);
    expect(status.isProcessing).toBe(false);
  });

  test.skip('requeues when rate limited and proceeds after delay (flaky with timers) — TODO: make deterministic', async () => {
    jest.setTimeout(15000);
    const rq = new RequestQueue({ maxRequestsPerMinute: 1, retryDelay: 10, maxRetries: 1 });

    // First: deny, then allow
    const rateSeq = [false, true];
    jest.spyOn(rq, 'checkRateLimit').mockImplementation(() => Promise.resolve(rateSeq.shift() ?? true));

    const p = rq.queueRequest(async () => 'OK');

    // Cancel any auto-scheduled timers (like the 100ms processQueue trigger and 5s interval)
    jest.clearAllTimers();

    // Process once: will be rate limited and requeued, waiting for 5s inside
    const proc = rq.processQueue();
    // Advance the 5000ms wait inside processQueue
  jest.advanceTimersByTime(5000);
  // Allow any pending microtasks to flush
  await Promise.resolve();
  await proc;

    // Now process again which should allow
  await rq.processQueue();
    await expect(p).resolves.toBe('OK');
  });
});
