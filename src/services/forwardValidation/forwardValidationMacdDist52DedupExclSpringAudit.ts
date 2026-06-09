/**
 * MACD×52w 重複除外 · 2025年4〜5月イベント除外 再集計 — ルール変更なし
 */
import { FORWARD_SIGNAL_START } from '../../constants/forwardValidation';
import type {
  ForwardMacdDist52DedupExclSpringAuditReport,
  ForwardMacdDist52DedupExclSpringMetrics,
  ForwardMacdDist52DedupTimelineRow,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { buildDayBuckets } from './forwardValidationMacdDist52DedupDayAudit';
import {
  buildTimelineRows,
  maxConsecutiveLosses,
  maxDrawdownPct,
} from './forwardValidationMacdDist52DedupTimelineAudit';
import { auditPassedTrades } from './forwardValidationPassedTradesAudit';
import { matchesMacdDist52 } from './forwardValidationMacdDist52PeriodAudit';

const COHORT_LABEL = 'MACD>=0.25 × 52w<=-5%';
const EXCLUDE_MONTHS = ['2025-04', '2025-05'] as const;

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

function monthKey(d: string): string {
  return d.slice(0, 7);
}

function isSpringMonth(signalDate: string): boolean {
  return (EXCLUDE_MONTHS as readonly string[]).includes(monthKey(signalDate));
}

function buildMetrics(
  labelJa: string,
  timeline: ForwardMacdDist52DedupTimelineRow[],
): ForwardMacdDist52DedupExclSpringMetrics {
  const returns = timeline.map((r) => r.avgReturnPct);
  const wins = timeline.filter((r) => r.avgReturnPct > 0);
  const finalCumulative =
    timeline.length > 0 ? timeline[timeline.length - 1]!.cumulativeReturnPct : 0;
  return {
    labelJa,
    eventCount: timeline.length,
    winCount: wins.length,
    winRatePct: timeline.length > 0 ? round3((wins.length / timeline.length) * 100) : 0,
    avgReturnPct: mean(returns),
    sharpe: tradeSharpe(returns),
    maxConsecutiveLosses: maxConsecutiveLosses(timeline),
    maxDrawdownPct: maxDrawdownPct(timeline),
    cumulativeReturnPct: finalCumulative,
  };
}

function formatMetrics(m: ForwardMacdDist52DedupExclSpringMetrics): string {
  return [
    `${m.labelJa}`,
    `件数 ${m.eventCount} · 勝率 ${m.winRatePct}% · 均R ${m.avgReturnPct ?? '—'}%`,
    `Sharpe ${m.sharpe ?? '—'} · 最大連敗 ${m.maxConsecutiveLosses} · 最大DD ${m.maxDrawdownPct}%`,
    `累積利益率 ${m.cumulativeReturnPct}%`,
  ].join('\n');
}

export function auditMacdDist52DedupExclSpring(input: {
  bundle: ForwardOhlcvBundle;
}): ForwardMacdDist52DedupExclSpringAuditReport {
  const passed = auditPassedTrades(input);
  const cohort = passed.trades.filter(matchesMacdDist52);
  const allBuckets = buildDayBuckets(cohort);
  const allTimeline = buildTimelineRows(allBuckets);

  const remainingBuckets = allBuckets.filter((b) => !isSpringMonth(b.signalDate));
  const remainingTimeline = buildTimelineRows(remainingBuckets);
  const excludedTimeline = allTimeline.filter((r) => isSpringMonth(r.signalDate));

  const full = buildMetrics('除外前（18イベント相当）', allTimeline);
  const excluded = buildMetrics(`${EXCLUDE_MONTHS.join('・')}除外分`, excludedTimeline);
  const remaining = buildMetrics('除外後（残存イベント）', remainingTimeline);

  const humanLines = [
    `【MACD×52w 4〜5月イベント除外 再集計】${FORWARD_SIGNAL_START} ～ ${input.bundle.latestDate}`,
    `対象 ${COHORT_LABEL} · 重複除外 ${allTimeline.length}イベント`,
    `除外シグナル月: ${EXCLUDE_MONTHS.join(', ')} · ${excluded.eventCount}イベント除外`,
    '（監査のみ・ルール変更なし）',
    '',
    '■ 除外前',
    formatMetrics(full),
    '',
    '■ 除外対象',
    formatMetrics(excluded),
    '',
    '■ 除外後（再集計）',
    formatMetrics(remaining),
    '',
    ...(remainingTimeline.length > 0
      ? ['■ 残存イベント', ...remainingTimeline.map((r) => `${r.signalDate} · ${r.avgReturnPct}% · ${r.outcomeJa}`)]
      : ['■ 残存イベント', '（該当なし）']),
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate: FORWARD_SIGNAL_START,
    toDate: input.bundle.latestDate,
    totalTrades: passed.tradeCount,
    cohortLabelJa: COHORT_LABEL,
    excludeMonths: [...EXCLUDE_MONTHS],
    totalEventCount: allTimeline.length,
    excludedEventCount: excluded.eventCount,
    remainingEventCount: remaining.eventCount,
    full,
    excluded,
    remaining,
    remainingTimeline,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export function formatMacdDist52DedupExclSpringCsv(
  report: ForwardMacdDist52DedupExclSpringAuditReport,
): string {
  const header =
    'group,eventCount,winRatePct,avgReturnPct,sharpe,maxConsecutiveLosses,maxDrawdownPct,cumulativeReturnPct';
  const row = (m: ForwardMacdDist52DedupExclSpringMetrics) =>
    [
      m.labelJa,
      m.eventCount,
      m.winRatePct,
      m.avgReturnPct ?? '',
      m.sharpe ?? '',
      m.maxConsecutiveLosses,
      m.maxDrawdownPct,
      m.cumulativeReturnPct,
    ].join(',');
  return [header, row(report.full), row(report.excluded), row(report.remaining)].join('\n');
}
