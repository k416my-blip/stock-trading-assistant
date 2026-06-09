/**
 * npx vitest run tests/unit/forwardValidationDangerousEnvironmentFilterAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  DANGER_ENV_FILTER_DEFS,
  shouldSkipEntryForFilter,
  simulateDangerEnvFilter,
} from '../../src/services/forwardValidation/forwardValidationDangerousEnvironmentFilterAudit';
import type { EnrichedTrade } from '../../src/services/forwardValidation/forwardValidationRegimeEnvironmentAudit';
import type { ForwardPassedTradeRecord } from '../../src/types/forwardValidation';

function trade(
  id: string,
  entry: string,
  exit: string,
  ret: number,
  extra: Partial<EnrichedTrade> = {},
): EnrichedTrade {
  return {
    id,
    symbol: 'HDV' as ForwardPassedTradeRecord['symbol'],
    signalDate: entry,
    entryDate: entry,
    exitDate: exit,
    entryPrice: 100,
    exitPrice: 100 + ret,
    returnPct: ret,
    holdDays: 5,
    exitReason: ret >= 4 ? 'take_profit' : 'max_hold',
    adx14: 25,
    macdHistPct: 0.2,
    dist52wPct: -3,
    bucket: 'up',
    spyRegime: 'up',
    vixAtSignal: 25,
    ...extra,
  };
}

describe('forwardValidationDangerousEnvironmentFilterAudit', () => {
  it('defines 8 danger filters', () => {
    expect(DANGER_ENV_FILTER_DEFS.length).toBe(8);
  });

  it('skips VIX 24-30 band entries', () => {
    const t = trade('a', '2020-01-02', '2020-01-10', 4, { vixAtSignal: 26 });
    expect(shouldSkipEntryForFilter(t, 'vix_24_30')).toBe(true);
    expect(shouldSkipEntryForFilter(t, 'vix_gte30')).toBe(false);
  });

  it('skips sideways SPY regime', () => {
    const t = trade('a', '2020-01-02', '2020-01-10', 4, { bucket: 'sideways_deep' });
    expect(shouldSkipEntryForFilter(t, 'spy_sideways')).toBe(true);
  });

  it('reduces executed count when filter active', () => {
    const candidates = [
      trade('a', '2020-01-02', '2020-01-10', 4, { vixAtSignal: 26 }),
      trade('b', '2020-02-02', '2020-02-10', 4, { vixAtSignal: 32 }),
    ];
    const baseline = simulateDangerEnvFilter({
      candidates,
      symbols: ['HDV'],
      filterId: 'current',
      historyForSlot: [],
    });
    const filtered = simulateDangerEnvFilter({
      candidates,
      symbols: ['HDV'],
      filterId: 'vix_24_30',
      historyForSlot: [],
    });
    expect(filtered.skippedCount).toBe(1);
    expect(filtered.executed.length).toBeLessThan(baseline.executed.length);
  });
});
