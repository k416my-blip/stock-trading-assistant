/**
 * AIコンシェルジュ — 予算上限・数量希望の最適化（B: 制約内でリスク調整）
 */
import { CHARTER_MIN_BUY_CONFIDENCE_PCT } from '../constants/investmentCharter';
import type { AllocationPlan, RiskLevel, StockFundamentals } from '../types';
import { buildStockRecommendation } from './recommendationEngine';
import { buildAllocationRecommendationMeta } from './recommendationProvenance';
import { toMYR } from './fx';
import { totalAllocationBuyCostMYR } from './allocationActions';

const MAX_SINGLE_PCT = 0.35;

export type ConciergeBudgetSummary = {
  budgetMYR: number;
  proposedSpendMYR: number;
  remainingCashMYR: number;
  cashReserveMYR: number;
  remainingReasonJa: string;
  riskJudgmentJa: string;
  concentrationJa: string;
  didNotUseFullBudget: boolean;
  quantityAdjusted?: boolean;
  quantityReasonJa?: string;
};

export type QuantityEvaluation = {
  requestedShares: number;
  recommendedShares: number;
  approved: boolean;
  adjusted: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  concentrationPct: number;
  confidencePct: number;
  reasonJa: string;
};

export function cashReservePctForRisk(riskLevel: RiskLevel): number {
  if (riskLevel === 'low') return 0.15;
  if (riskLevel === 'high') return 0.05;
  return 0.1;
}

export function normalizeRiskLevel(riskLevel: RiskLevel | 'medium'): RiskLevel {
  return riskLevel === 'medium' ? 'standard' : riskLevel;
}

/** 予算上限（deposit）からリスク調整後の使える上限を算出 — 使い切りではない */
export function computeMaxSpendableMYR(depositMYR: number, riskLevel: RiskLevel | 'medium'): number {
  const risk = normalizeRiskLevel(riskLevel);
  const reservePct = cashReservePctForRisk(risk);
  return Math.max(0, depositMYR * (1 - reservePct));
}

export function evaluateRequestedQuantity(input: {
  stock: StockFundamentals;
  requestedShares: number;
  budgetMYR: number;
  riskLevel?: RiskLevel | 'medium';
}): QuantityEvaluation {
  const risk = normalizeRiskLevel(input.riskLevel ?? 'standard');
  const priceMYR = toMYR(input.stock.price, input.stock.currency);
  const rec = buildStockRecommendation(input.stock);
  const meta = buildAllocationRecommendationMeta({
    symbol: input.stock.symbol,
    name: input.stock.name,
    rec,
    selectionReason: '',
    allocationPct: 0,
  });
  const confidencePct = meta.confidencePct ?? 50;
  const maxSpend = computeMaxSpendableMYR(input.budgetMYR, risk);
  const maxByBudget = priceMYR > 0 ? Math.floor(maxSpend / priceMYR) : 0;
  const maxByConcentration = priceMYR > 0 ? Math.floor((input.budgetMYR * MAX_SINGLE_PCT) / priceMYR) : 0;
  let recommended = Math.min(input.requestedShares, maxByBudget, maxByConcentration);

  if (confidencePct < CHARTER_MIN_BUY_CONFIDENCE_PCT) {
    recommended = Math.min(recommended, Math.floor(maxByBudget * 0.5));
  }
  if (recommended < 1 && input.requestedShares > 0) {
    recommended = 0;
  }

  const costMYR = recommended * priceMYR;
  const concentrationPct = input.budgetMYR > 0 ? (costMYR / input.budgetMYR) * 100 : 0;
  const adjusted = recommended !== input.requestedShares;
  const approved = recommended > 0;

  let reasonJa = '指定数量はリスク・集中度・信頼度の範囲内です。';
  if (!approved) {
    reasonJa = '指定数量はリスクまたは信頼度の観点から見送りを推奨します。';
  } else if (adjusted) {
    reasonJa =
      confidencePct < CHARTER_MIN_BUY_CONFIDENCE_PCT
        ? `信頼度 ${confidencePct}% が基準未満のため、${input.requestedShares}株 → ${recommended}株に減額提案します。`
        : `集中度・予算上限を考慮し、${input.requestedShares}株 → ${recommended}株に調整します。`;
  }

  const riskLevelOut: QuantityEvaluation['riskLevel'] =
    confidencePct < CHARTER_MIN_BUY_CONFIDENCE_PCT || concentrationPct > 30
      ? 'high'
      : concentrationPct > 20
        ? 'medium'
        : 'low';

  return {
    requestedShares: input.requestedShares,
    recommendedShares: recommended,
    approved,
    adjusted,
    riskLevel: riskLevelOut,
    concentrationPct,
    confidencePct,
    reasonJa,
  };
}

