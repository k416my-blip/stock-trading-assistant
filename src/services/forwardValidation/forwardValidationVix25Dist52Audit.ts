/**
 * VIX≥25 24件 · 52週乖離区分監査 — 条件適合96件 · ルール変更なし
 */
import { FORWARD_SIGNAL_START } from '../../constants/forwardValidation';
import type {
  ForwardPassedTradeRecord,
  ForwardVix25Dist52AuditReport,
  ForwardVix25Dist52BucketId,
  ForwardVix25Dist52Row,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { barIndexByDate, type OhlcvBar } from './case4Indicators';
import { auditPassedTrades } from './forwardValidationPassedTradesAudit';

const VIX_COHORT_MIN = 25;

const BUCKET_DEFS: { id: ForwardVix25Dist52BucketId; labelJa: string }[] = [
  { id: 'd10_12', labelJa: '52週 -10〜-12%' },
  { id: 'd12_15', labelJa: '52週 -12〜-15%' },
  { id: 'd15_plus', labelJa: '52週 -15%以下' },
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

/** -10〜-12%: (-12, -10] */
function classifyDist52(dist52wPct: number): ForwardVix25Dist52BucketId | null {
  if (dist52wPct > -10) return null;
  if (dist52wPct > -12) return 'd10_12';
  if (dist52wPct > -15) return 'd12_15';
  return 'd15_plus';
}

type CohortTrade = ForwardPassedTradeRecord & {
  vix: number | null;
  dist52BucketId: ForwardVix25Dist52BucketId | null;
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
      dist52BucketId: classifyDist52(t.dist52wPct),
    });
  }
  return out;
}

function buildRow(def: (typeof BUCKET_DEFS)[number], trades: CohortTrade[]): ForwardVix25Dist52Row {
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
    avgDist52: mean(trades.map((t) => t.dist52wPct)),
  };
}

function formatRow(r: ForwardVix25Dist52Row): string {
  return (
    `${r.labelJa}: ${r.tradeCount}件 · 勝率${r.winRatePct}% · 均R${r.avgReturnPct ?? '—'}% · ` +
    `Sharpe${r.sharpe ?? '—'} · 25日満了${r.maxHoldRatePct}%` +
    (r.avgDist52 != null ? ` · 52週均${r.avgDist52}%` : '')
  );
}

export function auditVix25Dist52(input: {
  bundle: ForwardOhlcvBundle;
}): ForwardVix25Dist52AuditReport {
  const passed = auditPassedTrades(input);
  const cohort = selectVix25Cohort(input.bundle, passed.trades);

  const buckets = BUCKET_DEFS.map((b) =>
    buildRow(
      b,
      cohort.filter((t) => t.dist52BucketId === b.id),
    ),
  );

  const shallowerCount = cohort.filter((t) => t.dist52BucketId == null).length;
  const bucketSum = buckets.reduce((s, b) => s + b.tradeCount, 0);

  const humanLines = [
    `【VIX≥25 52週乖離区分監査】${FORWARD_SIGNAL_START} ～ ${input.bundle.latestDate}`,
    `母集団 条件適合 ${passed.tradeCount}件 · VIX≥${VIX_COHORT_MIN} ${cohort.length}件 · 現行出口+3%/25日`,
    '（監査のみ・ルール変更なし）',
    '',
    '■ 52週区分（シグナル日 dist52wPct）',
    '-10〜-12% / -12〜-15% / -15%以下',
    ...buckets.map(formatRow),
    '',
    '■ 件数',
    ...buckets.map((b) => `${b.labelJa}: ${b.tradeCount}件`),
    `合計: ${bucketSum}件 / コホート${cohort.length}件`,
    shallowerCount > 0 ? `※ 52週>-10% ${shallowerCount}件（上記3区分の対象外）` : '',
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
    bucketedCount: bucketSum,
    shallowerThan10Count: shallowerCount,
    buckets,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export function formatVix25Dist52Csv(report: ForwardVix25Dist52AuditReport): string {
  const header = 'bucket,tradeCount,winRatePct,avgReturnPct,sharpe,maxHoldRatePct,avgDist52';
  const rows = report.buckets.map((b) =>
    [
      b.labelJa,
      b.tradeCount,
      b.winRatePct,
      b.avgReturnPct ?? '',
      b.sharpe ?? '',
      b.maxHoldRatePct,
      b.avgDist52 ?? '',
    ].join(','),
  );
  return [header, ...rows].join('\n');
}
