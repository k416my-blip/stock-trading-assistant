/**
 * Bursa Phase 8 — 今日の売買 UI フォーマット
 */
import type { BursaPhase8Analysis } from '../../types/bursaDisclosure';

export const TODAY_TRADING_MISSING_JA = 'データ未取得';

function fmtScore(n: number | null): string {
  return n != null && Number.isFinite(n) ? String(n) : TODAY_TRADING_MISSING_JA;
}

function fmtPrice(n: number | null): string {
  return n != null && Number.isFinite(n) ? `RM ${n.toFixed(2)}` : TODAY_TRADING_MISSING_JA;
}

function fmtPct(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return TODAY_TRADING_MISSING_JA;
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
}

function fmtMoney(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return TODAY_TRADING_MISSING_JA;
  return `RM ${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

export type TodayTradingBuyRow = {
  rank: string;
  stockCode: string;
  companyNameJa: string;
  compositeScoreJa: string;
  currentPriceJa: string;
  fairPriceJa: string;
  discountJa: string;
  judgmentJa: string;
  reasonJa: string;
};

export type TodayTradingSellRow = {
  symbol: string;
  companyNameJa: string;
  kindJa: string;
  reasonJa: string;
  currentPriceJa: string;
  premiumJa: string;
};

export type TodayTradingAllocationRow = {
  budgetLabelJa: string;
  stockCode: string;
  companyNameJa: string;
  allocationJa: string;
  allocationPctJa: string;
  sharesJa: string;
  requiredJa: string;
  remainderJa: string;
  currentPriceJa: string;
};

export type TodayTradingPriorityRow = {
  symbol: string;
  companyNameJa: string;
  priorityJa: string;
  reasonJa: string;
};

export type TodayTradingReport = {
  primaryActionJa: string;
  primaryReasonJa: string;
  buyTop10: TodayTradingBuyRow[];
  sellCandidates: TodayTradingSellRow[];
  allocations: TodayTradingAllocationRow[];
  priorityOrder: TodayTradingPriorityRow[];
  notifications: string[];
  dataSourceLabel: string;
};

export function formatTodayTradingReport(phase8: BursaPhase8Analysis): TodayTradingReport {
  const buyTop10: TodayTradingBuyRow[] = phase8.buyTop10.map((b) => ({
    rank: b.rank != null ? `${b.rank}位` : TODAY_TRADING_MISSING_JA,
    stockCode: b.stockCode,
    companyNameJa: b.companyName ?? TODAY_TRADING_MISSING_JA,
    compositeScoreJa: fmtScore(b.compositeScore),
    currentPriceJa: fmtPrice(b.currentPrice),
    fairPriceJa: fmtPrice(b.fairPrice),
    discountJa: fmtPct(b.discountPct),
    judgmentJa: b.judgment ?? TODAY_TRADING_MISSING_JA,
    reasonJa: b.reasonJa,
  }));

  const sellCandidates: TodayTradingSellRow[] = phase8.sellCandidates.map((s) => ({
    symbol: s.symbol,
    companyNameJa: s.companyName ?? TODAY_TRADING_MISSING_JA,
    kindJa: s.kind,
    reasonJa: s.reasonJa,
    currentPriceJa: fmtPrice(s.currentPrice),
    premiumJa: fmtPct(s.premiumPct),
  }));

  const allocations: TodayTradingAllocationRow[] = phase8.budgetPlans.flatMap((plan) =>
    plan.rows.map((row) => ({
      budgetLabelJa: fmtMoney(plan.budgetMYR),
      stockCode: row.stockCode,
      companyNameJa: row.companyName ?? TODAY_TRADING_MISSING_JA,
      allocationJa: fmtMoney(row.allocationMYR),
      allocationPctJa: `${row.allocationPct}%`,
      sharesJa: row.shares != null ? `${row.shares}株` : TODAY_TRADING_MISSING_JA,
      requiredJa: fmtMoney(row.requiredMYR),
      remainderJa: fmtMoney(row.remainderMYR),
      currentPriceJa: fmtPrice(row.currentPrice),
    })),
  );

  const priorityOrder: TodayTradingPriorityRow[] = phase8.priorityOrder.map((p) => ({
    symbol: p.symbol,
    companyNameJa: p.companyName ?? TODAY_TRADING_MISSING_JA,
    priorityJa: p.priority,
    reasonJa: p.reasonJa,
  }));

  return {
    primaryActionJa: phase8.primaryAction.actionJa,
    primaryReasonJa: phase8.primaryAction.reasonJa,
    buyTop10,
    sellCandidates,
    allocations,
    priorityOrder,
    notifications: phase8.notifications,
    dataSourceLabel: 'LIVE · KLSE Screener · 実データのみ',
  };
}
