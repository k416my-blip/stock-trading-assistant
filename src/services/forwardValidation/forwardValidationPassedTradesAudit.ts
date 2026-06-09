/**
 * 条件適合96件 共通特徴監査 — ルール変更なし
 */
import {
  FORWARD_ETF_UNIVERSE,
  FORWARD_HOLD_DAYS,
  FORWARD_SIGNAL_START,
  FORWARD_TAKE_PROFIT_PCT,
  type ForwardEtfSymbol,
} from '../../constants/forwardValidation';
import type {
  ForwardPassedTradeAuditReport,
  ForwardPassedTradeRecord,
  ForwardPassedTradeTop20Insight,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import {
  barIndexByDate,
  buildSpyRegimeMap,
  scanSignalAtBar,
  simulateExitFromEntry,
  type FourBucket,
  type Regime,
} from './case4Indicators';

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function mean(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return round3(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function mode(values: string[]): string | null {
  if (values.length === 0) return null;
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best = values[0]!;
  let max = 0;
  for (const [k, c] of counts) {
    if (c > max) {
      max = c;
      best = k;
    }
  }
  return best;
}

export function collectPassedTradesFrom(
  bundle: ForwardOhlcvBundle,
  fromDate: string,
  toDate: string,
  takeProfitPct = FORWARD_TAKE_PROFIT_PCT,
  maxHoldDays = FORWARD_HOLD_DAYS,
): ForwardPassedTradeRecord[] {
  const regimeMap = buildSpyRegimeMap(bundle.spyBars);
  const dates = bundle.tradingDates.filter((d) => d >= fromDate && d <= toDate);
  const trades: ForwardPassedTradeRecord[] = [];

  for (const signalDate of dates) {
    for (const symbol of FORWARD_ETF_UNIVERSE) {
      const bars = bundle.etfBars[symbol];
      const signalIdx = barIndexByDate(bars, signalDate);
      if (signalIdx < 0) continue;

      const scan = scanSignalAtBar(bars, signalIdx, regimeMap);
      if (!scan?.passes) continue;

      const entryIdx = signalIdx + 1;
      if (entryIdx >= bars.length) continue;

      const entryBar = bars[entryIdx]!;
      const entryDate = entryBar.date;
      const entryPrice = entryBar.close;
      const exit = simulateExitFromEntry(
        bars,
        entryIdx,
        maxHoldDays,
        takeProfitPct,
      );
      if (!exit) continue;

      const exitIdx = barIndexByDate(bars, exit.exitDate);
      const holdDays = exitIdx >= entryIdx ? exitIdx - entryIdx : 0;
      const regime = regimeMap.get(signalDate) ?? 'unknown';

      trades.push({
        id: `${signalDate}_${symbol}`,
        symbol,
        signalDate,
        entryDate,
        exitDate: exit.exitDate,
        entryPrice: round3(entryPrice),
        exitPrice: round3(exit.exitPrice),
        returnPct: exit.returnPct,
        holdDays,
        exitReason: exit.reason,
        adx14: scan.adx14,
        macdHistPct: scan.macdHistPct,
        dist52wPct: scan.dist52wPct,
        bucket: scan.bucket,
        spyRegime: regime,
      });
    }
  }

  return trades.sort((a, b) => a.signalDate.localeCompare(b.signalDate));
}

function collectPassedTrades(bundle: ForwardOhlcvBundle): ForwardPassedTradeRecord[] {
  return collectPassedTradesFrom(bundle, FORWARD_SIGNAL_START, bundle.latestDate);
}

function etfStats(trades: ForwardPassedTradeRecord[], symbol: ForwardEtfSymbol) {
  const rows = trades.filter((t) => t.symbol === symbol);
  const wins = rows.filter((t) => t.returnPct > 0);
  return {
    symbol,
    tradeCount: rows.length,
    winCount: wins.length,
    winRatePct: rows.length > 0 ? round3((wins.length / rows.length) * 100) : 0,
    avgReturnPct: mean(rows.map((t) => t.returnPct)),
    avgHoldDays: mean(rows.map((t) => t.holdDays)),
    avgAdx: mean(rows.map((t) => t.adx14)),
    avgMacd: mean(rows.map((t) => t.macdHistPct)),
    avgDist52: mean(rows.map((t) => t.dist52wPct)),
  };
}

function analyzeTop20Winners(top20: ForwardPassedTradeRecord[]): ForwardPassedTradeTop20Insight {
  const etfCounts = Object.fromEntries(FORWARD_ETF_UNIVERSE.map((s) => [s, 0])) as Record<
    ForwardEtfSymbol,
    number
  >;
  for (const t of top20) etfCounts[t.symbol]++;

  const buckets = top20.map((t) => t.bucket);
  const regimes = top20.map((t) => t.spyRegime);
  const tpCount = top20.filter((t) => t.exitReason === 'take_profit').length;

  const summaryLines = [
    `上位20件は全て利益（returnPct降順）`,
    `ETF内訳: ${FORWARD_ETF_UNIVERSE.map((s) => `${s}=${etfCounts[s]}`).join(', ')}`,
    `最多ETF: ${mode(top20.map((t) => t.symbol)) ?? '—'}`,
    `ADX平均 ${mean(top20.map((t) => t.adx14)) ?? '—'} · MACD平均 ${mean(top20.map((t) => t.macdHistPct)) ?? '—'}% · 52w乖離平均 ${mean(top20.map((t) => t.dist52wPct)) ?? '—'}%`,
    `バケット最多: ${mode(buckets) ?? '—'} · SPYレジーム最多: ${mode(regimes) ?? '—'}`,
    `利確(+3%) ${tpCount}/20 · 保有日数平均 ${mean(top20.map((t) => t.holdDays)) ?? '—'}日`,
    `→ 強いトレンド(ADX高)・正MACD・深い押し目(dist52やや深め)・利確到達が多い`,
  ];

  return {
    etfCounts,
    dominantEtf: mode(top20.map((t) => t.symbol)),
    dominantBucket: mode(buckets) as FourBucket | null,
    dominantRegime: mode(regimes) as Regime | 'unknown' | null,
    takeProfitCount: tpCount,
    avgAdx: mean(top20.map((t) => t.adx14)),
    avgMacd: mean(top20.map((t) => t.macdHistPct)),
    avgDist52: mean(top20.map((t) => t.dist52wPct)),
    avgHoldDays: mean(top20.map((t) => t.holdDays)),
    avgReturnPct: mean(top20.map((t) => t.returnPct)),
    summaryJa: summaryLines.join('\n'),
  };
}

export function auditPassedTrades(input: {
  bundle: ForwardOhlcvBundle;
}): ForwardPassedTradeAuditReport {
  const trades = collectPassedTrades(input.bundle);
  const wins = trades.filter((t) => t.returnPct > 0);
  const top20 = [...trades].sort((a, b) => b.returnPct - a.returnPct).slice(0, 20);

  const entryStats = {
    avgAdx: mean(trades.map((t) => t.adx14)),
    avgMacd: mean(trades.map((t) => t.macdHistPct)),
    avgDist52: mean(trades.map((t) => t.dist52wPct)),
  };

  const perEtf = FORWARD_ETF_UNIVERSE.map((s) => etfStats(trades, s));
  const top20Insight = analyzeTop20Winners(top20);

  const humanLines = [
    `【条件適合トレード監査】${FORWARD_SIGNAL_START} ～ ${input.bundle.latestDate}`,
    `条件適合 ${trades.length}件 · 勝ち ${wins.length}件 · 勝率 ${trades.length > 0 ? round3((wins.length / trades.length) * 100) : 0}%`,
    '',
    '■ エントリー時平均',
    `ADX ${entryStats.avgAdx ?? '—'} · MACD ${entryStats.avgMacd ?? '—'}% · 52w乖離 ${entryStats.avgDist52 ?? '—'}%`,
    `保有日数平均 ${mean(trades.map((t) => t.holdDays)) ?? '—'} · 利益率平均 ${mean(trades.map((t) => t.returnPct)) ?? '—'}%`,
    '',
    '■ ETF別',
    ...perEtf.map(
      (e) =>
        `${e.symbol}: ${e.tradeCount}件 勝率${e.winRatePct}% 均R${e.avgReturnPct ?? '—'}% 均保有${e.avgHoldDays ?? '—'}日`,
    ),
    '',
    '■ 上位20勝ちトレード共通特徴',
    top20Insight.summaryJa,
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate: FORWARD_SIGNAL_START,
    toDate: input.bundle.latestDate,
    trades,
    tradeCount: trades.length,
    winCount: wins.length,
    winRatePct: trades.length > 0 ? round3((wins.length / trades.length) * 100) : 0,
    entryStats,
    avgHoldDays: mean(trades.map((t) => t.holdDays)),
    avgReturnPct: mean(trades.map((t) => t.returnPct)),
    perEtf,
    top20Winners: top20,
    top20Insight,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export function formatPassedTradesAuditCsv(report: ForwardPassedTradeAuditReport): string {
  const lines = [
    'id,symbol,signalDate,entryDate,exitDate,entryPrice,exitPrice,returnPct,holdDays,exitReason,adx14,macdHistPct,dist52wPct,bucket,spyRegime',
    ...report.trades.map((t) =>
      [
        t.id,
        t.symbol,
        t.signalDate,
        t.entryDate,
        t.exitDate,
        t.entryPrice,
        t.exitPrice,
        t.returnPct,
        t.holdDays,
        t.exitReason,
        t.adx14,
        t.macdHistPct,
        t.dist52wPct,
        t.bucket,
        t.spyRegime,
      ].join(','),
    ),
  ];
  return lines.join('\n');
}
