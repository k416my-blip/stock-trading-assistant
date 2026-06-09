/**
 * VIX≥25 かつ SPY63≤-5% · ETF別エントリー後リターン監査 — ルール変更なし
 */
import {
  FORWARD_ETF_UNIVERSE,
  FORWARD_SIGNAL_START,
  type ForwardEtfSymbol,
} from '../../constants/forwardValidation';
import type {
  ForwardVix25SpyEtfForwardReturnAuditReport,
  ForwardVix25SpyEtfForwardReturnRow,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { barIndexByDate, type OhlcvBar } from './case4Indicators';
import { auditPassedTrades } from './forwardValidationPassedTradesAudit';

const VIX_COHORT_MIN = 25;
const SPY_THRESHOLD = -5;
const HORIZONS = [1, 3, 5, 10] as const;

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

function computeSpyRet63(spyBars: OhlcvBar[], date: string): number | null {
  const idx = spyBars.findIndex((b) => b.date === date);
  const lookback = 63;
  if (idx < lookback) return null;
  const closes = spyBars.map((b) => b.close);
  return round3(((closes[idx]! / closes[idx - lookback]! - 1) * 100));
}

function returnAfterEntryBars(
  bars: OhlcvBar[],
  entryDate: string,
  entryPrice: number,
  horizonDays: number,
): number | null {
  const entryIdx = barIndexByDate(bars, entryDate);
  if (entryIdx < 0 || entryPrice <= 0) return null;
  const targetIdx = entryIdx + horizonDays;
  if (targetIdx >= bars.length) return null;
  return round3(((bars[targetIdx]!.close / entryPrice - 1) * 100));
}

function buildEtfRow(symbol: ForwardEtfSymbol, cohort: ReturnType<typeof auditPassedTrades>['trades'], bundle: ForwardOhlcvBundle): ForwardVix25SpyEtfForwardReturnRow {
  const trades = cohort.filter((t) => t.symbol === symbol);
  const bars = bundle.etfBars[symbol];
  const r1: number[] = [];
  const r3: number[] = [];
  const r5: number[] = [];
  const r10: number[] = [];
  for (const t of trades) {
    const a = returnAfterEntryBars(bars, t.entryDate, t.entryPrice, 1);
    const b = returnAfterEntryBars(bars, t.entryDate, t.entryPrice, 3);
    const c = returnAfterEntryBars(bars, t.entryDate, t.entryPrice, 5);
    const d = returnAfterEntryBars(bars, t.entryDate, t.entryPrice, 10);
    if (a != null) r1.push(a);
    if (b != null) r3.push(b);
    if (c != null) r5.push(c);
    if (d != null) r10.push(d);
  }
  return {
    symbol,
    tradeCount: trades.length,
    avgReturn1dPct: mean(r1),
    avgReturn3dPct: mean(r3),
    avgReturn5dPct: mean(r5),
    avgReturn10dPct: mean(r10),
  };
}

export function auditVix25SpyEtfForwardReturns(input: {
  bundle: ForwardOhlcvBundle;
}): ForwardVix25SpyEtfForwardReturnAuditReport {
  const passed = auditPassedTrades(input);
  const vixBars = input.bundle.vixBars ?? [];

  const cohort = passed.trades.filter((t) => {
    const vix = vixAtDate(vixBars, t.signalDate);
    const spy = computeSpyRet63(input.bundle.spyBars, t.signalDate);
    return vix != null && vix >= VIX_COHORT_MIN && spy != null && spy <= SPY_THRESHOLD;
  });

  const byEtf = FORWARD_ETF_UNIVERSE.map((s) => buildEtfRow(s, cohort, input.bundle));

  const humanLines = [
    `【VIX≥25×SPY≤-5% ETF別エントリー後リターン】${FORWARD_SIGNAL_START} ～ ${input.bundle.latestDate}`,
    `母集団 ${cohort.length}件 · 基準=エントリー終値 · 評価=N営業日後終値`,
    '（監査のみ・ルール変更なし）',
    '',
    'ETF | 件数 | 1日後均% | 3日後均% | 5日後均% | 10日後均%',
    ...byEtf.map(
      (r) =>
        `${r.symbol} | ${r.tradeCount} | ${r.avgReturn1dPct ?? '—'} | ${r.avgReturn3dPct ?? '—'} | ${r.avgReturn5dPct ?? '—'} | ${r.avgReturn10dPct ?? '—'}`,
    ),
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate: FORWARD_SIGNAL_START,
    toDate: input.bundle.latestDate,
    totalTrades: passed.tradeCount,
    cohortCount: cohort.length,
    cohortMinVix: VIX_COHORT_MIN,
    spyThresholdPct: SPY_THRESHOLD,
    byEtf,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export function formatVix25SpyEtfForwardReturnCsv(report: ForwardVix25SpyEtfForwardReturnAuditReport): string {
  const header = 'symbol,tradeCount,avgReturn1dPct,avgReturn3dPct,avgReturn5dPct,avgReturn10dPct';
  const rows = report.byEtf.map((r) =>
    [
      r.symbol,
      r.tradeCount,
      r.avgReturn1dPct ?? '',
      r.avgReturn3dPct ?? '',
      r.avgReturn5dPct ?? '',
      r.avgReturn10dPct ?? '',
    ].join(','),
  );
  return [header, ...rows].join('\n');
}
