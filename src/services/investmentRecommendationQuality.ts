import { findStock, getStocksByMarket } from '../data/sampleStocks';
import type { AllocationCandidate, AllocationPlan, AllocationPlanInput, ManualOrderItem } from '../types';
import {
  buyableShares,
  canBuyCandidate,
  candidatesToManualBuyItems,
  filterBuyableCandidates,
  totalAllocationBuyCostMYR,
} from './allocationActions';
import { buildAllocationPlan } from './allocationPlan';
import { buildBeginnerRecommendationQuality } from './recommendationReasons';

/** RM5,000 · Bursa · beginner · moderate risk — phase validation baseline. */
export const RM5000_BEGINNER_BURSA_INPUT: AllocationPlanInput = {
  depositMYR: 5000,
  market: 'bursa',
  riskLevel: 'standard',
  investmentStyle: 'balanced',
  fractionalSharesEnabled: false,
  userUniverse: [],
};

export type QualityIssue = { code: string; message: string };

export type QualityValidationResult = {
  pass: boolean;
  issues: QualityIssue[];
  candidateCount: number;
  maxSinglePct: number;
  totalBuyCostMYR: number;
  cashRemainderMYR: number;
};

export type ApiStatusSnapshot = {
  priceApi: 'ok' | 'failed' | 'partial';
  newsApi: 'ok' | 'failed' | 'skipped';
  openAi: 'ok' | 'failed' | 'skipped';
  network: 'online' | 'offline';
};

export type InvestmentQualityAuditEntry = {
  id: string;
  timestamp: string;
  investableMYR: number;
  input: Pick<
    AllocationPlanInput,
    'depositMYR' | 'market' | 'riskLevel' | 'investmentStyle' | 'fractionalSharesEnabled'
  >;
  candidateSymbols: string[];
  excluded: Array<{ symbol: string; reason: string }>;
  selected: Array<{
    symbol: string;
    name: string;
    shares: number;
    entryPrice: number;
    allocationMYR: number;
    qualityReasonSummary: string;
  }>;
  estimatedTotalMYR: number;
  cashRemainderMYR: number;
  apiStatus: ApiStatusSnapshot;
  aiSummary: string;
  manualOrderCreatable: boolean;
  validation: QualityValidationResult;
};

const FORBIDDEN_PHRASES = [/必ず上が/, /確実に利益/, /保証/, /絶対に儲か/];

export function validateAllocationPlanQuality(plan: AllocationPlan): QualityValidationResult {
  const issues: QualityIssue[] = [];
  const { candidates, depositMYR, cashReserveMYR } = plan;
  const n = candidates.length;

  if (n < 3) issues.push({ code: 'too-few-names', message: `銘柄数が少なすぎます (${n})` });
  if (n > 8) issues.push({ code: 'too-many-names', message: `銘柄数が多すぎます (${n})` });

  let maxSinglePct = 0;
  for (const c of candidates) {
    const pct = depositMYR > 0 ? (c.allocationMYR / depositMYR) * 100 : 0;
    maxSinglePct = Math.max(maxSinglePct, pct);
    if (pct > 36) {
      issues.push({ code: 'concentration', message: `${c.symbol} が ${pct.toFixed(1)}% に集中` });
    }
    if (c.estimatedShares < 1 && !c.isFractionalShares) {
      issues.push({ code: 'unrealistic-shares', message: `${c.symbol} 数量が0` });
    }
    const catalog = findStock(c.symbol);
    if (!catalog || catalog.market !== plan.market) {
      issues.push({ code: 'unknown-symbol', message: `${c.symbol} がカタログに存在しない` });
    } else if (Math.abs(catalog.price - c.entryPrice) / Math.max(catalog.price, 0.01) > 0.25) {
      issues.push({
        code: 'price-mismatch',
        message: `${c.symbol} 価格不整合 catalog=${catalog.price} entry=${c.entryPrice}`,
      });
    }
    if (!(c.entryPrice > 0)) {
      issues.push({ code: 'missing-price', message: `${c.symbol} 価格未取得` });
    }
    const reasonBlob = [c.selectionReason, c.beginnerNote, c.recommendationMeta?.approvalReasonsJa?.join('')]
      .filter(Boolean)
      .join(' ');
    for (const re of FORBIDDEN_PHRASES) {
      if (re.test(reasonBlob)) {
        issues.push({ code: 'forbidden-copy', message: `${c.symbol} 禁止表現を検出` });
      }
    }
  }

  const totalBuyCostMYR = totalAllocationBuyCostMYR(candidates);
  if (totalBuyCostMYR > depositMYR * 1.02) {
    issues.push({
      code: 'over-budget',
      message: `合計 ${totalBuyCostMYR.toFixed(0)} > 入金 ${depositMYR}`,
    });
  }

  const cashRemainderMYR = cashReserveMYR + Math.max(0, plan.investableMYR - candidates.reduce((s, c) => s + c.allocationMYR, 0));
  if (cashRemainderMYR > depositMYR * 0.4) {
    issues.push({ code: 'excess-cash', message: `端数現金が大きすぎ (${cashRemainderMYR.toFixed(0)} MYR)` });
  }

  return {
    pass: issues.length === 0,
    issues,
    candidateCount: n,
    maxSinglePct,
    totalBuyCostMYR,
    cashRemainderMYR,
  };
}

