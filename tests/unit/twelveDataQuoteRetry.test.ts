import { describe, expect, it, vi } from 'vitest';
import { QUOTE_RETRY_DELAYS_MS } from '../../src/constants/marketData';
import { delayMs, fetchQuoteWithRetry } from '../../src/services/twelveDataQuoteRetry';
import { MarketDataError } from '../../src/services/marketDataService';

describe('twelveDataQuoteRetry', () => {
  it('succeeds on second attempt after delay', async () => {
    vi.useFakeTimers();
    let calls = 0;
    const onRetry = vi.fn();
    const promise = fetchQuoteWithRetry(
      async () => {
        calls += 1;
        if (calls < 2) {
          throw new MarketDataError('network_timeout', 'timeout');
        }
        return { price: 1.2 };
      },
      { onRetry },
    );

    await vi.advanceTimersByTimeAsync(QUOTE_RETRY_DELAYS_MS[0]);
    const result = await promise;
    vi.useRealTimers();

    expect(result).toEqual({ price: 1.2 });
    expect(calls).toBe(2);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('throws after third failure', async () => {
    vi.useFakeTimers();
    const promise = fetchQuoteWithRetry(async () => {
      throw new MarketDataError('network_timeout', 'timeout');
    });
    const assertion = expect(promise).rejects.toBeInstanceOf(MarketDataError);
    await vi.runAllTimersAsync();
    await assertion;
    vi.useRealTimers();
  });

  it('delayMs waits requested time', async () => {
    vi.useFakeTimers();
    const p = delayMs(500);
    await vi.advanceTimersByTimeAsync(500);
    await p;
    vi.useRealTimers();
  });
});
