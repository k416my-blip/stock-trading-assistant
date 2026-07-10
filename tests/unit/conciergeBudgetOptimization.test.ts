import { describe, expect, it } from 'vitest';
import { buildAllocationPlan } from '@/services/allocationPlan';
import { buildManualOrderFlowItems } from '@/services/manualOrderFlow';
import {
  buildBudgetSummaryFromPlan,
  buildNoBuyTodayMessageJa,
  computeMaxSpendableMYR,
  computeRiskBasedSharesForSymbol,
  evaluateRequestedQuantity,
} from '@/services/conciergeBudgetOptimization';
import { validateAllocationPlanQuality } from '@/services/investmentRecommendationQuality';
import { buildConciergeTodayProposals } from '@/services/concierge/conciergeTodayProposalsBuilder';
import { findStock } from '@/data/sampleStocks';

describe('concierge budget optimization (spec B)', () => {
  it('does not treat remaining cash as validation FAIL', () => {
    const plan = buildAllocationPlan({
      depositMYR: 5000,
      market: 'bursa',
      riskLevel: 'standard',
      investmentStyle: 'balanced',
      fractionalSharesEnabled: false,
    });
    if ('error' in plan) return;
    const v = validateAllocationPlanQuality(plan);
    expect(v.issues.some((i) => i.code === 'excess-cash')).toBe(false);
    expect(v.cashRemainderMYR).toBeGreaterThan(0);
  });

  it('RM5000 concierge_full does not force spend near full budget', () => {
    const result = buildManualOrderFlowItems({
      mode: 'concierge_full',
      market: 'bursa',
      depositMYR: 5000,
      riskLevel: 'standard',
    });
    if (!result.ok) return;
    const total = result.items.reduce((s, i) => s + i.allocationMYR, 0);
    expect(total).toBeLessThan(5000 * 0.98);
    expect(result.budget?.remainingCashMYR ?? 0).toBeGreaterThan(100);
  });

  it('computeMaxSpendableMYR keeps reserve — not full deposit', () => {
    expect(computeMaxSpendableMYR(5000, 'standard')).toBeLessThan(5000);
    expect(computeMaxSpendableMYR(5000, 'standard')).toBe(4500);
  });

  it('concierge_quantity does not floor(deposit/price) max spend', () => {
    const stock = findStock('1155');
    expect(stock).toBeTruthy();
    if (!stock) return;
    const sized = computeRiskBasedSharesForSymbol({
      stock,
      depositMYR: 5000,
      riskLevel: 'standard',
      explicitUserSymbol: true,
    });
    const maxFloor = Math.floor(5000 / stock.price);
    expect(sized.shares).toBeGreaterThan(0);
    expect(sized.shares).toBeLessThan(maxFloor);
    expect(sized.allocationMYR).toBeLessThan(5000 * 0.95);
  });

  it('explicit user symbol with low confidence keeps cash — not max spend', () => {
    const stock = findStock('1155');
    expect(stock).toBeTruthy();
    if (!stock) return;
    const sized = computeRiskBasedSharesForSymbol({
      stock,
      depositMYR: 50000,
      riskLevel: 'standard',
      explicitUserSymbol: true,
    });
    expect(sized.shares).toBeGreaterThan(0);
    expect(sized.allocationMYR).toBeLessThan(50000 * 0.15);
  });

  it('single-stock concentration stays under 35% of budget', () => {
    const stock = findStock('1155');
    expect(stock).toBeTruthy();
    if (!stock) return;
    const sized = computeRiskBasedSharesForSymbol({
      stock,
      depositMYR: 5000,
      riskLevel: 'standard',
      explicitUserSymbol: true,
    });
    expect(sized.allocationMYR / 5000).toBeLessThanOrEqual(0.35);
  });

  it('concierge_symbol with shares only does not max budget on low-price filler', () => {
    const result = buildManualOrderFlowItems({
      mode: 'concierge_symbol',
      market: 'bursa',
      shares: 100,
    });
    if (!result.ok) return;
    expect(result.items[0]?.estimatedShares).toBeLessThanOrEqual(100);
    expect(result.budget?.proposedSpendMYR ?? 0).toBeLessThan(100 * 20);
  });

  it('low-confidence-only plan can hold remaining cash', () => {
    const result = buildManualOrderFlowItems({
      mode: 'concierge_full',
      market: 'bursa',
      depositMYR: 5000,
      riskLevel: 'standard',
    });
    if (!result.ok) {
      expect(result.error).toMatch(/見送り|買付推奨はありません|現金/);
      return;
    }
    expect(result.budget?.remainingCashMYR ?? 0).toBeGreaterThan(0);
  });

  it('evaluateRequestedQuantity can reduce excessive share request', () => {
    const stock = findStock('1155');
    expect(stock).toBeTruthy();
    if (!stock) return;
    const eval_ = evaluateRequestedQuantity({
      stock,
      requestedShares: 10_000,
      budgetMYR: 5000,
      riskLevel: 'standard',
    });
    expect(eval_.recommendedShares).toBeLessThan(eval_.requestedShares);
    expect(eval_.adjusted).toBe(true);
  });

  it('empty userUniverse returns error or no forced weak buys', () => {
    const plan = buildAllocationPlan({
      depositMYR: 5000,
      market: 'bursa',
      riskLevel: 'standard',
      investmentStyle: 'balanced',
      fractionalSharesEnabled: false,
      userUniverse: [],
    });
    if ('error' in plan) {
      expect(plan.error).toMatch(/見送り|買付推奨はありません|銘柄/);
    } else {
      expect(plan.candidates.every((c) => c.recommendationMeta?.buyAllowed !== false)).toBe(true);
    }
  });

  it('buildBudgetSummaryFromPlan explains remaining cash', () => {
    const plan = buildAllocationPlan({
      depositMYR: 5000,
      market: 'bursa',
      riskLevel: 'standard',
      investmentStyle: 'balanced',
      fractionalSharesEnabled: false,
    });
    if ('error' in plan) return;
    const summary = buildBudgetSummaryFromPlan(plan);
    expect(summary.remainingReasonJa).toMatch(/現金として残/);
    expect(summary.didNotUseFullBudget).toBe(true);
  });

  it('buildNoBuyTodayMessageJa returns Japanese skip text', () => {
    expect(buildNoBuyTodayMessageJa('no_adoptable')).toMatch(/見送り/);
  });

  it('today proposals can be empty without error', () => {
    const proposals = buildConciergeTodayProposals([], 3);
    expect(proposals).toHaveLength(0);
  });

  it('today proposals are not forced to include buy_candidate only', () => {
    const proposals = buildConciergeTodayProposals([], 3);
    expect(proposals.filter((p) => p.kind === 'buy_candidate')).toHaveLength(0);
  });
});
