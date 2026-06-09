/**
 * npx vitest run tests/unit/forwardValidationOosValidationAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  buildOosPeriodMetrics,
  evaluateOverfit,
  OOS_TRAIN_FROM,
  OOS_TRAIN_TO,
  tradesInSignalRange,
} from '../../src/services/forwardValidation/forwardValidationOosValidationAudit';
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

const emptyBundle = {
  etfBars: { DGRO: [] },
} as unknown as ForwardOhlcvBundle;

describe('forwardValidationOosValidationAudit', () => {
  it('splits trades by signal date range', () => {
    const trades = [mockTrade('2020-03-01', 3), mockTrade('2024-05-01', 3)];
    expect(tradesInSignalRange(trades, OOS_TRAIN_FROM, OOS_TRAIN_TO)).toHaveLength(1);
    expect(tradesInSignalRange(trades, '2023-01-01', '2026-12-31')).toHaveLength(1);
  });

  it('detects no overfit when OOS matches IS', () => {
    const is = buildOosPeriodMetrics(
      'in_sample',
      'IS',
      OOS_TRAIN_FROM,
      OOS_TRAIN_TO,
      [mockTrade('2020-01-01', 3), mockTrade('2021-01-01', 3)],
      emptyBundle,
    );
    const oos = buildOosPeriodMetrics(
      'out_of_sample',
      'OOS',
      '2023-01-01',
      '2026-12-31',
      [
        mockTrade('2025-01-01', 3),
        mockTrade('2025-02-01', 3),
        mockTrade('2025-03-01', 3),
        mockTrade('2025-04-01', 3),
        mockTrade('2025-05-01', 3),
      ],
      emptyBundle,
    );
    const { verdict } = evaluateOverfit(is, oos);
    expect(verdict).toBe('none');
  });

  it('flags clear overfit on large win rate drop', () => {
    const is = buildOosPeriodMetrics(
      'in_sample',
      'IS',
      OOS_TRAIN_FROM,
      OOS_TRAIN_TO,
      Array.from({ length: 10 }, (_, i) => mockTrade(`2020-01-${String(i + 1).padStart(2, '0')}`, 3)),
      emptyBundle,
    );
    const oos = buildOosPeriodMetrics(
      'out_of_sample',
      'OOS',
      '2023-01-01',
      '2026-12-31',
      [
        mockTrade('2025-01-01', 3),
        mockTrade('2025-02-01', -5),
        mockTrade('2025-03-01', -5),
        mockTrade('2025-04-01', -5),
        mockTrade('2025-05-01', 3),
      ],
      emptyBundle,
    );
    const { verdict } = evaluateOverfit(is, oos);
    expect(['suspected', 'clear']).toContain(verdict);
  });
});
