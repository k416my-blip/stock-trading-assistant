/**
 * 指標×利益率 相関監査 — 条件適合96件 · ルール変更なし
 */
import { FORWARD_SIGNAL_START } from '../../constants/forwardValidation';
import type {
  ForwardPassedTradeRecord,
  ForwardReturnCorrelationAuditReport,
  ForwardReturnCorrelationMetricAudit,
  ForwardReturnCorrelationMetricId,
  ForwardReturnCorrelationRanking,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { auditPassedTrades } from './forwardValidationPassedTradesAudit';

const TOP_BOTTOM_N = 20;

const METRIC_DEFS: { id: ForwardReturnCorrelationMetricId; labelJa: string; pick: (t: ForwardPassedTradeRecord) => number }[] = [
  { id: 'adx', labelJa: 'ADX', pick: (t) => t.adx14 },
  { id: 'macd', labelJa: 'MACD', pick: (t) => t.macdHistPct },
  { id: 'dist52', labelJa: '52週高値乖離', pick: (t) => t.dist52wPct },
];

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function mean(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return round3(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function median(vals: number[]): number | null {
  if (vals.length === 0) return null;
  const sorted = [...vals].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return round3((sorted[mid - 1]! + sorted[mid]!) / 2);
  }
  return round3(sorted[mid]!);
}

/** ピアソン相関係数 */
export function pearsonCorrelation(xs: number[], ys: number[]): number | null {
  if (xs.length !== ys.length || xs.length < 2) return null;
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let dx2 = 0;
  let dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i]! - mx;
    const dy = ys[i]! - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  const den = Math.sqrt(dx2 * dy2);
  if (den <= 0) return null;
  return round3(num / den);
}

function sortByReturn(trades: ForwardPassedTradeRecord[]): ForwardPassedTradeRecord[] {
  return [...trades].sort(
    (a, b) => b.returnPct - a.returnPct || a.signalDate.localeCompare(b.signalDate),
  );
}

function analyzeMetric(
  def: (typeof METRIC_DEFS)[number],
  trades: ForwardPassedTradeRecord[],
): ForwardReturnCorrelationMetricAudit {
  const sorted = sortByReturn(trades);
  const top20 = sorted.slice(0, TOP_BOTTOM_N);
  const bottom20 = sorted.slice(-TOP_BOTTOM_N);
  const values = trades.map(def.pick);
  const returns = trades.map((t) => t.returnPct);
  const topVals = top20.map(def.pick);
  const bottomVals = bottom20.map(def.pick);
  const top20Median = median(topVals);
  const bottom20Median = median(bottomVals);

  return {
    id: def.id,
    labelJa: def.labelJa,
    correlation: pearsonCorrelation(values, returns),
    top20Avg: mean(topVals),
    bottom20Avg: mean(bottomVals),
    top20Median,
    bottom20Median,
    allMedian: median(values),
    medianGapTopMinusBottom:
      top20Median != null && bottom20Median != null
        ? round3(top20Median - bottom20Median)
        : null,
  };
}

function buildImpactRanking(
  metrics: ForwardReturnCorrelationMetricAudit[],
): ForwardReturnCorrelationRanking[] {
  const sorted = [...metrics].sort((a, b) => {
    const absA = a.correlation == null ? -1 : Math.abs(a.correlation);
    const absB = b.correlation == null ? -1 : Math.abs(b.correlation);
    return absB - absA;
  });
  return sorted.map((m, i) => ({
    rank: i + 1,
    metricId: m.id,
    labelJa: m.labelJa,
    correlation: m.correlation,
    absCorrelation: m.correlation == null ? null : round3(Math.abs(m.correlation)),
  }));
}

export function auditReturnCorrelation(input: {
  bundle: ForwardOhlcvBundle;
}): ForwardReturnCorrelationAuditReport {
  const passed = auditPassedTrades(input);
  const trades = passed.trades;
  const metrics = METRIC_DEFS.map((def) => analyzeMetric(def, trades));
  const impactRanking = buildImpactRanking(metrics);

  const humanLines = [
    `【指標×利益率 相関監査】${FORWARD_SIGNAL_START} ～ ${input.bundle.latestDate}`,
    `条件適合 ${trades.length}件 · 上位/下位各${TOP_BOTTOM_N}件`,
    '',
    ...metrics.map((m) => {
      const lines = [
        `■ ${m.labelJa}`,
        `相関係数 r=${m.correlation ?? '—'}`,
        `上位20平均 ${m.top20Avg ?? '—'} · 下位20平均 ${m.bottom20Avg ?? '—'}`,
        `上位20中央値 ${m.top20Median ?? '—'} · 下位20中央値 ${m.bottom20Median ?? '—'} · 全体中央値 ${m.allMedian ?? '—'}`,
        `中央値差（上位−下位）${m.medianGapTopMinusBottom ?? '—'}`,
      ];
      return lines.join('\n');
    }),
    '',
    '■ 利益率説明力ランキング（|r|降順）',
    ...impactRanking.map(
      (r) =>
        `${r.rank}. ${r.labelJa} r=${r.correlation ?? '—'} |r|=${r.absCorrelation ?? '—'}`,
    ),
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate: FORWARD_SIGNAL_START,
    toDate: input.bundle.latestDate,
    tradeCount: trades.length,
    metrics,
    impactRanking,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export function formatReturnCorrelationCsv(report: ForwardReturnCorrelationAuditReport): string {
  const header =
    'metric,correlation,top20Avg,bottom20Avg,top20Median,bottom20Median,allMedian,medianGapTopMinusBottom,impactRank,absCorrelation';
  const rankMap = new Map(report.impactRanking.map((r) => [r.metricId, r]));
  const rows = report.metrics.map((m) => {
    const rank = rankMap.get(m.id);
    return [
      m.labelJa,
      m.correlation ?? '',
      m.top20Avg ?? '',
      m.bottom20Avg ?? '',
      m.top20Median ?? '',
      m.bottom20Median ?? '',
      m.allMedian ?? '',
      m.medianGapTopMinusBottom ?? '',
      rank?.rank ?? '',
      rank?.absCorrelation ?? '',
    ].join(',');
  });
  return [header, ...rows].join('\n');
}
