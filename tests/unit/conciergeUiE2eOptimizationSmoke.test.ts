/**
 * AIコンシェルジュ予算・数量最適化 — UI/E2E smoke（サービス層 + 表示契約）
 */
import { describe, expect, it } from 'vitest';
import { buildManualOrderFlowItems } from '@/services/manualOrderFlow';
import { buildAllocationPlan } from '@/services/allocationPlan';
import {
  buildBudgetSummaryFromPlan,
  buildNoBuyTodayMessageJa,
  evaluateRequestedQuantity,
} from '@/services/conciergeBudgetOptimization';
import { buildConciergeTodayProposals } from '@/services/concierge/conciergeTodayProposalsBuilder';
import { validateAllocationPlanQuality } from '@/services/investmentRecommendationQuality';
import { findStock } from '@/data/sampleStocks';
import jaConcierge from '@/i18n/resources/ja/concierge.json';

function expectBudgetBSpec(budget: {
  budgetMYR: number;
  proposedSpendMYR: number;
  remainingCashMYR: number;
  remainingReasonJa: string;
}) {
  expect(budget.proposedSpendMYR).toBeLessThanOrEqual(budget.budgetMYR);
  expect(budget.remainingCashMYR).toBeGreaterThanOrEqual(0);
  expect(budget.remainingReasonJa.length).toBeGreaterThan(0);
}

describe('concierge UI/E2E optimization smoke', () => {
  it('RM5000 concierge_full — remaining cash allowed, not near-full spend', () => {
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
    expect(result.budget).toBeTruthy();
    if (!result.budget) return;
    expectBudgetBSpec(result.budget);
    expect(result.budget.proposedSpendMYR).toBeLessThan(5000 * 0.98);
    expect(result.budget.remainingCashMYR).toBeGreaterThan(0);
    const plan = buildAllocationPlan({
      depositMYR: 5000,
      market: 'bursa',
      riskLevel: 'standard',
      investmentStyle: 'balanced',
      fractionalSharesEnabled: false,
    });
    if (!('error' in plan)) {
      const v = validateAllocationPlanQuality(plan);
      expect(v.issues.some((i) => i.code === 'excess-cash')).toBe(false);
    }
  });

  it('concierge_quantity 1155 RM5000 — budget summary fields for UI card', () => {
    const result = buildManualOrderFlowItems({
      mode: 'concierge_quantity',
      market: 'bursa',
      symbol: '1155',
      depositMYR: 5000,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.budget).toBeTruthy();
    if (!result.budget) return;
    expectBudgetBSpec(result.budget);
    expect(result.budget.remainingReasonJa).toMatch(/現金として残|リスク/);
    expect(result.budget.riskJudgmentJa.length).toBeGreaterThan(0);
    expect(result.budget.concentrationJa).toMatch(/%/);
  });

  it('concierge_symbol amount RM5000 — risk-based single pick with budget summary', () => {
    const result = buildManualOrderFlowItems({
      mode: 'concierge_symbol',
      market: 'bursa',
      depositMYR: 5000,
    });
    if (!result.ok) {
      expect(result.error).toMatch(/見送り|買付推奨|信頼度/);
      return;
    }
    expect(result.items).toHaveLength(1);
    expect(result.budget).toBeTruthy();
    if (!result.budget) return;
    expectBudgetBSpec(result.budget);
    expect(result.items[0]!.estimatedShares).toBeGreaterThan(0);
  });

  it('concierge_symbol shares 100 — can reduce or pass with reason', () => {
    const result = buildManualOrderFlowItems({
      mode: 'concierge_symbol',
      market: 'bursa',
      shares: 100,
    });
    if (result.ok) {
      expect(result.items[0]!.estimatedShares).toBeLessThanOrEqual(100);
      if (result.budget?.quantityReasonJa) {
        expect(result.budget.quantityReasonJa).toMatch(/株|減額|調整/);
      }
    } else {
      expect(result.error).toMatch(/見送り|減額|リスク|信頼度/);
      if (result.budget?.quantityReasonJa) {
        expect(result.budget.quantityReasonJa.length).toBeGreaterThan(0);
      }
    }
  });

  it('Maybank 100 shares evaluation — not unconditional approval', () => {
    const stock = findStock('1155');
    expect(stock).toBeTruthy();
    if (!stock) return;
    const eval_ = evaluateRequestedQuantity({
      stock,
      requestedShares: 100,
      budgetMYR: 5000,
      riskLevel: 'standard',
    });
    expect(eval_.recommendedShares).toBeLessThanOrEqual(100);
    expect(eval_.reasonJa.length).toBeGreaterThan(0);
  });

  it('shares-only concierge_symbol — does not pick cheapest filler for budget max', () => {
    const result = buildManualOrderFlowItems({
      mode: 'concierge_symbol',
      market: 'bursa',
      shares: 100,
    });
    if (!result.ok) return;
    const spend = result.budget?.proposedSpendMYR ?? result.items[0]?.allocationMYR ?? 0;
    expect(spend).toBeLessThan(100 * 15);
  });

  it('today proposals empty — normal card text in Japanese', () => {
    const proposals = buildConciergeTodayProposals([], 3);
    expect(proposals).toHaveLength(0);
    expect(jaConcierge.todayProposalsEmpty).toBe('現在、優先提案はありません');
    expect(buildNoBuyTodayMessageJa('low_confidence')).toMatch(/本日|現金|見送り/);
  });

  it('empty userUniverse — error or remaining cash, not forced weak buys', () => {
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
      const summary = buildBudgetSummaryFromPlan(plan);
      expect(summary.remainingCashMYR).toBeGreaterThan(0);
    }
  });
});
