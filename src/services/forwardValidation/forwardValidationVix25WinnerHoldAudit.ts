/**
 * VIX≥25 勝ち24件 · 保有日数区分監査 — 条件適合96件 · ルール変更なし
 */
import { FORWARD_SIGNAL_START } from '../../constants/forwardValidation';
import type {
  ForwardPassedTradeRecord,
  ForwardVix25WinnerHoldAuditReport,
  ForwardVix25WinnerHoldBucketId,
  ForwardVix25WinnerHoldRow,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { barIndexByDate, type OhlcvBar } from './case4Indicators';
import { auditPassedTrades } from './forwardValidationPassedTradesAudit';

const VIX_COHORT_MIN = 25;

const BUCKET_DEFS: { id: ForwardVix25WinnerHoldBucketId; labelJa: string; min: number; max: number }[] = [
  { id: 'd1_5', labelJa: '5日以内', min: 0, max: 5 },
  { id: 'd6_10', labelJa: '6〜10日', min: 6, max: 10 },
  { id: 'd11_15', labelJa: '11〜15日', min: 11, max: 15 },
  { id: 'd16_20', labelJa: '16〜20日', min: 16, max: 20 },
  { id: 'd21_25', labelJa: '21〜25日', min: 21, max: 25 },
];

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function mean(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return round3(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function vixAtDate(vixBars: OhlcvBar[], date: string): number | null {
  const idx = barIndexByDate(vixBars, date);
  if (idx < 0) return null;
  return round3(vixBars[idx]!.close);
}

function classifyHoldDays(holdDays: number): ForwardVix25WinnerHoldBucketId | null {
  for (const b of BUCKET_DEFS) {
    if (holdDays >= b.min && holdDays <= b.max) return b.id;
  }
  return null;
}

type CohortTrade = ForwardPassedTradeRecord & {
  vix: number | null;
  holdBucketId: ForwardVix25WinnerHoldBucketId | null;
};

function selectVix25Winners(bundle: ForwardOhlcvBundle, trades: ForwardPassedTradeRecord[]): CohortTrade[] {
  const vixBars = bundle.vixBars ?? [];
  const out: CohortTrade[] = [];
  for (const t of trades) {
    const vix = vixAtDate(vixBars, t.signalDate);
    if (vix == null || vix < VIX_COHORT_MIN) continue;
    if (t.returnPct <= 0) continue;
    out.push({
      ...t,
      vix,
      holdBucketId: classifyHoldDays(t.holdDays),
    });
  }
  return out;
}

function buildRow(def: (typeof BUCKET_DEFS)[number], trades: CohortTrade[]): ForwardVix25WinnerHoldRow {
  const returns = trades.map((t) => t.returnPct);
  return {
    bucketId: def.id,
    labelJa: def.labelJa,
    tradeCount: trades.length,
    avgReturnPct: mean(returns),
    avgHoldDays: mean(trades.map((t) => t.holdDays)),
  };
}

function formatRow(r: ForwardVix25WinnerHoldRow): string {
  return `${r.labelJa}: ${r.tradeCount}件 · 均R${r.avgReturnPct ?? '—'}%` + (r.avgHoldDays != null ? ` · 保有均${r.avgHoldDays}日` : '');
}

export function auditVix25WinnerHold(input: {
  bundle: ForwardOhlcvBundle;
}): ForwardVix25WinnerHoldAuditReport {
  const passed = auditPassedTrades(input);
  const vixCohort = passed.trades.filter((t) => {
    const vixBars = input.bundle.vixBars ?? [];
    const vix = vixAtDate(vixBars, t.signalDate);
    return vix != null && vix >= VIX_COHORT_MIN;
  });
  const winners = selectVix25Winners(input.bundle, passed.trades);
  const lossInCohort = vixCohort.length - winners.length;

  const buckets = BUCKET_DEFS.map((b) =>
    buildRow(
      b,
      winners.filter((t) => t.holdBucketId === b.id),
    ),
  );

  const bucketSum = buckets.reduce((s, b) => s + b.tradeCount, 0);
  const unbucketed = winners.filter((t) => t.holdBucketId == null);

  const humanLines = [
    `【VIX≥25 勝ちトレード保有日数監査】${FORWARD_SIGNAL_START} ～ ${input.bundle.latestDate}`,
    `母集団 条件適合 ${passed.tradeCount}件 · VIX≥${VIX_COHORT_MIN} ${vixCohort.length}件 · 勝ち ${winners.length}件`,
    lossInCohort > 0 ? `※ VIX≥25の負け ${lossInCohort}件は対象外` : '',
    '（監査のみ・ルール変更なし）',
    '',
    '■ 保有日数区分（勝ちのみ · holdDays）',
    ...buckets.map(formatRow),
    '',
    '■ 件数',
    ...buckets.map((b) => `${b.labelJa}: ${b.tradeCount}件`),
    `合計: ${bucketSum}件 / 勝ち${winners.length}件`,
    unbucketed.length > 0 ? `※ 区分外保有日数 ${unbucketed.length}件` : '',
  ].filter(Boolean);

  return {
    auditedAt: new Date().toISOString(),
    fromDate: FORWARD_SIGNAL_START,
    toDate: input.bundle.latestDate,
    totalTrades: passed.tradeCount,
    cohortCount: vixCohort.length,
    winnerCount: winners.length,
    lossInCohortCount: lossInCohort,
    cohortMinVix: VIX_COHORT_MIN,
    bucketedCount: bucketSum,
    buckets,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export function formatVix25WinnerHoldCsv(report: ForwardVix25WinnerHoldAuditReport): string {
  const header = 'holdBucket,tradeCount,avgReturnPct,avgHoldDays';
  const rows = report.buckets.map((b) =>
    [b.labelJa, b.tradeCount, b.avgReturnPct ?? '', b.avgHoldDays ?? ''].join(','),
  );
  return [header, ...rows].join('\n');
}
