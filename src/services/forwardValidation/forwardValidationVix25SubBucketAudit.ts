/**
 * VIX≥25 24件 · VIX細区分監査 — 条件適合96件 · ルール変更なし
 */
import { FORWARD_SIGNAL_START } from '../../constants/forwardValidation';
import type {
  ForwardPassedTradeRecord,
  ForwardVix25SubBucketAuditReport,
  ForwardVix25SubBucketId,
  ForwardVix25SubBucketRow,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { barIndexByDate, type OhlcvBar } from './case4Indicators';
import { auditPassedTrades } from './forwardValidationPassedTradesAudit';

const VIX_COHORT_MIN = 25;

const BUCKET_DEFS: { id: ForwardVix25SubBucketId; labelJa: string }[] = [
  { id: 'v25_30', labelJa: 'VIX 25〜30' },
  { id: 'v30_35', labelJa: 'VIX 30〜35' },
  { id: 'v35_plus', labelJa: 'VIX 35以上' },
];

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

function vixAtDate(vixBars: OhlcvBar[], date: string): number | null {
  const idx = barIndexByDate(vixBars, date);
  if (idx < 0) return null;
  return round3(vixBars[idx]!.close);
}

type EnrichedTrade = ForwardPassedTradeRecord & {
  vix: number | null;
  bucketId: ForwardVix25SubBucketId | null;
};

function classifyVixBucket(vix: number): ForwardVix25SubBucketId {
  if (vix < 30) return 'v25_30';
  if (vix < 35) return 'v30_35';
  return 'v35_plus';
}

function enrich(bundle: ForwardOhlcvBundle, trades: ForwardPassedTradeRecord[]): EnrichedTrade[] {
  const vixBars = bundle.vixBars ?? [];
  return trades.map((t) => {
    const vix = vixAtDate(vixBars, t.signalDate);
    const inCohort = vix != null && vix >= VIX_COHORT_MIN;
    return {
      ...t,
      vix,
      bucketId: inCohort ? classifyVixBucket(vix) : null,
    };
  });
}

function buildRow(def: (typeof BUCKET_DEFS)[number], trades: EnrichedTrade[]): ForwardVix25SubBucketRow {
  const wins = trades.filter((t) => t.returnPct > 0);
  const maxHold = trades.filter((t) => t.exitReason === 'max_hold');
  const returns = trades.map((t) => t.returnPct);
  return {
    bucketId: def.id,
    labelJa: def.labelJa,
    tradeCount: trades.length,
    winCount: wins.length,
    winRatePct: trades.length > 0 ? round3((wins.length / trades.length) * 100) : 0,
    avgReturnPct: mean(returns),
    sharpe: tradeSharpe(returns),
    maxHoldRatePct: trades.length > 0 ? round3((maxHold.length / trades.length) * 100) : 0,
    avgVix: mean(trades.map((t) => t.vix!).filter((v) => v != null)),
  };
}

function formatRow(r: ForwardVix25SubBucketRow): string {
  return (
    `${r.labelJa}: ${r.tradeCount}件 · 勝率${r.winRatePct}% · 均R${r.avgReturnPct ?? '—'}% · ` +
    `Sharpe${r.sharpe ?? '—'} · 25日満了${r.maxHoldRatePct}%` +
    (r.avgVix != null ? ` · VIX均${r.avgVix}` : '')
  );
}

export function auditVix25SubBuckets(input: {
  bundle: ForwardOhlcvBundle;
}): ForwardVix25SubBucketAuditReport {
  const passed = auditPassedTrades(input);
  const enriched = enrich(input.bundle, passed.trades);
  const cohort = enriched.filter((t) => t.bucketId != null);
  const unclassifiedInCohort = enriched.filter(
    (t) => t.vix != null && t.vix >= VIX_COHORT_MIN && t.bucketId == null,
  );

  const buckets = BUCKET_DEFS.map((b) =>
    buildRow(
      b,
      cohort.filter((t) => t.bucketId === b.id),
    ),
  );

  const bucketSum = buckets.reduce((s, b) => s + b.tradeCount, 0);

  const humanLines = [
    `【VIX≥25 細区分監査】${FORWARD_SIGNAL_START} ～ ${input.bundle.latestDate}`,
    `母集団 条件適合 ${passed.tradeCount}件 · VIX≥${VIX_COHORT_MIN} ${cohort.length}件 · 現行出口+3%/25日`,
    '（監査のみ・ルール変更なし）',
    '',
    '■ 区分（シグナル日 VIX終値）',
    ...buckets.map(formatRow),
    '',
    '■ 件数',
    ...buckets.map((b) => `${b.labelJa}: ${b.tradeCount}件`),
    `合計: ${bucketSum}件`,
    unclassifiedInCohort.length > 0 ? `区分外 ${unclassifiedInCohort.length}件` : '',
    '',
    '※ Sharpe = 区分内トレードリターンの mean/std（2件未満は—）',
  ].filter(Boolean);

  return {
    auditedAt: new Date().toISOString(),
    fromDate: FORWARD_SIGNAL_START,
    toDate: input.bundle.latestDate,
    totalTrades: passed.tradeCount,
    cohortCount: cohort.length,
    cohortMinVix: VIX_COHORT_MIN,
    buckets,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export function formatVix25SubBucketCsv(report: ForwardVix25SubBucketAuditReport): string {
  const header = 'bucket,tradeCount,winRatePct,avgReturnPct,sharpe,maxHoldRatePct,avgVix';
  const rows = report.buckets.map((b) =>
    [b.labelJa, b.tradeCount, b.winRatePct, b.avgReturnPct ?? '', b.sharpe ?? '', b.maxHoldRatePct, b.avgVix ?? ''].join(
      ',',
    ),
  );
  return [header, ...rows].join('\n');
}
