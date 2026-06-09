import { describe, expect, it } from 'vitest';
import {
  computeCalendar7030Split,
  gradeWf7030Oos,
  judgeWf7030Overfit,
} from '../../src/services/forwardValidation/forwardValidationWf7030OosAudit';
import type { ForwardWalkForward31PhaseMetrics } from '../../types/forwardValidation';

function phase(
  cumulative: number,
  wr = 90,
  trades = 10,
  pf = 2,
): ForwardWalkForward31PhaseMetrics {
  return {
    labelJa: 'x',
    fromDate: '2018-01-01',
    toDate: '2020-12-31',
    tradeCount: trades,
    winRatePct: wr,
    avgReturnPct: 3,
    profitFactor: pf,
    sharpe: 1.5,
    maxDrawdownPct: -5,
    cumulativeReturnPct: cumulative,
    mar: 1,
  };
}

describe('forwardValidationWf7030OosAudit', () => {
  it('computeCalendar7030Split divides timeline 70/30', () => {
    const split = computeCalendar7030Split('2018-01-01', '2026-06-04');
    expect(split.trainPct).toBe(70);
    expect(split.testPct).toBe(30);
    expect(split.trainFrom).toBe('2018-01-01');
    expect(split.testTo).toBe('2026-06-04');
    expect(split.trainTo < split.testFrom).toBe(true);
  });

  it('gradeWf7030Oos returns A for strong OOS', () => {
    const { grade } = gradeWf7030Oos({
      train: phase(40),
      test: phase(15, 85, 5, 1.5),
      cumulativeDegradationPct: 25,
    });
    expect(grade).toBe('A');
  });

  it('judgeWf7030Overfit flags negative OOS', () => {
    const verdict = judgeWf7030Overfit({
      train: phase(30),
      test: phase(-5, 60, 4),
      cumulativeDegradationPct: 120,
    });
    expect(verdict).toContain('過学習');
  });

  it('gradeWf7030Oos returns D for negative OOS', () => {
    const { grade } = gradeWf7030Oos({
      train: phase(30),
      test: phase(-10, 50, 4, 0.5),
      cumulativeDegradationPct: 130,
    });
    expect(grade).toBe('D');
  });
});
