import { describe, expect, it } from 'vitest';
import {
  BOOTSTRAP_MC_66_RUNS,
  computeCalendarTrainTestSplit,
  gradeMalaysiaV2Durability,
  MALAYSIA_V2_OPERATIONAL_SYMBOLS,
  recommendOperationalLot,
} from '../../src/services/forwardValidation/forwardValidationMalaysiaV2DurabilityAudit';

const metrics = (cumulative: number, wr = 80) => ({
  tradeCount: 20,
  cumulativeReturnPct: cumulative,
  cumulativeWithDividendPct: cumulative + 2,
  winRatePct: wr,
  profitFactor: 2,
  sharpe: 1.5,
  maxDrawdownPct: -10,
  cagr: 8,
});

describe('forwardValidationMalaysiaV2DurabilityAudit', () => {
  it('MALAYSIA_V2_OPERATIONAL_SYMBOLS is TENAGA/GAMUDA', () => {
    expect(MALAYSIA_V2_OPERATIONAL_SYMBOLS).toEqual(['5347', '5398']);
  });

  it('BOOTSTRAP_MC_66_RUNS is 10000', () => {
    expect(BOOTSTRAP_MC_66_RUNS).toBe(10_000);
  });

  it('computeCalendarTrainTestSplit divides 60/40', () => {
    const split = computeCalendarTrainTestSplit('2018-01-01', '2026-06-04', 60);
    expect(split.trainPct).toBe(60);
    expect(split.testPct).toBe(40);
    expect(split.trainTo < split.testFrom).toBe(true);
  });

  it('gradeMalaysiaV2Durability returns A for strong durability', () => {
    const { grade } = gradeMalaysiaV2Durability({
      v2Metrics: metrics(120),
      v2Bootstrap: {
        runs: 10000,
        bankruptcyRatePct: 0,
        meanCumulativePct: 30,
        medianCumulativePct: 28,
        p5CumulativePct: 10,
        p1CumulativePct: 5,
        worstCumulativePct: 2,
        worstMaxDrawdownPct: -12,
      },
      wf6040: {
        trainPct: 60,
        testPct: 40,
        train: metrics(80),
        test: metrics(15),
        cumulativeDegradationPct: 30,
        overfitVerdictJa: 'ok',
      },
      wf8020: {
        trainPct: 80,
        testPct: 20,
        train: metrics(100),
        test: metrics(10),
        cumulativeDegradationPct: 40,
        overfitVerdictJa: 'ok',
      },
      covidPhase: metrics(5),
      worstCaseRm3000: { cumulativeReturnPct: 3 },
    });
    expect(grade).toBe('A');
  });

  it('recommendOperationalLot returns 700 when bootstrap is safe', () => {
    expect(
      recommendOperationalLot({
        bootstrap: {
          runs: 10000,
          bankruptcyRatePct: 0,
          meanCumulativePct: 30,
          medianCumulativePct: 28,
          p5CumulativePct: 12,
          p1CumulativePct: 5,
          worstCumulativePct: 2,
          worstMaxDrawdownPct: -10,
        },
        maxDrawdownPct: -8,
      }),
    ).toBe(700);
  });
});
