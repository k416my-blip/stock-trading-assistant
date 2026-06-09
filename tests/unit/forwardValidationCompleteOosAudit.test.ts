import { describe, expect, it } from 'vitest';
import {
  computeCompleteOosTrustScore,
  gradeCompleteOos,
} from '../../src/services/forwardValidation/forwardValidationCompleteOosAudit';
import type {
  ForwardCompleteOosSplitRow,
  ForwardCompleteOosYearRow,
  ForwardWalkForward31FoldRow,
  ForwardWalkForward31PhaseMetrics,
} from '../../src/types/forwardValidation';

function phase(cumulative: number, wr = 90, trades = 5): ForwardWalkForward31PhaseMetrics {
  return {
    labelJa: 'test',
    fromDate: '2024-01-01',
    toDate: '2024-12-31',
    tradeCount: trades,
    winRatePct: wr,
    avgReturnPct: 3,
    profitFactor: 4,
    sharpe: 2,
    maxDrawdownPct: -5,
    cumulativeReturnPct: cumulative,
    mar: 1,
  };
}

function split(testCum: number): ForwardCompleteOosSplitRow {
  return {
    splitId: 'holdout_a',
    labelJa: 'test',
    trainFrom: '2018-01-01',
    trainTo: '2023-12-31',
    testFrom: '2024-01-01',
    testTo: '2026-06-04',
    train: phase(30),
    test: phase(testCum),
  };
}

function fold(testYear: string, testCum: number, collapsed = false): ForwardWalkForward31FoldRow {
  return {
    foldId: 1,
    trainFrom: '2018-01-01',
    trainTo: '2020-12-31',
    testYear,
    testFrom: `${testYear}-01-01`,
    testTo: `${testYear}-12-31`,
    train: phase(20),
    test: phase(testCum),
    winRateDegradationPct: 2,
    avgReturnDegradationPct: 2,
    cumulativeDegradationPct: 5,
    collapsed,
  };
}

describe('forwardValidationCompleteOosAudit', () => {
  it('computeCompleteOosTrustScore returns high score for positive OOS', () => {
    const splitRows = [split(12), { ...split(8), splitId: 'holdout_b' }];
    const foldRows = [fold('2024', 10), fold('2025', 6)];
    const yearRows: ForwardCompleteOosYearRow[] = [
      {
        year: '2024',
        fromDate: '2024-01-01',
        toDate: '2024-12-31',
        tradeCount: 5,
        winRatePct: 90,
        profitFactor: 4,
        sharpe: 2,
        maxDrawdownPct: -4,
        cumulativeReturnPct: 10,
      },
    ];
    const score = computeCompleteOosTrustScore({
      splitRows,
      foldRows,
      yearRows,
      aggregateOosTest: phase(18, 90, 25),
    });
    expect(score).toBeGreaterThanOrEqual(70);
  });

  it('gradeCompleteOos returns A for strong OOS', () => {
    const splitRows = [split(12), { ...split(10), splitId: 'holdout_b' }];
    const foldRows = [fold('2021', 8), fold('2022', 6), fold('2023', 10), fold('2024', 12)];
    const { grade } = gradeCompleteOos({
      splitRows,
      foldRows,
      aggregateOosTest: phase(20, 88),
      trustScore: 80,
      year2026: null,
    });
    expect(grade).toBe('A');
  });

  it('gradeCompleteOos returns D when holdout negative', () => {
    const splitRows = [split(-5), { ...split(3), splitId: 'holdout_b' }];
    const { grade } = gradeCompleteOos({
      splitRows,
      foldRows: [fold('2024', -3, true)],
      aggregateOosTest: phase(-2, 60),
      trustScore: 30,
      year2026: null,
    });
    expect(grade).toBe('D');
  });
});
