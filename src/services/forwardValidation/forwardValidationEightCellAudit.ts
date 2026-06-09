/**
 * MACD×52w×SPY 8セル監査 — 条件適合96件 · ルール変更なし
 */
import { FORWARD_SIGNAL_START } from '../../constants/forwardValidation';
import type {
  ForwardEightCellAuditReport,
  ForwardEightCellDistSide,
  ForwardEightCellMacdSide,
  ForwardEightCellSpySide,
  ForwardEightCellStats,
  ForwardPassedTradeRecord,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { auditPassedTrades } from './forwardValidationPassedTradesAudit';
import { classifyRegimeGroup } from './forwardValidationRegimePerformanceAudit';

const MACD_THRESHOLD = 0.25;
const DIST52_THRESHOLD = -5;

type CellKey = `${ForwardEightCellMacdSide}_${ForwardEightCellDistSide}_${ForwardEightCellSpySide}`;

const CELL_ORDER: {
  macdSide: ForwardEightCellMacdSide;
  distSide: ForwardEightCellDistSide;
  spySide: ForwardEightCellSpySide;
}[] = [
  { macdSide: 'high', distSide: 'deep', spySide: 'down' },
  { macdSide: 'high', distSide: 'deep', spySide: 'up_shallow' },
  { macdSide: 'high', distSide: 'shallow', spySide: 'down' },
  { macdSide: 'high', distSide: 'shallow', spySide: 'up_shallow' },
  { macdSide: 'low', distSide: 'deep', spySide: 'down' },
  { macdSide: 'low', distSide: 'deep', spySide: 'up_shallow' },
  { macdSide: 'low', distSide: 'shallow', spySide: 'down' },
  { macdSide: 'low', distSide: 'shallow', spySide: 'up_shallow' },
];

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

function macdSide(t: ForwardPassedTradeRecord): ForwardEightCellMacdSide {
  return t.macdHistPct >= MACD_THRESHOLD ? 'high' : 'low';
}

function distSide(t: ForwardPassedTradeRecord): ForwardEightCellDistSide {
  return t.dist52wPct <= DIST52_THRESHOLD ? 'deep' : 'shallow';
}

function spySide(t: ForwardPassedTradeRecord): ForwardEightCellSpySide {
  return classifyRegimeGroup(t.bucket) === 'down' ? 'down' : 'up_shallow';
}

function cellKey(
  m: ForwardEightCellMacdSide,
  d: ForwardEightCellDistSide,
  s: ForwardEightCellSpySide,
): CellKey {
  return `${m}_${d}_${s}`;
}

function cellLabelJa(
  m: ForwardEightCellMacdSide,
  d: ForwardEightCellDistSide,
  s: ForwardEightCellSpySide,
): string {
  const macd = m === 'high' ? `MACD≥${MACD_THRESHOLD}` : `MACD<${MACD_THRESHOLD}`;
  const dist = d === 'deep' ? `52w≤${DIST52_THRESHOLD}%` : `52w>${DIST52_THRESHOLD}%`;
  const spy = s === 'down' ? 'SPY down' : 'SPY up/shallow';
  return `${macd} × ${dist} × ${spy}`;
}

function buildCellStats(
  macdSideVal: ForwardEightCellMacdSide,
  distSideVal: ForwardEightCellDistSide,
  spySideVal: ForwardEightCellSpySide,
  trades: ForwardPassedTradeRecord[],
): ForwardEightCellStats {
  const wins = trades.filter((t) => t.returnPct > 0);
  const maxHold = trades.filter((t) => t.exitReason === 'max_hold');
  const returns = trades.map((t) => t.returnPct);
  return {
    macdSide: macdSideVal,
    distSide: distSideVal,
    spySide: spySideVal,
    labelJa: cellLabelJa(macdSideVal, distSideVal, spySideVal),
    tradeCount: trades.length,
    winCount: wins.length,
    winRatePct: trades.length > 0 ? round3((wins.length / trades.length) * 100) : 0,
    avgReturnPct: mean(returns),
    sharpe: tradeSharpe(returns),
    maxHoldRatePct: trades.length > 0 ? round3((maxHold.length / trades.length) * 100) : 0,
  };
}

function formatCell(c: ForwardEightCellStats): string {
  return (
    `${c.labelJa}\n` +
    `${c.tradeCount}件 · 勝率${c.winRatePct}% · 均R${c.avgReturnPct ?? '—'}% · ` +
    `Sharpe${c.sharpe ?? '—'} · 25日満了${c.maxHoldRatePct}%`
  );
}

export function auditEightCell(input: { bundle: ForwardOhlcvBundle }): ForwardEightCellAuditReport {
  const passed = auditPassedTrades(input);
  const byCell = new Map<CellKey, ForwardPassedTradeRecord[]>();
  for (const def of CELL_ORDER) {
    byCell.set(cellKey(def.macdSide, def.distSide, def.spySide), []);
  }

  for (const t of passed.trades) {
    const key = cellKey(macdSide(t), distSide(t), spySide(t));
    byCell.get(key)!.push(t);
  }

  const cells = CELL_ORDER.map((def) =>
    buildCellStats(
      def.macdSide,
      def.distSide,
      def.spySide,
      byCell.get(cellKey(def.macdSide, def.distSide, def.spySide)) ?? [],
    ),
  );

  const classifiedCount = cells.reduce((s, c) => s + c.tradeCount, 0);

  const humanLines = [
    `【MACD×52w×SPY 8セル監査】${FORWARD_SIGNAL_START} ～ ${input.bundle.latestDate}`,
    `対象 条件適合 ${passed.tradeCount}件 · 分類 ${classifiedCount}件 · 現行出口+3%/25日`,
    '（A: MACD≥0.25 vs <0.25 · B: 52w≤-5% vs >-5% · C: SPY down vs up/shallow）',
    '',
    ...cells.map((c) => `■ ${formatCell(c)}`),
    '',
    '※ Sharpe = セル内トレードリターンの mean/std（2件未満は—）',
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate: FORWARD_SIGNAL_START,
    toDate: input.bundle.latestDate,
    totalTrades: passed.tradeCount,
    classifiedCount,
    cells,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export function formatEightCellCsv(report: ForwardEightCellAuditReport): string {
  const header =
    'cell,tradeCount,winRatePct,avgReturnPct,sharpe,maxHoldRatePct,macdSide,distSide,spySide';
  const rows = report.cells.map((c) =>
    [
      c.labelJa,
      c.tradeCount,
      c.winRatePct,
      c.avgReturnPct ?? '',
      c.sharpe ?? '',
      c.maxHoldRatePct,
      c.macdSide,
      c.distSide,
      c.spySide,
    ].join(','),
  );
  return [header, ...rows].join('\n');
}
