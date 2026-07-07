import { describe, expect, it } from 'vitest';
import { buildAllocationPlan } from '@/services/allocationPlan';
import { totalAllocationBuyCostMYR } from '@/services/allocationActions';
import { buildManualOrderFlowItems } from '@/services/manualOrderFlow';
import {
  assessReproducibility,
  buildAllocationPlanQualitySnapshot,
  buildRm5000BursaPlan,
  candidatesToManualBuyItemsSafe,
  RM5000_BEGINNER_BURSA_INPUT,
  validateAllocationPlanQuality,
  withSimulatedPriceFailure,
} from '@/services/investmentRecommendationQuality';
import {
  appendInvestmentQualityAudit,
  clearInvestmentQualityAuditForTest,
  loadInvestmentQualityAuditLog,
} from '@/services/investmentRecommendationQualityAudit';
import { buildBeginnerRecommendationQuality } from '@/services/recommendationReasons';

describe('investmentRecommendationQuality RM5000 Bursa', () => {
  it('builds a diversified plan within budget', () => {
    const result = buildRm5000BursaPlan();
    expect('error' in result).toBe(false);
    if ('error' in result) return;

    const validation = validateAllocationPlanQuality(result);
    expect(result.candidates.length).toBeGreaterThanOrEqual(3);
    expect(result.candidates.length).toBeLessThanOrEqual(8);
    expect(validation.maxSinglePct).toBeLessThanOrEqual(36);
    expect(validation.totalBuyCostMYR).toBeLessThanOrEqual(5000 * 1.02);
    expect(validation.pass).toBe(true);
    if (process.env.PHASE_SNAPSHOT === '1') {
      console.log(
        JSON.stringify({
          candidates: result.candidates.map((c) => ({
            symbol: c.symbol,
            name: c.name,
            shares: c.estimatedShares,
            entryPrice: c.entryPrice,
            allocationMYR: c.allocationMYR,
          })),
          validation,
          cashReserveMYR: result.cashReserveMYR,
          investableMYR: result.investableMYR,
        }),
      );
    }
  });

  it('includes structured beginner quality reasons', () => {
    const result = buildAllocationPlan(RM5000_BEGINNER_BURSA_INPUT);
    if ('error' in result) throw new Error(result.error);
    for (const c of result.candidates) {
      const q = buildBeginnerRecommendationQuality(c);
      expect(q.whySelected.length).toBeGreaterThan(10);
      expect(q.beginnerBenefit.length).toBeGreaterThan(5);
      expect(q.mainRisk).toMatch(/リスク|変動|下が/);
      expect(q.expectedReturnView).not.toMatch(/必ず上が|確実に利益|保証されます|保証する/);
      expect(q.whenToReview.length).toBeGreaterThan(5);
      expect(q.whenNotToBuy.length).toBeGreaterThan(5);
    }
  });

  it('manual order conversion uses buy side and bursa market', () => {
    const result = buildManualOrderFlowItems({
      mode: 'concierge_full',
      market: 'bursa',
      depositMYR: 5000,
      riskLevel: 'standard',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items.every((i) => i.side === 'buy')).toBe(true);
    expect(result.items.every((i) => i.market === 'bursa')).toBe(true);
    const total = result.items.reduce((s, i) => s + i.allocationMYR, 0);
    expect(total).toBeLessThanOrEqual(5000 * 1.05);
  });
});

describe('API / price failure safety', () => {
  it('rejects manual list when all prices missing', () => {
    const plan = buildAllocationPlan(RM5000_BEGINNER_BURSA_INPUT);
    if ('error' in plan) throw new Error(plan.error);
    const broken = withSimulatedPriceFailure(plan.candidates, plan.candidates.map((c) => c.symbol));
    const safe = candidatesToManualBuyItemsSafe(broken);
    expect(safe.ok).toBe(false);
    if (safe.ok) return;
    expect(safe.error).toMatch(/価格取得に失敗/);
  });

  it('excludes partial price failures and keeps buyable symbols', () => {
    const plan = buildAllocationPlan(RM5000_BEGINNER_BURSA_INPUT);
    if ('error' in plan) throw new Error(plan.error);
    const failSymbol = plan.candidates[0]!.symbol;
    const partial = withSimulatedPriceFailure(plan.candidates, [failSymbol]);
    const safe = candidatesToManualBuyItemsSafe(partial);
    expect(safe.ok).toBe(true);
    if (!safe.ok) return;
    expect(safe.skipped.some((s) => s.startsWith(failSymbol))).toBe(true);
    expect(safe.items.every((i) => i.symbol !== failSymbol)).toBe(true);
    expect(safe.items.every((i) => i.entryPrice > 0)).toBe(true);
  });

  it('audit snapshot marks manualOrderCreatable false on total price failure', () => {
    const plan = buildAllocationPlan(RM5000_BEGINNER_BURSA_INPUT);
    if ('error' in plan) throw new Error(plan.error);
    const broken = withSimulatedPriceFailure(plan.candidates, plan.candidates.map((c) => c.symbol));
    const snapshot = buildAllocationPlanQualitySnapshot(
      { ...plan, candidates: broken },
      RM5000_BEGINNER_BURSA_INPUT,
      { priceApi: 'failed', network: 'offline' },
    );
    expect(snapshot.manualOrderCreatable).toBe(false);
    expect(snapshot.apiStatus.priceApi).toBe('failed');
    expect(snapshot.apiStatus.network).toBe('offline');
  });
});

describe('reproducibility (3 runs)', () => {
  it('keeps stable strategy across three RM5000 runs', () => {
    const plans = [1, 2, 3].map(() => {
      const p = buildAllocationPlan(RM5000_BEGINNER_BURSA_INPUT);
      if ('error' in p) throw new Error(p.error);
      return p;
    });
    const report = assessReproducibility(plans);
    expect(report.pass).toBe(true);
    expect(report.stableSymbolOverlapPct).toBeGreaterThanOrEqual(40);
  });
});

describe('quality audit persistence', () => {
  it('stores audit without secrets', async () => {
    await clearInvestmentQualityAuditForTest();
    const plan = buildAllocationPlan(RM5000_BEGINNER_BURSA_INPUT);
    if ('error' in plan) throw new Error(plan.error);
    const snapshot = buildAllocationPlanQualitySnapshot(plan, RM5000_BEGINNER_BURSA_INPUT);
    await appendInvestmentQualityAudit(snapshot);
    const log = await loadInvestmentQualityAuditLog();
    expect(log.entries.length).toBe(1);
    const raw = JSON.stringify(log);
    expect(raw).not.toMatch(/sk-|apikey|password|secret/i);
    expect(log.entries[0]?.investableMYR).toBe(plan.investableMYR);
    expect(log.entries[0]?.selected.length).toBeGreaterThan(0);
  });
});

describe('concierge flow modes RM5000', () => {
  it('concierge_symbol produces one buy item', () => {
    const r = buildManualOrderFlowItems({ mode: 'concierge_symbol', market: 'bursa', depositMYR: 5000 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.items).toHaveLength(1);
    expect(r.items[0]?.side).toBe('buy');
  });

  it('concierge_quantity computes shares from amount', () => {
    const plan = buildAllocationPlan(RM5000_BEGINNER_BURSA_INPUT);
    if ('error' in plan) throw new Error(plan.error);
    const sym = plan.candidates[0]!.symbol;
    const r = buildManualOrderFlowItems({
      mode: 'concierge_quantity',
      market: 'bursa',
      symbol: sym,
      depositMYR: 2000,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.items[0]?.estimatedShares).toBeGreaterThan(0);
  });
});

describe('quantity calculation stability', () => {
  it('total buy cost tracks allocation slots', () => {
    const plan = buildAllocationPlan(RM5000_BEGINNER_BURSA_INPUT);
    if ('error' in plan) throw new Error(plan.error);
    const cost = totalAllocationBuyCostMYR(plan.candidates);
    expect(cost).toBeGreaterThan(0);
    expect(cost).toBeLessThanOrEqual(plan.depositMYR);
  });
});
