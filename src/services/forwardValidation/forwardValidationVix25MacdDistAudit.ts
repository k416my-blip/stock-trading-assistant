/**
 * VIX≥25 24件 · MACD分布監査 — 条件適合96件 · ルール変更なし
 */
import { FORWARD_SIGNAL_START } from '../../constants/forwardValidation';
import type {
  ForwardPassedTradeRecord,
  ForwardVix25MacdBucketId,
  ForwardVix25MacdDistAuditReport,
  ForwardVix25MacdDistRow,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { barIndexByDate, type OhlcvBar } from './case4Indicators';
import { auditPassedTrades } from './forwardValidationPassedTradesAudit';

const VIX_COHORT_MIN = 25;

const BUCKET_DEFS: { id: ForwardVix25MacdBucketId; labelJa: string }[] = [
  { id: 'm25_40', labelJa: 'MACD 0.25〜0.40' },
  { id: 'm40_60', labelJa: 'MACD 0.40〜0.60' },
  { id: 'm60_plus', labelJa: 'MACD 0.60以上' },
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

function classifyMacdBucket(macdHistPct: number): ForwardVix25MacdBucketId | null {
  if (macdHistPct < 0.25) return null;
  if (macdHistPct < 0.4) return 'm25_40';
  if (macdHistPct < 0.6) return 'm40_60';
  return 'm60_plus';
}

type CohortTrade = ForwardPassedTradeRecord & {
  vix: number | null;
  macdBucketId: ForwardVix25MacdBucketId | null;
};

function selectVix25Cohort(bundle: ForwardOhlcvBundle, trades: ForwardPassedTradeRecord[]): CohortTrade[] {
  const vixBars = bundle.vixBars ?? [];
  const out: CohortTrade[] = [];
  for (const t of trades) {
    const vix = vixAtDate(vixBars, t.signalDate);
    if (vix == null || vix < VIX_COHORT_MIN) continue;
    out.push({
      ...t,
      vix,
      macdBucketId: classifyMacdBucket(t.macdHistPct),
    });
  }
  return out;
}

function buildRow(def: (typeof BUCKET_DEFS)[number], trades: CohortTrade[]): ForwardVix25MacdDistRow {
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
    avgMacd: mean(trades.map((t) => t.macdHistPct)),
  };
}

function formatRow(r: ForwardVix25MacdDistRow): string {
  return (
    `${r.labelJa}: ${r.tradeCount}件 · 勝率${r.winRatePct}% · 均R${r.avgReturnPct ?? '—'}% · ` +
    `Sharpe${r.sharpe ?? '—'} · 25日満了${r.maxHoldRatePct}%` +
    (r.avgMacd != null ? ` · MACD均${r.avgMacd}` : '')
  );
}

export function auditVix25MacdDist(input: {
  bundle: ForwardOhlcvBundle;
}): ForwardVix25MacdDistAuditReport {
  const passed = auditPassedTrades(input);
  const cohort = selectVix25Cohort(input.bundle, passed.trades);

  const buckets = BUCKET_DEFS.map((b) =>
    buildRow(
      b,
      cohort.filter((t) => t.macdBucketId === b.id),
    ),
  );

  const below25Count = cohort.filter((t) => t.macdBucketId == null).length;
  const bucketSum = buckets.reduce((s, b) => s + b.tradeCount, 0);

  const humanLines = [
    `【VIX≥25 MACD分布監査】${FORWARD_SIGNAL_START} ～ ${input.bundle.latestDate}`,
    `母集団 条件適合 ${passed.tradeCount}件 · VIX≥${VIX_COHORT_MIN} ${cohort.length}件 · 現行出口+3%/25日`,
    '（監査のみ・ルール変更なし）',
    '',
    '■ MACD区分（シグナル日 macdHistPct）',
    '0.25〜0.40 / 0.40〜0.60 / 0.60以上',
    ...buckets.map(formatRow),
    '',
    '■ 件数',
    ...buckets.map((b) => `${b.labelJa}: ${b.tradeCount}件`),
    `合計: ${bucketSum}件 / コホート${cohort.length}件`,
    below25Count > 0 ? `※ MACD<0.25 ${below25Count}件（上記3区分の対象外）` : '',
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
    below25Count,
    bucketedCount: bucketSum,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export function formatVix25MacdDistCsv(report: ForwardVix25MacdDistAuditReport): string {
  const header = 'bucket,tradeCount,winRatePct,avgReturnPct,sharpe,maxHoldRatePct,avgMacd';
  const rows = report.buckets.map((b) =>
    [b.labelJa, b.tradeCount, b.winRatePct, b.avgReturnPct ?? '', b.sharpe ?? '', b.maxHoldRatePct, b.avgMacd ?? ''].join(
      ',',
    ),
  );
  return [header, ...rows].join('\n');
}
