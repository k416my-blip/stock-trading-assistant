/**
 * npx vitest run tests/unit/forwardValidationRegimeEnvironmentAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  buildRegimeEnvironmentMetrics,
  enrichTradesWithVix,
  REGIME_ENVIRONMENT_DEFS,
} from '../../src/services/forwardValidation/forwardValidationRegimeEnvironmentAudit';
import type { ForwardPassedTradeRecord } from '../../src/types/forwardValidation';

function trade(
  id: string,
  signal: string,
  bucket: string,
  ret: number,
): ForwardPassedTradeRecord {
  return {
    id,
    symbol: 'HDV' as ForwardPassedTradeRecord['symbol'],
    signalDate: signal,
    entryDate: signal,
    exitDate: signal.slice(0, 8) + '15',
    entryPrice: 100,
    exitPrice: 100 + ret,
    returnPct: ret,
    holdDays: 5,
    exitReason: 'take_profit',
    adx14: 25,
    macdHistPct: 0.2,
    dist52wPct: -3,
    bucket,
    spyRegime: 'down',
  };
}

describe('forwardValidationRegimeEnvironmentAudit', () => {
  it('exposes 18 environment definitions', () => {
    expect(REGIME_ENVIRONMENT_DEFS.length).toBe(18);
  });

  it('classifies VIX bands on enriched trades', () => {
    const enriched = enrichTradesWithVix(
      [trade('a', '2022-03-01', 'down', 4)],
      [{ date: '2022-03-01', open: 28, high: 30, low: 27, close: 28.5, volume: 1 }],
    );
    const vix30 = REGIME_ENVIRONMENT_DEFS.find((d) => d.environmentId === 'vix_gte30')!;
    const vix24 = REGIME_ENVIRONMENT_DEFS.find((d) => d.environmentId === 'vix_24_30')!;
    expect(vix30.match(enriched[0]!)).toBe(false);
    expect(vix24.match(enriched[0]!)).toBe(true);
  });

  it('builds metrics for trend_up bucket', () => {
    const trades = enrichTradesWithVix(
      [
        trade('a', '2020-01-02', 'up', 4),
        trade('b', '2020-02-02', 'up', 2),
        trade('c', '2020-03-02', 'down', -1),
      ],
      [],
    );
    const def = REGIME_ENVIRONMENT_DEFS.find((d) => d.environmentId === 'trend_up')!;
    const row = buildRegimeEnvironmentMetrics(def, trades, '2020-01-01', '2020-12-31', 10);
    expect(row.tradeCount).toBe(2);
    expect(row.winRatePct).toBe(100);
  });

  it('matches covid crash date window', () => {
    const def = REGIME_ENVIRONMENT_DEFS.find((d) => d.environmentId === 'covid_crash')!;
    const enriched = enrichTradesWithVix(
      [trade('a', '2020-03-15', 'down', 4)],
      [],
    );
    expect(def.match(enriched[0]!)).toBe(true);
  });
});
