/**
 * 実口座資産・エクスポージャー（監査88修正）
 *
 * 総資産 = 保有評価額 + 利用可能現金 + 拘束現金（= 現金合計）
 * 注文中評価額は資産に加算しない（現金の充当先 · pro forma 配分のみ）
 *
 * 監査87式（保有+注文中+現金）は二重計上 — audit87EffectiveExposureMYR で比較用に残す
 */
import type { AppState, ManualOrderItem, PortfolioPosition } from '../types';
import { calculateBuyingPower } from './buyingPower';
import { MALAYSIA_V4_TARGET_WEIGHTS } from '../constants/malaysiaV4TargetWeights';
import {
  computeMatchedStockValueMYR,
  computePendingOrderNotionalMYR,
  getMatchedMalaysiaPositions,
  getPendingMalaysiaOrders,
  projectPortfolioAfterFullFill,
  snapshotFromAppState,
} from './realAccountPortfolio';
import { safePrice, safeShares } from '../utils/safeNumeric';
import {
  buildPendingOrderValuationRows,
  computePendingOrderMarketValueMYR as computePendingOrderValuationMYR,
} from './realAccountOrderValuation';
import { buildOrderFundingSummary } from './realAccountOrderFunding';

export { computePendingOrderMarketValueMYR } from './realAccountOrderValuation';

const V4_SYMBOL_NAMES: Record<string, string> = {
  '5347': 'TENAGA',
  '1023': 'CIMB',
  '5398': 'GAMUDA',
  '6742': 'YTL',
  '3336': 'IJM',
};

const V4_SYMBOLS = Object.keys(MALAYSIA_V4_TARGET_WEIGHTS);
const CASH_BUCKET = 'CASH';

export type RealAccountCashBreakdown = {
  totalCashMYR: number;
  reservedCashMYR: number;
  availableCashMYR: number;
  buyingPowerDeductsPending: boolean;
};

export type RealAccountOrderCompareRow = {
  symbol: string;
  labelJa: string;
  shares: number;
  entryPriceMYR: number;
  aiOrderAmountMYR: number;
  aiMarketValueMYR: number;
  rakutenOrderAmountMYR: number | null;
  deltaMYR: number | null;
  noteJa: string;
};

export type RealAccountExposureAllocationRow = {
  symbol: string;
  labelJa: string;
  bucket: 'stock' | 'cash';
  matchedValueMYR: number;
  pendingValueMYR: number;
  combinedValueMYR: number;
  assumedWeightPct: number;
  projectedWeightPct: number;
  targetWeightPct: number;
  deltaAssumedPct: number;
  deltaProjectedPct: number;
};

export type RealAccountExposureReport = {
  matchedStockValueMYR: number;
  /** 指値×株数（注文価格ベース） */
  pendingOrderValueMYR: number;
  /** Yahoo終値×株数（参考 · mark-to-market） */
  pendingMarkToMarketMYR: number;
  pendingCommittedMYR: number;
  cash: RealAccountCashBreakdown;
  /** 保有 + 現金合計（二重計上なし） */
  totalAssetsMYR: number;
  /** @deprecated 互換 — totalAssetsMYR と同値 */
  effectiveExposureMYR: number;
  /** 監査87式（二重計上あり） */
  audit87EffectiveExposureMYR: number;
  doubleCountExcessMYR: number;
  isDoubleCounting: boolean;
  /** 互換 — cash.availableCashMYR */
  availableCashMYR: number;
  additionalPurchasableMYR: number;
  cashCushionAfterFillMYR: number;
  isOverCommitted: boolean;
  /** 手数料込み発注可否 */
  orderFunding?: import('./realAccountOrderFunding').OrderFundingSummary;
  orderCompareRows: RealAccountOrderCompareRow[];
  allocationRows: RealAccountExposureAllocationRow[];
  assumedSummaryJa: string;
  projectedSummaryJa: string;
  assetsSummaryJa: string;
  liquiditySummaryJa: string;
};

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function computeCashBreakdown(input: {
  totalCashMYR: number;
  pendingCommittedMYR: number;
}): RealAccountCashBreakdown {
  const totalCashMYR = round3(Math.max(0, input.totalCashMYR));
  const reservedCashMYR = round3(Math.min(totalCashMYR, input.pendingCommittedMYR));
  const availableCashMYR = round3(Math.max(0, totalCashMYR - reservedCashMYR));
  return {
    totalCashMYR,
    reservedCashMYR,
    availableCashMYR,
    buyingPowerDeductsPending: false,
  };
}

