/**
 * MACD×52w 重複除外18イベント 時系列・DD監査 — ルール変更なし
 */
import { FORWARD_SIGNAL_START } from '../../constants/forwardValidation';
import type {
  ForwardMacdDist52DedupTimelineAuditReport,
  ForwardMacdDist52DedupTimelineRow,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { buildDayBuckets } from './forwardValidationMacdDist52DedupDayAudit';
import { auditPassedTrades } from './forwardValidationPassedTradesAudit';
import { matchesMacdDist52 } from './forwardValidationMacdDist52PeriodAudit';

const COHORT_LABEL = 'MACD>=0.25 × 52w<=-5%';

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

export function buildTimelineRows(
  buckets: ReturnType<typeof buildDayBuckets>,
): ForwardMacdDist52DedupTimelineRow[] {
  let cumulative = 0;
  return buckets.map((b, index) => {
    cumulative = round3(cumulative + b.avgReturnPct);
    const isWin = b.avgReturnPct > 0;
    return {
      index: index + 1,
      signalDate: b.signalDate,
      avgReturnPct: b.avgReturnPct,
      outcomeJa: isWin ? '勝' : '敗',
      etfCount: b.tradeCount,
      symbols: b.symbols,
      cumulativeReturnPct: cumulative,
      hasMaxHold: b.hasMaxHold,
    };
  });
}

export function maxConsecutiveLosses(rows: ForwardMacdDist52DedupTimelineRow[]): number {
  let max = 0;
  let current = 0;
  for (const r of rows) {
    if (r.avgReturnPct <= 0) {
      current++;
      max = Math.max(max, current);
    } else {
      current = 0;
    }
  }
  return max;
}

export function maxDrawdownPct(rows: ForwardMacdDist52DedupTimelineRow[]): number {
  if (rows.length === 0) return 0;
  let peak = rows[0]!.cumulativeReturnPct;
  let maxDd = 0;
  for (const r of rows) {
    peak = Math.max(peak, r.cumulativeReturnPct);
    const dd = round3(peak - r.cumulativeReturnPct);
    maxDd = Math.max(maxDd, dd);
  }
  return round3(maxDd);
}

function formatRow(r: ForwardMacdDist52DedupTimelineRow): string {
  return (
    `${r.index}. ${r.signalDate} · 均R${r.avgReturnPct}% · ${r.outcomeJa} · ` +
    `ETF${r.etfCount}（${r.symbols.join(',')}） · 累積${r.cumulativeReturnPct}%`
  );
}

export function auditMacdDist52DedupTimeline(input: {
  bundle: ForwardOhlcvBundle;
}): ForwardMacdDist52DedupTimelineAuditReport {
  const passed = auditPassedTrades(input);
  const cohort = passed.trades.filter(matchesMacdDist52);
  const buckets = buildDayBuckets(cohort);
  const timeline = buildTimelineRows(buckets);
  const finalCumulative =
    timeline.length > 0 ? timeline[timeline.length - 1]!.cumulativeReturnPct : 0;
  const maxLossStreak = maxConsecutiveLosses(timeline);
  const maxDd = maxDrawdownPct(timeline);
  const winCount = timeline.filter((r) => r.avgReturnPct > 0).length;

  const humanLines = [
    `【MACD×52w 重複除外 時系列監査】${FORWARD_SIGNAL_START} ～ ${input.bundle.latestDate}`,
    `対象 ${COHORT_LABEL} · ${cohort.length}トレード → ${timeline.length}イベント`,
    '（シグナル日1件 · 当日利益率=ETF平均 · 累積=算術和 · 監査のみ）',
    '',
    '■ サマリー',
    `イベント数 ${timeline.length} · 勝${winCount} 敗${timeline.length - winCount}`,
    `最大連敗 ${maxLossStreak} · 最大ドローダウン ${maxDd}% · 最終累積 ${finalCumulative}%`,
    '',
    '■ 時系列一覧',
    ...(timeline.length > 0 ? timeline.map(formatRow) : ['（該当なし）']),
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate: FORWARD_SIGNAL_START,
    toDate: input.bundle.latestDate,
    totalTrades: passed.tradeCount,
    cohortLabelJa: COHORT_LABEL,
    underlyingTradeCount: cohort.length,
    eventCount: timeline.length,
    winCount,
    lossCount: timeline.length - winCount,
    maxConsecutiveLosses: maxLossStreak,
    maxDrawdownPct: maxDd,
    finalCumulativeReturnPct: finalCumulative,
    timeline,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export function formatMacdDist52DedupTimelineCsv(
  report: ForwardMacdDist52DedupTimelineAuditReport,
): string {
  const header =
    'index,signalDate,avgReturnPct,outcome,etfCount,symbols,cumulativeReturnPct,hasMaxHold';
  const rows = report.timeline.map((r) =>
    [
      r.index,
      r.signalDate,
      r.avgReturnPct,
      r.outcomeJa,
      r.etfCount,
      r.symbols.join('+'),
      r.cumulativeReturnPct,
      r.hasMaxHold ? 1 : 0,
    ].join(','),
  );
  const summary = [
    '',
    'metric,value',
    `maxConsecutiveLosses,${report.maxConsecutiveLosses}`,
    `maxDrawdownPct,${report.maxDrawdownPct}`,
    `finalCumulativeReturnPct,${report.finalCumulativeReturnPct}`,
  ];
  return [header, ...rows, ...summary].join('\n');
}
