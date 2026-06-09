/**
 * SPYレジーム別成績監査 — 条件適合96件 · ルール変更なし
 *
 * 分類: SPY 63日レジーム + 52w乖離から導出する4バケット
 * - up / down / sideways_shallow はそのまま
 * - sideways_deep → 表示ラベル "sideways"
 */
import { FORWARD_SIGNAL_START } from '../../constants/forwardValidation';
import type {
  ForwardPassedTradeRecord,
  ForwardRegimeGroupId,
  ForwardRegimePerformanceAuditReport,
  ForwardRegimePerformanceStats,
} from '../../types/forwardValidation';
import type { FourBucket } from './case4Indicators';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { auditPassedTrades } from './forwardValidationPassedTradesAudit';

const GROUP_DEFS: { id: ForwardRegimeGroupId; labelJa: string }[] = [
  { id: 'up', labelJa: 'up' },
  { id: 'down', labelJa: 'down' },
  { id: 'sideways', labelJa: 'sideways' },
  { id: 'sideways_shallow', labelJa: 'sideways_shallow' },
];

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function mean(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return round3(vals.reduce((a, b) => a + b, 0) / vals.length);
}

/** エントリーバケット → 監査用4分類 */
export function classifyRegimeGroup(bucket: FourBucket | string): ForwardRegimeGroupId | null {
  switch (bucket) {
    case 'up':
      return 'up';
    case 'down':
      return 'down';
    case 'sideways_shallow':
      return 'sideways_shallow';
    case 'sideways_deep':
      return 'sideways';
    default:
      return null;
  }
}

function groupStats(
  id: ForwardRegimeGroupId,
  labelJa: string,
  trades: ForwardPassedTradeRecord[],
): ForwardRegimePerformanceStats {
  const wins = trades.filter((t) => t.returnPct > 0);
  return {
    id,
    labelJa,
    tradeCount: trades.length,
    winCount: wins.length,
    winRatePct: trades.length > 0 ? round3((wins.length / trades.length) * 100) : 0,
    avgReturnPct: mean(trades.map((t) => t.returnPct)),
    avgHoldDays: mean(trades.map((t) => t.holdDays)),
    avgAdx: mean(trades.map((t) => t.adx14)),
    avgMacd: mean(trades.map((t) => t.macdHistPct)),
    avgDist52: mean(trades.map((t) => t.dist52wPct)),
  };
}

export function auditRegimePerformance(input: {
  bundle: ForwardOhlcvBundle;
}): ForwardRegimePerformanceAuditReport {
  const passed = auditPassedTrades(input);
  const byGroup = new Map<ForwardRegimeGroupId, ForwardPassedTradeRecord[]>();
  for (const def of GROUP_DEFS) byGroup.set(def.id, []);

  let unclassifiedCount = 0;
  for (const trade of passed.trades) {
    const group = classifyRegimeGroup(trade.bucket);
    if (group == null) {
      unclassifiedCount++;
      continue;
    }
    byGroup.get(group)!.push(trade);
  }

  const groups = GROUP_DEFS.map((def) =>
    groupStats(def.id, def.labelJa, byGroup.get(def.id) ?? []),
  );

  const humanLines = [
    `【SPYレジーム別成績】${FORWARD_SIGNAL_START} ～ ${input.bundle.latestDate}`,
    `条件適合 ${passed.tradeCount}件${unclassifiedCount > 0 ? ` · 分類外 ${unclassifiedCount}件` : ''}`,
    '（sideways = SPY横ばい × 52w乖離≤-5% の sideways_deep）',
    '',
    ...groups.map(
      (g) =>
        `■ ${g.labelJa}: ${g.tradeCount}件 · 勝率${g.winRatePct}% · 均R${g.avgReturnPct ?? '—'}% · 保有${g.avgHoldDays ?? '—'}日 · ADX${g.avgAdx ?? '—'} · MACD${g.avgMacd ?? '—'}% · 52w${g.avgDist52 ?? '—'}%`,
    ),
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate: FORWARD_SIGNAL_START,
    toDate: input.bundle.latestDate,
    totalTrades: passed.tradeCount,
    unclassifiedCount,
    groups,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export function formatRegimePerformanceCsv(report: ForwardRegimePerformanceAuditReport): string {
  const header =
    'regime,tradeCount,winCount,winRatePct,avgReturnPct,avgHoldDays,avgAdx,avgMacd,avgDist52';
  const rows = report.groups.map((g) =>
    [
      g.labelJa,
      g.tradeCount,
      g.winCount,
      g.winRatePct,
      g.avgReturnPct ?? '',
      g.avgHoldDays ?? '',
      g.avgAdx ?? '',
      g.avgMacd ?? '',
      g.avgDist52 ?? '',
    ].join(','),
  );
  return [header, ...rows].join('\n');
}
