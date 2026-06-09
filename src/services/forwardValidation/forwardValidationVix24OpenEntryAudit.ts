/**
 * VIX≥24 寄付きエントリー再検証 — 終値版 vs 寄付き版 · 監査のみ
 */
import {
  FORWARD_HOLD_DAYS,
  FORWARD_SIGNAL_START,
  FORWARD_TAKE_PROFIT_PCT,
} from '../../constants/forwardValidation';
import type {
  ForwardPassedTradeRecord,
  ForwardVix24OpenEntryAuditReport,
  ForwardVix24OpenEntryCompareRow,
  ForwardVix24OpenEntryMetrics,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { barIndexByDate, type OhlcvBar } from './case4Indicators';
import { auditPassedTrades } from './forwardValidationPassedTradesAudit';
import { returnAfterEntryBars } from './forwardValidationVix24EffectivenessAudit';

const VIX_THRESHOLD = 24;
const LIVE_CANDIDATE_MIN_WIN_RATE = 95;
const LIVE_CANDIDATE_MIN_CUMULATIVE = 80;

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

function computeMaxDrawdown(
  bars: OhlcvBar[],
  entryDate: string,
  exitDate: string,
  entryPrice: number,
): number | null {
  const entryIdx = barIndexByDate(bars, entryDate);
  const exitIdx = barIndexByDate(bars, exitDate);
  if (entryIdx < 0 || exitIdx < entryIdx || entryPrice <= 0) return null;

  let mae = 0;
  for (let i = entryIdx; i <= exitIdx; i++) {
    const lowRet = (bars[i]!.low / entryPrice - 1) * 100;
    if (lowRet < mae) mae = lowRet;
  }
  return round3(mae);
}

/** 出口ロジックは終値版と同一。entryPrice のみ差し替え */
export function simulateExitFromEntryPrice(
  bars: OhlcvBar[],
  entryIdx: number,
  holdDays: number,
  takeProfitPct: number,
  entryPrice: number,
): {
  returnPct: number;
  exitDate: string;
  exitPrice: number;
  reason: 'take_profit' | 'max_hold';
} | null {
  const lastIdx = Math.min(entryIdx + holdDays, bars.length - 1);
  if (entryIdx >= bars.length || lastIdx <= entryIdx || entryPrice <= 0) return null;
  const target = entryPrice * (1 + takeProfitPct / 100);
  for (let i = entryIdx + 1; i <= lastIdx; i++) {
    const bar = bars[i]!;
    if (bar.high >= target) {
      return {
        returnPct: round3(takeProfitPct),
        exitDate: bar.date,
        exitPrice: round3(target),
        reason: 'take_profit',
      };
    }
  }
  const exitBar = bars[lastIdx]!;
  return {
    returnPct: round3(((exitBar.close / entryPrice - 1) * 100)),
    exitDate: exitBar.date,
    exitPrice: round3(exitBar.close),
    reason: 'max_hold',
  };
}

type SimulatedTrade = {
  symbol: string;
  entryDate: string;
  entryPrice: number;
  exitDate: string;
  returnPct: number;
};

function sortCohort(trades: ForwardPassedTradeRecord[]): ForwardPassedTradeRecord[] {
  return [...trades].sort(
    (a, b) => a.signalDate.localeCompare(b.signalDate) || a.symbol.localeCompare(b.symbol),
  );
}

function simulateOpenEntry(
  bundle: ForwardOhlcvBundle,
  t: ForwardPassedTradeRecord,
): SimulatedTrade | null {
  const bars = bundle.etfBars[t.symbol];
  const entryIdx = barIndexByDate(bars, t.entryDate);
  if (entryIdx < 0) return null;
  const entryPrice = round3(bars[entryIdx]!.open);
  if (entryPrice <= 0) return null;
  const exit = simulateExitFromEntryPrice(
    bars,
    entryIdx,
    FORWARD_HOLD_DAYS,
    FORWARD_TAKE_PROFIT_PCT,
    entryPrice,
  );
  if (!exit) return null;
  return {
    symbol: t.symbol,
    entryDate: t.entryDate,
    entryPrice,
    exitDate: exit.exitDate,
    returnPct: exit.returnPct,
  };
}

function buildMetrics(
  entryModeJa: string,
  rows: SimulatedTrade[],
  bundle: ForwardOhlcvBundle,
): ForwardVix24OpenEntryMetrics {
  const wins = rows.filter((r) => r.returnPct > 0);
  const returns = rows.map((r) => r.returnPct);

  const drawdowns: number[] = [];
  for (const r of rows) {
    const bars = bundle.etfBars[r.symbol];
    const dd = computeMaxDrawdown(bars, r.entryDate, r.exitDate, r.entryPrice);
    if (dd != null) drawdowns.push(dd);
  }

  const nextDayReturns: number[] = [];
  const fiveDayReturns: number[] = [];
  for (const r of rows) {
    const bars = bundle.etfBars[r.symbol];
    const d1 = returnAfterEntryBars(bars, r.entryDate, r.entryPrice, 1);
    const d5 = returnAfterEntryBars(bars, r.entryDate, r.entryPrice, 5);
    if (d1 != null) nextDayReturns.push(d1);
    if (d5 != null) fiveDayReturns.push(d5);
  }

  return {
    entryModeJa,
    tradeCount: rows.length,
    winCount: wins.length,
    lossCount: rows.length - wins.length,
    winRatePct: rows.length > 0 ? round3((wins.length / rows.length) * 100) : 0,
    avgReturnPct: mean(returns),
    avgMaxDrawdownPct: mean(drawdowns),
    nextDayWinRatePct:
      nextDayReturns.length > 0
        ? round3((nextDayReturns.filter((r) => r > 0).length / nextDayReturns.length) * 100)
        : null,
    fiveDayWinRatePct:
      fiveDayReturns.length > 0
        ? round3((fiveDayReturns.filter((r) => r > 0).length / fiveDayReturns.length) * 100)
        : null,
    cumulativeReturnPct: round3(returns.reduce((s, r) => s + r, 0)),
  };
}

function fmtDelta(closeVal: number | null, openVal: number | null): string {
  if (closeVal == null || openVal == null) return '—';
  return round3(openVal - closeVal).toString();
}

function buildComparison(
  closeM: ForwardVix24OpenEntryMetrics,
  openM: ForwardVix24OpenEntryMetrics,
): ForwardVix24OpenEntryCompareRow[] {
  const rows: { metricJa: string; c: string; o: string; d: string }[] = [
    {
      metricJa: '勝率%',
      c: String(closeM.winRatePct),
      o: String(openM.winRatePct),
      d: fmtDelta(closeM.winRatePct, openM.winRatePct),
    },
    {
      metricJa: '勝ち/負け',
      c: `${closeM.winCount}/${closeM.lossCount}`,
      o: `${openM.winCount}/${openM.lossCount}`,
      d: `${openM.winCount - closeM.winCount}/${openM.lossCount - closeM.lossCount}`,
    },
    {
      metricJa: '平均利益率%',
      c: closeM.avgReturnPct != null ? String(closeM.avgReturnPct) : '—',
      o: openM.avgReturnPct != null ? String(openM.avgReturnPct) : '—',
      d: fmtDelta(closeM.avgReturnPct, openM.avgReturnPct),
    },
    {
      metricJa: '平均最大DD%',
      c: closeM.avgMaxDrawdownPct != null ? String(closeM.avgMaxDrawdownPct) : '—',
      o: openM.avgMaxDrawdownPct != null ? String(openM.avgMaxDrawdownPct) : '—',
      d: fmtDelta(closeM.avgMaxDrawdownPct, openM.avgMaxDrawdownPct),
    },
    {
      metricJa: '翌日勝率%',
      c: closeM.nextDayWinRatePct != null ? String(closeM.nextDayWinRatePct) : '—',
      o: openM.nextDayWinRatePct != null ? String(openM.nextDayWinRatePct) : '—',
      d: fmtDelta(closeM.nextDayWinRatePct, openM.nextDayWinRatePct),
    },
    {
      metricJa: '5日勝率%',
      c: closeM.fiveDayWinRatePct != null ? String(closeM.fiveDayWinRatePct) : '—',
      o: openM.fiveDayWinRatePct != null ? String(openM.fiveDayWinRatePct) : '—',
      d: fmtDelta(closeM.fiveDayWinRatePct, openM.fiveDayWinRatePct),
    },
    {
      metricJa: '累積利益率%',
      c: String(closeM.cumulativeReturnPct),
      o: String(openM.cumulativeReturnPct),
      d: fmtDelta(closeM.cumulativeReturnPct, openM.cumulativeReturnPct),
    },
  ];
  return rows.map((r) => ({
    metricJa: r.metricJa,
    closeValue: r.c,
    openValue: r.o,
    delta: r.d,
  }));
}

function pad(s: string, w: number): string {
  return s.length >= w ? s : s + ' '.repeat(w - s.length);
}

function formatComparisonTable(rows: ForwardVix24OpenEntryCompareRow[]): string[] {
  const cols = [
    { w: 14, h: '項目' },
    { w: 12, h: '終値版' },
    { w: 12, h: '寄付き版' },
    { w: 10, h: '差分' },
  ];
  const line = (cells: string[]) => cols.map((c, i) => pad(cells[i] ?? '', c.w)).join(' ');
  return [
    line(cols.map((c) => c.h)),
    cols.map((c) => '-'.repeat(c.w)).join(' '),
    ...rows.map((r) => line([r.metricJa, r.closeValue, r.openValue, r.delta])),
  ];
}

export function auditVix24OpenEntry(input: {
  bundle: ForwardOhlcvBundle;
}): ForwardVix24OpenEntryAuditReport {
  const passed = auditPassedTrades(input);
  const vixBars = input.bundle.vixBars ?? [];
  const cohort = sortCohort(
    passed.trades.filter((t) => {
      const vix = vixAtDate(vixBars, t.signalDate);
      return vix != null && vix >= VIX_THRESHOLD;
    }),
  );

  const closeRows: SimulatedTrade[] = cohort.map((t) => ({
    symbol: t.symbol,
    entryDate: t.entryDate,
    entryPrice: t.entryPrice,
    exitDate: t.exitDate,
    returnPct: t.returnPct,
  }));

  const openRows: SimulatedTrade[] = [];
  for (const t of cohort) {
    const sim = simulateOpenEntry(input.bundle, t);
    if (sim) openRows.push(sim);
  }

  const closeMetrics = buildMetrics('翌営業日終値', closeRows, input.bundle);
  const openMetrics = buildMetrics('翌営業日寄付き', openRows, input.bundle);
  const comparison = buildComparison(closeMetrics, openMetrics);

  const liveCandidate =
    openMetrics.winRatePct >= LIVE_CANDIDATE_MIN_WIN_RATE &&
    openMetrics.cumulativeReturnPct >= LIVE_CANDIDATE_MIN_CUMULATIVE;

  const liveCandidateVerdictJa = liveCandidate
    ? `【実運用候補】寄付き版 勝率${openMetrics.winRatePct}%≥${LIVE_CANDIDATE_MIN_WIN_RATE}% かつ 累積${openMetrics.cumulativeReturnPct}%≥${LIVE_CANDIDATE_MIN_CUMULATIVE}%`
    : `【実運用候補 非該当】寄付き版 勝率${openMetrics.winRatePct}% / 累積${openMetrics.cumulativeReturnPct}%（基準: 勝率≥${LIVE_CANDIDATE_MIN_WIN_RATE}% かつ 累積≥${LIVE_CANDIDATE_MIN_CUMULATIVE}%）`;

  const humanLines = [
    `【VIX≥24 寄付きエントリー再検証】${FORWARD_SIGNAL_START} ～ ${input.bundle.latestDate}`,
    `対象 条件適合 ${passed.tradeCount}件 · VIX≥${VIX_THRESHOLD} 該当 ${cohort.length}件`,
    `現行出口 +${FORWARD_TAKE_PROFIT_PCT}% / ${FORWARD_HOLD_DAYS}営業日 · 変更点=entryPriceのみ（寄付き）`,
    '（監査のみ・ルール変更なし）',
    '',
    '■ 終値版サマリー',
    `勝率 ${closeMetrics.winRatePct}% · 勝${closeMetrics.winCount} 敗${closeMetrics.lossCount} · 均R ${closeMetrics.avgReturnPct ?? '—'}% · 累積 ${closeMetrics.cumulativeReturnPct}%`,
    '',
    '■ 寄付き版サマリー',
    `勝率 ${openMetrics.winRatePct}% · 勝${openMetrics.winCount} 敗${openMetrics.lossCount} · 均R ${openMetrics.avgReturnPct ?? '—'}% · 累積 ${openMetrics.cumulativeReturnPct}%`,
    '',
    '■ 比較表',
    ...formatComparisonTable(comparison),
    '',
    `■ 判定: ${liveCandidateVerdictJa}`,
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate: FORWARD_SIGNAL_START,
    toDate: input.bundle.latestDate,
    totalTrades: passed.tradeCount,
    cohortTradeCount: cohort.length,
    vixThreshold: VIX_THRESHOLD,
    closeMetrics,
    openMetrics,
    comparison,
    liveCandidate,
    liveCandidateVerdictJa,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export function formatVix24OpenEntryCsv(report: ForwardVix24OpenEntryAuditReport): string {
  const header = 'metric,closeEntry,openEntry,delta';
  const rows = report.comparison.map((r) =>
    [r.metricJa, r.closeValue, r.openValue, r.delta].join(','),
  );
  const summary = [
    '',
    'verdict,liveCandidate,detail',
    `liveCandidate,${report.liveCandidate ? 1 : 0},"${report.liveCandidateVerdictJa.replace(/"/g, '""')}"`,
    '',
    'mode,tradeCount,winCount,lossCount,winRatePct,avgReturnPct,avgMaxDrawdownPct,nextDayWinRatePct,fiveDayWinRatePct,cumulativeReturnPct',
    [
      'close',
      report.closeMetrics.tradeCount,
      report.closeMetrics.winCount,
      report.closeMetrics.lossCount,
      report.closeMetrics.winRatePct,
      report.closeMetrics.avgReturnPct ?? '',
      report.closeMetrics.avgMaxDrawdownPct ?? '',
      report.closeMetrics.nextDayWinRatePct ?? '',
      report.closeMetrics.fiveDayWinRatePct ?? '',
      report.closeMetrics.cumulativeReturnPct,
    ].join(','),
    [
      'open',
      report.openMetrics.tradeCount,
      report.openMetrics.winCount,
      report.openMetrics.lossCount,
      report.openMetrics.winRatePct,
      report.openMetrics.avgReturnPct ?? '',
      report.openMetrics.avgMaxDrawdownPct ?? '',
      report.openMetrics.nextDayWinRatePct ?? '',
      report.openMetrics.fiveDayWinRatePct ?? '',
      report.openMetrics.cumulativeReturnPct,
    ].join(','),
  ];
  return [header, ...rows, ...summary].join('\n');
}
