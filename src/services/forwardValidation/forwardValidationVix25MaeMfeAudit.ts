/**
 * VIX≥25 24件 · MAE/MFE監査 — ルール変更なし
 */
import { FORWARD_SIGNAL_START } from '../../constants/forwardValidation';
import type {
  ForwardPassedTradeRecord,
  ForwardVix25MaeBucketId,
  ForwardVix25MaeBucketRow,
  ForwardVix25MaeMfeAuditReport,
  ForwardVix25MaeSummary,
  ForwardVix25MaeTradeRow,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { barIndexByDate, type OhlcvBar } from './case4Indicators';
import { auditPassedTrades } from './forwardValidationPassedTradesAudit';

const VIX_COHORT_MIN = 25;

const MAE_BUCKET_DEFS: { id: ForwardVix25MaeBucketId; labelJa: string }[] = [
  { id: 'm0_1', labelJa: 'MAE 0〜-1%' },
  { id: 'm1_2', labelJa: 'MAE -1〜-2%' },
  { id: 'm2_3', labelJa: 'MAE -2〜-3%' },
  { id: 'm3_plus', labelJa: 'MAE -3%以上' },
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

function vixAtDate(vixBars: OhlcvBar[], date: string): number | null {
  const idx = barIndexByDate(vixBars, date);
  if (idx < 0) return null;
  return round3(vixBars[idx]!.close);
}

function classifyMaeBucket(maePct: number): ForwardVix25MaeBucketId {
  if (maePct > -1) return 'm0_1';
  if (maePct > -2) return 'm1_2';
  if (maePct > -3) return 'm2_3';
  return 'm3_plus';
}

/** エントリー日〜決済日（両端含む）の日次安値/高値ベース */
function computeMaeMfe(
  bars: OhlcvBar[],
  entryDate: string,
  exitDate: string,
  entryPrice: number,
): { maePct: number; mfePct: number } | null {
  const entryIdx = barIndexByDate(bars, entryDate);
  const exitIdx = barIndexByDate(bars, exitDate);
  if (entryIdx < 0 || exitIdx < entryIdx || entryPrice <= 0) return null;

  let mae = 0;
  let mfe = 0;
  for (let i = entryIdx; i <= exitIdx; i++) {
    const lowRet = ((bars[i]!.low / entryPrice - 1) * 100);
    const highRet = ((bars[i]!.high / entryPrice - 1) * 100);
    if (lowRet < mae) mae = lowRet;
    if (highRet > mfe) mfe = highRet;
  }
  return { maePct: round3(mae), mfePct: round3(mfe) };
}

function buildMaeSummary(trades: ForwardVix25MaeTradeRow[]): ForwardVix25MaeSummary {
  const maes = trades.map((t) => t.maePct);
  const mfes = trades.map((t) => t.mfePct);
  return {
    avgMaePct: mean(maes),
    medianMaePct: median(maes),
    maxMaePct: maes.length > 0 ? round3(Math.min(...maes)) : null,
    avgMfePct: mean(mfes),
    medianMfePct: median(mfes),
    maxMfePct: mfes.length > 0 ? round3(Math.max(...mfes)) : null,
  };
}

function buildBucketRow(def: (typeof MAE_BUCKET_DEFS)[number], trades: ForwardVix25MaeTradeRow[]): ForwardVix25MaeBucketRow {
  const wins = trades.filter((t) => t.returnPct > 0);
  return {
    bucketId: def.id,
    labelJa: def.labelJa,
    tradeCount: trades.length,
    winCount: wins.length,
    winRatePct: trades.length > 0 ? round3((wins.length / trades.length) * 100) : 0,
    avgReturnPct: mean(trades.map((t) => t.returnPct)),
    avgHoldDays: mean(trades.map((t) => t.holdDays)),
  };
}

function formatBucket(b: ForwardVix25MaeBucketRow): string {
  return (
    `${b.labelJa}: ${b.tradeCount}件 · 勝率${b.winRatePct}% · 均R${b.avgReturnPct ?? '—'}% · 保有均${b.avgHoldDays ?? '—'}日`
  );
}

export function auditVix25MaeMfe(input: {
  bundle: ForwardOhlcvBundle;
}): ForwardVix25MaeMfeAuditReport {
  const passed = auditPassedTrades(input);
  const vixBars = input.bundle.vixBars ?? [];
  const tradeRows: ForwardVix25MaeTradeRow[] = [];
  let skipped = 0;

  for (const t of passed.trades) {
    const vix = vixAtDate(vixBars, t.signalDate);
    if (vix == null || vix < VIX_COHORT_MIN) continue;

    const bars = input.bundle.etfBars[t.symbol];
    const excursion = computeMaeMfe(bars, t.entryDate, t.exitDate, t.entryPrice);
    if (!excursion) {
      skipped++;
      continue;
    }

    const bucketId = classifyMaeBucket(excursion.maePct);
    const bucketLabel = MAE_BUCKET_DEFS.find((d) => d.id === bucketId)!.labelJa;
    tradeRows.push({
      id: t.id,
      symbol: t.symbol,
      signalDate: t.signalDate,
      entryDate: t.entryDate,
      exitDate: t.exitDate,
      returnPct: t.returnPct,
      holdDays: t.holdDays,
      exitReason: t.exitReason,
      vix,
      maePct: excursion.maePct,
      mfePct: excursion.mfePct,
      maeBucketId: bucketId,
      maeBucketLabelJa: bucketLabel,
    });
  }

  const buckets = MAE_BUCKET_DEFS.map((d) =>
    buildBucketRow(
      d,
      tradeRows.filter((r) => r.maeBucketId === d.id),
    ),
  );
  const maeSummary = buildMaeSummary(tradeRows);

  const humanLines = [
    `【VIX≥25 MAE/MFE監査】${FORWARD_SIGNAL_START} ～ ${input.bundle.latestDate}`,
    `母集団 VIX≥${VIX_COHORT_MIN} · 算出 ${tradeRows.length}件 · 現行出口+3%/25日`,
    skipped > 0 ? `※ OHLC欠損 ${skipped}件` : '',
    'MAE=保有期間中の最大含み損（日次安値/エントリー） · MFE=最大含み益（日次高値/エントリー）',
    '（監査のみ・ルール変更なし）',
    '',
    '■ 全件 MAEサマリー',
    `平均MAE ${maeSummary.avgMaePct ?? '—'}% · 中央値MAE ${maeSummary.medianMaePct ?? '—'}% · 最大MAE（最深）${maeSummary.maxMaePct ?? '—'}%`,
    `参考 MFE: 平均${maeSummary.avgMfePct ?? '—'}% · 中央値${maeSummary.medianMfePct ?? '—'}% · 最大${maeSummary.maxMfePct ?? '—'}%`,
    '',
    '■ MAE区分',
    ...buckets.map(formatBucket),
  ].filter(Boolean);

  return {
    auditedAt: new Date().toISOString(),
    fromDate: FORWARD_SIGNAL_START,
    toDate: input.bundle.latestDate,
    totalTrades: passed.tradeCount,
    cohortCount: tradeRows.length,
    cohortMinVix: VIX_COHORT_MIN,
    skippedCount: skipped,
    trades: tradeRows,
    buckets,
    maeSummary,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export function formatVix25MaeMfeCsv(report: ForwardVix25MaeMfeAuditReport): string {
  const lines: string[] = [];

  lines.push(
    'section,id,symbol,signalDate,entryDate,exitDate,returnPct,holdDays,exitReason,vix,maePct,mfePct,maeBucket',
  );
  for (const t of report.trades) {
    lines.push(
      [
        'trade',
        t.id,
        t.symbol,
        t.signalDate,
        t.entryDate,
        t.exitDate,
        t.returnPct,
        t.holdDays,
        t.exitReason,
        t.vix ?? '',
        t.maePct,
        t.mfePct,
        t.maeBucketLabelJa,
      ].join(','),
    );
  }

  lines.push('section,bucket,tradeCount,winRatePct,avgReturnPct,avgHoldDays');
  for (const b of report.buckets) {
    lines.push(
      ['bucket', b.labelJa, b.tradeCount, b.winRatePct, b.avgReturnPct ?? '', b.avgHoldDays ?? ''].join(','),
    );
  }

  const s = report.maeSummary;
  lines.push('section,metric,value');
  lines.push(['summary', 'avgMaePct', s.avgMaePct ?? ''].join(','));
  lines.push(['summary', 'medianMaePct', s.medianMaePct ?? ''].join(','));
  lines.push(['summary', 'maxMaePct_deepest', s.maxMaePct ?? ''].join(','));
  lines.push(['summary', 'avgMfePct', s.avgMfePct ?? ''].join(','));
  lines.push(['summary', 'medianMfePct', s.medianMfePct ?? ''].join(','));
  lines.push(['summary', 'maxMfePct', s.maxMfePct ?? ''].join(','));

  return lines.join('\n');
}
