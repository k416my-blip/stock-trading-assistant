/**
 * Bursa Phase 9 — 市場監視 UI フォーマット
 */
import type { BursaPhase9Analysis } from '../../types/bursaDisclosure';

export const MONITORING_MISSING_JA = 'データ未取得';

function fmtPct(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return MONITORING_MISSING_JA;
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
}

function fmtLarge(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return MONITORING_MISSING_JA;
  if (Math.abs(n) >= 1_000_000_000) return `RM ${(n / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(n) >= 1_000_000) return `RM ${(n / 1_000_000).toFixed(2)}M`;
  return `RM ${n.toLocaleString('en-US')}`;
}

function fmtSen(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return MONITORING_MISSING_JA;
  return `${n.toFixed(1)} sen`;
}

export type MonitoringRankRow = {
  stockCode: string;
  companyNameJa: string;
  changeLabelJa: string;
  currentRankJa: string;
  isHolding: boolean;
  isWatchlist: boolean;
};

export type MonitoringEarningsRow = {
  stockCode: string;
  companyNameJa: string;
  periodJa: string;
  revenueJa: string;
  revenueChangeJa: string;
  netProfitJa: string;
  netProfitChangeJa: string;
  epsJa: string;
  epsChangeJa: string;
  dividendJa: string;
  dividendChangeJa: string;
};

export type MonitoringDividendRow = {
  stockCode: string;
  companyNameJa: string;
  statusJa: string;
  reasonJa: string;
};

export type MonitoringAlertRow = {
  atJa: string;
  stockCode: string;
  companyNameJa: string;
  kindJa: string;
  messageJa: string;
};

export type MonitoringWatchlistRow = {
  stockCode: string;
  companyNameJa: string;
  addedAtJa: string;
};

export type MarketMonitoringReport = {
  previousSnapshotAtJa: string;
  snapshotCapturedAtJa: string;
  rankChanges: MonitoringRankRow[];
  earningsChanges: MonitoringEarningsRow[];
  dividendChanges: MonitoringDividendRow[];
  holdingsRankChanges: MonitoringRankRow[];
  holdingsEarningsChanges: MonitoringEarningsRow[];
  holdingsDividendChanges: MonitoringDividendRow[];
  watchlist: MonitoringWatchlistRow[];
  alerts: MonitoringAlertRow[];
  alertHistory: MonitoringAlertRow[];
  notifications: string[];
  dataSourceLabel: string;
};

function mapRank(rows: BursaPhase9Analysis['rankChanges']): MonitoringRankRow[] {
  return rows.map((r) => ({
    stockCode: r.stockCode,
    companyNameJa: r.companyName ?? MONITORING_MISSING_JA,
    changeLabelJa: r.changeLabelJa,
    currentRankJa: r.currentRank != null ? `${r.currentRank}位` : MONITORING_MISSING_JA,
    isHolding: r.isHolding,
    isWatchlist: r.isWatchlist,
  }));
}

function mapEarnings(rows: BursaPhase9Analysis['earningsChanges']): MonitoringEarningsRow[] {
  return rows.map((e) => ({
    stockCode: e.stockCode,
    companyNameJa: e.companyName ?? MONITORING_MISSING_JA,
    periodJa: `${e.previousPeriodJa} → ${e.latestPeriodJa}`,
    revenueJa: fmtLarge(e.revenueLatest),
    revenueChangeJa: fmtPct(e.revenueChangePct),
    netProfitJa: fmtLarge(e.netProfitLatest),
    netProfitChangeJa: fmtPct(e.netProfitChangePct),
    epsJa: fmtSen(e.epsLatest),
    epsChangeJa: fmtPct(e.epsChangePct),
    dividendJa: e.dividendLatest != null ? `RM ${e.dividendLatest.toFixed(2)}` : MONITORING_MISSING_JA,
    dividendChangeJa: fmtPct(e.dividendChangePct),
  }));
}

function mapDividend(rows: BursaPhase9Analysis['dividendChanges']): MonitoringDividendRow[] {
  return rows.map((d) => ({
    stockCode: d.stockCode,
    companyNameJa: d.companyName ?? MONITORING_MISSING_JA,
    statusJa: d.status ?? MONITORING_MISSING_JA,
    reasonJa: d.reasonJa,
  }));
}

function mapAlerts(
  rows: Array<{
    at: string;
    stockCode: string;
    companyName: string | null;
    kind: string;
    messageJa: string;
  }>,
): MonitoringAlertRow[] {
  return rows.map((a) => ({
    atJa: a.at,
    stockCode: a.stockCode,
    companyNameJa: a.companyName ?? MONITORING_MISSING_JA,
    kindJa: a.kind,
    messageJa: a.messageJa,
  }));
}

export function formatMarketMonitoringReport(phase9: BursaPhase9Analysis): MarketMonitoringReport {
  return {
    previousSnapshotAtJa: phase9.previousSnapshotAt ?? MONITORING_MISSING_JA,
    snapshotCapturedAtJa: phase9.snapshotCapturedAt ?? MONITORING_MISSING_JA,
    rankChanges: mapRank(phase9.rankChanges),
    earningsChanges: mapEarnings(phase9.earningsChanges),
    dividendChanges: mapDividend(phase9.dividendChanges),
    holdingsRankChanges: mapRank(phase9.holdingsMonitor.rankChanges),
    holdingsEarningsChanges: mapEarnings(phase9.holdingsMonitor.earningsChanges),
    holdingsDividendChanges: mapDividend(phase9.holdingsMonitor.dividendChanges),
    watchlist: phase9.watchlist.map((w) => ({
      stockCode: w.stockCode,
      companyNameJa: w.companyName ?? MONITORING_MISSING_JA,
      addedAtJa: w.addedAt,
    })),
    alerts: mapAlerts(phase9.alerts),
    alertHistory: mapAlerts(phase9.alertHistory),
    notifications: phase9.notifications,
    dataSourceLabel: 'LIVE · KLSE Screener · 実データのみ',
  };
}
