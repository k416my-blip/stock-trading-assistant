/**
 * 25日満了トレード監査 — 条件適合96件 · ルール変更なし
 */
import { FORWARD_ETF_UNIVERSE, FORWARD_SIGNAL_START } from '../../constants/forwardValidation';
import type { ForwardEtfSymbol } from '../../constants/forwardValidation';
import type {
  ForwardMaxHoldAuditReport,
  ForwardMaxHoldGroupStats,
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

function etfCompositionPct(trades: ForwardPassedTradeRecord[]): Record<ForwardEtfSymbol, number> {
  const counts = Object.fromEntries(FORWARD_ETF_UNIVERSE.map((s) => [s, 0])) as Record<
    ForwardEtfSymbol,
    number
  >;
  for (const t of trades) counts[t.symbol]++;
  if (trades.length === 0) return counts;
  const pct = { ...counts };
  for (const s of FORWARD_ETF_UNIVERSE) {
    pct[s] = round3((counts[s] / trades.length) * 100);
  }
  return pct;
}

function regimePct(trades: ForwardPassedTradeRecord[], regime: string): number {
  if (trades.length === 0) return 0;
  const n = trades.filter((t) => classifyRegimeGroup(t.bucket) === regime).length;
  return round3((n / trades.length) * 100);
}

function buildGroupStats(
  labelJa: string,
  trades: ForwardPassedTradeRecord[],
): ForwardMaxHoldGroupStats {
  const wins = trades.filter((t) => t.returnPct > 0);
  return {
    labelJa,
    tradeCount: trades.length,
    winCount: wins.length,
    winRatePct: trades.length > 0 ? round3((wins.length / trades.length) * 100) : 0,
    avgReturnPct: mean(trades.map((t) => t.returnPct)),
    avgHoldDays: mean(trades.map((t) => t.holdDays)),
    avgAdx: mean(trades.map((t) => t.adx14)),
    avgMacd: mean(trades.map((t) => t.macdHistPct)),
    avgDist52: mean(trades.map((t) => t.dist52wPct)),
    spyUpPct: regimePct(trades, 'up'),
    spyDownPct: regimePct(trades, 'down'),
    spySidewaysPct: regimePct(trades, 'sideways'),
    spyShallowPct: regimePct(trades, 'sideways_shallow'),
    etfCompositionPct: etfCompositionPct(trades),
  };
}

function formatEtf(pct: Record<ForwardEtfSymbol, number>): string {
  return FORWARD_ETF_UNIVERSE.map((s) => `${s}=${pct[s]}%`).join(' ');
}

export function auditMaxHoldTrades(input: {
  bundle: ForwardOhlcvBundle;
}): ForwardMaxHoldAuditReport {
  const passed = auditPassedTrades(input);
  const takeProfit = passed.trades.filter((t) => t.exitReason === 'take_profit');
  const maxHold = passed.trades.filter((t) => t.exitReason === 'max_hold');

  const reached = buildGroupStats('利確(+3%)到達', takeProfit);
  const notReached = buildGroupStats('25日満了', maxHold);

  const diff = {
    avgReturnPct: delta(reached.avgReturnPct, notReached.avgReturnPct),
    avgHoldDays: delta(reached.avgHoldDays, notReached.avgHoldDays),
    avgAdx: delta(reached.avgAdx, notReached.avgAdx),
    avgMacd: delta(reached.avgMacd, notReached.avgMacd),
    avgDist52: delta(reached.avgDist52, notReached.avgDist52),
    spyUpPct: delta(reached.spyUpPct, notReached.spyUpPct),
    spyDownPct: delta(reached.spyDownPct, notReached.spyDownPct),
    spySidewaysPct: delta(reached.spySidewaysPct, notReached.spySidewaysPct),
    spyShallowPct: delta(reached.spyShallowPct, notReached.spyShallowPct),
  };

  const humanLines = [
    `【25日満了トレード監査】${FORWARD_SIGNAL_START} ～ ${input.bundle.latestDate}`,
    `条件適合 ${passed.tradeCount}件 · 利確 ${takeProfit.length} · 25日満了 ${maxHold.length}`,
    '',
    '■ 利確(+3%)到達組',
    `${reached.tradeCount}件 · 勝率${reached.winRatePct}% · 均R${reached.avgReturnPct ?? '—'}% · 保有${reached.avgHoldDays ?? '—'}日`,
    `ADX${reached.avgAdx ?? '—'} · MACD${reached.avgMacd ?? '—'}% · 52w${reached.avgDist52 ?? '—'}%`,
    `SPY up${reached.spyUpPct}% down${reached.spyDownPct}% sideways${reached.spySidewaysPct}% shallow${reached.spyShallowPct}%`,
    `ETF: ${formatEtf(reached.etfCompositionPct)}`,
    '',
    '■ 25日満了組',
    `${notReached.tradeCount}件 · 勝率${notReached.winRatePct}% · 均R${notReached.avgReturnPct ?? '—'}% · 保有${notReached.avgHoldDays ?? '—'}日`,
    `ADX${notReached.avgAdx ?? '—'} · MACD${notReached.avgMacd ?? '—'}% · 52w${notReached.avgDist52 ?? '—'}%`,
    `SPY up${notReached.spyUpPct}% down${notReached.spyDownPct}% sideways${notReached.spySidewaysPct}% shallow${notReached.spyShallowPct}%`,
    `ETF: ${formatEtf(notReached.etfCompositionPct)}`,
    '',
    '■ 差分（到達 − 満了）',
    `均R ${diff.avgReturnPct ?? '—'}% · 保有 ${diff.avgHoldDays ?? '—'}日`,
    `ADX ${diff.avgAdx ?? '—'} · MACD ${diff.avgMacd ?? '—'}% · 52w ${diff.avgDist52 ?? '—'}%`,
    `SPY down ${diff.spyDownPct ?? '—'}pt · shallow ${diff.spyShallowPct ?? '—'}pt · up ${diff.spyUpPct ?? '—'}pt`,
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate: FORWARD_SIGNAL_START,
    toDate: input.bundle.latestDate,
    totalTrades: passed.tradeCount,
    takeProfitTrades: takeProfit,
    maxHoldTrades: maxHold,
    reached,
    notReached,
    diff,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export function formatMaxHoldAuditCsv(report: ForwardMaxHoldAuditReport): string {
  const header =
    'group,tradeCount,winRatePct,avgReturnPct,avgHoldDays,avgAdx,avgMacd,avgDist52,spyUpPct,spyDownPct,spySidewaysPct,spyShallowPct';
  const rows = [report.reached, report.notReached].map((g) =>
    [
      g.labelJa,
      g.tradeCount,
      g.winRatePct,
      g.avgReturnPct ?? '',
      g.avgHoldDays ?? '',
      g.avgAdx ?? '',
      g.avgMacd ?? '',
      g.avgDist52 ?? '',
      g.spyUpPct,
      g.spyDownPct,
      g.spySidewaysPct,
      g.spyShallowPct,
    ].join(','),
  );
  const etfLines = FORWARD_ETF_UNIVERSE.flatMap((s) =>
    [report.reached, report.notReached].map(
      (g) => `etf,${g.labelJa},${s},${g.etfCompositionPct[s]}`.replace(/,/g, ','),
    ),
  );
  return [header, ...rows, ...etfLines].join('\n');
}
