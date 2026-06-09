/**
 * VIX≥25 かつ SPY63≤-5% · 翌日ギャップ監査 — ルール変更なし
 */
import { FORWARD_SIGNAL_START } from '../../constants/forwardValidation';
import type {
  ForwardVix25SpyGapAuditReport,
  ForwardVix25SpyGapSummary,
  ForwardVix25SpyGapTradeRow,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { barIndexByDate, type OhlcvBar } from './case4Indicators';
import { auditPassedTrades } from './forwardValidationPassedTradesAudit';

const VIX_COHORT_MIN = 25;
const SPY_THRESHOLD = -5;

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

function computeSpyRet63(spyBars: OhlcvBar[], date: string): number | null {
  const idx = spyBars.findIndex((b) => b.date === date);
  const lookback = 63;
  if (idx < lookback) return null;
  const closes = spyBars.map((b) => b.close);
  return round3(((closes[idx]! / closes[idx - lookback]! - 1) * 100));
}

function nextDayGapPct(
  bars: OhlcvBar[],
  entryDate: string,
  entryClose: number,
): { nextOpen: number; gapPct: number } | null {
  const entryIdx = barIndexByDate(bars, entryDate);
  const nextIdx = entryIdx + 1;
  if (entryIdx < 0 || nextIdx >= bars.length || entryClose <= 0) return null;
  const nextOpen = round3(bars[nextIdx]!.open);
  return {
    nextOpen,
    gapPct: round3(((nextOpen / entryClose - 1) * 100)),
  };
}

function buildSummary(gaps: number[]): ForwardVix25SpyGapSummary {
  return {
    avgGapPct: mean(gaps),
    medianGapPct: median(gaps),
    maxGapPct: gaps.length > 0 ? round3(Math.max(...gaps)) : null,
    minGapPct: gaps.length > 0 ? round3(Math.min(...gaps)) : null,
  };
}

export function auditVix25SpyGap(input: {
  bundle: ForwardOhlcvBundle;
}): ForwardVix25SpyGapAuditReport {
  const passed = auditPassedTrades(input);
  const vixBars = input.bundle.vixBars ?? [];
  const tradeRows: ForwardVix25SpyGapTradeRow[] = [];
  let skipped = 0;

  for (const t of passed.trades) {
    const vix = vixAtDate(vixBars, t.signalDate);
    const spy = computeSpyRet63(input.bundle.spyBars, t.signalDate);
    if (vix == null || vix < VIX_COHORT_MIN || spy == null || spy > SPY_THRESHOLD) continue;

    const gap = nextDayGapPct(input.bundle.etfBars[t.symbol], t.entryDate, t.entryPrice);
    if (!gap) {
      skipped++;
      continue;
    }

    tradeRows.push({
      signalDate: t.signalDate,
      symbol: t.symbol,
      entryDate: t.entryDate,
      entryClose: t.entryPrice,
      nextOpen: gap.nextOpen,
      gapPct: gap.gapPct,
    });
  }

  const gaps = tradeRows.map((r) => r.gapPct);
  const summary = buildSummary(gaps);
  tradeRows.sort((a, b) => a.gapPct - b.gapPct);

  const humanLines = [
    `【VIX≥25×SPY≤-5% 翌日ギャップ監査】${FORWARD_SIGNAL_START} ～ ${input.bundle.latestDate}`,
    `母集団 ${tradeRows.length}件 · ギャップ%=翌営業日始値/エントリー終値-1`,
    skipped > 0 ? `※ 翌日OHLC欠損 ${skipped}件` : '',
    '（監査のみ・ルール変更なし）',
    '',
    '■ サマリー',
    `平均 ${summary.avgGapPct ?? '—'}% · 中央値 ${summary.medianGapPct ?? '—'}% · 最大 ${summary.maxGapPct ?? '—'}% · 最小 ${summary.minGapPct ?? '—'}%`,
    '',
    '■ トレード一覧（ギャップ%昇順）',
    ...tradeRows.map(
      (r) =>
        `${r.signalDate} ${r.symbol} · 始値${r.nextOpen} / 終値${r.entryClose} · ギャップ${r.gapPct}%`,
    ),
  ].filter(Boolean);

  return {
    auditedAt: new Date().toISOString(),
    fromDate: FORWARD_SIGNAL_START,
    toDate: input.bundle.latestDate,
    totalTrades: passed.tradeCount,
    cohortCount: tradeRows.length,
    cohortMinVix: VIX_COHORT_MIN,
    spyThresholdPct: SPY_THRESHOLD,
    skippedCount: skipped,
    summary,
    trades: tradeRows,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export function formatVix25SpyGapCsv(report: ForwardVix25SpyGapAuditReport): string {
  const lines: string[] = [];
  lines.push('section,signalDate,symbol,entryDate,entryClose,nextOpen,gapPct');
  for (const t of report.trades) {
    lines.push(['trade', t.signalDate, t.symbol, t.entryDate, t.entryClose, t.nextOpen, t.gapPct].join(','));
  }
  const s = report.summary;
  lines.push('section,metric,value');
  lines.push(['summary', 'avgGapPct', s.avgGapPct ?? ''].join(','));
  lines.push(['summary', 'medianGapPct', s.medianGapPct ?? ''].join(','));
  lines.push(['summary', 'maxGapPct', s.maxGapPct ?? ''].join(','));
  lines.push(['summary', 'minGapPct', s.minGapPct ?? ''].join(','));
  return lines.join('\n');
}
