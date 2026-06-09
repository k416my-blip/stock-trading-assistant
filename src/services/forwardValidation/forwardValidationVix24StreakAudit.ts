/**
 * VIX≥24 連敗監査 — 条件適合96件 · 現行出口+3%/25日 · ルール変更なし
 */
import {
  FORWARD_HOLD_DAYS,
  FORWARD_SIGNAL_START,
  FORWARD_TAKE_PROFIT_PCT,
} from '../../constants/forwardValidation';
import type {
  ForwardPassedTradeRecord,
  ForwardVix24StreakAuditReport,
  ForwardVix24StreakCurvePoint,
  ForwardVix24StreakEpisode,
  ForwardVix24StreakLossTradeRow,
  ForwardVix24StreakMonthlyRow,
  ForwardVix24StreakYearlyRow,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { barIndexByDate, type OhlcvBar } from './case4Indicators';
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

function vixAtDate(vixBars: OhlcvBar[], date: string): number | null {
  const idx = barIndexByDate(vixBars, date);
  if (idx < 0) return null;
  return round3(vixBars[idx]!.close);
}

type EnrichedTrade = ForwardPassedTradeRecord & { vix: number | null };

function sortTrades(trades: EnrichedTrade[]): EnrichedTrade[] {
  return [...trades].sort(
    (a, b) => a.signalDate.localeCompare(b.signalDate) || a.symbol.localeCompare(b.symbol),
  );
}

function enrich(bundle: ForwardOhlcvBundle, trades: ForwardPassedTradeRecord[]): EnrichedTrade[] {
  const vixBars = bundle.vixBars ?? [];
  return trades.map((t) => ({
    ...t,
    vix: vixAtDate(vixBars, t.signalDate),
  }));
}

function toLossRow(t: EnrichedTrade): ForwardVix24StreakLossTradeRow {
  return {
    signalDate: t.signalDate,
    symbol: t.symbol,
    returnPct: t.returnPct,
    vix: t.vix,
    adx14: t.adx14,
    macdHistPct: t.macdHistPct,
    dist52wPct: t.dist52wPct,
    bucket: t.bucket,
    spyRegime: t.spyRegime,
    holdDays: t.holdDays,
    exitReason: t.exitReason,
  };
}

export function computeMaxConsecutiveWins(trades: { returnPct: number }[]): number {
  let max = 0;
  let current = 0;
  for (const t of trades) {
    if (t.returnPct > 0) {
      current++;
      max = Math.max(max, current);
    } else {
      current = 0;
    }
  }
  return max;
}

export function computeMaxConsecutiveLosses(trades: { returnPct: number }[]): number {
  let max = 0;
  let current = 0;
  for (const t of trades) {
    if (t.returnPct <= 0) {
      current++;
      max = Math.max(max, current);
    } else {
      current = 0;
    }
  }
  return max;
}

export function buildLossStreakEpisodes(trades: EnrichedTrade[]): ForwardVix24StreakEpisode[] {
  const episodes: ForwardVix24StreakEpisode[] = [];
  let current: ForwardVix24StreakLossTradeRow[] = [];

  const flush = () => {
    if (current.length === 0) return;
    episodes.push({
      streakLength: current.length,
      startDate: current[0]!.signalDate,
      endDate: current[current.length - 1]!.signalDate,
      trades: current,
    });
    current = [];
  };

  for (const t of trades) {
    if (t.returnPct <= 0) {
      current.push(toLossRow(t));
    } else {
      flush();
    }
  }
  flush();
  return episodes.filter((e) => e.streakLength >= 2);
}

export function buildCumulativeCurve(trades: EnrichedTrade[]): ForwardVix24StreakCurvePoint[] {
  let cumulative = 0;
  return trades.map((t, i) => {
    cumulative = round3(cumulative + t.returnPct);
    return {
      index: i + 1,
      signalDate: t.signalDate,
      symbol: t.symbol,
      returnPct: round3(t.returnPct),
      outcomeJa: t.returnPct > 0 ? '勝' : '敗',
      cumulativeReturnPct: cumulative,
      vix: t.vix,
    };
  });
}

function monthKey(d: string): string {
  return d.slice(0, 7);
}

function yearKey(d: string): string {
  return d.slice(0, 4);
}

function buildMonthly(trades: EnrichedTrade[]): ForwardVix24StreakMonthlyRow[] {
  const byMonth = new Map<string, EnrichedTrade[]>();
  for (const t of trades) {
    const m = monthKey(t.signalDate);
    if (!byMonth.has(m)) byMonth.set(m, []);
    byMonth.get(m)!.push(t);
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, rows]) => ({
      month,
      tradeCount: rows.length,
      avgReturnPct: mean(rows.map((r) => r.returnPct)),
      sumReturnPct: round3(rows.reduce((s, r) => s + r.returnPct, 0)),
    }));
}

