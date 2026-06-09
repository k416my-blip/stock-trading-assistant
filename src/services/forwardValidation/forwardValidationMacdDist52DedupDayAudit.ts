/**
 * MACD×52w シグナル日重複除外監査 — 同一日複数ETFを1件 · ルール変更なし
 */
import { FORWARD_SIGNAL_START } from '../../constants/forwardValidation';
import type {
  ForwardMacdDist52DedupDayAuditReport,
  ForwardMacdDist52DedupDayBucket,
  ForwardMacdDist52DedupDaySnapshot,
  ForwardPassedTradeRecord,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { auditPassedTrades } from './forwardValidationPassedTradesAudit';
import { matchesMacdDist52 } from './forwardValidationMacdDist52PeriodAudit';

const MACD_THRESHOLD = 0.25;
const DIST52_THRESHOLD = -5;
const COHORT_LABEL = `MACD>=${MACD_THRESHOLD} × 52w<=${DIST52_THRESHOLD}%`;


function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function mean(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return round3(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function std(vals: number[]): number {
  if (vals.length === 0) return 0;
  const m = mean(vals) ?? 0;
  return Math.sqrt(vals.reduce((a, x) => a + (x - m) ** 2, 0) / vals.length);
}

function tradeSharpe(returns: number[]): number | null {
  if (returns.length < 2) return null;
  const mu = mean(returns);
  const sigma = std(returns);
  if (mu == null || sigma <= 1e-9) return null;
  return round3(mu / sigma);
}

/** 同一シグナル日の複数ETFを1日1件に集約（利益率は当日平均） */
export function buildDayBuckets(trades: ForwardPassedTradeRecord[]): ForwardMacdDist52DedupDayBucket[] {
  const byDate = new Map<string, ForwardPassedTradeRecord[]>();
  for (const t of trades) {
    const list = byDate.get(t.signalDate) ?? [];
    list.push(t);
    byDate.set(t.signalDate, list);
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([signalDate, rows]) => {
      const returns = rows.map((r) => r.returnPct);
      return {
        signalDate,
        tradeCount: rows.length,
        symbols: [...new Set(rows.map((r) => r.symbol))].sort(),
        avgReturnPct: mean(returns)!,
        hasMaxHold: rows.some((r) => r.exitReason === 'max_hold'),
      };
    });
}

function buildSnapshot(
  labelJa: string,
  buckets: ForwardMacdDist52DedupDayBucket[],
): ForwardMacdDist52DedupDaySnapshot {
  const returns = buckets.map((b) => b.avgReturnPct);
  const wins = buckets.filter((b) => b.avgReturnPct > 0);
  const maxHoldDays = buckets.filter((b) => b.hasMaxHold);
  return {
    labelJa,
    dayCount: buckets.length,
    underlyingTradeCount: buckets.reduce((s, b) => s + b.tradeCount, 0),
    winCount: wins.length,
    winRatePct: buckets.length > 0 ? round3((wins.length / buckets.length) * 100) : 0,
    avgReturnPct: mean(returns),
    sharpe: tradeSharpe(returns),
    maxHoldRatePct: buckets.length > 0 ? round3((maxHoldDays.length / buckets.length) * 100) : 0,
  };
}

function formatSnap(s: ForwardMacdDist52DedupDaySnapshot): string {
  return (
    `${s.labelJa}: ${s.dayCount}件（元${s.underlyingTradeCount}トレード） · 勝率${s.winRatePct}% · ` +
    `均R${s.avgReturnPct ?? '—'}% · Sharpe${s.sharpe ?? '—'} · 25日満了${s.maxHoldRatePct}%`
  );
}

export function auditMacdDist52DedupDay(input: {
  bundle: ForwardOhlcvBundle;
}): ForwardMacdDist52DedupDayAuditReport {
  const passed = auditPassedTrades(input);
  const cohort = passed.trades.filter(matchesMacdDist52);
  const buckets = buildDayBuckets(cohort);

  const rawTrades = cohort;
  const rawWins = rawTrades.filter((t) => t.returnPct > 0);
  const rawMaxHold = rawTrades.filter((t) => t.exitReason === 'max_hold');
  const rawReturns = rawTrades.map((t) => t.returnPct);
  const beforeDedup: ForwardMacdDist52DedupDaySnapshot = {
    labelJa: '重複除外前（トレード単位）',
    dayCount: rawTrades.length,
    underlyingTradeCount: rawTrades.length,
    winCount: rawWins.length,
    winRatePct: rawTrades.length > 0 ? round3((rawWins.length / rawTrades.length) * 100) : 0,
    avgReturnPct: mean(rawReturns),
    sharpe: tradeSharpe(rawReturns),
    maxHoldRatePct: rawTrades.length > 0 ? round3((rawMaxHold.length / rawTrades.length) * 100) : 0,
  };

  const afterDedup = buildSnapshot('重複除外後（シグナル日1件）', buckets);

  const humanLines = [
    `【MACD×52w シグナル日重複除外監査】${FORWARD_SIGNAL_START} ～ ${input.bundle.latestDate}`,
    `対象 条件適合 ${passed.tradeCount}件 · ${COHORT_LABEL}`,
    '同一シグナル日の複数ETF → 1件（当日利益率はETF平均 · 満了は当日いずれかが25日満了）',
    '（監査のみ・ルール変更なし）',
    '',
    '■ 重複除外前',
    formatSnap(beforeDedup),
    '',
    '■ 重複除外後',
    formatSnap(afterDedup),
    '',
    '※ Sharpe = 集計単位内リターンの mean/std（2件未満は—）',
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate: FORWARD_SIGNAL_START,
    toDate: input.bundle.latestDate,
    totalTrades: passed.tradeCount,
    cohortLabelJa: COHORT_LABEL,
    cohortTradeCount: cohort.length,
    uniqueSignalDays: buckets.length,
    beforeDedup,
    afterDedup,
    dayBuckets: buckets,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export function formatMacdDist52DedupDayCsv(report: ForwardMacdDist52DedupDayAuditReport): string {
  const header = 'group,dayCount,underlyingTrades,winRatePct,avgReturnPct,sharpe,maxHoldRatePct';
  const row = (s: ForwardMacdDist52DedupDaySnapshot) =>
    [
      s.labelJa,
      s.dayCount,
      s.underlyingTradeCount,
      s.winRatePct,
      s.avgReturnPct ?? '',
      s.sharpe ?? '',
      s.maxHoldRatePct,
    ].join(',');
  const dayHeader = 'signalDate,etfCount,symbols,avgReturnPct,hasMaxHold';
  const dayRows = report.dayBuckets.map((b) =>
    [b.signalDate, b.tradeCount, b.symbols.join('+'), b.avgReturnPct, b.hasMaxHold ? 1 : 0].join(','),
  );
  return [header, row(report.beforeDedup), row(report.afterDedup), '', dayHeader, ...dayRows].join('\n');
}
