/**
 * 実口座 — 手数料込み発注資金計算
 * 利用可能資金 = 現金残高 − 予想手数料（注文代金は別途）
 * 発注可否 = 現金 − 注文合計 − 手数料 ≥ 0
 */
import type { AllocationCandidate, ManualOrderItem } from '../types';
import { getBrokerageEstimate } from './brokerage';
import {
  MALAYSIA_V4_SHARE_REDUCTION_PRIORITY,
  proposeShareReductionToFitCash,
  SHARE_REDUCTION_CHUNK,
  type ShareReductionProposal,
} from './realAccountOrderShareReduction';

export {
  activeBuyOrders,
  proposeShareReductionToFitCash,
  syncManualOrderShares,
  SHARE_REDUCTION_CHUNK,
  MALAYSIA_V4_SHARE_REDUCTION_PRIORITY,
  verifyEntryPricesUnchanged,
  type ShareReductionProposal,
  type ShareReductionStep,
} from './realAccountOrderShareReduction';
import { pendingOrderAmountMYR } from './realAccountOrderValuation';
import { getPendingMalaysiaOrders } from './realAccountPortfolio';
import { buyableShares } from './allocationActions';

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export type OrderFundingRow = {
  orderId: string;
  symbol: string;
  labelJa: string;
  shares: number;
  entryPriceMYR: number;
  orderAmountMYR: number;
  brokerageFeeMYR: number;
};

export type OrderFundingSummary = {
  cashMYR: number;
  orderTotalMYR: number;
  estimatedFeesMYR: number;
  grandTotalMYR: number;
  deployableCashMYR: number;
  balanceAfterMYR: number;
  canPlaceOrders: boolean;
  rows: OrderFundingRow[];
};

export function estimateOrderBrokerageFeeMYR(order: ManualOrderItem): number {
  if (order.completed || order.side !== 'buy') return 0;
  const fee = getBrokerageEstimate(
    order.market,
    order.estimatedShares,
    order.entryPrice,
    order.currency,
  );
  return round3(fee.estimatedFee);
}

export function estimateCandidateBrokerageFeeMYR(candidate: AllocationCandidate): number {
  const shares = buyableShares(candidate);
  if (shares <= 0) return 0;
  const fee = getBrokerageEstimate(
    candidate.market,
    shares,
    candidate.entryPrice,
    candidate.currency,
  );
  return round3(fee.estimatedFee);
}

function fundingRowsFromOrders(orders: ManualOrderItem[]): OrderFundingRow[] {
  return orders
    .filter((o) => !o.completed && o.side === 'buy')
    .map((o) => {
      const orderAmountMYR = pendingOrderAmountMYR(o);
      return {
        orderId: o.id,
        symbol: o.symbol,
        labelJa: o.name,
        shares: o.estimatedShares,
        entryPriceMYR: o.entryPrice,
        orderAmountMYR,
        brokerageFeeMYR: estimateOrderBrokerageFeeMYR(o),
      };
    });
}

export function buildOrderFundingSummary(input: {
  cashMYR: number;
  orders: ManualOrderItem[];
}): OrderFundingSummary {
  const rows = fundingRowsFromOrders(input.orders);
  const orderTotalMYR = round3(rows.reduce((s, r) => s + r.orderAmountMYR, 0));
  const estimatedFeesMYR = round3(rows.reduce((s, r) => s + r.brokerageFeeMYR, 0));
  const grandTotalMYR = round3(orderTotalMYR + estimatedFeesMYR);
  const cashMYR = round3(Math.max(0, input.cashMYR));
  const deployableCashMYR = round3(Math.max(0, cashMYR - estimatedFeesMYR));
  const balanceAfterMYR = round3(cashMYR - grandTotalMYR);
  const canPlaceOrders = balanceAfterMYR >= -0.001;

  return {
    cashMYR,
    orderTotalMYR,
    estimatedFeesMYR,
    grandTotalMYR,
    deployableCashMYR,
    balanceAfterMYR,
    canPlaceOrders,
    rows,
  };
}

export function buildOrderFundingFromAppState(input: {
  cashMYR: number;
  manualOrderList: ManualOrderItem[];
}): OrderFundingSummary {
  const pending = getPendingMalaysiaOrders(input.manualOrderList);
  return buildOrderFundingSummary({ cashMYR: input.cashMYR, orders: pending });
}

