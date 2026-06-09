/**
 * npx vitest run tests/unit/forwardValidationSymbolWeightAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  buildSymbolWeightSchemeDefs,
  dedupOneEtfPerDayWithWeights,
  resolveSlotPctForScheme,
  simulateRm3000WeightedPath,
} from '../../src/services/forwardValidation/forwardValidationSymbolWeightAudit';
import type { ForwardPassedTradeRecord } from '../../src/types/forwardValidation';

function trade(
  id: string,
  symbol: string,
  signal: string,
  entry: string,
  exit: string,
  ret: number,
): ForwardPassedTradeRecord {
  return {
    id,
    symbol: symbol as ForwardPassedTradeRecord['symbol'],
    signalDate: signal,
    entryDate: entry,
    exitDate: exit,
    entryPrice: 100,
    exitPrice: 100 + ret,
    returnPct: ret,
    holdDays: 5,
    exitReason: 'take_profit',
    adx14: 25,
    macdHistPct: 0.2,
    dist52wPct: -3,
    bucket: 'deep',
    spyRegime: 'down',
  };
}

describe('forwardValidationSymbolWeightAudit', () => {
  it('builds 16 weight scheme definitions', () => {
    const defs = buildSymbolWeightSchemeDefs({
      symbols: ['HDV', 'DGRO', 'QQQ', 'SCHD'],
      contributionWeights: { HDV: 0.4, DGRO: 0.3, QQQ: 0.2, SCHD: 0.1 },
      sharpeWeights: { HDV: 0.25, DGRO: 0.25, QQQ: 0.25, SCHD: 0.25 },
      marWeights: { HDV: 0.25, DGRO: 0.25, QQQ: 0.25, SCHD: 0.25 },
      ddMinWeights: { HDV: 0.25, DGRO: 0.25, QQQ: 0.25, SCHD: 0.25 },
    });
    expect(defs.length).toBe(16);
    expect(defs.find((d) => d.schemeId === 'excl_schd')?.universe).toEqual([
      'HDV',
      'DGRO',
      'QQQ',
    ]);
  });

  it('weighted dedup prefers higher-weight symbol on same day', () => {
    const trades = [
      trade('a', 'HDV', '2020-01-02', '2020-01-02', '2020-01-10', 4),
      trade('b', 'SCHD', '2020-01-02', '2020-01-02', '2020-01-10', 4),
    ];
    const out = dedupOneEtfPerDayWithWeights(
      trades,
      ['HDV', 'SCHD'],
      'weighted',
      { HDV: 0.9, SCHD: 0.1 },
      [],
    );
    expect(out).toHaveLength(1);
    expect(out[0]!.symbol).toBe('HDV');
  });

  it('RM3000 path grows equity on winning trades', () => {
    const trades = [
      trade('a', 'HDV', '2020-01-02', '2020-01-02', '2020-01-10', 4),
      trade('b', 'HDV', '2020-02-02', '2020-02-02', '2020-02-10', 4),
    ];
    const def = {
      schemeId: 'equal' as const,
      labelJa: 'equal',
      universe: ['HDV'],
      selectionMode: 'equal' as const,
      slotMode: 'equal' as const,
    };
    const path = simulateRm3000WeightedPath(trades, def);
    expect(path.finalEquityMYR).toBeGreaterThan(3000);
    expect(path.expectedProfitMYR).toBeGreaterThan(0);
  });

  it('equal slot uses base slot pct', () => {
    const def = {
      schemeId: 'equal' as const,
      labelJa: 'equal',
      universe: ['HDV', 'DGRO'],
      selectionMode: 'equal' as const,
      slotMode: 'equal' as const,
    };
    const pct = resolveSlotPctForScheme(
      trade('a', 'HDV', '2020-01-02', '2020-01-02', '2020-01-10', 1),
      [],
      def,
    );
    expect(pct).toBeCloseTo(100 / 3, 1);
  });
});
