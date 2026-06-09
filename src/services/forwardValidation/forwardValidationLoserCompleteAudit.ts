/**
 * 負けトレード完全監査 — 条件適合96件 · ルール変更なし
 */
import { FORWARD_SIGNAL_START } from '../../constants/forwardValidation';
import type {
  ForwardLoserCompleteAuditReport,
  ForwardLoserTradeRow,
  ForwardPassedTradeRecord,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { auditPassedTrades } from './forwardValidationPassedTradesAudit';
import { classifyRegimeGroup } from './forwardValidationRegimePerformanceAudit';

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function mean(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return round3(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function delta(a: number | null, b: number | null): number | null {
  if (a == null || b == null) return null;
  return round3(a - b);
}

function regimeLabel(t: ForwardPassedTradeRecord): string {
  return classifyRegimeGroup(t.bucket) ?? t.bucket;
}

function toLoserRow(t: ForwardPassedTradeRecord): ForwardLoserTradeRow {
  return {
    id: t.id,
    signalDate: t.signalDate,
    symbol: t.symbol,
    returnPct: t.returnPct,
    holdDays: t.holdDays,
    exitReason: t.exitReason,
    spyRegimeLabel: regimeLabel(t),
    spyRegimeRaw: t.spyRegime,
    bucket: t.bucket,
    adx14: t.adx14,
    macdHistPct: t.macdHistPct,
    dist52wPct: t.dist52wPct,
  };
}

function downPct(trades: ForwardPassedTradeRecord[]): number {
  if (trades.length === 0) return 0;
  const n = trades.filter((t) => classifyRegimeGroup(t.bucket) === 'down').length;
  return round3((n / trades.length) * 100);
}

function shallowPct(trades: ForwardPassedTradeRecord[]): number {
  if (trades.length === 0) return 0;
  const n = trades.filter((t) => t.dist52wPct > -5).length;
  return round3((n / trades.length) * 100);
}

export function auditLoserComplete(input: {
  bundle: ForwardOhlcvBundle;
}): ForwardLoserCompleteAuditReport {
  const passed = auditPassedTrades(input);
  const winTrades = passed.trades.filter((t) => t.returnPct > 0);
  const lossTrades = passed.trades.filter((t) => t.returnPct <= 0);

  const winAvg = {
    returnPct: mean(winTrades.map((t) => t.returnPct)),
    holdDays: mean(winTrades.map((t) => t.holdDays)),
    spyDownPct: downPct(winTrades),
    spyShallowDistPct: shallowPct(winTrades),
    adx: mean(winTrades.map((t) => t.adx14)),
    macd: mean(winTrades.map((t) => t.macdHistPct)),
    dist52: mean(winTrades.map((t) => t.dist52wPct)),
  };

  const lossAvg = {
    returnPct: mean(lossTrades.map((t) => t.returnPct)),
    holdDays: mean(lossTrades.map((t) => t.holdDays)),
    spyDownPct: downPct(lossTrades),
    spyShallowDistPct: shallowPct(lossTrades),
    adx: mean(lossTrades.map((t) => t.adx14)),
    macd: mean(lossTrades.map((t) => t.macdHistPct)),
    dist52: mean(lossTrades.map((t) => t.dist52wPct)),
  };

  const diff = {
    returnPct: delta(winAvg.returnPct, lossAvg.returnPct),
    holdDays: delta(winAvg.holdDays, lossAvg.holdDays),
    spyDownPct: delta(winAvg.spyDownPct, lossAvg.spyDownPct),
    spyShallowDistPct: delta(winAvg.spyShallowDistPct, lossAvg.spyShallowDistPct),
    adx: delta(winAvg.adx, lossAvg.adx),
    macd: delta(winAvg.macd, lossAvg.macd),
    dist52: delta(winAvg.dist52, lossAvg.dist52),
  };

  const loserRows = lossTrades.map(toLoserRow).sort((a, b) => a.signalDate.localeCompare(b.signalDate));

  const humanLines = [
    `【負けトレード完全監査】${FORWARD_SIGNAL_START} ～ ${input.bundle.latestDate}`,
    `条件適合 ${passed.tradeCount}件 · 勝ち ${winTrades.length} · 負け ${lossTrades.length}`,
    '',
    '■ 負け全件一覧',
    ...loserRows.map(
      (t) =>
        `${t.signalDate} ${t.symbol} R${t.returnPct}% · 保有${t.holdDays}日 · SPY=${t.spyRegimeLabel} · ADX${t.adx14} · MACD${t.macdHistPct}% · 52w${t.dist52wPct}% · ${t.exitReason}`,
    ),
    '',
    '■ 勝ち群 vs 負け群 平均比較',
    `利益率: 勝ち ${winAvg.returnPct ?? '—'}% · 負け ${lossAvg.returnPct ?? '—'}% · 差 ${diff.returnPct ?? '—'}%`,
    `保有: 勝ち ${winAvg.holdDays ?? '—'}日 · 負け ${lossAvg.holdDays ?? '—'}日 · 差 ${diff.holdDays ?? '—'}日`,
    `SPY down比率: 勝ち ${winAvg.spyDownPct}% · 負け ${lossAvg.spyDownPct}% · 差 ${diff.spyDownPct ?? '—'}pt`,
    `52w浅い(>-5%)比率: 勝ち ${winAvg.spyShallowDistPct}% · 負け ${lossAvg.spyShallowDistPct}% · 差 ${diff.spyShallowDistPct ?? '—'}pt`,
    `ADX: 勝ち ${winAvg.adx ?? '—'} · 負け ${lossAvg.adx ?? '—'} · 差 ${diff.adx ?? '—'}`,
    `MACD: 勝ち ${winAvg.macd ?? '—'}% · 負け ${lossAvg.macd ?? '—'}% · 差 ${diff.macd ?? '—'}%`,
    `52w乖離: 勝ち ${winAvg.dist52 ?? '—'}% · 負け ${lossAvg.dist52 ?? '—'}% · 差 ${diff.dist52 ?? '—'}%`,
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate: FORWARD_SIGNAL_START,
    toDate: input.bundle.latestDate,
    totalTrades: passed.tradeCount,
    winCount: winTrades.length,
    lossCount: lossTrades.length,
    loserRows,
    winAvg,
    lossAvg,
    diff,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export function formatLoserCompleteCsv(report: ForwardLoserCompleteAuditReport): string {
  const header =
    'signalDate,symbol,returnPct,holdDays,spyRegime,bucket,adx14,macdHistPct,dist52wPct,exitReason';
  const rows = report.loserRows.map((t) =>
    [
      t.signalDate,
      t.symbol,
      t.returnPct,
      t.holdDays,
      t.spyRegimeLabel,
      t.bucket,
      t.adx14,
      t.macdHistPct,
      t.dist52wPct,
      t.exitReason,
    ].join(','),
  );
  const summary = [
    `summary,win_avg_return,${report.winAvg.returnPct ?? ''}`,
    `summary,loss_avg_return,${report.lossAvg.returnPct ?? ''}`,
    `summary,diff_adx,${report.diff.adx ?? ''}`,
    `summary,diff_macd,${report.diff.macd ?? ''}`,
    `summary,diff_dist52,${report.diff.dist52 ?? ''}`,
  ];
  return [header, ...rows, ...summary].join('\n');
}
