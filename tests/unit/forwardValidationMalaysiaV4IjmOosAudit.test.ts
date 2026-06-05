import { describe, expect, it } from 'vitest';
import {
  buildIjmPhaseEvals,
  buildIjmYearlyRows,
  detectOosCollapse,
  gradeIjmOosAdoption,
  toIjmTradeRows,
} from '../../src/services/forwardValidation/forwardValidationMalaysiaV4IjmOosAudit';

describe('forwardValidationMalaysiaV4IjmOosAudit', () => {
  const sampleLedger = [
    {
      id: 'a',
      symbol: '3336',
      phase: 'phase4' as const,
      signalDate: '2024-01-01',
      entryDate: '2024-01-02',
      exitDate: '2024-06-01',
      notionalMYR: 1000,
      weightPct: 20,
      returnPct: 4,
      pnlMYR: 40,
      equityAfterMYR: 3040,
    },
    {
      id: 'b',
      symbol: '3336',
      phase: 'phase4' as const,
      signalDate: '2025-01-01',
      entryDate: '2025-01-02',
      exitDate: '2025-06-01',
      notionalMYR: 1000,
      weightPct: 20,
      returnPct: -2,
      pnlMYR: -20,
      equityAfterMYR: 3020,
    },
  ];

  it('toIjmTradeRows marks OOS by exit date', () => {
    const rows = toIjmTradeRows(sampleLedger, '2025-01-01');
    expect(rows).toHaveLength(2);
    expect(rows[0]!.isOos).toBe(false);
    expect(rows[1]!.isOos).toBe(true);
  });

  it('buildIjmYearlyRows groups by year', () => {
    const rows = toIjmTradeRows(sampleLedger, '2025-01-01');
    const yearly = buildIjmYearlyRows(rows);
    expect(yearly).toHaveLength(2);
  });

  it('buildIjmPhaseEvals separates phase1 and phase2', () => {
    const rows = toIjmTradeRows(sampleLedger, '2025-01-01');
    const phases = buildIjmPhaseEvals(rows);
    expect(phases.find((p) => p.phaseId === 'phase2')!.tradeCount).toBe(2);
    expect(phases.find((p) => p.phaseId === 'phase1')!.tradeCount).toBe(0);
  });

  it('detectOosCollapse flags severe OOS loss', () => {
    expect(
      detectOosCollapse({
        oosTradeCount: 4,
        oosTotalPnlMYR: -3000,
        oosWinRatePct: 25,
        oosProfitFactor: 0.5,
        inSampleTotalPnlMYR: 20000,
      }),
    ).toBe(true);
  });

  it('gradeIjmOosAdoption returns A when OOS sample tiny and full period strong', () => {
    const { grade } = gradeIjmOosAdoption({
      oosCollapsed: false,
      oosTotalPnlMYR: -2000,
      oosProfitFactor: 0.6,
      oosExpectancyMYR: -500,
      fullTotalPnlMYR: 24000,
      fullProfitFactor: 1.5,
      mcBankruptcyPct: 4.4,
      oosTradeCount: 4,
    });
    expect(grade).toBe('A');
  });

  it('gradeIjmOosAdoption returns B when OOS sample large and weak', () => {
    const { grade } = gradeIjmOosAdoption({
      oosCollapsed: false,
      oosTotalPnlMYR: -5000,
      oosProfitFactor: 0.7,
      oosExpectancyMYR: -200,
      fullTotalPnlMYR: 18000,
      fullProfitFactor: 1.3,
      mcBankruptcyPct: 12,
      oosTradeCount: 15,
    });
    expect(grade).toBe('B');
  });
});