function buildYearly(trades: EnrichedTrade[]): ForwardVix24StreakYearlyRow[] {
  const byYear = new Map<string, EnrichedTrade[]>();
  for (const t of trades) {
    const y = yearKey(t.signalDate);
    if (!byYear.has(y)) byYear.set(y, []);
    byYear.get(y)!.push(t);
  }
  return [...byYear.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, rows]) => ({
      year,
      tradeCount: rows.length,
      avgReturnPct: mean(rows.map((r) => r.returnPct)),
      sumReturnPct: round3(rows.reduce((s, r) => s + r.returnPct, 0)),
    }));
}

function formatLossConditions(t: ForwardVix24StreakLossTradeRow): string {
  return (
    `${t.signalDate} ${t.symbol} R${t.returnPct}% · VIX${t.vix ?? '—'} · ADX${t.adx14} · ` +
    `MACD${t.macdHistPct}% · 52w${t.dist52wPct}% · ${t.bucket}/${t.spyRegime} · ${t.holdDays}日/${t.exitReason}`
  );
}

function formatEpisode(ep: ForwardVix24StreakEpisode): string[] {
  return [
    `連敗${ep.streakLength}件 (${ep.startDate}～${ep.endDate})`,
    ...ep.trades.map((t) => `  ${formatLossConditions(t)}`),
  ];
}

