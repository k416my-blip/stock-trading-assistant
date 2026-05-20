import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  enqueueMarketDataRequest,
  marketDataRequestQueue,
} from '../../src/services/marketDataRequestQueue';

describe('integration: API 429 storm', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    marketDataRequestQueue.resetCooldownsForTest();
  });

  afterEach(() => {
    vi.useRealTimers();
    marketDataRequestQueue.resetCooldownsForTest();
  });

  it('backs off and limits concurrency under burst', async () => {
    let peak = 0;
    let running = 0;

    const tasks = Array.from({ length: 8 }, (_, i) =>
      enqueueMarketDataRequest(`storm:${i}`, async () => {
        running += 1;
        peak = Math.max(peak, running);
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 10);
        });
        running -= 1;
        return i;
      }),
    );

    const all = Promise.all(tasks);
    // 8 dispatches with MARKET_DATA_MIN_INTERVAL_MS (1500) gaps — advance virtual clock, not wall clock.
    await vi.advanceTimersByTimeAsync(12_000);
    await all;

    expect(peak).toBeLessThanOrEqual(2);

    marketDataRequestQueue.noteRateLimit();
    const snap = marketDataRequestQueue.getSnapshot();
    expect(snap.backoffMs).toBeGreaterThanOrEqual(2000);
  });
});
