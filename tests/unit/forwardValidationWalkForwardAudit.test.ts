/**
 * npx vitest run tests/unit/forwardValidationWalkForwardAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  buildWalkForwardFold,
  degradationPct,
  evaluateWalkForwardOverfit,
  WALK_FORWARD_FOLDS,
} from '../../src/services/forwardValidation/forwardValidationWalkForwardAudit';
import type { ForwardPassedTradeRecord } from '../../src/types/forwardValidation';
import type { ForwardOhlcvBundle } from '../../src/services/forwardValidation/forwardValidationEngine';

function mockTrade(signalDate: string, returnPct: number): ForwardPassedTradeRecord {
  return {
    id: signalDate,
    symbol: 'DGRO',
    signalDate,
    entryDate: signalDate,
    exitDate: signalDate,
    entryPrice: 25,
    exitPrice: 25 * (1 + returnPct / 100),
    returnPct,
    holdDays: 5,
    exitReason: returnPct > 0 ? 'take_profit' : 'max_hold',
    adx14: 30,
    macdHistPct: 0.3,
    dist52wPct: -8,
    bucket: 'down',
    spyRegime: 'down',
  };
}

const emptyBundle = { etfBars: { DGRO: [] } } as unknown as ForwardOhlcvBundle;

describe('forwardValidationWalkForwardAudit', () => {
  it('computes degradation rate', () => {
    expect(degradationPct(90, 81)).toBe(10);
    expect(degradationPct(3, 3)).toBe(0);
  });

  it('builds fold with train and test split', () => {
    const trades = [
      mockTrade('2020-03-01', 3),
      mockTrade('2022-06-01', 3),
      mockTrade('2025-04-01', 3),
    ];
    const fold = buildWalkForwardFold(WALK_FORWARD_FOLDS[4]!, trades, emptyBundle, '2026-06-03');
    expect(fold.train.tradeCount).toBeGreaterThan(0);
    expect(fold.test.tradeCount).toBe(1);
  });

  it('evaluates no overfit when degradation is low', () => {
    const folds = [
      {
        foldId: 1,
        trainFrom: '2018-01-01',
        trainTo: '2020-12-31',
        testYear: '2021',
        train: { winRatePct: 90, avgReturnPct: 2.5, cumulativeReturnPct: 50, tradeCount: 10 } as never,
        test: { winRatePct: 88, avgReturnPct: 2.4, cumulativeReturnPct: 6, tradeCount: 2 } as never,
        winRateDegradationPct: 2.222,
        avgReturnDegradationPct: 4,
        cumulativeDegradationPct: null,
      },
    ];
    const { verdict } = evaluateWalkForwardOverfit({
      folds,
      avgWinRateDegradationPct: 2.222,
      avgReturnDegradationPct: 4,
    });
    expect(verdict).toBe('none');
  });
});