/** entryPrice固定 · 100株単位削減で 現金 ≥ 注文+手数料 */
export function fitPendingOrdersToCashWithFees(
  orders: ManualOrderItem[],
  cashMYR: number,
): {
  orders: ManualOrderItem[];
  proposal: ShareReductionProposal;
  funding: OrderFundingSummary;
} {
  const pending = orders.filter((o) => !o.completed && o.side === 'buy');
  const proposal = proposeShareReductionToFitCash(pending, cashMYR, (input) =>
    buildOrderFundingSummary(input),
  );
  const funding = buildOrderFundingSummary({
    cashMYR,
    orders: proposal.proposedOrders,
  });
  return { orders: proposal.proposedOrders, proposal, funding };
}

function candidatesFundingTotals(candidates: AllocationCandidate[]): {
  orderTotalMYR: number;
  estimatedFeesMYR: number;
  grandTotalMYR: number;
} {
  let orderTotalMYR = 0;
  let estimatedFeesMYR = 0;
  for (const c of candidates) {
    const shares = buyableShares(c);
    if (shares <= 0) continue;
    orderTotalMYR += round3(c.entryPrice * shares);
    estimatedFeesMYR += estimateCandidateBrokerageFeeMYR(c);
  }
  orderTotalMYR = round3(orderTotalMYR);
  estimatedFeesMYR = round3(estimatedFeesMYR);
  return {
    orderTotalMYR,
    estimatedFeesMYR,
    grandTotalMYR: round3(orderTotalMYR + estimatedFeesMYR),
  };
}

function reduceCandidateShares(
  candidate: AllocationCandidate,
  sharesToRemove: number,
): AllocationCandidate | null {
  const shares = buyableShares(candidate);
  const nextShares = shares - sharesToRemove;
  if (nextShares <= 0) return null;
  const entryPrice = candidate.entryPrice;
  return {
    ...candidate,
    entryPrice,
    estimatedShares: candidate.isFractionalShares ? nextShares : nextShares,
    allocationMYR: round3(entryPrice * nextShares),
    allocationAdjusted: true,
  };
}

/** entryPrice固定 · 100株単位削減で手数料込み現金内 */
export function fitAllocationCandidatesToCashNetOfFees(
  candidates: AllocationCandidate[],
  cashMYR: number,
): {
  candidates: AllocationCandidate[];
  reductions: { symbol: string; labelJa: string; sharesRemoved: number }[];
  orderTotalMYR: number;
  estimatedFeesMYR: number;
  grandTotalMYR: number;
  canPlaceOrders: boolean;
  entryPricesUnchanged: boolean;
} {
  const buyable = candidates.filter((c) => buyableShares(c) > 0);
  if (buyable.length === 0) {
    return {
      candidates,
      reductions: [],
      orderTotalMYR: 0,
      estimatedFeesMYR: 0,
      grandTotalMYR: 0,
      canPlaceOrders: true,
      entryPricesUnchanged: true,
    };
  }

  let current = [...candidates];
  const reductions: { symbol: string; labelJa: string; sharesRemoved: number }[] = [];
  const originalPrices = new Map(candidates.map((c) => [c.symbol, c.entryPrice]));

  let guard = 0;
  while (guard++ < 64) {
    const totals = candidatesFundingTotals(current);
    if (totals.grandTotalMYR <= cashMYR + 0.001) break;

    let reduced = false;
    for (const sym of MALAYSIA_V4_SHARE_REDUCTION_PRIORITY) {
      const idx = current.findIndex(
        (c) => c.symbol === sym && buyableShares(c) >= SHARE_REDUCTION_CHUNK,
      );
      if (idx < 0) continue;
      const before = current[idx]!;
      const next = reduceCandidateShares(before, SHARE_REDUCTION_CHUNK);
      if (!next) {
        current = current.filter((_, i) => i !== idx);
      } else {
        current[idx] = next;
      }
      reductions.push({
        symbol: sym,
        labelJa: before.name,
        sharesRemoved: SHARE_REDUCTION_CHUNK,
      });
      reduced = true;
      break;
    }
    if (!reduced) break;
  }

  const final = candidatesFundingTotals(current);
  const entryPricesUnchanged = current.every(
    (c) => round3(c.entryPrice) === round3(originalPrices.get(c.symbol) ?? c.entryPrice),
  );

  return {
    candidates: current.filter((c) => buyableShares(c) > 0),
    reductions,
    orderTotalMYR: final.orderTotalMYR,
    estimatedFeesMYR: final.estimatedFeesMYR,
    grandTotalMYR: final.grandTotalMYR,
    canPlaceOrders: final.grandTotalMYR <= cashMYR + 0.001,
    entryPricesUnchanged,
  };
}
