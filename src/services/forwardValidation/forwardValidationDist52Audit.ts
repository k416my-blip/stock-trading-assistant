/**
 * 52週高値乖離帯別成績監査 — 条件適合96件 · ルール変更なし
 */
import { FORWARD_SIGNAL_START } from '../../constants/forwardValidation';
import type {
  ForwardDist52AuditReport,
  ForwardDist52BucketId,
  ForwardDist52BucketStats,
  ForwardPassedTradeRecord,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { auditPassedTrades } from './forwardValidationPassedTradesAudit';

const BUCKET_DEFS: { id: ForwardDist52BucketId; labelJa: string }[] = [
  { id: 'm2_m4', labelJa: '-2%～-4%' },
  { id: 'm4_m6', labelJa: '-4%～-6%' },
  { id: 'm6_m8', labelJa: '-6%～-8%' },
  { id: 'm8_m10', labelJa: '-8%～-10%' },
  { id: 'm10_m12', labelJa: '-10%～-12%' },
  { id: 'm12_plus', labelJa: '-12%以上' },
];

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function mean(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return round3(vals.reduce((a, b) => a + b, 0) / vals.length);
}

/** dist52wPct（負値）を乖離帯へ分類。上限は含む・下限は含まない（-2%～-4% = (-4,-2]） */
export function classifyDist52Bucket(dist52wPct: number): ForwardDist52BucketId | null {
  if (dist52wPct <= -2 && dist52wPct > -4) return 'm2_m4';
  if (dist52wPct <= -4 && dist52wPct > -6) return 'm4_m6';
  if (dist52wPct <= -6 && dist52wPct > -8) return 'm6_m8';
  if (dist52wPct <= -8 && dist52wPct > -10) return 'm8_m10';
  if (dist52wPct <= -10 && dist52wPct > -12) return 'm10_m12';
  if (dist52wPct <= -12) return 'm12_plus';
  return null;
}

function bucketStats(
  id: ForwardDist52BucketId,
  labelJa: string,
  trades: ForwardPassedTradeRecord[],
): ForwardDist52BucketStats {
  const wins = trades.filter((t) => t.returnPct > 0);
  return {
    id,
    labelJa,
    tradeCount: trades.length,
    winCount: wins.length,
    winRatePct: trades.length > 0 ? round3((wins.length / trades.length) * 100) : 0,
    avgReturnPct: mean(trades.map((t) => t.returnPct)),
    avgHoldDays: mean(trades.map((t) => t.holdDays)),
    avgAdx: mean(trades.map((t) => t.adx14)),
    avgMacd: mean(trades.map((t) => t.macdHistPct)),
  };
}

export function auditDist52Performance(input: {
  bundle: ForwardOhlcvBundle;
}): ForwardDist52AuditReport {
  const passed = auditPassedTrades(input);
  const byBucket = new Map<ForwardDist52BucketId, ForwardPassedTradeRecord[]>();
  for (const def of BUCKET_DEFS) byBucket.set(def.id, []);

  let unclassifiedCount = 0;
  for (const trade of passed.trades) {
    const bucket = classifyDist52Bucket(trade.dist52wPct);
    if (bucket == null) {
      unclassifiedCount++;
      continue;
    }
    byBucket.get(bucket)!.push(trade);
  }

  const buckets = BUCKET_DEFS.map((def) =>
    bucketStats(def.id, def.labelJa, byBucket.get(def.id) ?? []),
  );

  const humanLines = [
    `【52週高値乖離帯別成績】${FORWARD_SIGNAL_START} ～ ${input.bundle.latestDate}`,
    `条件適合 ${passed.tradeCount}件${unclassifiedCount > 0 ? ` · 帯外 ${unclassifiedCount}件` : ''}`,
    '',
    ...buckets.map(
      (b) =>
        `■ ${b.labelJa}: ${b.tradeCount}件 · 勝率${b.winRatePct}% · 均R${b.avgReturnPct ?? '—'}% · 保有${b.avgHoldDays ?? '—'}日 · ADX${b.avgAdx ?? '—'} · MACD${b.avgMacd ?? '—'}%`,
    ),
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate: FORWARD_SIGNAL_START,
    toDate: input.bundle.latestDate,
    totalTrades: passed.tradeCount,
    unclassifiedCount,
    buckets,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export function formatDist52AuditCsv(report: ForwardDist52AuditReport): string {
  const header =
    'bucket,labelJa,tradeCount,winCount,winRatePct,avgReturnPct,avgHoldDays,avgAdx,avgMacd';
  const rows = report.buckets.map((b) =>
    [
      b.id,
      b.labelJa,
      b.tradeCount,
      b.winCount,
      b.winRatePct,
      b.avgReturnPct ?? '',
      b.avgHoldDays ?? '',
      b.avgAdx ?? '',
      b.avgMacd ?? '',
    ].join(','),
  );
  return [header, ...rows].join('\n');
}
