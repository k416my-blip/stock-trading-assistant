import { describe, expect, it } from 'vitest';
import {
  gradeOverfitAdoption,
  shouldSkipCoreDangerCandidate,
  OVERFIT_PERIOD_DEFS,
} from '../../src/services/forwardValidation/forwardValidationOverfitAudit';
import { matchesCoreDanger } from '../../src/services/forwardValidation/forwardValidationReproducibilityAudit';
import type { EnrichedSidewaysTrade } from '../../src/services/forwardValidation/forwardValidationSpySidewaysValidityAudit';

function trade(partial: Partial<EnrichedSidewaysTrade>): EnrichedSidewaysTrade {
  return {
    signalDate: '2022-02-03',
    entryDate: '2022-02-04',
    exitDate: '2022-03-01',
    symbol: 'QQQ',
    returnPct: -11.128,
    adx14: 25,
    macdHistPct: 0.5,
    dist52wPct: -5,
    bucket: 'down',
    spyRegime: 'down',
    vixAtSignal: 24.35,
    spy63Pct: -5,
    holdDays: 25,
    exitReason: 'max_hold',
    ...partial,
  } as EnrichedSidewaysTrade;
}

describe('forwardValidationOverfitAudit', () => {
  it('shouldSkipCoreDangerCandidate matches core danger', () => {
    expect(shouldSkipCoreDangerCandidate(trade({ vixAtSignal: 24.35 }))).toBe(true);
    expect(shouldSkipCoreDangerCandidate(trade({ vixAtSignal: 27.5 }))).toBe(false);
    expect(matchesCoreDanger(trade({ vixAtSignal: 24.35 }))).toBe(true);
  });

  it('gradeOverfitAdoption rejects small sample', () => {
    const periodRows = OVERFIT_PERIOD_DEFS.map((def) => ({
      periodId: def.periodId,
      periodLabelJa: def.labelJa,
      fromDate: def.from,
      toDate: def.to,
      current: {
        ruleId: 'current' as const,
        labelJa: '現行',
        tradeCount: 10,
        winRatePct: 80,
        profitFactor: 2,
        sharpe: 1,
        maxDrawdownPct: -10,
        cumulativeReturnPct: 20,
        coreSkipCount: 0,
        coreHitCount: def.periodId === 'b_2021_2023' ? 2 : 0,
      },
      candidate: {
        ruleId: 'candidate' as const,
        labelJa: '候補',
        tradeCount: 10,
        winRatePct: 85,
        profitFactor: 2.5,
        sharpe: 1.2,
        maxDrawdownPct: -8,
        cumulativeReturnPct: def.periodId === 'b_2021_2023' ? 25 : 20,
        coreSkipCount: 0,
        coreHitCount: 0,
      },
      deltaCumulativePt: def.periodId === 'b_2021_2023' ? 5 : 0,
      deltaMaxDrawdownPt: 0,
      deltaSharpe: null,
      candidateBetter: def.periodId === 'b_2021_2023',
    }));

    const { grade } = gradeOverfitAdoption({
      coreExecutedCount: 2,
      bootstrap: {
        runs: 1000,
        candidateWinRatePct: 60,
        meanDeltaCumulativePt: 2,
        medianDeltaCumulativePt: 1,
        ci95LowDeltaPt: -1,
        ci95HighDeltaPt: 5,
        pValuePct: 40,
      },
      periodRows: [
        ...periodRows,
        {
          periodId: 'full',
          periodLabelJa: '全期間',
          fromDate: '2018-01-01',
          toDate: '2026-06-04',
          current: periodRows[0]!.current,
          candidate: periodRows[0]!.candidate,
          deltaCumulativePt: 5,
          deltaMaxDrawdownPt: 2,
          deltaSharpe: 0.2,
          candidateBetter: true,
        },
      ],
    });
    expect(grade).toBe('C');
  });
});
