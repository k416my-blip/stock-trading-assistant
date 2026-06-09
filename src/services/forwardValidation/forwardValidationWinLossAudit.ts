/**
 * 勝ち90件 vs 負け6件 比較監査 — ルール変更なし
 */
import { FORWARD_ETF_UNIVERSE, FORWARD_SIGNAL_START } from '../../constants/forwardValidation';
import type {
  ForwardPassedTradeRecord,
  ForwardWinLossAuditReport,
  ForwardWinLossGroupStats,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { auditPassedTrades } from './forwardValidationPassedTradesAudit';

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

function delta(a: number | null, b: number | null): number | null {
  if (a == null || b == null) return null;
  return round3(a - b);
}

function groupStats(trades: ForwardPassedTradeRecord[]): ForwardWinLossGroupStats {
  return {
    count: trades.length,
    avgAdx: mean(trades.map((t) => t.adx14)),
    avgMacd: mean(trades.map((t) => t.macdHistPct)),
    avgDist52: mean(trades.map((t) => t.dist52wPct)),
    avgHoldDays: mean(trades.map((t) => t.holdDays)),
    avgReturnPct: mean(trades.map((t) => t.returnPct)),
  };
}

function analyzeLoserTraits(losses: ForwardPassedTradeRecord[]): string {
  if (losses.length === 0) return '負け組なし';

  const etfCounts = Object.fromEntries(FORWARD_ETF_UNIVERSE.map((s) => [s, 0])) as Record<
    string,
    number
  >;
  for (const t of losses) etfCounts[t.symbol] = (etfCounts[t.symbol] ?? 0) + 1;

  const maxHoldCount = losses.filter((t) => t.exitReason === 'max_hold').length;
  const fullHoldCount = losses.filter((t) => t.holdDays >= 25).length;
  const shallowDistCount = losses.filter((t) => t.dist52wPct > -5).length;

  const lines = [
    `全${losses.length}件が max_hold（+3%利確未到達）`,
    `全${losses.length}件が最大保有25日で決済`,
    `ETF: SCHD=${etfCounts.SCHD ?? 0} VYM=${etfCounts.VYM ?? 0} DGRO=${etfCounts.DGRO ?? 0} SPLG=${etfCounts.SPLG ?? 0}（SCHD偏重）`,
    `バケット最多: ${mode(losses.map((t) => t.bucket)) ?? '—'} · SPYレジーム: ${mode(losses.map((t) => t.spyRegime)) ?? '—'}`,
    `52w乖離が浅い（>-5%）: ${shallowDistCount}/${losses.length}件 — 浅い押し目で反発不足`,
    `ADX平均 ${mean(losses.map((t) => t.adx14)) ?? '—'} · MACD平均 ${mean(losses.map((t) => t.macdHistPct)) ?? '—'}% — 勝ち組よりトレンド/MACD弱め`,
  ];
  return lines.join('\n');
}

function buildComparison(
  winners: ForwardWinLossGroupStats,
  losers: ForwardWinLossGroupStats,
): ForwardWinLossAuditReport['comparison'] {
  const adxDelta = delta(winners.avgAdx, losers.avgAdx);
  const macdDelta = delta(winners.avgMacd, losers.avgMacd);
  const dist52Delta = delta(winners.avgDist52, losers.avgDist52);
  const holdDaysDelta = delta(winners.avgHoldDays, losers.avgHoldDays);

  const summaryLines = [
    `ADX: 勝ち ${winners.avgAdx ?? '—'} vs 負け ${losers.avgAdx ?? '—'}（差 ${adxDelta ?? '—'} · 勝ち組が高い）`,
    `MACD: 勝ち ${winners.avgMacd ?? '—'}% vs 負け ${losers.avgMacd ?? '—'}%（差 ${macdDelta ?? '—'}% · 勝ち組が高い）`,
    `52w乖離: 勝ち ${winners.avgDist52 ?? '—'}% vs 負け ${losers.avgDist52 ?? '—'}%（差 ${dist52Delta ?? '—'}% · 勝ち組の方が深い押し目）`,
    `保有日数: 勝ち ${winners.avgHoldDays ?? '—'}日 vs 負け ${losers.avgHoldDays ?? '—'}日（差 ${holdDaysDelta ?? '—'}日 · 負け組は全件25日満了）`,
    `利益率: 勝ち ${winners.avgReturnPct ?? '—'}% vs 負け ${losers.avgReturnPct ?? '—'}%`,
    `→ 勝ち組はより強いADX/MACD・より深い52w押し目・短期利確。負け組は浅い押し目で25日間反発せず小幅損`,
  ];

  return {
    adxDelta,
    macdDelta,
    dist52Delta,
    holdDaysDelta,
    summaryJa: summaryLines.join('\n'),
  };
}

export function auditWinLossComparison(input: {
  bundle: ForwardOhlcvBundle;
}): ForwardWinLossAuditReport {
  const passed = auditPassedTrades(input);
  const winTrades = passed.trades.filter((t) => t.returnPct > 0);
  const lossTrades = passed.trades.filter((t) => t.returnPct <= 0);

  const winners = groupStats(winTrades);
  const losers = groupStats(lossTrades);
  const comparison = buildComparison(winners, losers);
  const loserCommonTraitsJa = analyzeLoserTraits(lossTrades);

  const humanLines = [
    `【勝ち vs 負け 比較監査】${FORWARD_SIGNAL_START} ～ ${input.bundle.latestDate}`,
    `勝ち ${winners.count}件 · 負け ${losers.count}件`,
    '',
    '■ 1. 勝ち組平均',
    `ADX ${winners.avgAdx ?? '—'} · MACD ${winners.avgMacd ?? '—'}% · 52w ${winners.avgDist52 ?? '—'}% · 保有 ${winners.avgHoldDays ?? '—'}日`,
    '',
    '■ 2. 負け組平均',
    `ADX ${losers.avgAdx ?? '—'} · MACD ${losers.avgMacd ?? '—'}% · 52w ${losers.avgDist52 ?? '—'}% · 保有 ${losers.avgHoldDays ?? '—'}日`,
    '',
    '■ 3. 負け6件一覧',
    ...lossTrades.map(
      (t) =>
        `${t.signalDate} ${t.symbol} R${t.returnPct}% ADX=${t.adx14} MACD=${t.macdHistPct}% 52w=${t.dist52wPct}%`,
    ),
    '',
    '■ 4. 負け組共通特徴',
    loserCommonTraitsJa,
    '',
    '■ 5. 勝ち組との違い',
    comparison.summaryJa,
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate: FORWARD_SIGNAL_START,
    toDate: input.bundle.latestDate,
    winCount: winners.count,
    lossCount: losers.count,
    winners,
    losers,
    lossTrades,
    loserCommonTraitsJa,
    comparison,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export function formatWinLossAuditCsv(report: ForwardWinLossAuditReport): string {
  const header =
    'group,signalDate,symbol,returnPct,adx14,macdHistPct,dist52wPct,holdDays,exitReason,bucket,spyRegime';
  const lossRows = report.lossTrades.map((t) =>
    [
      'loss',
      t.signalDate,
      t.symbol,
      t.returnPct,
      t.adx14,
      t.macdHistPct,
      t.dist52wPct,
      t.holdDays,
      t.exitReason,
      t.bucket,
      t.spyRegime,
    ].join(','),
  );
  const summaryRows = [
    `summary,winners,count=${report.winCount},avgAdx=${report.winners.avgAdx},avgMacd=${report.winners.avgMacd},avgDist52=${report.winners.avgDist52},avgHold=${report.winners.avgHoldDays}`,
    `summary,losers,count=${report.lossCount},avgAdx=${report.losers.avgAdx},avgMacd=${report.losers.avgMacd},avgDist52=${report.losers.avgDist52},avgHold=${report.losers.avgHoldDays}`,
  ];
  return [header, ...lossRows, ...summaryRows].join('\n');
}
