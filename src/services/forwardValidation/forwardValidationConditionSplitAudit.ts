/**
 * 3条件二元分割監査 — 条件適合96件 · ルール変更なし
 */
import { FORWARD_SIGNAL_START } from '../../constants/forwardValidation';
import type {
  ForwardConditionSplitAuditReport,
  ForwardConditionSplitComparison,
  ForwardConditionSplitGroupStats,
  ForwardConditionSplitId,
  ForwardPassedTradeRecord,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { auditPassedTrades } from './forwardValidationPassedTradesAudit';
import { classifyRegimeGroup } from './forwardValidationRegimePerformanceAudit';

const MACD_THRESHOLD = 0.25;
const DIST52_THRESHOLD = -5;

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function mean(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return round3(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function std(vals: number[]): number {
  if (vals.length === 0) return 0;
  const m = mean(vals) ?? 0;
  return Math.sqrt(vals.reduce((a, x) => a + (x - m) ** 2, 0) / vals.length);
}

function tradeSharpe(returns: number[]): number | null {
  if (returns.length < 2) return null;
  const mu = mean(returns);
  const sigma = std(returns);
  if (mu == null || sigma <= 1e-9) return null;
  return round3(mu / sigma);
}

function buildGroupStats(labelJa: string, trades: ForwardPassedTradeRecord[]): ForwardConditionSplitGroupStats {
  const wins = trades.filter((t) => t.returnPct > 0);
  const maxHold = trades.filter((t) => t.exitReason === 'max_hold');
  const returns = trades.map((t) => t.returnPct);
  return {
    labelJa,
    tradeCount: trades.length,
    winCount: wins.length,
    winRatePct: trades.length > 0 ? round3((wins.length / trades.length) * 100) : 0,
    avgReturnPct: mean(returns),
    sharpe: tradeSharpe(returns),
    maxHoldRatePct: trades.length > 0 ? round3((maxHold.length / trades.length) * 100) : 0,
  };
}

function formatGroup(g: ForwardConditionSplitGroupStats): string {
  return (
    `${g.labelJa}: ${g.tradeCount}件 · 勝率${g.winRatePct}% · 均R${g.avgReturnPct ?? '—'}% · ` +
    `Sharpe${g.sharpe ?? '—'} · 25日満了${g.maxHoldRatePct}%`
  );
}

function buildComparison(
  id: ForwardConditionSplitId,
  labelJa: string,
  groupA: ForwardConditionSplitGroupStats,
  groupB: ForwardConditionSplitGroupStats,
): ForwardConditionSplitComparison {
  return { id, labelJa, groupA, groupB };
}

export function auditConditionSplit(input: {
  bundle: ForwardOhlcvBundle;
}): ForwardConditionSplitAuditReport {
  const passed = auditPassedTrades(input);
  const trades = passed.trades;

  const macdLow = trades.filter((t) => t.macdHistPct < MACD_THRESHOLD);
  const macdHigh = trades.filter((t) => t.macdHistPct >= MACD_THRESHOLD);

  const distShallow = trades.filter((t) => t.dist52wPct > DIST52_THRESHOLD);
  const distDeep = trades.filter((t) => t.dist52wPct <= DIST52_THRESHOLD);

  const spyDown = trades.filter((t) => classifyRegimeGroup(t.bucket) === 'down');
  const spyUpShallow = trades.filter((t) => {
    const g = classifyRegimeGroup(t.bucket);
    return g === 'up' || g === 'sideways_shallow' || g === 'sideways';
  });

  const comparisons: ForwardConditionSplitComparison[] = [
    buildComparison(
      'macd',
      'MACD分割',
      buildGroupStats(`MACD < ${MACD_THRESHOLD}`, macdLow),
      buildGroupStats(`MACD >= ${MACD_THRESHOLD}`, macdHigh),
    ),
    buildComparison(
      'dist52',
      '52週乖離分割',
      buildGroupStats(`52w > ${DIST52_THRESHOLD}%`, distShallow),
      buildGroupStats(`52w <= ${DIST52_THRESHOLD}%`, distDeep),
    ),
    buildComparison(
      'spy',
      'SPYレジーム分割',
      buildGroupStats('SPY down', spyDown),
      buildGroupStats('SPY up/shallow', spyUpShallow),
    ),
  ];

  const humanLines = [
    `【3条件二元分割監査】${FORWARD_SIGNAL_START} ～ ${input.bundle.latestDate}`,
    `対象 条件適合 ${passed.tradeCount}件 · 現行出口+3%/25日`,
    '',
    ...comparisons.flatMap((c) => [
      `■ ${c.labelJa}`,
      formatGroup(c.groupA),
      formatGroup(c.groupB),
      '',
    ]),
    '※ Sharpe = グループ内トレードリターンの mean/std',
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate: FORWARD_SIGNAL_START,
    toDate: input.bundle.latestDate,
    totalTrades: passed.tradeCount,
    comparisons,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export function formatConditionSplitCsv(report: ForwardConditionSplitAuditReport): string {
  const header = 'comparison,group,tradeCount,winRatePct,avgReturnPct,sharpe,maxHoldRatePct';
  const rows: string[] = [];
  for (const c of report.comparisons) {
    for (const g of [c.groupA, c.groupB]) {
      rows.push(
        [
          c.labelJa,
          g.labelJa,
          g.tradeCount,
          g.winRatePct,
          g.avgReturnPct ?? '',
          g.sharpe ?? '',
          g.maxHoldRatePct,
        ].join(','),
      );
    }
  }
  return [header, ...rows].join('\n');
}
