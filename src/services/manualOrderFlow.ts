import { findStock, getStocksByMarket } from '../data/sampleStocks';
import { buildAllocationPlan } from './allocationPlan';
import {
  buyableShares,
  filterBuyableCandidates,
  MANUAL_ORDER_METHOD,
} from './allocationActions';
import { candidatesToManualBuyItemsSafe } from './investmentRecommendationQuality';
import {
  buildBudgetSummaryFromPlan,
  computeRiskBasedSharesForSymbol,
  evaluateRequestedQuantity,
  normalizeRiskLevel,
  type ConciergeBudgetSummary,
} from './conciergeBudgetOptimization';
import { toMYR } from './fx';
import { normalizeStockCodeInput } from '../utils/normalizeStockCodeInput';
import type {
  AllocationPlan,
  InvestmentStyle,
  ManualOrderItem,
  Market,
  RiskLevel,
  StockFundamentals,
} from '../types';

export type ManualOrderFlowMode =
  | 'concierge_full'
  | 'manual_full'
  | 'concierge_symbol'
  | 'concierge_quantity';

export type { ConciergeBudgetSummary };

export type BuildManualOrderFlowInput = {
  mode: ManualOrderFlowMode;
  market: Market;
  depositMYR?: number;
  symbol?: string;
  shares?: number;
  entryPrice?: number;
  investmentStyle?: InvestmentStyle;
  riskLevel?: RiskLevel | 'medium';
  fractionalSharesEnabled?: boolean;
};

export type BuildManualOrderFlowResult =
  | { ok: true; items: ManualOrderItem[]; budget?: ConciergeBudgetSummary }
  | { ok: false; error: string; budget?: ConciergeBudgetSummary };

function defaultPlanInput(
  depositMYR: number,
  market: Market,
  investmentStyle: InvestmentStyle = 'balanced',
  riskLevel: RiskLevel | 'medium' = 'standard',
  fractionalSharesEnabled = false,
  strictCharterOnly = true,
) {
  return {
    depositMYR,
    market,
    riskLevel: normalizeRiskLevel(riskLevel),
    investmentStyle,
    fractionalSharesEnabled,
    strictCharterOnly,
  };
}

function buildPlanOrError(input: ReturnType<typeof defaultPlanInput>): AllocationPlan | { error: string } {
  const result = buildAllocationPlan(input);
  if ('error' in result) return { error: result.error };
  return result;
}

function topBuyableCandidate(plan: AllocationPlan) {
  const { buyable } = filterBuyableCandidates(plan.candidates);
  return buyable[0] ?? null;
}

function medianSharePriceMYR(market: Market): number {
  const stocks = getStocksByMarket(market).filter((s) => s.price > 0);
  if (stocks.length === 0) return 10;
  const prices = stocks.map((s) => toMYR(s.price, s.currency)).sort((a, b) => a - b);
  return prices[Math.floor(prices.length / 2)] ?? 10;
}

function resolveStock(symbol: string, market: Market): StockFundamentals | undefined {
  const trimmed = normalizeStockCodeInput(symbol);
  const found = findStock(trimmed);
  if (!found) return undefined;
  if (found.market !== market) return undefined;
  return found;
}

function manualFullItem(
  stock: StockFundamentals,
  shares: number,
  entryPrice: number,
  source: ManualOrderItem['source'] = 'allocation',
): ManualOrderItem {
  const buyShares = stock.market === 'us' && shares % 1 !== 0 ? shares : Math.floor(shares);
  return {
    id: `manual-flow-${Date.now()}-${stock.symbol}`,
    symbol: stock.symbol,
    name: stock.name,
    market: stock.market,
    currency: stock.currency,
    side: 'buy',
    entryPrice,
    estimatedShares: buyShares,
    allocationMYR: toMYR(entryPrice * buyShares, stock.currency),
    orderMethod: MANUAL_ORDER_METHOD,
    completed: false,
    createdAt: new Date().toISOString(),
    source,
  };
}

