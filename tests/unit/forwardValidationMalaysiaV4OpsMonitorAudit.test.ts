import { describe, expect, it } from 'vitest';
import {
  assessOpsRiskLevel,
  buildAllocationComparison,
  computeConcentration,
  computeHhi,
  MALAYSIA_V4_TARGET_WEIGHTS,
  resolveYtlWarningLevel,
} from '../../src/services/forwardValidation/forwardValidationMalaysiaV4OpsMonitorAudit';
import type { ForwardMalaysiaV4OpsSymbolSnapshot } from '../../types/forwardValidation';

describe('forwardValidationMalaysiaV4OpsMonitorAudit', () => {
  it('target weights sum to 100', () => {
    const sum = Object.values(MALAYSIA_V4_TARGET_WEIGHTS).reduce((s, v) => s + v, 0);
    expect(sum).toBeCloseTo(100, 0);
  });

  it('resolveYtlWarningLevel escalates at thresholds', () => {
    expect(resolveYtlWarningLevel(34).level).toBe('none');
    expect(resolveYtlWarningLevel(35).level).toBe('warn35');
    expect(resolveYtlWarningLevel(50).level).toBe('warn50');
  });

  it('computeHhi returns 1 for single 100% weight', () => {
    expect(computeHhi([100])).toBe(1);
  });

  it('assessOpsRiskLevel returns green for low dependency', () => {
    expect(assessOpsRiskLevel({ ytlDependencyPct: 30, hhi: 0.2, top1Pct: 30 }).level).toBe('green');
  });

  it('buildAllocationComparison flags buy/sell beyond tolerance', () => {
    const { sellCandidates, buyCandidates } = buildAllocationComparison({
      currentWeights: { '5347': 30, '1023': 10, '5398': 15, '6742': 15, '3336': 30 },
      sourceLabelJa: 'test',
    });
    expect(sellCandidates).toContain('TENAGA');
    expect(buyCandidates).toContain('CIMB');
  });

  it('computeConcentration ranks top contributors', () => {
    const snaps: ForwardMalaysiaV4OpsSymbolSnapshot[] = [
      {
        symbol: '6742',
        symbolNameJa: 'YTL',
        profitContributionPct: 40,
        winRatePct: 80,
        profitFactor: 2,
        maxDrawdownPct: -5,
        cumulativePnlMYR: 1000,
        tradeCount: 10,
      },
      {
        symbol: '3336',
        symbolNameJa: 'IJM',
        profitContributionPct: 30,
        winRatePct: 70,
        profitFactor: 1.5,
        maxDrawdownPct: -4,
        cumulativePnlMYR: 800,
        tradeCount: 8,
      },
    ];
    const c = computeConcentration(snaps);
    expect(c.top1ProfitContributionPct).toBe(40);
    expect(c.hhi).toBeGreaterThan(0);
  });
});
