import {
  ALLOCATION_PRACTICE_MESSAGES,
  CANNOT_BUY_ONE_SHARE_WARNING,
} from '../constants/allocation';
import { getBrokerageEstimate } from './brokerage';
import { toMYR } from './fx';
import { executePracticeTrade } from './practice';
import { estimateProceedsMYR, MANUAL_SELL_ORDER_METHOD } from './sellAllHoldings';
import type {
  AllocationCandidate,
  AllocationPlan,
  Currency,
  ManualOrderItem,
  PracticeState,
  PortfolioPosition,
  PositionPnL,
} from '../types';

export const MANUAL_ORDER_METHOD = 'Rakuten Tradeで手動入力';
export const MANUAL_ORDER_WARNING =
  '実際の注文は証券会社アプリ側で実行してください。本アプリは注文を送信しません。';

export function buyableShares(candidate: AllocationCandidate): number {
  if (candidate.isFractionalShares) {
    return candidate.estimatedShares;
  }
  return Math.floor(candidate.estimatedShares);
}

export function canBuyCandidate(candidate: AllocationCandidate): boolean {
  return buyableShares(candidate) > 0;
}

export function filterBuyableCandidates(candidates: AllocationCandidate[]): {
  buyable: AllocationCandidate[];
  skipped: AllocationCandidate[];
} {
  const buyable: AllocationCandidate[] = [];
  const skipped: AllocationCandidate[] = [];
  for (const c of candidates) {
    if (canBuyCandidate(c)) buyable.push(c);
    else skipped.push(c);
  }
  return { buyable, skipped };
}

export function candidatesToManualBuyItems(candidates: AllocationCandidate[]): ManualOrderItem[] {
  const now = new Date().toISOString();
  return candidates.filter(canBuyCandidate).map((c, i) => ({
    id: `manual-buy-${Date.now()}-${i}`,
    symbol: c.symbol,
    name: c.name,
    market: c.market,
    currency: c.currency,
    side: 'buy' as const,
    entryPrice: c.entryPrice,
    estimatedShares: buyableShares(c),
    allocationMYR: c.allocationMYR,
    orderMethod: MANUAL_ORDER_METHOD,
    completed: false,
    createdAt: now,
    source: 'allocation' as const,
  }));
}

export function positionToManualSellItem(
  position: PositionPnL,
  name: string,
  currency: Currency,
): ManualOrderItem {
  return {
    id: `manual-sell-${Date.now()}-${position.symbol}`,
    symbol: position.symbol,
    name,
    market: position.market,
    currency,
    side: 'sell',
    entryPrice: position.currentPrice,
    estimatedShares: position.shares,
    allocationMYR: estimateProceedsMYR(position.shares, position.currentPrice, currency),
    orderMethod: MANUAL_SELL_ORDER_METHOD,
    completed: false,
    createdAt: new Date().toISOString(),
    source: 'holding',
  };
}

export type PracticeAllocationResult =
  | {
      ok: true;
      practice: PracticeState;
      boughtCount: number;
      skipped: string[];
      partialSkipMessage?: string;
    }
  | { ok: false; error: string; skipped: string[] };

function candidateBuyCostMYR(candidate: AllocationCandidate): number {
  const shares = buyableShares(candidate);
  if (shares <= 0) return 0;
  const brokerage = getBrokerageEstimate(
    candidate.market,
    shares,
    candidate.entryPrice,
    candidate.currency,
  );
  return (
    toMYR(shares * candidate.entryPrice, candidate.currency) +
    toMYR(brokerage.estimatedFee, candidate.currency)
  );
}

export function totalAllocationBuyCostMYR(candidates: AllocationCandidate[]): number {
  return candidates.reduce((sum, c) => sum + candidateBuyCostMYR(c), 0);
}

export function executeAllocationPracticeBuys(
  practice: PracticeState,
  plan: AllocationPlan,
): PracticeAllocationResult {
  const { buyable, skipped } = filterBuyableCandidates(plan.candidates);
  const skippedNames = skipped.map((c) => `${c.name}（${CANNOT_BUY_ONE_SHARE_WARNING}）`);

  if (buyable.length === 0) {
    return {
      ok: false,
      error: ALLOCATION_PRACTICE_MESSAGES.noBuyable,
      skipped: skippedNames,
    };
  }

  const totalCostMYR = totalAllocationBuyCostMYR(buyable);
  if (totalCostMYR > practice.cashBalanceMYR) {
    return {
      ok: false,
      error: ALLOCATION_PRACTICE_MESSAGES.insufficientCash,
      skipped: skippedNames,
    };
  }

  let current = practice;
  const executedAt = new Date().toISOString();
  let boughtCount = 0;

  for (let i = 0; i < buyable.length; i++) {
    const c = buyable[i];
    const shares = buyableShares(c);
    if (shares <= 0) continue;

    console.log('buying allocation item', {
      symbol: c.symbol,
      market: c.market,
      shares,
      name: c.name,
    });

    if (!Number.isFinite(c.entryPrice) || c.entryPrice <= 0) {
      console.warn('skip invalid entry price', c.symbol, c.entryPrice);
      continue;
    }

    const brokerage = getBrokerageEstimate(c.market, shares, c.entryPrice, c.currency);
    const tradeExecutedAt = `${executedAt}-alloc-${i}-${c.market}-${c.symbol}`;
    const result = executePracticeTrade(current, {
      symbol: c.symbol,
      market: c.market,
      currency: c.currency,
      side: 'buy',
      shares,
      price: c.entryPrice,
      brokerageFee: brokerage.estimatedFee,
      executedAt: tradeExecutedAt,
      notes: 'おすすめ配分プランから仮想買付',
    });

    if (!result.ok) {
      const error =
        result.error.includes('不足') || result.error.includes('現金')
          ? ALLOCATION_PRACTICE_MESSAGES.insufficientCash
          : result.error;
      return { ok: false, error, skipped: skippedNames };
    }
    current = result.practice;
    boughtCount += 1;
  }

  if (boughtCount === 0) {
    return {
      ok: false,
      error: ALLOCATION_PRACTICE_MESSAGES.noBuyable,
      skipped: skippedNames,
    };
  }

  console.log('saved holdings', current.portfolio.filter((p) => p.shares > 0));

  return {
    ok: true,
    practice: current,
    boughtCount,
    skipped: skippedNames,
    partialSkipMessage:
      skipped.length > 0 ? ALLOCATION_PRACTICE_MESSAGES.partialSkip : undefined,
  };
}

export function executePracticeSellAll(
  practice: PracticeState,
  position: PortfolioPosition,
  name: string,
  currentPrice: number,
): { ok: true; practice: PracticeState } | { ok: false; error: string } {
  if (position.shares <= 0) {
    return { ok: false, error: '売却する株がありません。' };
  }

  const brokerage = getBrokerageEstimate(
    position.market,
    position.shares,
    currentPrice,
    position.currency,
  );

  return executePracticeTrade(practice, {
    symbol: position.symbol,
    market: position.market,
    currency: position.currency,
    side: 'sell',
    shares: position.shares,
    price: currentPrice,
    brokerageFee: brokerage.estimatedFee,
    executedAt: new Date().toISOString(),
    notes: '保有銘柄から仮想売却',
  });
}
