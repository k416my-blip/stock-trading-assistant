/**
 * バックテスト品質監査 — VIX≥24 · 2018〜 · 監査のみ
 */
import {
  FORWARD_ETF_UNIVERSE,
  FORWARD_MAX_CONCURRENT,
  FORWARD_PRIORITY,
} from '../../constants/forwardValidation';
import type {
  ForwardBacktestCapitalAuditRow,
  ForwardBacktestEtfPerformanceRow,
  ForwardBacktestFeasibilityGrade,
  ForwardBacktestQualityAuditReport,
  ForwardPassedTradeRecord,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { fetchForwardOhlcvBundle } from './forwardValidationEngine';
import { barIndexByDate, type OhlcvBar } from './case4Indicators';
import { collectPassedTradesFrom } from './forwardValidationPassedTradesAudit';
import {
  EXTENDED_AUDIT_START,
  filterVix24Trades,
} from './forwardValidationVix24ExtendedHistoryAudit';

const VIX_THRESHOLD = 24;
const FX_JPY_PER_USD = 150;
const CAPITAL_LEVELS_JPY = [1_000_000, 3_000_000, 10_000_000];

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function mean(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return round3(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function computeTradeMaxDrawdown(
  bars: OhlcvBar[],
  t: ForwardPassedTradeRecord,
): number | null {
  const entryIdx = barIndexByDate(bars, t.entryDate);
  const exitIdx = barIndexByDate(bars, t.exitDate);
  if (entryIdx < 0 || exitIdx < entryIdx || t.entryPrice <= 0) return null;
  let mae = 0;
  for (let i = entryIdx; i <= exitIdx; i++) {
    const lowRet = (bars[i]!.low / t.entryPrice - 1) * 100;
    if (lowRet < mae) mae = lowRet;
  }
  return round3(mae);
}

export function maxSameDaySignalStats(trades: ForwardPassedTradeRecord[]): {
  maxCount: number;
  maxDate: string | null;
  avgCount: number | null;
} {
  const byDate = new Map<string, number>();
  for (const t of trades) {
    byDate.set(t.signalDate, (byDate.get(t.signalDate) ?? 0) + 1);
  }
  if (byDate.size === 0) return { maxCount: 0, maxDate: null, avgCount: null };
  let maxCount = 0;
  let maxDate: string | null = null;
  for (const [d, c] of byDate) {
    if (c > maxCount) {
      maxCount = c;
      maxDate = d;
    }
  }
  return { maxCount, maxDate, avgCount: mean([...byDate.values()]) };
}

export function maxConcurrentHoldingsStats(
  trades: ForwardPassedTradeRecord[],
  tradingDates: string[],
): { maxConcurrent: number; maxDate: string | null } {
  if (trades.length === 0) return { maxConcurrent: 0, maxDate: null };
  const from = trades.reduce((m, t) => (t.entryDate < m ? t.entryDate : m), trades[0]!.entryDate);
  const to = trades.reduce((m, t) => (t.exitDate > m ? t.exitDate : m), trades[0]!.exitDate);
  const dates = tradingDates.filter((d) => d >= from && d <= to);
  let maxConcurrent = 0;
  let maxDate: string | null = null;
  for (const d of dates) {
    const open = trades.filter((t) => t.entryDate <= d && t.exitDate >= d).length;
    if (open > maxConcurrent) {
      maxConcurrent = open;
      maxDate = d;
    }
  }
  return { maxConcurrent, maxDate };
}

export function peakOneShareCapitalJpy(trades: ForwardPassedTradeRecord[]): number {
  let overlapPeak = 0;
  const dates = [...new Set(trades.flatMap((t) => [t.entryDate, t.exitDate]))].sort();
  for (const d of dates) {
    const open = trades.filter((t) => t.entryDate <= d && t.exitDate >= d);
    const cost = open.reduce((s, t) => s + t.entryPrice * FX_JPY_PER_USD, 0);
    overlapPeak = Math.max(overlapPeak, cost);
  }
  return Math.round(overlapPeak);
}

export function simulateCapitalConstraint(
  trades: ForwardPassedTradeRecord[],
  capitalJpy: number,
): Omit<
  ForwardBacktestCapitalAuditRow,
  'capitalJpy' | 'peakOneShareCapitalJpy' | 'canTakeAllSignalsOneShare'
> {
  const sorted = [...trades].sort(
    (a, b) => a.entryDate.localeCompare(b.entryDate) || a.symbol.localeCompare(b.symbol),
  );
  const slotCapital = capitalJpy / FORWARD_MAX_CONCURRENT;
  const open: ForwardPassedTradeRecord[] = [];
  let executed = 0;
  let skippedConcurrent = 0;
  let skippedCapital = 0;

  for (const t of sorted) {
    const stillOpen = open.filter((o) => o.exitDate >= t.entryDate);
    open.length = 0;
    open.push(...stillOpen);
    const entryCostJpy = t.entryPrice * FX_JPY_PER_USD;
    if (open.length >= FORWARD_MAX_CONCURRENT) {
      skippedConcurrent++;
      continue;
    }
    if (entryCostJpy > slotCapital) {
      skippedCapital++;
      continue;
    }
    open.push(t);
    executed++;
  }

  const skipped = skippedConcurrent + skippedCapital;
  return {
    executedCount: executed,
    skippedCount: skipped,
    skippedConcurrent,
    skippedCapital,
    canExecuteAllUnderMaxConcurrent: skipped === 0,
  };
}

export function dedupOneEtfPerDay(trades: ForwardPassedTradeRecord[]): ForwardPassedTradeRecord[] {
  const byDate = new Map<string, ForwardPassedTradeRecord[]>();
  for (const t of trades) {
    const list = byDate.get(t.signalDate) ?? [];
    list.push(t);
    byDate.set(t.signalDate, list);
  }
  const out: ForwardPassedTradeRecord[] = [];
  for (const rows of byDate.values()) {
    const best = [...rows].sort(
      (a, b) => FORWARD_PRIORITY[b.symbol] - FORWARD_PRIORITY[a.symbol],
    )[0]!;
    out.push(best);
  }
  return out.sort((a, b) => a.signalDate.localeCompare(b.signalDate));
}

function buildEtfPerformance(
  trades: ForwardPassedTradeRecord[],
  bundle: ForwardOhlcvBundle,
): ForwardBacktestEtfPerformanceRow[] {
  return FORWARD_ETF_UNIVERSE.map((symbol) => {
    const rows = trades.filter((t) => t.symbol === symbol);
    const wins = rows.filter((t) => t.returnPct > 0);
    const dds = rows
      .map((t) => computeTradeMaxDrawdown(bundle.etfBars[symbol], t))
      .filter((v): v is number => v != null);
    return {
      symbol,
      tradeCount: rows.length,
      winRatePct: rows.length > 0 ? round3((wins.length / rows.length) * 100) : 0,
      avgReturnPct: mean(rows.map((t) => t.returnPct)),
      avgMaxDrawdownPct: mean(dds),
    };
  });
}

function buildSurvivorshipNotes(bundle: ForwardOhlcvBundle): {
  firstBarDates: Record<string, string>;
  notesJa: string;
} {
  const firstBarDates: Record<string, string> = {};
  for (const sym of FORWARD_ETF_UNIVERSE) {
    const bars = bundle.etfBars[sym];
    firstBarDates[sym] = bars.length > 0 ? bars[0]!.date : '—';
  }
  const lines = [
    '監査対象は現行上場4ETF（SCHD/VYM/DGRO/SPLG）のみ。Delisted銘柄は未含有。',
    ...FORWARD_ETF_UNIVERSE.map((s) => `${s}: Yahooデータ開始 ${firstBarDates[s] ?? '—'}`),
    'シグナル日に当該ETFのOHLCが存在する場合のみトレード計上（上場前日付は自動除外）。',
  ];
  return { firstBarDates, notesJa: lines.join('\n') };
}

export function gradeFeasibility(input: {
  maxSameDay: number;
  maxConcurrent: number;
  capital1M: ForwardBacktestCapitalAuditRow;
  capital3M: ForwardBacktestCapitalAuditRow;
  dedupWinRate: number;
  cohortWinRate: number;
}): { grade: ForwardBacktestFeasibilityGrade; verdictJa: string } {
  const { maxSameDay, maxConcurrent, capital1M, capital3M, dedupWinRate, cohortWinRate } = input;
  if (
    capital1M.canExecuteAllUnderMaxConcurrent &&
    capital1M.canTakeAllSignalsOneShare &&
    dedupWinRate >= 90 &&
    cohortWinRate >= 95
  ) {
    return {
      grade: 'A',
      verdictJa:
        'A: 100万円・同時3件ルールで全シグナル実行可。重複除外後も高勝率。現行ETF限定の生存者バイアスは要認識。',
    };
  }
  if (
    capital3M.canExecuteAllUnderMaxConcurrent &&
    dedupWinRate >= 85 &&
    cohortWinRate >= 90
  ) {
    return {
      grade: 'B',
      verdictJa:
        `B: 300万円以上推奨。最大同時保有${maxConcurrent}件・同日最大${maxSameDay}件。1Mでは${capital1M.skippedCount}件スキップ。`,
    };
  }
  if (capital3M.executedCount > 0 && dedupWinRate >= 75) {
    return {
      grade: 'C',
      verdictJa:
        `C: 資金または同時保有制約あり（1Mスキップ${capital1M.skippedCount}・最大同時${maxConcurrent}）。重複除外勝率${dedupWinRate}%。`,
    };
  }
  return {
    grade: 'D',
    verdictJa: 'D: 実運用制約下で成績または実行可能性に重大な懸念。',
  };
}

export function auditBacktestQuality(input: {
  bundle: ForwardOhlcvBundle;
  fromDate?: string;
}): ForwardBacktestQualityAuditReport {
  const fromDate = input.fromDate ?? EXTENDED_AUDIT_START;
  const toDate = input.bundle.latestDate;
  const vixBars = input.bundle.vixBars ?? [];
  const allPassed = collectPassedTradesFrom(input.bundle, fromDate, toDate);
  const cohort = filterVix24Trades(allPassed, vixBars);

  const sameDay = maxSameDaySignalStats(cohort);
  const concurrent = maxConcurrentHoldingsStats(cohort, input.bundle.tradingDates);
  const peakCapital = peakOneShareCapitalJpy(cohort);

  const capitalAudits: ForwardBacktestCapitalAuditRow[] = CAPITAL_LEVELS_JPY.map((cap) => ({
    capitalJpy: cap,
    peakOneShareCapitalJpy: peakCapital,
    canTakeAllSignalsOneShare: cap >= peakCapital,
    ...simulateCapitalConstraint(cohort, cap),
  }));

  const etfPerformance = buildEtfPerformance(cohort, input.bundle);
  const deduped = dedupOneEtfPerDay(cohort);
  const dedupWins = deduped.filter((t) => t.returnPct > 0);
  const dedupWinRate = deduped.length > 0 ? round3((dedupWins.length / deduped.length) * 100) : 0;
  const dedupCumulative = round3(deduped.reduce((s, t) => s + t.returnPct, 0));
  const cohortWins = cohort.filter((t) => t.returnPct > 0);
  const cohortWinRate = cohort.length > 0 ? round3((cohortWins.length / cohort.length) * 100) : 0;

  const { firstBarDates, notesJa } = buildSurvivorshipNotes(input.bundle);
  const cap1M = capitalAudits.find((c) => c.capitalJpy === 1_000_000)!;
  const cap3M = capitalAudits.find((c) => c.capitalJpy === 3_000_000)!;
  const { grade, verdictJa } = gradeFeasibility({
    maxSameDay: sameDay.maxCount,
    maxConcurrent: concurrent.maxConcurrent,
    capital1M: cap1M,
    capital3M: cap3M,
    dedupWinRate,
    cohortWinRate,
  });

  const humanLines = [
    `【バックテスト品質監査】${fromDate} ～ ${toDate}`,
    `対象 VIX≥${VIX_THRESHOLD} · ${cohort.length}件（監査のみ・ルール変更なし）`,
    '',
    '■ 1. 同日シグナル重複',
    `最大 ${sameDay.maxCount}件/日（${sameDay.maxDate ?? '—'}）· 平均 ${sameDay.avgCount ?? '—'}件/日`,
    `※現行エンジン上限 ${FORWARD_MAX_CONCURRENT}件/シグナル日`,
    '',
    '■ 2. 最大同時保有',
    `最大 ${concurrent.maxConcurrent}件（${concurrent.maxDate ?? '—'}）`,
    '',
    `■ 3. 資金制約（1株・${FX_JPY_PER_USD}円/USD · 同時${FORWARD_MAX_CONCURRENT}枠均等配分）`,
    ...capitalAudits.map(
      (c) =>
        `${c.capitalJpy / 10_000}万円: 実行${c.executedCount} スキップ${c.skippedCount} ` +
        `(枠${c.skippedConcurrent}/資金${c.skippedCapital}) · 全件1株必要${c.peakOneShareCapitalJpy}円 · ` +
        `全件可=${c.canTakeAllSignalsOneShare ? '可' : '不可'}`,
    ),
    '',
    '■ 4. ETF別成績',
    ...etfPerformance.map(
      (e) =>
        `${e.symbol}: ${e.tradeCount}件 · 勝率${e.winRatePct}% · 均R${e.avgReturnPct ?? '—'}% · DD${e.avgMaxDrawdownPct ?? '—'}%`,
    ),
    '',
    '■ 5. 重複除外（1日1ETF・優先度DGRO>VYM>SPLG>SCHD）',
    `${deduped.length}件 · 勝率${dedupWinRate}% · 均R${mean(deduped.map((t) => t.returnPct)) ?? '—'}% · 累積${dedupCumulative}%`,
    '',
    '■ 6. 生存者バイアス',
    notesJa,
    '',
    `■ 7. 実運用可能性: 【${grade}】`,
    verdictJa,
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate,
    toDate,
    cohortTradeCount: cohort.length,
    maxSameDaySignalCount: sameDay.maxCount,
    maxSameDaySignalDate: sameDay.maxDate,
    avgSameDaySignalCount: sameDay.avgCount,
    maxConcurrentHoldings: concurrent.maxConcurrent,
    maxConcurrentDate: concurrent.maxDate,
    capitalAudits,
    etfPerformance,
    dedupTradeCount: deduped.length,
    dedupWinRatePct: dedupWinRate,
    dedupAvgReturnPct: mean(deduped.map((t) => t.returnPct)),
    dedupCumulativeReturnPct: dedupCumulative,
    survivorshipFirstBarDates: firstBarDates,
    survivorshipBiasNotesJa: notesJa,
    feasibilityGrade: grade,
    feasibilityVerdictJa: verdictJa,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export async function runBacktestQualityAudit(): Promise<ForwardBacktestQualityAuditReport | null> {
  const bundle = await fetchForwardOhlcvBundle(EXTENDED_AUDIT_START);
  if (!bundle) return null;
  return auditBacktestQuality({ bundle });
}

export function formatBacktestQualityCsv(report: ForwardBacktestQualityAuditReport): string {
  const lines = [
    'section,metric,value',
    `sameDay,maxCount,${report.maxSameDaySignalCount}`,
    `sameDay,maxDate,${report.maxSameDaySignalDate ?? ''}`,
    `concurrent,max,${report.maxConcurrentHoldings}`,
    `concurrent,maxDate,${report.maxConcurrentDate ?? ''}`,
    `dedup,tradeCount,${report.dedupTradeCount}`,
    `dedup,winRatePct,${report.dedupWinRatePct}`,
    `dedup,cumulativeReturnPct,${report.dedupCumulativeReturnPct}`,
    `feasibility,grade,${report.feasibilityGrade}`,
    '',
    'capitalJpy,executed,skipped,skippedConcurrent,skippedCapital,canExecuteAll,peakOneShareJpy,canTakeAllOneShare',
    ...report.capitalAudits.map((c) =>
      [
        c.capitalJpy,
        c.executedCount,
        c.skippedCount,
        c.skippedConcurrent,
        c.skippedCapital,
        c.canExecuteAllUnderMaxConcurrent ? 1 : 0,
        c.peakOneShareCapitalJpy,
        c.canTakeAllSignalsOneShare ? 1 : 0,
      ].join(','),
    ),
    '',
    'symbol,tradeCount,winRatePct,avgReturnPct,avgMaxDrawdownPct',
    ...report.etfPerformance.map((e) =>
      [e.symbol, e.tradeCount, e.winRatePct, e.avgReturnPct ?? '', e.avgMaxDrawdownPct ?? ''].join(','),
    ),
  ];
  return lines.join('\n');
}