export function auditVix24Streak(input: {
  bundle: ForwardOhlcvBundle;
}): ForwardVix24StreakAuditReport {
  const passed = auditPassedTrades(input);
  const enriched = enrich(input.bundle, passed.trades);
  const cohort = sortTrades(enriched.filter((t) => t.vix != null && t.vix >= VIX_THRESHOLD));
  const wins = cohort.filter((t) => t.returnPct > 0);
  const losses = cohort.filter((t) => t.returnPct <= 0);
  const maxWinStreak = computeMaxConsecutiveWins(cohort);
  const maxLossStreak = computeMaxConsecutiveLosses(cohort);
  const lossStreakEpisodes = buildLossStreakEpisodes(cohort);
  const allLossTrades = losses.map((t) => toLossRow(t));
  const monthly = buildMonthly(cohort);
  const yearly = buildYearly(cohort);
  const curve = buildCumulativeCurve(cohort);
  const finalCumulative = curve.length > 0 ? curve[curve.length - 1]!.cumulativeReturnPct : 0;

  const humanLines = [
    `【VIX≥24 連敗監査】${FORWARD_SIGNAL_START} ～ ${input.bundle.latestDate}`,
    `対象 条件適合 ${passed.tradeCount}件 · 現行ルール ${RULE_LABEL}`,
    `該当 ${cohort.length}件 · 勝${wins.length} 敗${losses.length}（監査のみ・ルール変更なし）`,
    '',
    '■ 連勝・連敗',
    `最大連勝 ${maxWinStreak} · 最大連敗 ${maxLossStreak}`,
    '',
    '■ 連敗エピソード（2連敗以上）',
    ...(lossStreakEpisodes.length > 0
      ? lossStreakEpisodes.flatMap(formatEpisode)
      : ['（2連敗以上なし）']),
    '',
    '■ 全敗トレード（連敗発生日・条件）',
    ...(allLossTrades.length > 0
      ? allLossTrades.map(formatLossConditions)
      : ['（敗トレードなし）']),
    '',
    '■ 月別',
    ...monthly.map(
      (m) => `${m.month}: ${m.tradeCount}件 · 均R${m.avgReturnPct ?? '—'}% · 合計${m.sumReturnPct}%`,
    ),
    '',
    '■ 年別',
    ...yearly.map(
      (y) => `${y.year}: ${y.tradeCount}件 · 均R${y.avgReturnPct ?? '—'}% · 合計${y.sumReturnPct}%`,
    ),
    '',
    '■ 累積損益曲線（トレード順）',
    `最終累積 ${finalCumulative}%`,
    ...(curve.length > 0
      ? curve.map(
          (p) =>
            `${p.index}. ${p.signalDate} ${p.symbol} R${p.returnPct}% ${p.outcomeJa} · 累積${p.cumulativeReturnPct}%`,
        )
      : ['（該当なし）']),
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate: FORWARD_SIGNAL_START,
    toDate: input.bundle.latestDate,
    totalTrades: passed.tradeCount,
    cohortTradeCount: cohort.length,
    vixThreshold: VIX_THRESHOLD,
    winCount: wins.length,
    lossCount: losses.length,
    maxConsecutiveWins: maxWinStreak,
    maxConsecutiveLosses: maxLossStreak,
    lossStreakEpisodes,
    allLossTrades,
    monthly,
    yearly,
    curve,
    finalCumulativeReturnPct: finalCumulative,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export function formatVix24StreakCsv(report: ForwardVix24StreakAuditReport): string {
  const summary = [
    'section,metric,value',
    `summary,totalTrades,${report.totalTrades}`,
    `summary,cohortTradeCount,${report.cohortTradeCount}`,
    `summary,maxConsecutiveWins,${report.maxConsecutiveWins}`,
    `summary,maxConsecutiveLosses,${report.maxConsecutiveLosses}`,
    `summary,finalCumulativeReturnPct,${report.finalCumulativeReturnPct}`,
    '',
    'month,tradeCount,avgReturnPct,sumReturnPct',
    ...report.monthly.map((m) =>
      [m.month, m.tradeCount, m.avgReturnPct ?? '', m.sumReturnPct].join(','),
    ),
    '',
    'year,tradeCount,avgReturnPct,sumReturnPct',
    ...report.yearly.map((y) =>
      [y.year, y.tradeCount, y.avgReturnPct ?? '', y.sumReturnPct].join(','),
    ),
    '',
    'index,signalDate,symbol,returnPct,outcome,cumulativeReturnPct,vix',
    ...report.curve.map((p) =>
      [
        p.index,
        p.signalDate,
        p.symbol,
        p.returnPct,
        p.outcomeJa,
        p.cumulativeReturnPct,
        p.vix ?? '',
      ].join(','),
    ),
    '',
    'signalDate,symbol,returnPct,vix,adx14,macdHistPct,dist52wPct,bucket,spyRegime,holdDays,exitReason',
    ...report.allLossTrades.map((t) =>
      [
        t.signalDate,
        t.symbol,
        t.returnPct,
        t.vix ?? '',
        t.adx14,
        t.macdHistPct,
        t.dist52wPct,
        t.bucket,
        t.spyRegime,
        t.holdDays,
        t.exitReason,
      ].join(','),
    ),
    '',
    'lossStreakLength,startDate,endDate,signalDate,symbol,returnPct,vix,adx14,macdHistPct,dist52wPct,bucket,spyRegime,holdDays,exitReason',
  ];

  const lossRows: string[] = [];
  for (const ep of report.lossStreakEpisodes) {
    for (const t of ep.trades) {
      lossRows.push(
        [
          ep.streakLength,
          ep.startDate,
          ep.endDate,
          t.signalDate,
          t.symbol,
          t.returnPct,
          t.vix ?? '',
          t.adx14,
          t.macdHistPct,
          t.dist52wPct,
          t.bucket,
          t.spyRegime,
          t.holdDays,
          t.exitReason,
        ].join(','),
      );
    }
  }

  return [...summary, ...lossRows].join('\n');
}
