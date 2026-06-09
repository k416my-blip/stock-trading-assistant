/**
 * npx vitest run tests/unit/forwardValidationMonteCarloAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  buildDdBuckets,
  mulberry32,
  percentile,
  shuffleInPlace,
  simulateMonteCarloPath,
} from '../../src/services/forwardValidation/forwardValidationMonteCarloAudit';
import type { ForwardPassedTradeRecord } from '../../src/types/forwardValidation';

function trade(returnPct: number, holdDays = 5): ForwardPassedTradeRecord {
  return {
    id: `t_${returnPct}`,
    symbol: 'HDV' as ForwardPassedTradeRecord['symbol'],
    signalDate: '2020-01-01',
    entryDate: '2020-01-02',
    exitDate: '2020-01-10',
    entryPrice: 100,
    exitPrice: 100 + returnPct,
    returnPct,
    holdDays,
    exitReason: 'take_profit',
    adx14: 25,
    macdHistPct: 0.2,
    dist52wPct: -3,
    bucket: 'deep',
    spyRegime: 'down',
  };
}

describe('forwardValidationMonteCarloAudit', () => {
  it('order affects path metrics', () => {
    const winsFirst = simulateMonteCarloPath(
      [trade(4), trade(4), trade(-8)],
      ['HDV', 'DGRO', 'QQQ', 'SCHD'],
      1,
    );
    const lossFirst = simulateMonteCarloPath(
      [trade(-8), trade(4), trade(4)],
      ['HDV', 'DGRO', 'QQQ', 'SCHD'],
      1,
    );
    expect(winsFirst.cumulativeReturnPct).not.toBe(lossFirst.cumulativeReturnPct);
  });

  it('computes percentiles', () => {
    const sorted = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(percentile(sorted, 50)).toBe(5.5);
    expect(percentile(sorted, 2.5)).toBeLessThan(percentile(sorted, 97.5));
  });

  it('shuffles deterministically with seed', () => {
    const items = [1, 2, 3, 4, 5];
    const a = shuffleInPlace([...items], mulberry32(42));
    const b = shuffleInPlace([...items], mulberry32(42));
    expect(a).toEqual(b);
  });

  it('builds dd buckets', () => {
    const buckets = buildDdBuckets([-3, -8, -15, -25]);
    expect(buckets.reduce((s, b) => s + b.count, 0)).toBe(4);
  });
});
