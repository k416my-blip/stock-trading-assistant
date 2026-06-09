import { describe, expect, it } from 'vitest';
import {
  buildMonthlyOutcomeLabelJa,
  buildTrustMonthlyReportReasonJa,
  computePortfolioMonthlyReturnPct,
  formatTrustReturnPct,
  getPreviousYearMonth,
  resolveMonthlyOutcome,
  toTrustMonthlyPerformanceDisplay,
} from '../../src/services/trustMonthlyPerformanceReport';
import type { AllocationPlan } from '../../src/types';

function minimalPlan(overrides: Partial<AllocationPlan> = {}): AllocationPlan {
  return {
    depositMYR: 1000,
    market: 'bursa',
    riskLevel: 'standard',
    investmentStyle: 'balanced',
    fractionalSharesEnabled: false,
    cashReserveMYR: 100,
    cashReservePct: 10,
    investableMYR: 900,
    candidates: [
      {
        symbol: 'NVDA',
        name: 'NVIDIA',
        market: 'us',
        currency: 'USD',
        category: 'growth',
        categoryLabel: '成長株',
        allocationMYR: 500,
        allocationPct: 50,
        estimatedShares: 1,
        isFractionalShares: false,
        entryPrice: 100,
        stopLoss: 90,
        takeProfit: 120,
        selectionReason: '半導体関連で成長が期待できる',
        beginnerNote: '',
        recommendationMeta: {
          charterApprovalReasonsJa: ['半導体セクターが好調'],
        } as AllocationPlan['candidates'][0]['recommendationMeta'],
      },
    ],
    ...overrides,
  };
}

describe('trustMonthlyPerformanceReport', () => {
  it('formats signed percent labels', () => {
    expect(formatTrustReturnPct(3.24)).toBe('+3.2%');
    expect(formatTrustReturnPct(-1.14)).toBe('-1.1%');
    expect(formatTrustReturnPct(0)).toBe('0%');
  });

  it('computes monthly portfolio return from history', () => {
    const yearMonth = getPreviousYearMonth(new Date('2026-06-15'));
    const history = [
      { date: `${yearMonth}-01`, portfolioValueMYR: 10_000 },
      { date: `${yearMonth}-28`, portfolioValueMYR: 10_320 },
    ];
    const ret = computePortfolioMonthlyReturnPct(history, yearMonth);
    expect(ret).not.toBeNull();
    expect(ret!).toBeCloseTo(3.2, 1);
  });

  it('resolves beat/lag/match outcomes', () => {
    expect(resolveMonthlyOutcome(3.2, 1.4)).toBe('beat');
    expect(resolveMonthlyOutcome(1.0, 1.4)).toBe('lag');
    expect(resolveMonthlyOutcome(1.5, 1.4)).toBe('match');
  });

  it('builds simple Japanese outcome labels', () => {
    expect(buildMonthlyOutcomeLabelJa('beat')).toBe('市場平均を上回りました');
    expect(buildMonthlyOutcomeLabelJa('lag')).toBe('市場平均を下回りました');
    expect(buildMonthlyOutcomeLabelJa('match')).toBe('市場平均とほぼ同じでした');
  });

  it('builds semiconductor reason without jargon', () => {
    const reason = buildTrustMonthlyReportReasonJa(minimalPlan(), 'beat');
    expect(reason).toContain('半導体');
    expect(reason).not.toMatch(/RSI|PER|委員会|decisionHash/i);
  });

  it('shows pending display when no record exists', () => {
    const display = toTrustMonthlyPerformanceDisplay(null, '2026-05');
    expect(display.ready).toBe(false);
    expect(display.outcomeLabelJa).toBe('まだ結果がありません');
    expect(display.portfolioReturnLabel).toBe('集計中');
  });
});
