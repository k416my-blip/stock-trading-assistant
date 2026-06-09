/**
 * VIX≥25 24件 · エントリー後N営業日リターン監査 — ルール変更なし
 */
import { FORWARD_SIGNAL_START } from '../../constants/forwardValidation';
import type {
  ForwardPassedTradeRecord,
  ForwardVix25ForwardHorizonDays,
  ForwardVix25ForwardReturnAuditReport,
  ForwardVix25ForwardReturnHorizonRow,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { barIndexByDate, type OhlcvBar } from './case4Indicators';
import { auditPassedTrades } from './forwardValidationPassedTradesAudit';

const VIX_COHORT_MIN = 25;
const HORIZONS: ForwardVix25ForwardHorizonDays[] = [1, 3, 5, 10];

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

function buildHorizonRow(
  horizonDays: ForwardVix25ForwardHorizonDays,
  returns: number[],
): ForwardVix25ForwardReturnHorizonRow {
  const wins = returns.filter((r) => r > 0);
  return {
    horizonDays,
    labelJa: `${horizonDays}営業日後`,
    sampleCount: returns.length,
    avgReturnPct: mean(returns),
    medianReturnPct: median(returns),
    winRatePct: returns.length > 0 ? round3((wins.length / returns.length) * 100) : 0,
  };
}

function formatHorizon(r: ForwardVix25ForwardReturnHorizonRow): string {
  return (
    `${r.labelJa}: n=${r.sampleCount} · 平均${r.avgReturnPct ?? '—'}% · 中央値${r.medianReturnPct ?? '—'}% · 勝率${r.winRatePct}%`
  );
}

export function auditVix25ForwardReturns(input: {
  bundle: ForwardOhlcvBundle;
}): ForwardVix25ForwardReturnAuditReport {
  const passed = auditPassedTrades(input);
  const vixBars = input.bundle.vixBars ?? [];

  const cohort = passed.trades.filter((t) => {
    const vix = vixAtDate(vixBars, t.signalDate);
    return vix != null && vix >= VIX_COHORT_MIN;
  });

  const returnsByHorizon = new Map<ForwardVix25ForwardHorizonDays, number[]>();
  const missingByHorizon = new Map<ForwardVix25ForwardHorizonDays, number>();
  for (const h of HORIZONS) {
    returnsByHorizon.set(h, []);
    missingByHorizon.set(h, 0);
  }

  for (const t of cohort) {
    const bars = input.bundle.etfBars[t.symbol];
    for (const h of HORIZONS) {
      const r = returnAfterEntryBars(bars, t.entryDate, t.entryPrice, h);
      if (r == null) {
        missingByHorizon.set(h, (missingByHorizon.get(h) ?? 0) + 1);
      } else {
        returnsByHorizon.get(h)!.push(r);
      }
    }
  }

  const horizons = HORIZONS.map((h) => buildHorizonRow(h, returnsByHorizon.get(h) ?? []));

  const humanLines = [
    `【VIX≥25 エントリー後リターン監査】${FORWARD_SIGNAL_START} ～ ${input.bundle.latestDate}`,
    `母集団 VIX≥${VIX_COHORT_MIN} ${cohort.length}件（条件適合${passed.tradeCount}件から）`,
    '基準価格=エントリー日終値 · 評価=エントリー日からN営業日後の終値',
    '（監査のみ・ルール変更なし）',
    '',
    '■ ホライズン別',
    ...horizons.map(formatHorizon),
    '',
    '■ 一覧表',
    '営業日後 | 件数 | 平均% | 中央値% | 勝率%',
    ...horizons.map(
      (r) =>
        `${r.horizonDays} | ${r.sampleCount} | ${r.avgReturnPct ?? '—'} | ${r.medianReturnPct ?? '—'} | ${r.winRatePct}`,
    ),
    ...HORIZONS.map((h) => {
      const miss = missingByHorizon.get(h) ?? 0;
      return miss > 0 ? `※ ${h}営業日後: データ不足 ${miss}件` : '';
    }).filter(Boolean),
  ].filter(Boolean);

  return {
    auditedAt: new Date().toISOString(),
    fromDate: FORWARD_SIGNAL_START,
    toDate: input.bundle.latestDate,
    totalTrades: passed.tradeCount,
    cohortCount: cohort.length,
    cohortMinVix: VIX_COHORT_MIN,
    horizons,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export function formatVix25ForwardReturnCsv(report: ForwardVix25ForwardReturnAuditReport): string {
  const header = 'horizonDays,sampleCount,avgReturnPct,medianReturnPct,winRatePct';
  const rows = report.horizons.map((r) =>
    [r.horizonDays, r.sampleCount, r.avgReturnPct ?? '', r.medianReturnPct ?? '', r.winRatePct].join(','),
  );
  return [header, ...rows].join('\n');
}
