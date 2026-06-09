/**
 * 52週乖離単独説明力監査 — 条件適合96件 · ルール変更なし
 */
import { FORWARD_ETF_UNIVERSE, FORWARD_SIGNAL_START } from '../../constants/forwardValidation';
import type { ForwardEtfSymbol } from '../../constants/forwardValidation';
import type {
  ForwardDist52BucketId,
  ForwardDist52StandaloneAuditReport,
  ForwardDist52StandaloneStats,
  ForwardPassedTradeRecord,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { classifyDist52Bucket } from './forwardValidationDist52Audit';
import { auditPassedTrades } from './forwardValidationPassedTradesAudit';

const BUCKET_ORDER: { id: ForwardDist52BucketId; labelJa: string }[] = [
  { id: 'm2_m4', labelJa: '-2%～-4%' },
  { id: 'm4_m6', labelJa: '-4%～-6%' },
  { id: 'm6_m8', labelJa: '-6%～-8%' },
  { id: 'm8_m10', labelJa: '-8%～-10%' },
  { id: 'm10_m12', labelJa: '-10%～-12%' },
  { id: 'm12_plus', labelJa: '-12%以下' },
];

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function mean(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return round3(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function etfBreakdown(trades: ForwardPassedTradeRecord[]): {
  counts: Record<ForwardEtfSymbol, number>;
  pct: Record<ForwardEtfSymbol, number>;
} {
  const counts = Object.fromEntries(FORWARD_ETF_UNIVERSE.map((s) => [s, 0])) as Record<
    ForwardEtfSymbol,
    number
  >;
  for (const t of trades) counts[t.symbol]++;
  const pct = { ...counts };
  if (trades.length > 0) {
    for (const s of FORWARD_ETF_UNIVERSE) {
      pct[s] = round3((counts[s] / trades.length) * 100);
    }
  }
  return { counts, pct };
}

function buildStats(
  id: ForwardDist52BucketId,
  labelJa: string,
  trades: ForwardPassedTradeRecord[],
): ForwardDist52StandaloneStats {
  const wins = trades.filter((t) => t.returnPct > 0);
  const takeProfit = trades.filter((t) => t.exitReason === 'take_profit');
  const maxHold = trades.filter((t) => t.exitReason === 'max_hold');
  const etf = etfBreakdown(trades);

  return {
    id,
    labelJa,
    tradeCount: trades.length,
    winCount: wins.length,
    winRatePct: trades.length > 0 ? round3((wins.length / trades.length) * 100) : 0,
    avgReturnPct: mean(trades.map((t) => t.returnPct)),
    avgHoldDays: mean(trades.map((t) => t.holdDays)),
    takeProfitRatePct: trades.length > 0 ? round3((takeProfit.length / trades.length) * 100) : 0,
    maxHoldRatePct: trades.length > 0 ? round3((maxHold.length / trades.length) * 100) : 0,
    etfCounts: etf.counts,
    etfPct: etf.pct,
  };
}

function formatEtf(s: ForwardDist52StandaloneStats): string {
  return FORWARD_ETF_UNIVERSE.map((e) => `${e}=${s.etfCounts[e]}(${s.etfPct[e]}%)`).join(' ');
}

export function auditDist52Standalone(input: {
  bundle: ForwardOhlcvBundle;
}): ForwardDist52StandaloneAuditReport {
  const passed = auditPassedTrades(input);
  let unclassified = 0;

  const byBucket = new Map<ForwardDist52BucketId, ForwardPassedTradeRecord[]>();
  for (const b of BUCKET_ORDER) byBucket.set(b.id, []);

  for (const t of passed.trades) {
    const bucket = classifyDist52Bucket(t.dist52wPct);
    if (bucket == null) {
      unclassified++;
      continue;
    }
    byBucket.get(bucket)!.push(t);
  }

  const buckets = BUCKET_ORDER.map((b) =>
    buildStats(b.id, b.labelJa, byBucket.get(b.id) ?? []),
  );

  const humanLines = [
    `【52週乖離単独説明力監査】${FORWARD_SIGNAL_START} ～ ${input.bundle.latestDate}`,
    `条件適合 ${passed.tradeCount}件${unclassified > 0 ? ` · 帯外 ${unclassified}件` : ''}`,
    '',
    ...buckets.flatMap((b) => [
      `■ ${b.labelJa}`,
      `${b.tradeCount}件 · 勝率${b.winRatePct}% · 均R${b.avgReturnPct ?? '—'}% · 保有${b.avgHoldDays ?? '—'}日`,
      `利確到達${b.takeProfitRatePct}% · 25日満了${b.maxHoldRatePct}%`,
      `ETF: ${formatEtf(b)}`,
      '',
    ]),
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate: FORWARD_SIGNAL_START,
    toDate: input.bundle.latestDate,
    totalTrades: passed.tradeCount,
    unclassifiedCount: unclassified,
    buckets,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export function formatDist52StandaloneCsv(report: ForwardDist52StandaloneAuditReport): string {
  const header =
    'bucket,labelJa,tradeCount,winRatePct,avgReturnPct,avgHoldDays,takeProfitRatePct,maxHoldRatePct,SCHD,VYM,DGRO,SPLG';
  const rows = report.buckets.map((b) =>
    [
      b.id,
      b.labelJa,
      b.tradeCount,
      b.winRatePct,
      b.avgReturnPct ?? '',
      b.avgHoldDays ?? '',
      b.takeProfitRatePct,
      b.maxHoldRatePct,
      b.etfCounts.SCHD,
      b.etfCounts.VYM,
      b.etfCounts.DGRO,
      b.etfCounts.SPLG,
    ].join(','),
  );
  return [header, ...rows].join('\n');
}
