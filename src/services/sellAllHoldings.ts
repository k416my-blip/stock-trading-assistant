import type { AlertPayload } from './alertEngine';
import { getBrokerageEstimate } from './brokerage';
import { findStock } from '../data/sampleStocks';
import { formatSymbolDisplayFromPosition } from '../utils/formatSymbolDisplay';
import { mergeCompanyName } from '../utils/companyNameResolver';
import { executePracticeTrade } from './practice';
import { toMYR } from './fx';
import { positionDisplayPrice } from '../utils/positionPrice';
import { safeNumber, safeShares } from '../utils/safeNumeric';
import type {
  Currency,
  ManualOrderItem,
  Market,
  PortfolioPosition,
  PracticeState,
  SellAllLineItem,
  SellAllResult,
} from '../types';

export const SELL_ALL_CONFIRM_TITLE = '本当にすべて売却しますか？';
export const SELL_ALL_CONFIRM_MESSAGE =
  'この操作は保有中の全銘柄を売却処理します。';
export const SELL_ALL_NO_HOLDINGS = '保有銘柄がありません';
export const SELL_ALL_PRICE_MISSING = '現在株価が未取得です';
export const SELL_ALL_MANUAL_WARNING =
  '実際の売却はRakuten Tradeで自分で確認して行ってください';
export const MANUAL_SELL_ORDER_METHOD = 'Rakuten Tradeで手動売却';

export type SellAllPriceInput = {
  positionId: string;
  symbol: string;
  name: string;
  market: Market;
  currency: Currency;
  shares: number;
};

export function filterSellablePositions(portfolio: PortfolioPosition[]): PortfolioPosition[] {
  return portfolio.filter((p) => safeShares(p.shares, 0) > 0);
}

export function isPositionPriceAvailable(position: PortfolioPosition): boolean {
  if (safeShares(position.shares, 0) <= 0) return false;
  return positionDisplayPrice(position) > 0;
}

export function positionDisplayName(position: PortfolioPosition): string {
  const companyName = mergeCompanyName(
    position.symbol,
    position.market,
    position.companyName,
    findStock(position.symbol)?.name,
  );
  return formatSymbolDisplayFromPosition({
    ...position,
    companyName,
  });
}

export function estimateProceedsMYR(shares: number, price: number, currency: Currency): number {
  const s = safeShares(shares, 0);
  const p = safeNumber(price, 0);
  return toMYR(s * p, currency);
}

export function buildManualSellAllItems(
  entries: Array<{ position: PortfolioPosition; name: string; currentPrice: number }>,
): ManualOrderItem[] {
  const createdAt = new Date().toISOString();
  return entries.map((entry, index) => {
    const { position, name, currentPrice } = entry;
    const proceedsMYR = estimateProceedsMYR(position.shares, currentPrice, position.currency);
    return {
      id: `manual-sell-all-${Date.now()}-${index}-${position.id}`,
      symbol: position.symbol,
      name,
      market: position.market,
      currency: position.currency,
      side: 'sell' as const,
      entryPrice: currentPrice,
      estimatedShares: position.shares,
      allocationMYR: proceedsMYR,
      orderMethod: MANUAL_SELL_ORDER_METHOD,
      completed: false,
      createdAt,
      source: 'sell_all' as const,
    };
  });
}

export function buildSellAllLineItem(
  position: PortfolioPosition,
  name: string,
  currentPrice: number,
  realizedPnLMYR?: number,
  skipped?: boolean,
  skipReason?: string,
): SellAllLineItem {
  return {
    positionId: position.id,
    symbol: position.symbol,
    name,
    market: position.market,
    currency: position.currency,
    shares: position.shares,
    currentPrice,
    estimatedProceedsMYR: estimateProceedsMYR(position.shares, currentPrice, position.currency),
    realizedPnLMYR,
    skipped,
    skipReason,
  };
}

export type PracticeSellAllHoldingsResult =
  | { ok: true; practice: PracticeState; result: SellAllResult }
  | { ok: false; error: string };

export function executePracticeSellAllHoldings(
  practice: PracticeState,
  sells: Array<{ position: PortfolioPosition; name: string; sellPrice: number }>,
): PracticeSellAllHoldingsResult {
  if (sells.length === 0) {
    return { ok: false, error: SELL_ALL_NO_HOLDINGS };
  }

  let current = practice;
  const items: SellAllLineItem[] = [];
  let totalProceedsMYR = 0;
  let totalRealizedPnLMYR = 0;
  const baseExecutedAt = new Date().toISOString();

  for (let i = 0; i < sells.length; i++) {
    const { position, name, sellPrice } = sells[i];
    if (position.shares <= 0) continue;

    const brokerage = getBrokerageEstimate(
      position.market,
      position.shares,
      sellPrice,
      position.currency,
    );

    const exec = executePracticeTrade(current, {
      symbol: position.symbol,
      market: position.market,
      currency: position.currency,
      side: 'sell',
      shares: position.shares,
      price: sellPrice,
      brokerageFee: brokerage.estimatedFee,
      executedAt: `${baseExecutedAt}-sell-all-${i}`,
      notes: 'すべて売却（仮想）',
    });

    if (!exec.ok) {
      return { ok: false, error: exec.error };
    }

    const trade = exec.practice.trades[0];
    const realized = trade.realizedPnLMYR ?? 0;
    const proceedsMYR =
      toMYR(position.shares * sellPrice, position.currency) -
      toMYR(brokerage.estimatedFee, position.currency);

    totalProceedsMYR += proceedsMYR;
    totalRealizedPnLMYR += realized;
    items.push(buildSellAllLineItem(position, name, sellPrice, realized));
    current = exec.practice;
  }

  const soldCount = items.filter((i) => !i.skipped).length;

  return {
    ok: true,
    practice: current,
    result: {
      mode: 'practice',
      items,
      totalProceedsMYR,
      totalRealizedPnLMYR,
      soldCount,
      skippedCount: 0,
      completedAt: new Date().toISOString(),
    },
  };
}

export function buildManualSellAllResult(
  items: SellAllLineItem[],
  manualListCreated: boolean,
): SellAllResult {
  const active = items.filter((i) => !i.skipped);
  const totalProceedsMYR = active.reduce((s, i) => s + i.estimatedProceedsMYR, 0);
  return {
    mode: 'manual',
    items,
    totalProceedsMYR,
    totalRealizedPnLMYR: 0,
    soldCount: active.length,
    skippedCount: items.filter((i) => i.skipped).length,
    manualListCreated,
    completedAt: new Date().toISOString(),
  };
}

export function buildSellAllPracticeAlert(): AlertPayload {
  return {
    type: 'sell_candidate',
    cooldownKey: `sell-all-practice-${Date.now()}`,
    title: 'すべて売却',
    body: 'すべての仮想売却が完了しました',
  };
}

export function buildSellAllManualAlert(): AlertPayload {
  return {
    type: 'sell_candidate',
    cooldownKey: `sell-all-manual-${Date.now()}`,
    title: 'すべて売却',
    body: '手動売却リストを作成しました',
  };
}