function valueBySymbol(positions: PortfolioPosition[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of positions) {
    const sym = p.symbol.toUpperCase();
    const shares = safeShares(p.shares, 0);
    const px = safePrice(p.currentPrice, p.averageBuyPrice, 0);
    out[sym] = round3((out[sym] ?? 0) + shares * px);
  }
  return out;
}

function pendingValueBySymbol(
  orders: ManualOrderItem[],
  priceBySymbol?: Record<string, number>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of buildPendingOrderValuationRows(orders, priceBySymbol)) {
    const sym = row.symbol.toUpperCase();
    out[sym] = round3((out[sym] ?? 0) + row.orderPriceMYR);
  }
  return out;
}

export function buildOrderCompareRows(
  orders: ManualOrderItem[],
  priceBySymbol?: Record<string, number>,
): RealAccountOrderCompareRow[] {
  return buildPendingOrderValuationRows(orders, priceBySymbol).map((r) => ({
    symbol: r.symbol,
    labelJa: r.labelJa,
    shares: r.shares,
    entryPriceMYR: r.limitPriceMYR,
    aiOrderAmountMYR: r.orderPriceMYR,
    aiMarketValueMYR: r.yahooMarketValueMYR ?? r.orderPriceMYR,
    rakutenOrderAmountMYR: null,
    deltaMYR: r.orderVsYahooDeltaMYR,
    noteJa: '注文評価=指値×株数 · Yahoo列=終値×株数(参考)',
  }));
}

function buildAllocationRows(input: {
  matchedBySym: Record<string, number>;
  pendingBySym: Record<string, number>;
  totalAssetsMYR: number;
  availableCashMYR: number;
  projectedBySym: Record<string, number>;
  projectedTotalMYR: number;
  cashAfterFillMYR: number;
}): RealAccountExposureAllocationRow[] {
  const rows: RealAccountExposureAllocationRow[] = [];

  for (const sym of V4_SYMBOLS) {
    const matched = input.matchedBySym[sym] ?? 0;
    const pending = input.pendingBySym[sym] ?? 0;
    const combined = round3(matched + pending);
    const target = MALAYSIA_V4_TARGET_WEIGHTS[sym] ?? 0;
    const assumedWeight =
      input.totalAssetsMYR > 0 ? round3((combined / input.totalAssetsMYR) * 100) : 0;
    const projectedWeight =
      input.projectedTotalMYR > 0
        ? round3(((input.projectedBySym[sym] ?? 0) / input.projectedTotalMYR) * 100)
        : 0;
    rows.push({
      symbol: sym,
      labelJa: V4_SYMBOL_NAMES[sym] ?? sym,
      bucket: 'stock',
      matchedValueMYR: matched,
      pendingValueMYR: pending,
      combinedValueMYR: combined,
      assumedWeightPct: assumedWeight,
      projectedWeightPct: projectedWeight,
      targetWeightPct: target,
      deltaAssumedPct: round3(assumedWeight - target),
      deltaProjectedPct: round3(projectedWeight - target),
    });
  }

  const cashAssumed =
    input.totalAssetsMYR > 0
      ? round3((input.availableCashMYR / input.totalAssetsMYR) * 100)
      : 100;
  const cashProjected =
    input.projectedTotalMYR > 0
      ? round3((Math.max(0, input.cashAfterFillMYR) / input.projectedTotalMYR) * 100)
      : 0;

  rows.push({
    symbol: CASH_BUCKET,
    labelJa: '利用可能現金',
    bucket: 'cash',
    matchedValueMYR: 0,
    pendingValueMYR: 0,
    combinedValueMYR: round3(input.availableCashMYR),
    assumedWeightPct: cashAssumed,
    projectedWeightPct: Math.max(0, cashProjected),
    targetWeightPct: 0,
    deltaAssumedPct: cashAssumed,
    deltaProjectedPct: Math.max(0, cashProjected),
  });

  return rows;
}

