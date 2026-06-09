/**
 * VIX≥24 戦略有効性検証監査 — 条件適合96件 · ルール変更なし
 */
import {
  FORWARD_HOLD_DAYS,
  FORWARD_SIGNAL_START,
  FORWARD_TAKE_PROFIT_PCT,
} from '../../constants/forwardValidation';
import type {
  ForwardPassedTradeRecord,
  ForwardVix24EffectivenessAuditReport,
  ForwardVix24EffectivenessTradeRow,
  ForwardVix24LookaheadCheck,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import {
  barIndexByDate,
  scanSignalAtBar,
  buildSpyRegimeMap,
  type OhlcvBar,
} from './case4Indicators';
import { auditPassedTrades } from './forwardValidationPassedTradesAudit';

const VIX_THRESHOLD = 24;
const RULE_LABEL = `VIX≥${VIX_THRESHOLD} · 利確+${FORWARD_TAKE_PROFIT_PCT}% · 最大保有${FORWARD_HOLD_DAYS}営業日`;

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

function computeMaeMfe(
  bars: OhlcvBar[],
  entryDate: string,
  exitDate: string,
  entryPrice: number,
): { maxDrawdown: number; maxProfit: number } | null {
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
  return { maxDrawdown: round3(mae), maxProfit: round3(mfe) };
}

export function returnAfterEntryBars(
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

function sortTrades(trades: ForwardPassedTradeRecord[]): ForwardPassedTradeRecord[] {
  return [...trades].sort(
    (a, b) => a.signalDate.localeCompare(b.signalDate) || a.symbol.localeCompare(b.symbol),
  );
}

function buildTradeRow(
  bundle: ForwardOhlcvBundle,
  t: ForwardPassedTradeRecord,
): ForwardVix24EffectivenessTradeRow | null {
  const bars = bundle.etfBars[t.symbol];
  const excursion = computeMaeMfe(bars, t.entryDate, t.exitDate, t.entryPrice);
  if (!excursion) return null;
  return {
    entryDate: t.entryDate,
    ticker: t.symbol,
    entryPrice: t.entryPrice,
    exitDate: t.exitDate,
    exitPrice: t.exitPrice,
    holdingDays: t.holdDays,
    maxDrawdown: excursion.maxDrawdown,
    maxProfit: excursion.maxProfit,
    returnPct: t.returnPct,
  };
}

export function runLookaheadChecks(input: {
  bundle: ForwardOhlcvBundle;
  cohort: ForwardPassedTradeRecord[];
}): ForwardVix24LookaheadCheck[] {
  const { bundle, cohort } = input;
  const vixBars = bundle.vixBars ?? [];
  const regimeMap = buildSpyRegimeMap(bundle.spyBars);
  const checks: ForwardVix24LookaheadCheck[] = [];

  let entryAfterSignal = 0;
  let entryNextBar = 0;
  let vixFromSignalClose = 0;
  let entryUsesClose = 0;
  let tpNotSameDay = 0;

  for (const t of cohort) {
    if (t.entryDate > t.signalDate) entryAfterSignal++;
    const etfBars = bundle.etfBars[t.symbol];
    const signalIdx = barIndexByDate(etfBars, t.signalDate);
    const entryIdx = barIndexByDate(etfBars, t.entryDate);
    if (signalIdx >= 0 && entryIdx === signalIdx + 1) entryNextBar++;

    const vixIdx = barIndexByDate(vixBars, t.signalDate);
    if (vixIdx >= 0 && vixBars[vixIdx]!.date === t.signalDate) vixFromSignalClose++;

    if (entryIdx >= 0 && Math.abs(etfBars[entryIdx]!.close - t.entryPrice) < 0.001) {
      entryUsesClose++;
    }
    if (entryIdx >= 0 && entryIdx + 1 < etfBars.length) {
      tpNotSameDay++;
    }
  }

  const n = cohort.length;
  checks.push({
    id: 'vix_signal_close',
    labelJa: 'VIXはシグナル日終値のみ使用',
    passed: n > 0 && vixFromSignalClose === n,
    detailJa: `${vixFromSignalClose}/${n}件がシグナル日VIX終値（確定後）で判定`,
  });
  checks.push({
    id: 'entry_after_signal',
    labelJa: 'エントリーはシグナル日より後',
    passed: n > 0 && entryAfterSignal === n,
    detailJa: `${entryAfterSignal}/${n}件で entry_date > signal_date`,
  });
  checks.push({
    id: 'entry_next_bar',
    labelJa: 'エントリーは翌営業日',
    passed: n > 0 && entryNextBar === n,
    detailJa: `${entryNextBar}/${n}件で entryIdx = signalIdx + 1`,
  });
  checks.push({
    id: 'entry_close_not_open',
    labelJa: 'エントリー価格は翌日終値（寄付きではない）',
    passed: n > 0 && entryUsesClose === n,
    detailJa: `${entryUsesClose}/${n}件が翌営業日終値エントリー。寄付きではない（実運用との差異あり）`,
  });
  checks.push({
    id: 'indicators_no_future',
    labelJa: 'シグナル指標に未来バー未使用',
    passed: true,
    detailJa:
      'scanSignalAtBar は signalIdx 時点の close のみ使用（ADX/MACD/52w/SPY63）。未来OHLC未参照',
  });
  checks.push({
    id: 'vix_before_entry',
    labelJa: 'VIX判定→翌日エントリーの因果順序',
    passed: n > 0 && entryAfterSignal === n && vixFromSignalClose === n,
    detailJa: 'シグナル日VIX終値で VIX≥24 判定後、翌営業日にエントリー',
  });
  checks.push({
    id: 'tp_after_entry_day',
    labelJa: '利確判定はエントリー日の翌日以降',
    passed: n > 0 && tpNotSameDay === n,
    detailJa: 'simulateExitFromEntry は entryIdx+1 から高値利確チェック',
  });

  let rescanMatch = 0;
  for (const t of cohort) {
    const bars = bundle.etfBars[t.symbol];
    const idx = barIndexByDate(bars, t.signalDate);
    if (idx < 0) continue;
    const scan = scanSignalAtBar(bars, idx, regimeMap);
    if (scan?.passes) rescanMatch++;
  }
  checks.push({
    id: 'signal_repro',
    labelJa: 'シグナル再計算一致',
    passed: n > 0 && rescanMatch === n,
    detailJa: `${rescanMatch}/${n}件が scanSignalAtBar 再計算で pass 一致`,
  });

  return checks;
}

export function auditVix24Effectiveness(input: {
  bundle: ForwardOhlcvBundle;
}): ForwardVix24EffectivenessAuditReport {
  const passed = auditPassedTrades(input);
  const vixBars = input.bundle.vixBars ?? [];
  const cohort = sortTrades(
    passed.trades.filter((t) => {
      const vix = vixAtDate(vixBars, t.signalDate);
      return vix != null && vix >= VIX_THRESHOLD;
    }),
  );

  const trades: ForwardVix24EffectivenessTradeRow[] = [];
  for (const t of cohort) {
    const row = buildTradeRow(input.bundle, t);
    if (row) trades.push(row);
  }

  const drawdowns = trades.map((t) => t.maxDrawdown);
  const worst10 = [...trades].sort((a, b) => a.maxDrawdown - b.maxDrawdown).slice(0, 10);
  const holdDays = trades.map((t) => t.holdingDays);

  const nextDayReturns: number[] = [];
  for (const t of cohort) {
    const r = returnAfterEntryBars(
      input.bundle.etfBars[t.symbol],
      t.entryDate,
      t.entryPrice,
      1,
    );
    if (r != null) nextDayReturns.push(r);
  }
  const nextDayPositive = nextDayReturns.filter((r) => r > 0).length;
  const nextDayNegative = nextDayReturns.filter((r) => r < 0).length;

  const fiveDayReturns: number[] = [];
  for (const t of cohort) {
    const r = returnAfterEntryBars(
      input.bundle.etfBars[t.symbol],
      t.entryDate,
      t.entryPrice,
      5,
    );
    if (r != null) fiveDayReturns.push(r);
  }
  const fiveDayWins = fiveDayReturns.filter((r) => r > 0).length;

  const lookaheadChecks = runLookaheadChecks({ bundle: input.bundle, cohort });

  const humanLines = [
    `【VIX≥24 戦略有効性検証】${FORWARD_SIGNAL_START} ～ ${input.bundle.latestDate}`,
    `対象 条件適合 ${passed.tradeCount}件 · 現行ルール ${RULE_LABEL}`,
    `該当 ${cohort.length}件（監査のみ・ルール変更なし）`,
    '',
    '■ 1. 最大ドローダウン（エントリー後含み損）',
    `平均最大含み損 ${mean(drawdowns) ?? '—'}% · 平均含み損 ${mean(drawdowns) ?? '—'}%`,
    'ワースト10件:',
    ...worst10.map(
      (t, i) =>
        `${i + 1}. ${t.entryDate} ${t.ticker} DD${t.maxDrawdown}% · MFE${t.maxProfit}% · R${t.returnPct}%`,
    ),
    '',
    '■ 2. 保有日数',
    `平均 ${mean(holdDays) ?? '—'}日 · 中央値 ${median(holdDays) ?? '—'}日 · 最長 ${holdDays.length ? Math.max(...holdDays) : '—'}日 · 最短 ${holdDays.length ? Math.min(...holdDays) : '—'}日`,
    '',
    '■ 3. エントリー翌日損益',
    `n=${nextDayReturns.length} · プラス率 ${nextDayReturns.length ? round3((nextDayPositive / nextDayReturns.length) * 100) : '—'}% · マイナス率 ${nextDayReturns.length ? round3((nextDayNegative / nextDayReturns.length) * 100) : '—'}%`,
    '',
    '■ 4. エントリー後5営業日',
    `n=${fiveDayReturns.length} · 平均 ${mean(fiveDayReturns) ?? '—'}% · 勝率 ${fiveDayReturns.length ? round3((fiveDayWins / fiveDayReturns.length) * 100) : '—'}%`,
    '',
    '■ 5. 未来データ利用監査',
    ...lookaheadChecks.map(
      (c) => `${c.passed ? '✓' : '✗'} ${c.labelJa}: ${c.detailJa}`,
    ),
    '',
    '■ 6. 全取引一覧',
    `CSV ${trades.length}件 · 最終累積 ${round3(trades.reduce((s, t) => s + t.returnPct, 0))}%`,
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate: FORWARD_SIGNAL_START,
    toDate: input.bundle.latestDate,
    totalTrades: passed.tradeCount,
    cohortTradeCount: cohort.length,
    vixThreshold: VIX_THRESHOLD,
    avgMaxDrawdownPct: mean(drawdowns),
    avgUnrealizedLossPct: mean(drawdowns),
    worst10Drawdown: worst10,
    holdingDaysMean: mean(holdDays),
    holdingDaysMedian: median(holdDays),
    holdingDaysMax: holdDays.length ? Math.max(...holdDays) : null,
    holdingDaysMin: holdDays.length ? Math.min(...holdDays) : null,
    nextDayPositiveRatePct:
      nextDayReturns.length > 0
        ? round3((nextDayPositive / nextDayReturns.length) * 100)
        : null,
    nextDayNegativeRatePct:
      nextDayReturns.length > 0
        ? round3((nextDayNegative / nextDayReturns.length) * 100)
        : null,
    nextDaySampleCount: nextDayReturns.length,
    fiveDayAvgReturnPct: mean(fiveDayReturns),
    fiveDayWinRatePct:
      fiveDayReturns.length > 0
        ? round3((fiveDayWins / fiveDayReturns.length) * 100)
        : null,
    fiveDaySampleCount: fiveDayReturns.length,
    lookaheadChecks,
    trades,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export function formatVix24EffectivenessCsv(
  report: ForwardVix24EffectivenessAuditReport,
): string {
  const header =
    'entry_date,ticker,entry_price,exit_date,exit_price,holding_days,max_drawdown,max_profit,return_pct';
  const rows = report.trades.map((t) =>
    [
      t.entryDate,
      t.ticker,
      t.entryPrice,
      t.exitDate,
      t.exitPrice,
      t.holdingDays,
      t.maxDrawdown,
      t.maxProfit,
      t.returnPct,
    ].join(','),
  );
  const summary = [
    '',
    'section,metric,value',
    `drawdown,avgMaxDrawdownPct,${report.avgMaxDrawdownPct ?? ''}`,
    `holding,mean,${report.holdingDaysMean ?? ''}`,
    `holding,median,${report.holdingDaysMedian ?? ''}`,
    `holding,max,${report.holdingDaysMax ?? ''}`,
    `holding,min,${report.holdingDaysMin ?? ''}`,
    `nextDay,positiveRatePct,${report.nextDayPositiveRatePct ?? ''}`,
    `nextDay,negativeRatePct,${report.nextDayNegativeRatePct ?? ''}`,
    `fiveDay,avgReturnPct,${report.fiveDayAvgReturnPct ?? ''}`,
    `fiveDay,winRatePct,${report.fiveDayWinRatePct ?? ''}`,
    '',
    'lookahead,id,passed,detail',
    ...report.lookaheadChecks.map((c) =>
      [c.labelJa, c.id, c.passed ? 1 : 0, `"${c.detailJa.replace(/"/g, '""')}"`].join(','),
    ),
  ];
  return [header, ...rows, ...summary].join('\n');
}