/** 銘柄+予算モード: 予算を使い切らずリスクベースで株数決定 */
export function computeRiskBasedSharesForSymbol(input: {
  stock: StockFundamentals;
  depositMYR: number;
  riskLevel?: RiskLevel | 'medium';
  /** ユーザーが銘柄を明示指定した場合 — buyAllowed=false でも減額提案（完全見送りは最終手段） */
  explicitUserSymbol?: boolean;
}): { shares: number; allocationMYR: number; confidencePct: number; reasonJa: string } {
  const priceMYR = toMYR(input.stock.price, input.stock.currency);
  if (priceMYR <= 0 || input.depositMYR <= 0) {
    return { shares: 0, allocationMYR: 0, confidencePct: 0, reasonJa: '価格または予算が無効です。' };
  }

  const rec = buildStockRecommendation(input.stock);
  const meta = buildAllocationRecommendationMeta({
    symbol: input.stock.symbol,
    name: input.stock.name,
    rec,
    selectionReason: '',
    allocationPct: 0,
  });
  const confidencePct = meta.confidencePct ?? 50;
  const maxSpend = computeMaxSpendableMYR(input.depositMYR, input.riskLevel ?? 'standard');
  let capMYR = Math.min(maxSpend, input.depositMYR * MAX_SINGLE_PCT);

  if (confidencePct < CHARTER_MIN_BUY_CONFIDENCE_PCT) {
    capMYR *= 0.5;
  }
  const explicitUserSymbol = input.explicitUserSymbol === true;
  if (!meta.buyAllowed) {
    if (!explicitUserSymbol) {
      return {
        shares: 0,
        allocationMYR: 0,
        confidencePct,
        reasonJa: '投資委員会の判定により、この銘柄は本日の買付候補として見送ります。',
      };
    }
    capMYR *= 0.25;
  }

  const shares = Math.floor(capMYR / priceMYR);
  const allocationMYR = shares * priceMYR;
  const remaining = input.depositMYR - allocationMYR;
  let reasonJa =
    remaining > 0
      ? `指定額 RM${input.depositMYR.toFixed(0)} のうち RM${allocationMYR.toFixed(0)} を使用し、RM${remaining.toFixed(0)} は現金として残します。リスク・信頼度・集中度を優先した結果です。`
      : `指定上限内で ${shares} 株を提案します。`;
  if (!meta.buyAllowed && explicitUserSymbol && shares > 0) {
    reasonJa = `投資委員会の信頼度 ${confidencePct}% が基準未満のため、指定銘柄への投入額を抑制しました。${reasonJa}`;
  }
  if (shares <= 0 && explicitUserSymbol) {
    return {
      shares: 0,
      allocationMYR: 0,
      confidencePct,
      reasonJa: '指定銘柄はリスク・信頼度の観点から、本日は見送りを推奨します。',
    };
  }

  return { shares, allocationMYR, confidencePct, reasonJa };
}

export function buildBudgetSummaryFromPlan(plan: AllocationPlan): ConciergeBudgetSummary {
  const proposedSpendMYR = totalAllocationBuyCostMYR(plan.candidates);
  const remainingCashMYR = Math.max(0, plan.depositMYR - proposedSpendMYR);
  const didNotUseFullBudget = remainingCashMYR > plan.depositMYR * 0.05;

  const maxSingle =
    plan.candidates.length > 0
      ? Math.max(...plan.candidates.map((c) => (plan.depositMYR > 0 ? (c.allocationMYR / plan.depositMYR) * 100 : 0)))
      : 0;

  const remainingReasonJa = didNotUseFullBudget
    ? `指定額 RM${plan.depositMYR.toFixed(0)} のうち RM${proposedSpendMYR.toFixed(0)} を使用し、RM${remainingCashMYR.toFixed(0)} は現金として残します。候補銘柄では残額を無理に使うより現金余力として残す方がリスク効率が高いためです。`
    : '指定上限内で配分しました。';

  return {
    budgetMYR: plan.depositMYR,
    proposedSpendMYR,
    remainingCashMYR,
    cashReserveMYR: plan.cashReserveMYR,
    remainingReasonJa,
    riskJudgmentJa: plan.highRiskWarning ?? '標準リスク設定で評価しました。',
    concentrationJa: `最大単一銘柄比率 約${maxSingle.toFixed(1)}%（上限35%）`,
    didNotUseFullBudget,
  };
}

export function buildNoBuyTodayMessageJa(reason: 'low_confidence' | 'no_adoptable' | 'weak_candidates'): string {
  switch (reason) {
    case 'low_confidence':
      return '本日の買付推奨はありません。候補銘柄の confidence が基準値を下回っているため、現金を維持します。';
    case 'no_adoptable':
      return '今日は新規買付を見送ります。投資委員会の採用基準を満たす銘柄がありません。';
    default:
      return '現在のポートフォリオでは、追加購入よりも現金余力を残す方がリスク効率が高いと判断しました。';
  }
}
