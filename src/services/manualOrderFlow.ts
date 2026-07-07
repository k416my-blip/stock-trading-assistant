import { findStock, getStocksByMarket } from '../data/sampleStocks';
import { buildAllocationPlan } from './allocationPlan';
import {
  buyableShares,
  filterBuyableCandidates,
  MANUAL_ORDER_METHOD,
} from './allocationActions';
import { candidatesToManualBuyItemsSafe } from './investmentRecommendationQuality';
import { toMYR } from './fx';
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

export type BuildManualOrderFlowInput = {
  mode: ManualOrderFlowMode;
  market: Market;
  depositMYR?: number;
  symbol?: string;
  shares?: number;
  entryPrice?: number;
  investmentStyle?: InvestmentStyle;
  riskLevel?: RiskLevel;
  fractionalSharesEnabled?: boolean;
};

export type BuildManualOrderFlowResult =
  | { ok: true; items: ManualOrderItem[] }
  | { ok: false; error: string };

function defaultPlanInput(
  depositMYR: number,
  market: Market,
  investmentStyle: InvestmentStyle = 'balanced',
  riskLevel: RiskLevel = 'standard',
  fractionalSharesEnabled = false,
) {
  return {
    depositMYR,
    market,
    riskLevel,
    investmentStyle,
    fractionalSharesEnabled,
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
  const found = findStock(symbol);
  if (!found) return undefined;
  if (found.market !== market) return undefined;
  return found;
}

function manualFullItem(
  stock: StockFundamentals,
  shares: number,
  entryPrice: number,
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
    source: 'allocation',
  };
}

function conciergeQuantityItem(stock: StockFundamentals, depositMYR: number): ManualOrderItem | null {
  const priceMYR = toMYR(stock.price, stock.currency);
  if (priceMYR <= 0 || depositMYR <= 0) return null;
  const shares = Math.floor(depositMYR / priceMYR);
  if (shares <= 0) {
    return null;
  }
  return manualFullItem(stock, shares, stock.price);
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
    riskLevel = 'medium',
    fractionalSharesEnabled = false,
  } = input;

  if (mode === 'concierge_full') {
    if (depositMYR <= 0) return { ok: false, error: '投資金額を入力してください。' };
    const plan = buildPlanOrError(defaultPlanInput(depositMYR, market, investmentStyle, riskLevel, fractionalSharesEnabled));
    if ('error' in plan) return { ok: false, error: plan.error };
    const planInput = defaultPlanInput(depositMYR, market, investmentStyle, riskLevel, fractionalSharesEnabled);
    void import('./allocationPlan').then(({ persistAllocationPlanQualityAudit }) => {
      void persistAllocationPlanQualityAudit(plan, planInput, {
        priceApi: 'ok',
        newsApi: 'skipped',
        openAi: 'skipped',
        network: 'online',
      });
    });
    const safe = candidatesToManualBuyItemsSafe(plan.candidates);
    if (!safe.ok) return { ok: false, error: safe.error };
    if (safe.items.length === 0) return { ok: false, error: 'この金額では購入できる銘柄がありません。' };
    return { ok: true, items: safe.items };
  }

  if (mode === 'manual_full') {
    const trimmed = symbol.trim();
    if (!trimmed) return { ok: false, error: '銘柄コードを入力してください。' };
    if (shares <= 0) return { ok: false, error: '数量は1以上を入力してください。' };
    const stock = resolveStock(trimmed, market);
    if (!stock) return { ok: false, error: '銘柄が見つかりません。市場とコードを確認してください。' };
    const price = entryPrice && entryPrice > 0 ? entryPrice : stock.price;
    if (price <= 0) return { ok: false, error: '有効な指値を入力してください。' };
    return { ok: true, items: [manualFullItem(stock, shares, price)] };
  }

  if (mode === 'concierge_symbol') {
    const hasAmount = depositMYR > 0;
    const hasShares = shares > 0;
    if (!hasAmount && !hasShares) {
      return { ok: false, error: '投資金額または数量のどちらかを入力してください。' };
    }
    const budgetMYR = hasAmount ? depositMYR : shares * medianSharePriceMYR(market);
    const plan = buildPlanOrError(defaultPlanInput(budgetMYR, market, investmentStyle, riskLevel, fractionalSharesEnabled));
    if ('error' in plan) return { ok: false, error: plan.error };
    const candidate = topBuyableCandidate(plan);
    if (!candidate) return { ok: false, error: 'コンシェルジュが選定できる銘柄がありません。' };
    if (!(candidate.entryPrice > 0)) {
      return { ok: false, error: '価格取得に失敗しました。銘柄を再取得するか、別の銘柄を選んでください。' };
    }
    const resolvedShares = hasShares
      ? shares
      : buyableShares({ ...candidate, allocationMYR: depositMYR });
    if (resolvedShares <= 0) {
      return { ok: false, error: '指定条件では購入可能な数量がありません。' };
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
    );
    return { ok: true, items: [item] };
  }

  if (mode === 'concierge_quantity') {
    const trimmed = symbol.trim();
    if (!trimmed) return { ok: false, error: '銘柄コードを入力してください。' };
    if (depositMYR <= 0) return { ok: false, error: '投資金額を入力してください。' };
    const stock = resolveStock(trimmed, market);
    if (!stock) return { ok: false, error: '銘柄が見つかりません。市場とコードを確認してください。' };
    const item = conciergeQuantityItem(stock, depositMYR);
    if (!item) return { ok: false, error: '投資金額では1株も購入できません。金額を増やしてください。' };
    return { ok: true, items: [item] };
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
