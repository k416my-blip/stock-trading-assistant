import { describe, expect, it } from 'vitest';
import {
  aggregateV4Weights,
  buildDeltaRows,
  buildExecutionPriority,
  buildMaxProfitPlan,
  buildMinTradesPlan,
  buildRiskMinPlan,
  buildDemoHoldingsFromWeights,
  extractMalaysiaHoldings,
  predictPostRebalance,
} from '../../src/services/forwardValidation/forwardValidationMalaysiaV4RebalanceAudit';
import type { PortfolioPosition } from '../../src/types';

const sampleHoldings: PortfolioPosition[] = [
  {
    id: '1',
    symbol: '3336',
    market: 'bursa',
    currency: 'MYR',
    shares: 1000,
    averageBuyPrice: 3,
    currentPrice: 3.2,
    openedAt: '2024-01-01',
  },
  {
    id: '2',
    symbol: '6742',
    market: 'bursa',
    currency: 'MYR',
    shares: 800,
    averageBuyPrice: 2,
    currentPrice: 2.1,
    openedAt: '2024-01-01',
  },
  {
    id: '3',
    symbol: '5347',
    market: 'bursa',
    currency: 'MYR',
    shares: 200,
    averageBuyPrice: 10,
    currentPrice: 10,
    openedAt: '2024-01-01',
  },
];

describe('forwardValidationMalaysiaV4RebalanceAudit', () => {
  it('extractMalaysiaHoldings computes weights', () => {
    const rows = extractMalaysiaHoldings(sampleHoldings);
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => r.isV4Symbol)).toBe(true);
    const sum = rows.reduce((s, r) => s + r.weightPct, 0);
    expect(sum).toBeCloseTo(100, 0);
  });

  it('buildDeltaRows flags overweight IJM/YTL', () => {
    const weights = { '3336': 40, '6742': 35, '5347': 5, '1023': 10, '5398': 10 };
    const deltas = buildDeltaRows({ currentWeights: weights, v4TotalMYR: 100_000 });
    const ijm = deltas.find((d) => d.symbol === '3336')!;
    expect(ijm.action).toBe('sell');
    const tenaga = deltas.find((d) => d.symbol === '5347')!;
    expect(tenaga.action).toBe('buy');
  });

  it('buildMinTradesPlan produces at most two trades', () => {
    const weights = { '3336': 40, '6742': 35, '5347': 5, '1023': 10, '5398': 10 };
    const deltas = buildDeltaRows({ currentWeights: weights, v4TotalMYR: 100_000 });
    const plan = buildMinTradesPlan(deltas);
    expect(plan.tradeCount).toBeLessThanOrEqual(2);
  });

  it('buildRiskMinPlan prioritizes YTL sell', () => {
    const weights = { '3336': 40, '6742': 35, '5347': 5, '1023': 10, '5398': 10 };
    const deltas = buildDeltaRows({ currentWeights: weights, v4TotalMYR: 100_000 });
    const plan = buildRiskMinPlan(deltas);
    expect(plan.trades[0]?.symbol).toBe('6742');
  });

  it('predictPostRebalance improves alignment near target', () => {
    const target = { '5347': 23.3, '1023': 23.3, '5398': 15, '6742': 15, '3336': 23.3 };
    const pred = predictPostRebalance({
      weightsAfter: target,
      baselineCumulativePct: 38.36,
      baselineYtlDepPct: 32.8,
      baselineMcPct: 4.79,
      delistMcAtTarget: 4.79,
    });
    expect(pred.hhi).toBeLessThan(0.22);
    expect(pred.delistMcPct).toBeCloseTo(4.79, 0);
  });

  it('buildExecutionPriority lists YTL first when overweight', () => {
    const weights = { '3336': 40, '6742': 35, '5347': 5, '1023': 10, '5398': 10 };
    const deltas = buildDeltaRows({ currentWeights: weights, v4TotalMYR: 100_000 });
    const prio = buildExecutionPriority(deltas);
    expect(prio[0]).toContain('YTL');
  });

  it('buildDemoHoldingsFromWeights creates positions', () => {
    const h = buildDemoHoldingsFromWeights({ '3336': 50, '5347': 50 }, 10_000);
    expect(h).toHaveLength(2);
    const { weights } = aggregateV4Weights(extractMalaysiaHoldings(h));
    expect(weights['3336']).toBeCloseTo(50, 0);
  });
});
