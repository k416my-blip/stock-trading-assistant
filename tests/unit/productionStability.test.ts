import { describe, expect, it } from 'vitest';
import {
  isCircuitOpen,
  recordApiFailure,
  recordApiSuccess,
  resetCircuitBreakerForTest,
} from '../../src/services/productionStability/apiCircuitBreaker';
import { computeBackoffDelayMs, retryWithExponentialBackoff } from '../../src/services/productionStability/exponentialBackoff';
import {
  isStaleAsyncGeneration,
  nextAsyncGeneration,
  resetAsyncRaceGuardForTest,
} from '../../src/services/productionStability/asyncRaceGuard';
import { trimProactiveQueueOverflow, resetQueueGuardsForTest } from '../../src/services/productionStability/queueGuards';
import type { ProactiveSuggestion } from '../../src/types/proactiveSuggestion';

describe('productionStability', () => {
  it('opens circuit after repeated failures', () => {
    resetCircuitBreakerForTest();
    for (let i = 0; i < 5; i++) recordApiFailure('openai');
    expect(isCircuitOpen('openai')).toBe(true);
    recordApiSuccess('openai');
    recordApiSuccess('openai');
    expect(isCircuitOpen('openai')).toBe(false);
  });

  it('computes exponential backoff', () => {
    const d0 = computeBackoffDelayMs(0, 400, 12000);
    const d2 = computeBackoffDelayMs(2, 400, 12000);
    expect(d2).toBeGreaterThan(d0);
  });

  it('retries retryable errors', async () => {
    let attempts = 0;
    const result = await retryWithExponentialBackoff(
      async () => {
        attempts += 1;
        if (attempts < 2) throw new Error('network');
        return 'ok';
      },
      { maxAttempts: 3, baseMs: 1, maxMs: 10 },
    );
    expect(result).toBe('ok');
    expect(attempts).toBe(2);
  });

  it('blocks stale async generations', () => {
    resetAsyncRaceGuardForTest();
    const g1 = nextAsyncGeneration('test');
    nextAsyncGeneration('test');
    expect(isStaleAsyncGeneration('test', g1)).toBe(true);
  });

  it('trims proactive queue overflow', () => {
    resetQueueGuardsForTest();
    const items = Array.from({ length: 100 }, (_, i) => ({
      id: `p-${i}`,
      priority: 'low' as const,
      category: 'periodic_check' as const,
      dedupeKey: `k-${i}`,
      titleJa: 't',
      bodyJa: 'b',
      actionHintJa: 'a',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'pending' as const,
      source: 'advisor' as const,
    })) as ProactiveSuggestion[];
    const trimmed = trimProactiveQueueOverflow(items, 80);
    expect(trimmed.length).toBe(80);
  });
});
