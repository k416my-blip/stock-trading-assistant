/**
 * SPY down クラスター正体調査 — 条件適合96件 · ルール変更なし
 */
import { FORWARD_ETF_UNIVERSE, FORWARD_SIGNAL_START } from '../../constants/forwardValidation';
import type { ForwardEtfSymbol } from '../../constants/forwardValidation';
import type {
  ForwardPassedTradeRecord,
  ForwardSpyDownClusterAuditReport,
  ForwardSpyDownClusterMonthStats,
  ForwardSpyDownGroupComparison,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { auditPassedTrades } from './forwardValidationPassedTradesAudit';
import { classifyRegimeGroup } from './forwardValidationRegimePerformanceAudit';

const CLUSTER_MONTHS = ['2025-04', '2025-05', '2025-06'] as const;

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function mean(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return round3(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function monthKey(signalDate: string): string {
  return signalDate.slice(0, 7);
}

function isSpyDown(t: ForwardPassedTradeRecord): boolean {
  return classifyRegimeGroup(t.bucket) === 'down';
}

function etfComposition(trades: ForwardPassedTradeRecord[]): Record<ForwardEtfSymbol, number> {
  const counts = Object.fromEntries(FORWARD_ETF_UNIVERSE.map((s) => [s, 0])) as Record<
    ForwardEtfSymbol,
    number
  >;
  for (const t of trades) counts[t.symbol]++;
  const total = trades.length;
  const ratio: Record<ForwardEtfSymbol, number> = { ...counts };
  if (total > 0) {
    for (const s of FORWARD_ETF_UNIVERSE) {
      ratio[s] = round3((counts[s] / total) * 100);
    }
  }
  return ratio;
}

function buildGroupComparison(
  labelJa: string,
  trades: ForwardPassedTradeRecord[],
): ForwardSpyDownGroupComparison {
  const wins = trades.filter((t) => t.returnPct > 0);
  const byMonth = new Map<string, ForwardPassedTradeRecord[]>();
  for (const t of trades) {
    const m = monthKey(t.signalDate);
    if (!byMonth.has(m)) byMonth.set(m, []);
    byMonth.get(m)!.push(t);
  }
  const monthly: ForwardSpyDownClusterMonthStats[] = [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ym, rows]) => ({
      yearMonth: ym,
      tradeCount: rows.length,
      winRatePct: rows.length > 0 ? round3((rows.filter((t) => t.returnPct > 0).length / rows.length) * 100) : 0,
      avgReturnPct: mean(rows.map((t) => t.returnPct)),
    }));

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
    etfCompositionPct: etfComposition(trades),
    monthly,
  };
}

function formatEtfPct(pct: Record<ForwardEtfSymbol, number>): string {
  return FORWARD_ETF_UNIVERSE.map((s) => `${s}=${pct[s]}%`).join(' ');
}

function formatGroupBlock(g: ForwardSpyDownGroupComparison): string[] {
  return [
    `${g.labelJa}: ${g.tradeCount}件 · 勝率${g.winRatePct}% · 均R${g.avgReturnPct ?? '—'}% · 保有${g.avgHoldDays ?? '—'}日`,
    `ADX${g.avgAdx ?? '—'} · MACD${g.avgMacd ?? '—'}% · 52w${g.avgDist52 ?? '—'}%`,
    `ETF: ${formatEtfPct(g.etfCompositionPct)}`,
    '年月別:',
    ...g.monthly.map(
      (m) => `  ${m.yearMonth}: ${m.tradeCount}件 · 勝率${m.winRatePct}% · 均R${m.avgReturnPct ?? '—'}%`,
    ),
  ];
}

export function auditSpyDownCluster(input: {
  bundle: ForwardOhlcvBundle;
}): ForwardSpyDownClusterAuditReport {
  const passed = auditPassedTrades(input);
  const downTrades = passed.trades.filter(isSpyDown);
  const otherTrades = passed.trades.filter((t) => !isSpyDown(t));

  const spyDown = buildGroupComparison('SPY down', downTrades);
  const other = buildGroupComparison('それ以外', otherTrades);

  const clusterMonths = CLUSTER_MONTHS.map((ym) => {
    const rows = downTrades.filter((t) => monthKey(t.signalDate) === ym);
    return buildGroupComparison(`${ym}クラスター（downのみ）`, rows);
  });

  const humanLines = [
    `【SPY down クラスター調査】${FORWARD_SIGNAL_START} ～ ${input.bundle.latestDate}`,
    `条件適合 ${passed.tradeCount}件 · down ${downTrades.length} / その他 ${otherTrades.length}`,
    '',
    '■ SPY down vs それ以外',
    ...formatGroupBlock(spyDown),
    '',
    ...formatGroupBlock(other),
    '',
    '■ 2025年4月・5月・6月クラスター（downのみ）',
    ...clusterMonths.flatMap((c) => ['', ...formatGroupBlock(c)]),
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate: FORWARD_SIGNAL_START,
    toDate: input.bundle.latestDate,
    totalTrades: passed.tradeCount,
    spyDown,
    other,
    clusterMonths,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export function formatSpyDownClusterCsv(report: ForwardSpyDownClusterAuditReport): string {
  const lines = [
    'group,label,tradeCount,winRatePct,avgReturnPct,avgHoldDays,avgAdx,avgMacd,avgDist52',
  ];
  const groups = [report.spyDown, report.other, ...report.clusterMonths];
  for (const g of groups) {
    lines.push(
      [
        'summary',
        g.labelJa,
        g.tradeCount,
        g.winRatePct,
        g.avgReturnPct ?? '',
        g.avgHoldDays ?? '',
        g.avgAdx ?? '',
        g.avgMacd ?? '',
        g.avgDist52 ?? '',
      ].join(','),
    );
    for (const m of g.monthly) {
      lines.push(
        ['monthly', g.labelJa, m.yearMonth, m.tradeCount, m.winRatePct, m.avgReturnPct ?? ''].join(
          ',',
        ),
      );
    }
    for (const s of FORWARD_ETF_UNIVERSE) {
      lines.push(['etf_pct', g.labelJa, s, g.etfCompositionPct[s]].join(','));
    }
  }
  return lines.join('\n');
}
