/**
 * VIX≥25 MAEワースト10監査 — ルール変更なし
 */
import { FORWARD_SIGNAL_START } from '../../constants/forwardValidation';
import type {
  ForwardPassedTradeRecord,
  ForwardVix25MaeWorst10AuditReport,
  ForwardVix25MaeWorst10Row,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { barIndexByDate, type OhlcvBar } from './case4Indicators';
import { auditPassedTrades } from './forwardValidationPassedTradesAudit';

const VIX_COHORT_MIN = 25;
const WORST_N = 10;

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
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
    const lowRet = (bars[i]!.low / entryPrice - 1) * 100;
    const highRet = (bars[i]!.high / entryPrice - 1) * 100;
    if (lowRet < mae) mae = lowRet;
    if (highRet > mfe) mfe = highRet;
  }
  return { maePct: round3(mae), mfePct: round3(mfe) };
}

function buildRow(
  rank: number,
  t: ForwardPassedTradeRecord,
  vix: number,
  spyRet63Pct: number | null,
  maePct: number,
  mfePct: number,
): ForwardVix25MaeWorst10Row {
  return {
    rank,
    signalDate: t.signalDate,
    symbol: t.symbol,
    returnPct: t.returnPct,
    maePct,
    mfePct,
    holdDays: t.holdDays,
    vix,
    spyRet63Pct,
    dist52wPct: t.dist52wPct,
    macdHistPct: t.macdHistPct,
    adx14: t.adx14,
  };
}

function formatRow(r: ForwardVix25MaeWorst10Row): string {
  return (
    `#${r.rank} ${r.signalDate} ${r.symbol} · 最終${r.returnPct}% · MAE${r.maePct}% · MFE${r.mfePct}% · ` +
    `${r.holdDays}日 · VIX${r.vix} · SPY63${r.spyRet63Pct ?? '—'}% · 52w${r.dist52wPct}% · MACD${r.macdHistPct} · ADX${r.adx14}`
  );
}

export function auditVix25MaeWorst10(input: {
  bundle: ForwardOhlcvBundle;
}): ForwardVix25MaeWorst10AuditReport {
  const passed = auditPassedTrades(input);
  const vixBars = input.bundle.vixBars ?? [];
  const rows: Omit<ForwardVix25MaeWorst10Row, 'rank'>[] = [];
  let skipped = 0;

  for (const t of passed.trades) {
    const vix = vixAtDate(vixBars, t.signalDate);
    if (vix == null || vix < VIX_COHORT_MIN) continue;

    const excursion = computeMaeMfe(
      input.bundle.etfBars[t.symbol],
      t.entryDate,
      t.exitDate,
      t.entryPrice,
    );
    if (!excursion) {
      skipped++;
      continue;
    }

    rows.push(
      buildRow(
        0,
        t,
        vix,
        computeSpyRet63(input.bundle.spyBars, t.signalDate),
        excursion.maePct,
        excursion.mfePct,
      ),
    );
  }

  rows.sort((a, b) => a.maePct - b.maePct);
  const worst10 = rows.slice(0, WORST_N).map((r, i) => ({ ...r, rank: i + 1 }));

  const humanLines = [
    `【VIX≥25 MAEワースト10監査】${FORWARD_SIGNAL_START} ～ ${input.bundle.latestDate}`,
    `母集団 VIX≥${VIX_COHORT_MIN} ${rows.length}件 · MAEの深い順 · 現行出口+3%/25日`,
    skipped > 0 ? `※ OHLC欠損 ${skipped}件` : '',
    '（監査のみ・ルール変更なし）',
    '',
    '■ ワースト10',
    ...worst10.map(formatRow),
  ].filter(Boolean);

  return {
    auditedAt: new Date().toISOString(),
    fromDate: FORWARD_SIGNAL_START,
    toDate: input.bundle.latestDate,
    totalTrades: passed.tradeCount,
    cohortCount: rows.length,
    cohortMinVix: VIX_COHORT_MIN,
    skippedCount: skipped,
    worst10,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export function formatVix25MaeWorst10Csv(report: ForwardVix25MaeWorst10AuditReport): string {
  const header =
    'rank,signalDate,symbol,returnPct,maePct,mfePct,holdDays,vix,spyRet63Pct,dist52wPct,macdHistPct,adx14';
  const body = report.worst10.map((r) =>
    [
      r.rank,
      r.signalDate,
      r.symbol,
      r.returnPct,
      r.maePct,
      r.mfePct,
      r.holdDays,
      r.vix ?? '',
      r.spyRet63Pct ?? '',
      r.dist52wPct,
      r.macdHistPct,
      r.adx14,
    ].join(','),
  );
  return [header, ...body].join('\n');
}