export function buildAllocationPlanQualitySnapshot(
  plan: AllocationPlan,
  input: AllocationPlanInput,
  apiStatus: Partial<ApiStatusSnapshot> = {},
): Omit<InvestmentQualityAuditEntry, 'id' | 'timestamp'> {
  const { buyable, skipped } = filterBuyableCandidates(plan.candidates);
  const validation = validateAllocationPlanQuality(plan);
  const safe = candidatesToManualBuyItemsSafe(plan.candidates);

  const defaultApi: ApiStatusSnapshot = {
    priceApi: 'ok',
    newsApi: 'skipped',
    openAi: 'skipped',
    network: 'online',
    ...apiStatus,
  };

  return {
    investableMYR: plan.investableMYR,
    input: {
      depositMYR: input.depositMYR,
      market: input.market,
      riskLevel: input.riskLevel,
      investmentStyle: input.investmentStyle,
      fractionalSharesEnabled: input.fractionalSharesEnabled,
    },
    candidateSymbols: plan.candidates.map((c) => c.symbol),
    excluded: skipped.map((c) => ({
      symbol: c.symbol,
      reason: c.unpurchasableWarning ?? (c.recommendationMeta?.buyAllowed === false ? 'committee-reject' : 'not-buyable'),
    })),
    selected: buyable.map((c) => {
      const q = buildBeginnerRecommendationQuality(c);
      return {
        symbol: c.symbol,
        name: c.name,
        shares: buyableShares(c),
        entryPrice: c.entryPrice,
        allocationMYR: c.allocationMYR,
        qualityReasonSummary: q.whySelected.slice(0, 120),
      };
    }),
    estimatedTotalMYR: validation.totalBuyCostMYR,
    cashRemainderMYR: validation.cashRemainderMYR,
    apiStatus: defaultApi,
    aiSummary: `candidates=${plan.candidates.length} buyable=${buyable.length} validation=${validation.pass ? 'pass' : 'fail'}`,
    manualOrderCreatable: safe.ok,
    validation,
  };
}

export function candidatesToManualBuyItemsSafe(
  candidates: AllocationCandidate[],
):
  | { ok: true; items: ManualOrderItem[]; skipped: string[] }
  | { ok: false; error: string; skipped: string[] } {
  const skipped: string[] = [];
  const safe: AllocationCandidate[] = [];
  for (const c of candidates) {
    if (!canBuyCandidate(c)) {
      skipped.push(`${c.symbol}:not-buyable`);
      continue;
    }
    if (!(c.entryPrice > 0)) {
      skipped.push(`${c.symbol}:price-missing`);
      continue;
    }
    safe.push(c);
  }
  if (safe.length === 0) {
    return {
      ok: false,
      error: '価格取得に失敗した銘柄があるため、手動注文リストを作成できません。',
      skipped,
    };
  }
  return { ok: true, items: candidatesToManualBuyItems(safe), skipped };
}

export function buildRm5000BursaPlan(): AllocationPlan | { error: string } {
  return buildAllocationPlan(RM5000_BEGINNER_BURSA_INPUT);
}

export type ReproducibilityReport = {
  runs: number;
  symbolSets: string[][];
  stableSymbolOverlapPct: number;
  candidateCountRange: [number, number];
  totalCostRangeMYR: [number, number];
  pass: boolean;
  detail: string;
};

export function assessReproducibility(plans: AllocationPlan[]): ReproducibilityReport {
  const symbolSets = plans.map((p) => p.candidates.map((c) => c.symbol).sort());
  const counts = plans.map((p) => p.candidates.length);
  const costs = plans.map((p) => totalAllocationBuyCostMYR(p.candidates));

  let overlapSum = 0;
  for (let i = 1; i < symbolSets.length; i++) {
    const a = new Set(symbolSets[0]);
    const b = symbolSets[i];
    const inter = b.filter((s) => a.has(s)).length;
    overlapSum += b.length > 0 ? inter / b.length : 0;
  }
  const stableSymbolOverlapPct =
    symbolSets.length > 1 ? Math.round((overlapSum / (symbolSets.length - 1)) * 100) : 100;

  const countMin = Math.min(...counts);
  const countMax = Math.max(...counts);
  const costMin = Math.min(...costs);
  const costMax = Math.max(...costs);

  const pass =
    stableSymbolOverlapPct >= 40 &&
    countMax - countMin <= 2 &&
    costMax - costMin <= 800;

  return {
    runs: plans.length,
    symbolSets,
    stableSymbolOverlapPct,
    candidateCountRange: [countMin, countMax],
    totalCostRangeMYR: [costMin, costMax],
    pass,
    detail: `overlap=${stableSymbolOverlapPct}% counts=${countMin}-${countMax} costs=${costMin.toFixed(0)}-${costMax.toFixed(0)}`,
  };
}

/** Apply zero/invalid price to simulate API failure — never used in production paths. */
export function withSimulatedPriceFailure(
  candidates: AllocationCandidate[],
  failSymbols: string[],
): AllocationCandidate[] {
  return candidates.map((c) =>
    failSymbols.includes(c.symbol) ? { ...c, entryPrice: 0, unpurchasableWarning: '価格取得に失敗しました' } : c,
  );
}

export function bursaUniverseSymbolCount(): number {
  return getStocksByMarket('bursa').length;
}

export function estimateLotAwareNote(symbol: string, shares: number): string {
  const stock = findStock(symbol);
  if (!stock || stock.market !== 'bursa') return '';
  const lot = 100;
  if (shares > 0 && shares % lot !== 0 && shares < lot) {
    return `Bursaは100株単位が一般的です。${shares}株は参考数量であり、Rakuten Tradeでロットを確認してください。`;
  }
  return '';
}