export function buildManualOrderFlowItems(input: BuildManualOrderFlowInput): BuildManualOrderFlowResult {
  const {
    mode,
    market,
    depositMYR = 0,
    symbol = '',
    shares = 0,
    entryPrice,
    investmentStyle = 'balanced',
    riskLevel = 'standard',
    fractionalSharesEnabled = false,
  } = input;
  const normalizedRisk = normalizeRiskLevel(riskLevel);

  if (mode === 'concierge_full') {
    if (depositMYR <= 0) return { ok: false, error: '投資金額を入力してください。' };
    const planInput = defaultPlanInput(depositMYR, market, investmentStyle, normalizedRisk, fractionalSharesEnabled, true);
    const plan = buildPlanOrError(planInput);
    if ('error' in plan) return { ok: false, error: plan.error };
    void import('./allocationPlan').then(({ persistAllocationPlanQualityAudit }) => {
      void persistAllocationPlanQualityAudit(plan, planInput, {
        priceApi: 'ok',
        newsApi: 'skipped',
        openAi: 'skipped',
        network: 'online',
      });
    });
    const budget = buildBudgetSummaryFromPlan(plan);
    const safe = candidatesToManualBuyItemsSafe(plan.candidates);
    if (!safe.ok) return { ok: false, error: safe.error, budget };
    if (safe.items.length === 0) {
      return { ok: false, error: '本日の買付推奨はありません。現金維持を推奨します。', budget };
    }
    return { ok: true, items: safe.items, budget };
  }

  if (mode === 'manual_full') {
    const trimmed = symbol.trim();
    if (!trimmed) return { ok: false, error: '銘柄コードを入力してください。' };
    if (shares <= 0) return { ok: false, error: '数量は1以上を入力してください。' };
    const stock = resolveStock(trimmed, market);
    if (!stock) return { ok: false, error: '銘柄が見つかりません。市場とコードを確認してください。' };
    const price = entryPrice && entryPrice > 0 ? entryPrice : stock.price;
    if (price <= 0) return { ok: false, error: '有効な指値を入力してください。' };
    return { ok: true, items: [manualFullItem(stock, shares, price, 'manual_full')] };
  }

  if (mode === 'concierge_symbol') {
    const hasAmount = depositMYR > 0;
    const hasShares = shares > 0;
    if (!hasAmount && !hasShares) {
      return { ok: false, error: '投資金額または数量のどちらかを入力してください。' };
    }
    const budgetMYR = hasAmount ? depositMYR : shares * medianSharePriceMYR(market);
    const planInput = defaultPlanInput(budgetMYR, market, investmentStyle, normalizedRisk, fractionalSharesEnabled, true);
    const plan = buildPlanOrError(planInput);
    if ('error' in plan) return { ok: false, error: plan.error };
    const budget = buildBudgetSummaryFromPlan(plan);
    const candidate = topBuyableCandidate(plan);
    if (!candidate) {
      return { ok: false, error: '本日の買付推奨はありません。候補銘柄の信頼度が不足しています。', budget };
    }
    if (!(candidate.entryPrice > 0)) {
      return { ok: false, error: '価格取得に失敗しました。銘柄を再取得するか、別の銘柄を選んでください。', budget };
    }

    let resolvedShares: number;
    let quantityReasonJa: string | undefined;

    if (hasShares) {
      const stockForEval = resolveStock(candidate.symbol, market) ?? ({
        symbol: candidate.symbol,
        name: candidate.name,
        market: candidate.market,
        currency: candidate.currency,
        price: candidate.entryPrice,
      } as StockFundamentals);
      const qEval = evaluateRequestedQuantity({
        stock: stockForEval,
        requestedShares: shares,
        budgetMYR,
        riskLevel: normalizedRisk,
      });
      if (!qEval.approved) {
        return { ok: false, error: qEval.reasonJa, budget: { ...budget, quantityAdjusted: true, quantityReasonJa: qEval.reasonJa } };
      }
      resolvedShares = qEval.recommendedShares;
      if (qEval.adjusted) {
        quantityReasonJa = qEval.reasonJa;
        budget.quantityAdjusted = true;
        budget.quantityReasonJa = qEval.reasonJa;
      }
    } else {
      resolvedShares = buyableShares({ ...candidate, allocationMYR: Math.min(candidate.allocationMYR, budget.proposedSpendMYR || candidate.allocationMYR) });
    }

    if (resolvedShares <= 0) {
      return { ok: false, error: '指定条件では購入可能な数量がありません。', budget };
    }
    const item = manualFullItem(
      {
        symbol: candidate.symbol,
        name: candidate.name,
        market: candidate.market,
        currency: candidate.currency,
        price: candidate.entryPrice,
      } as StockFundamentals,
      resolvedShares,
      candidate.entryPrice,
      'concierge_symbol',
    );
    budget.proposedSpendMYR = item.allocationMYR;
    budget.remainingCashMYR = Math.max(0, budgetMYR - item.allocationMYR);
    if (quantityReasonJa) budget.quantityReasonJa = quantityReasonJa;
    return { ok: true, items: [item], budget };
  }

  if (mode === 'concierge_quantity') {
    const trimmed = symbol.trim();
    if (!trimmed) return { ok: false, error: '銘柄コードを入力してください。' };
    if (depositMYR <= 0) return { ok: false, error: '投資金額を入力してください。' };
    const stock = resolveStock(trimmed, market);
    if (!stock) return { ok: false, error: '銘柄が見つかりません。市場とコードを確認してください。' };

    const sized = computeRiskBasedSharesForSymbol({
      stock,
      depositMYR,
      riskLevel: normalizedRisk,
      explicitUserSymbol: true,
    });
    if (sized.shares <= 0) {
      return {
        ok: false,
        error: sized.reasonJa || '投資金額では1株も購入できません。金額を増やすか、別銘柄をご検討ください。',
      };
    }
    const item = manualFullItem(stock, sized.shares, stock.price, 'concierge_quantity');
    const budget: ConciergeBudgetSummary = {
      budgetMYR: depositMYR,
      proposedSpendMYR: item.allocationMYR,
      remainingCashMYR: Math.max(0, depositMYR - item.allocationMYR),
      cashReserveMYR: depositMYR * 0.1,
      remainingReasonJa: sized.reasonJa,
      riskJudgmentJa: sized.confidencePct < 60 ? '信頼度が基準未満 — 数量を抑制しました' : '標準リスク設定',
      concentrationJa: `単一銘柄 ${((item.allocationMYR / depositMYR) * 100).toFixed(1)}%`,
      didNotUseFullBudget: item.allocationMYR < depositMYR * 0.95,
    };
    return { ok: true, items: [item], budget };
  }

  return { ok: false, error: '不明なフローです。' };
}

export function manualOrderFlowModeTitleKey(mode: ManualOrderFlowMode): string {
  switch (mode) {
    case 'concierge_full':
      return 'manualOrderFlow.conciergeFull.title';
    case 'manual_full':
      return 'manualOrderFlow.manualFull.title';
    case 'concierge_symbol':
      return 'manualOrderFlow.conciergeSymbol.title';
    case 'concierge_quantity':
      return 'manualOrderFlow.conciergeQuantity.title';
    default:
      return 'manualOrderFlow.title';
  }
}