export function buildRealAccountExposureReport(input: {
  matchedPositions: PortfolioPosition[];
  pendingOrders: ManualOrderItem[];
  /** 現金合計（buyingPower）— 旧API名 availableCashMYR 互換 */
  availableCashMYR: number;
  priceBySymbol?: Record<string, number>;
}): RealAccountExposureReport {
  const matched = getMatchedMalaysiaPositions(input.matchedPositions);
  const pending = getPendingMalaysiaOrders(input.pendingOrders);
  const matchedStockValueMYR = computeMatchedStockValueMYR(matched);
  const pendingOrderValueMYR = computePendingOrderValuationMYR(
    pending,
    input.priceBySymbol,
    matched,
    'order_price',
  );
  const pendingMarkToMarketMYR = computePendingOrderValuationMYR(
    pending,
    input.priceBySymbol,
    matched,
    'yahoo_market',
  );
  const pendingCommittedMYR = computePendingOrderNotionalMYR(pending);
  const orderFunding = buildOrderFundingSummary({
    cashMYR: input.availableCashMYR,
    orders: pending,
  });
  const cash = computeCashBreakdown({
    totalCashMYR: input.availableCashMYR,
    pendingCommittedMYR: orderFunding.grandTotalMYR,
  });
  const totalAssetsMYR = round3(matchedStockValueMYR + cash.totalCashMYR);
  const audit87EffectiveExposureMYR = round3(
    matchedStockValueMYR + pendingOrderValueMYR + cash.totalCashMYR,
  );
  const doubleCountExcessMYR = round3(Math.max(0, audit87EffectiveExposureMYR - totalAssetsMYR));
  const isDoubleCounting = doubleCountExcessMYR > 0.001;
  const cashCushionAfterFillMYR = orderFunding.balanceAfterMYR;
  const additionalPurchasableMYR = round3(Math.max(0, orderFunding.deployableCashMYR - orderFunding.orderTotalMYR));
  const isOverCommitted = !orderFunding.canPlaceOrders;

  const matchedBySym = valueBySymbol(matched);
  const pendingBySym = pendingValueBySymbol(pending, input.priceBySymbol);

  const projectedPositions = projectPortfolioAfterFullFill(
    matched,
    pending,
    input.priceBySymbol,
  );
  const projectedBySym = valueBySymbol(projectedPositions);
  const projectedStockMYR = computeMatchedStockValueMYR(projectedPositions);
  const projectedTotalMYR =
    cashCushionAfterFillMYR >= 0
      ? round3(projectedStockMYR + cashCushionAfterFillMYR)
      : projectedStockMYR;

  const allocationRows = buildAllocationRows({
    matchedBySym,
    pendingBySym,
    totalAssetsMYR,
    availableCashMYR: cash.availableCashMYR,
    projectedBySym,
    projectedTotalMYR,
    cashAfterFillMYR: cashCushionAfterFillMYR,
  });

  const fmtWeights = (rows: RealAccountExposureAllocationRow[], field: 'assumedWeightPct' | 'projectedWeightPct') =>
    rows
      .filter((r) => r.bucket === 'stock')
      .map((r) => `${r.labelJa}${r[field]}%`)
      .join(' · ');

  const cashAssumedPct = allocationRows.find((r) => r.symbol === CASH_BUCKET)?.assumedWeightPct ?? 0;
  const cashProjectedPct = allocationRows.find((r) => r.symbol === CASH_BUCKET)?.projectedWeightPct ?? 0;

  return {
    matchedStockValueMYR,
    pendingOrderValueMYR,
    pendingMarkToMarketMYR,
    pendingCommittedMYR,
    cash,
    totalAssetsMYR,
    effectiveExposureMYR: totalAssetsMYR,
    audit87EffectiveExposureMYR,
    doubleCountExcessMYR,
    isDoubleCounting,
    availableCashMYR: cash.availableCashMYR,
    additionalPurchasableMYR,
    cashCushionAfterFillMYR,
    isOverCommitted,
    orderFunding,
    orderCompareRows: buildOrderCompareRows(pending, input.priceBySymbol),
    allocationRows,
    assumedSummaryJa: `想定配分(pro forma): ${fmtWeights(allocationRows, 'assumedWeightPct')} · 現金${cashAssumedPct}%`,
    projectedSummaryJa: `約定後予想: ${fmtWeights(allocationRows, 'projectedWeightPct')} · 現金${cashProjectedPct}%`,
    assetsSummaryJa: `総資産${totalAssetsMYR}MYR = 保有${matchedStockValueMYR} + 現金${cash.totalCashMYR}(利用可能${cash.availableCashMYR} + 拘束${cash.reservedCashMYR}) · 注文${pendingOrderValueMYR}MYR · Yahoo参考${pendingMarkToMarketMYR}MYR`,
    liquiditySummaryJa: `発注後残高${cashCushionAfterFillMYR}MYR · 手数料${orderFunding.estimatedFeesMYR}MYR · 追加購入可能${additionalPurchasableMYR}MYR${isOverCommitted ? ' · 警告:手数料込み現金超過' : ''}`,
  };
}

export function buildRealAccountExposureFromAppState(
  state: AppState,
  priceBySymbol?: Record<string, number>,
): RealAccountExposureReport {
  const snap = snapshotFromAppState(state);
  return buildRealAccountExposureReport({
    matchedPositions: snap.matchedPositions,
    pendingOrders: snap.pendingOrders,
    availableCashMYR: snap.cashMYR,
    /** Yahoo参考のみ — 注文金額計算には使用しない */
    priceBySymbol,
  });
}
