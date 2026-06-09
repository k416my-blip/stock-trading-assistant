/**
 * SPYレジーム単独説明力監査 — 条件適合96件 · ルール変更なし
 */
import { FORWARD_ETF_UNIVERSE, FORWARD_SIGNAL_START } from '../../constants/forwardValidation';
import type { ForwardEtfSymbol } from '../../constants/forwardValidation';
import type {
  ForwardPassedTradeRecord,
  ForwardRegimeGroupId,
  ForwardRegimeStandaloneAuditReport,
  ForwardRegimeStandaloneStats,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { auditPassedTrades } from './forwardValidationPassedTradesAudit';
import { classifyRegimeGroup } from './forwardValidationRegimePerformanceAudit';

const REGIME_ORDER: { id: ForwardRegimeGroupId; labelJa: string }[] = [
  { id: 'up', labelJa: 'SPY up' },
  { id: 'down', labelJa: 'SPY down' },
  { id: 'sideways', labelJa: 'SPY sideways' },
  { id: 'sideways_shallow', labelJa: 'SPY sideways_shallow' },
];

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function mean(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return round3(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function etfBreakdown(trades: ForwardPassedTradeRecord[]): {
  counts: Record<ForwardEtfSymbol, number>;
  pct: Record<ForwardEtfSymbol, number>;
} {
  const counts = Object.fromEntries(FORWARD_ETF_UNIVERSE.map((s) => [s, 0])) as Record<
    ForwardEtfSymbol,
    number
  >;
  for (const t of trades) counts[t.symbol]++;
  const pct = { ...counts };
  if (trades.length > 0) {
    for (const s of FORWARD_ETF_UNIVERSE) {
      pct[s] = round3((counts[s] / trades.length) * 100);
    }
  }
  return { counts, pct };
}

function buildStats(labelJa: string, trades: ForwardPassedTradeRecord[]): ForwardRegimeStandaloneStats {
  const wins = trades.filter((t) => t.returnPct > 0);
  const takeProfit = trades.filter((t) => t.exitReason === 'take_profit');
  const maxHold = trades.filter((t) => t.exitReason === 'max_hold');
  const etf = etfBreakdown(trades);

  return {
    labelJa,
    tradeCount: trades.length,
    winCount: wins.length,
    winRatePct: trades.length > 0 ? round3((wins.length / trades.length) * 100) : 0,
    avgReturnPct: mean(trades.map((t) => t.returnPct)),
    avgHoldDays: mean(trades.map((t) => t.holdDays)),
    takeProfitRatePct: trades.length > 0 ? round3((takeProfit.length / trades.length) * 100) : 0,
    maxHoldRatePct: trades.length > 0 ? round3((maxHold.length / trades.length) * 100) : 0,
    etfCounts: etf.counts,
    etfPct: etf.pct,
  };
}

function formatEtf(s: ForwardRegimeStandaloneStats): string {
  return FORWARD_ETF_UNIVERSE.map((e) => `${e}=${s.etfCounts[e]}(${s.etfPct[e]}%)`).join(' ');
}

export function auditRegimeStandalone(input: {
  bundle: ForwardOhlcvBundle;
}): ForwardRegimeStandaloneAuditReport {
  const passed = auditPassedTrades(input);
  let unclassified = 0;

  const byRegime = new Map<ForwardRegimeGroupId, ForwardPassedTradeRecord[]>();
  for (const r of REGIME_ORDER) byRegime.set(r.id, []);

  for (const t of passed.trades) {
    const g = classifyRegimeGroup(t.bucket);
    if (g == null) {
      unclassified++;
      continue;
    }
    byRegime.get(g)!.push(t);
  }

  const groups = REGIME_ORDER.map((r) =>
    buildStats(r.labelJa, byRegime.get(r.id) ?? []),
  );

  const humanLines = [
    `【SPYレジーム単独説明力監査】${FORWARD_SIGNAL_START} ～ ${input.bundle.latestDate}`,
    `条件適合 ${passed.tradeCount}件${unclassified > 0 ? ` · 分類外 ${unclassified}件` : ''}`,
    '（sideways = sideways_deep · 52w≤-5%）',
    '',
    ...groups.flatMap((g) => [
      `■ ${g.labelJa}`,
      `${g.tradeCount}件 · 勝率${g.winRatePct}% · 均R${g.avgReturnPct ?? '—'}% · 保有${g.avgHoldDays ?? '—'}日`,
      `利確到達${g.takeProfitRatePct}% · 25日満了${g.maxHoldRatePct}%`,
      `ETF: ${formatEtf(g)}`,
      '',
    ]),
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate: FORWARD_SIGNAL_START,
    toDate: input.bundle.latestDate,
    totalTrades: passed.tradeCount,
    unclassifiedCount: unclassified,
    groups,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export function formatRegimeStandaloneCsv(report: ForwardRegimeStandaloneAuditReport): string {
  const header =
    'regime,tradeCount,winRatePct,avgReturnPct,avgHoldDays,takeProfitRatePct,maxHoldRatePct,SCHD,VYM,DGRO,SPLG';
  const rows = report.groups.map((g) =>
    [
      g.labelJa,
      g.tradeCount,
      g.winRatePct,
      g.avgReturnPct ?? '',
      g.avgHoldDays ?? '',
      g.takeProfitRatePct,
      g.maxHoldRatePct,
      g.etfCounts.SCHD,
      g.etfCounts.VYM,
      g.etfCounts.DGRO,
      g.etfCounts.SPLG,
    ].join(','),
  );
  return [header, ...rows].join('\n');
}
