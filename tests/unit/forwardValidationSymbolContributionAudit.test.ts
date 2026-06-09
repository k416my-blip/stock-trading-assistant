/**
 * npx vitest run tests/unit/forwardValidationSymbolContributionAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  buildPairwiseSymbolCorrelations,
  buildSymbolMetricsFromTrades,
  combinations,
} from '../../src/services/forwardValidation/forwardValidationSymbolContributionAudit';
import type { ForwardPassedTradeRecord } from '../../src/types/forwardValidation';

function trade(
  id: string,
  symbol: string,
  signal: string,
  exit: string,
  ret: number,
): ForwardPassedTradeRecord {
  return {
    id,
    symbol: symbol as ForwardPassedTradeRecord['symbol'],
    signalDate: signal,
    entryDate: signal,
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

describe('forwardValidationSymbolContributionAudit', () => {
  it('builds per-symbol metrics and contribution shares', () => {
    const trades = [
      trade('a', 'HDV', '2020-01-02', '2020-01-10', 4),
      trade('b', 'DGRO', '2020-02-02', '2020-02-10', 2),
      trade('c', 'HDV', '2020-03-02', '2020-03-10', -1),
    ];
    const rows = buildSymbolMetricsFromTrades(
      trades,
      ['HDV', 'DGRO', 'SCHD', 'QQQ'],
      '2020-01-01',
      '2020-12-31',
    );
    const hdv = rows.find((r) => r.symbol === 'HDV')!;
    const dgro = rows.find((r) => r.symbol === 'DGRO')!;
    expect(hdv.tradeCount).toBe(2);
    expect(dgro.tradeCount).toBe(1);
    expect(hdv.contributionPct + dgro.contributionPct).toBeCloseTo(100, 1);
  });

  it('computes pairwise correlation on overlapping months', () => {
    const trades = [
      trade('a', 'HDV', '2020-01-02', '2020-01-10', 4),
      trade('b', 'DGRO', '2020-01-05', '2020-01-12', 2),
      trade('c', 'HDV', '2020-02-02', '2020-02-10', 3),
      trade('d', 'DGRO', '2020-02-05', '2020-02-12', 1),
    ];
    const rows = buildPairwiseSymbolCorrelations(trades, ['HDV', 'DGRO']);
    expect(rows.length).toBe(1);
    expect(rows[0]!.overlapMonths).toBe(2);
    expect(rows[0]!.correlation).not.toBeNull();
  });

  it('generates 2/3/4 symbol combinations', () => {
    const c2 = combinations(['HDV', 'DGRO', 'SCHD', 'QQQ'], 2);
    const c3 = combinations(['HDV', 'DGRO', 'SCHD', 'QQQ'], 3);
    expect(c2.length).toBe(6);
    expect(c3.length).toBe(4);
  });
});
