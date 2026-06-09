/**
 * SPYレジーム × 52週乖離 2因子クロス監査 — 条件適合96件 · ルール変更なし
 */
import { FORWARD_SIGNAL_START } from '../../constants/forwardValidation';
import type {
  ForwardDist52BucketId,
  ForwardPassedTradeRecord,
  ForwardRegimeDist52CrossAuditReport,
  ForwardRegimeDist52CrossCell,
  ForwardRegimeGroupId,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { classifyDist52Bucket } from './forwardValidationDist52Audit';
import { auditPassedTrades } from './forwardValidationPassedTradesAudit';
import { classifyRegimeGroup } from './forwardValidationRegimePerformanceAudit';

const MIN_CELL_TRADES = 3;

const REGIME_ROW_DEFS: { id: ForwardRegimeGroupId; labelJa: string }[] = [
  { id: 'up', labelJa: 'SPY up' },
  { id: 'down', labelJa: 'SPY down' },
  { id: 'sideways', labelJa: 'SPY sideways' },
  { id: 'sideways_shallow', labelJa: 'SPY sideways_shallow' },
];

const DIST52_COL_DEFS: { id: ForwardDist52BucketId; labelJa: string }[] = [
  { id: 'm2_m4', labelJa: '-2%～-4%' },
  { id: 'm4_m6', labelJa: '-4%～-6%' },
  { id: 'm6_m8', labelJa: '-6%～-8%' },
  { id: 'm8_m10', labelJa: '-8%～-10%' },
  { id: 'm10_m12', labelJa: '-10%～-12%' },
  { id: 'm12_plus', labelJa: '-12%以下' },
];

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function mean(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return round3(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function cellStats(
  regimeDef: (typeof REGIME_ROW_DEFS)[number],
  distDef: (typeof DIST52_COL_DEFS)[number],
  trades: ForwardPassedTradeRecord[],
): ForwardRegimeDist52CrossCell {
  const wins = trades.filter((t) => t.returnPct > 0);
  const takeProfit = trades.filter((t) => t.exitReason === 'take_profit');
  const maxHold = trades.filter((t) => t.exitReason === 'max_hold');
  return {
    regimeGroupId: regimeDef.id,
    regimeLabelJa: regimeDef.labelJa,
    dist52BucketId: distDef.id,
    dist52LabelJa: distDef.labelJa,
    tradeCount: trades.length,
    winCount: wins.length,
    winRatePct: trades.length > 0 ? round3((wins.length / trades.length) * 100) : 0,
    avgReturnPct: mean(trades.map((t) => t.returnPct)),
    avgHoldDays: mean(trades.map((t) => t.holdDays)),
    takeProfitRatePct: trades.length > 0 ? round3((takeProfit.length / trades.length) * 100) : 0,
    maxHoldRatePct: trades.length > 0 ? round3((maxHold.length / trades.length) * 100) : 0,
  };
}

function formatCellLine(cell: ForwardRegimeDist52CrossCell): string {
  return (
    `${cell.regimeLabelJa} × ${cell.dist52LabelJa}: ${cell.tradeCount}件 · ` +
    `勝率${cell.winRatePct}% · 均R${cell.avgReturnPct ?? '—'}% · ` +
    `利確${cell.takeProfitRatePct}% · 25日満了${cell.maxHoldRatePct}%`
  );
}

export function auditRegimeDist52Cross(input: {
  bundle: ForwardOhlcvBundle;
}): ForwardRegimeDist52CrossAuditReport {
  const passed = auditPassedTrades(input);
  const grid = new Map<string, ForwardPassedTradeRecord[]>();
  for (const regime of REGIME_ROW_DEFS) {
    for (const dist of DIST52_COL_DEFS) {
      grid.set(`${regime.id}_${dist.id}`, []);
    }
  }

  let unclassifiedCount = 0;
  for (const trade of passed.trades) {
    const regime = classifyRegimeGroup(trade.bucket);
    const dist = classifyDist52Bucket(trade.dist52wPct);
    if (regime == null || dist == null) {
      unclassifiedCount++;
      continue;
    }
    grid.get(`${regime}_${dist}`)!.push(trade);
  }

  const cells: ForwardRegimeDist52CrossCell[] = [];
  for (const regimeDef of REGIME_ROW_DEFS) {
    for (const distDef of DIST52_COL_DEFS) {
      cells.push(cellStats(regimeDef, distDef, grid.get(`${regimeDef.id}_${distDef.id}`) ?? []));
    }
  }

  const displayCells = cells.filter((c) => c.tradeCount >= MIN_CELL_TRADES);

  const humanLines = [
    `【SPYレジーム × 52w乖離 2因子クロス監査】${FORWARD_SIGNAL_START} ～ ${input.bundle.latestDate}`,
    `条件適合 ${passed.tradeCount}件 · 分類 ${passed.tradeCount - unclassifiedCount}件${unclassifiedCount > 0 ? ` · 帯外 ${unclassifiedCount}件` : ''}`,
    `（sideways = sideways_deep · ${MIN_CELL_TRADES}件以上セルのみ表示）`,
    '',
    ...displayCells.map(formatCellLine),
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate: FORWARD_SIGNAL_START,
    toDate: input.bundle.latestDate,
    totalTrades: passed.tradeCount,
    classifiedCount: passed.tradeCount - unclassifiedCount,
    unclassifiedCount,
    minCellTrades: MIN_CELL_TRADES,
    regimeRows: REGIME_ROW_DEFS,
    dist52Columns: DIST52_COL_DEFS,
    cells,
    displayCells,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export function formatRegimeDist52CrossCsv(report: ForwardRegimeDist52CrossAuditReport): string {
  const header =
    'regime,dist52Bucket,tradeCount,winCount,winRatePct,avgReturnPct,takeProfitRatePct,maxHoldRatePct';
  const rows = report.displayCells.map((c) =>
    [
      c.regimeLabelJa,
      c.dist52LabelJa,
      c.tradeCount,
      c.winCount,
      c.winRatePct,
      c.avgReturnPct ?? '',
      c.takeProfitRatePct,
      c.maxHoldRatePct,
    ].join(','),
  );
  return [header, ...rows].join('\n');
}
