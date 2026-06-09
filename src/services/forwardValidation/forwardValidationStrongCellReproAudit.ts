/**
 * 最強セル再現性監査 — 学習/検証期間比較 · ルール変更なし
 */
import { FORWARD_SIGNAL_START } from '../../constants/forwardValidation';
import type {
  ForwardPassedTradeRecord,
  ForwardStrongCellPeriodStats,
  ForwardStrongCellReproAuditReport,
  ForwardStrongCellReproRow,
  ForwardStrongCellScenarioId,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { auditPassedTrades } from './forwardValidationPassedTradesAudit';
import { classifyRegimeGroup } from './forwardValidationRegimePerformanceAudit';

const TRAIN_END = '2025-03-31';
const VALID_START = '2025-04-01';

const SCENARIOS: { id: ForwardStrongCellScenarioId; labelJa: string; match: (t: ForwardPassedTradeRecord) => boolean }[] = [
  {
    id: 'down_dist10',
    labelJa: 'down × 52w≤-10%',
    match: (t) => classifyRegimeGroup(t.bucket) === 'down' && t.dist52wPct <= -10,
  },
  {
    id: 'down_dist8',
    labelJa: 'down × 52w≤-8%',
    match: (t) => classifyRegimeGroup(t.bucket) === 'down' && t.dist52wPct <= -8,
  },
  {
    id: 'down_dist8_adx35',
    labelJa: 'down × 52w≤-8% × ADX35+',
    match: (t) =>
      classifyRegimeGroup(t.bucket) === 'down' &&
      t.dist52wPct <= -8 &&
      t.adx14 >= 35,
  },
  {
    id: 'down_dist8_adx35_macd',
    labelJa: 'down × 52w≤-8% × ADX35+ × MACD+',
    match: (t) =>
      classifyRegimeGroup(t.bucket) === 'down' &&
      t.dist52wPct <= -8 &&
      t.adx14 >= 35 &&
      t.macdHistPct > 0,
  },
];

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function mean(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return round3(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function periodStats(trades: ForwardPassedTradeRecord[]): ForwardStrongCellPeriodStats {
  const wins = trades.filter((t) => t.returnPct > 0);
  return {
    tradeCount: trades.length,
    winCount: wins.length,
    winRatePct: trades.length > 0 ? round3((wins.length / trades.length) * 100) : 0,
    avgReturnPct: mean(trades.map((t) => t.returnPct)),
    avgHoldDays: mean(trades.map((t) => t.holdDays)),
  };
}

function delta(train: number | null, valid: number | null): number | null {
  if (train == null || valid == null) return null;
  return round3(valid - train);
}

function buildRow(
  id: ForwardStrongCellScenarioId,
  labelJa: string,
  trainTrades: ForwardPassedTradeRecord[],
  validTrades: ForwardPassedTradeRecord[],
): ForwardStrongCellReproRow {
  const train = periodStats(trainTrades);
  const validation = periodStats(validTrades);
  return {
    scenarioId: id,
    labelJa,
    train,
    validation,
    diff: {
      tradeCount: validation.tradeCount - train.tradeCount,
      winRatePct: delta(train.winRatePct, validation.winRatePct),
      avgReturnPct: delta(train.avgReturnPct, validation.avgReturnPct),
      avgHoldDays: delta(train.avgHoldDays, validation.avgHoldDays),
    },
  };
}

function formatPeriod(p: ForwardStrongCellPeriodStats, label: string): string {
  return (
    `${label}: ${p.tradeCount}件 · 勝率${p.winRatePct}% · 均R${p.avgReturnPct ?? '—'}% · 保有${p.avgHoldDays ?? '—'}日`
  );
}

export function auditStrongCellReproducibility(input: {
  bundle: ForwardOhlcvBundle;
}): ForwardStrongCellReproAuditReport {
  const passed = auditPassedTrades(input);
  const trainTrades = passed.trades.filter(
    (t) => t.signalDate >= FORWARD_SIGNAL_START && t.signalDate <= TRAIN_END,
  );
  const validTrades = passed.trades.filter(
    (t) => t.signalDate >= VALID_START && t.signalDate <= input.bundle.latestDate,
  );

  const rows = SCENARIOS.map((s) => {
    const train = trainTrades.filter(s.match);
    const valid = validTrades.filter(s.match);
    return buildRow(s.id, s.labelJa, train, valid);
  });

  const humanLines = [
    `【最強セル再現性監査】${FORWARD_SIGNAL_START} ～ ${input.bundle.latestDate}`,
    `学習 ${FORWARD_SIGNAL_START} ～ ${TRAIN_END} · 検証 ${VALID_START} ～ ${input.bundle.latestDate}`,
    `母集団: 条件適合 ${passed.tradeCount}件（学習${trainTrades.length} / 検証${validTrades.length}）`,
    '',
    ...rows.flatMap((r) => [
      `■ ${r.labelJa}`,
      formatPeriod(r.train, '学習'),
      formatPeriod(r.validation, '検証'),
      `差分: 件数${r.diff.tradeCount >= 0 ? '+' : ''}${r.diff.tradeCount} · 勝率${r.diff.winRatePct ?? '—'}pt · 均R${r.diff.avgReturnPct ?? '—'}% · 保有${r.diff.avgHoldDays ?? '—'}日`,
      '',
    ]),
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate: FORWARD_SIGNAL_START,
    toDate: input.bundle.latestDate,
    trainFrom: FORWARD_SIGNAL_START,
    trainTo: TRAIN_END,
    validFrom: VALID_START,
    validTo: input.bundle.latestDate,
    totalTrades: passed.tradeCount,
    trainPoolCount: trainTrades.length,
    validPoolCount: validTrades.length,
    rows,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export function formatStrongCellReproCsv(report: ForwardStrongCellReproAuditReport): string {
  const header =
    'scenario,period,tradeCount,winCount,winRatePct,avgReturnPct,avgHoldDays';
  const lines: string[] = [header];
  for (const r of report.rows) {
    for (const [period, p] of [
      ['train', r.train],
      ['validation', r.validation],
    ] as const) {
      lines.push(
        [
          r.labelJa,
          period,
          p.tradeCount,
          p.winCount,
          p.winRatePct,
          p.avgReturnPct ?? '',
          p.avgHoldDays ?? '',
        ].join(','),
      );
    }
    lines.push(
      [
        r.labelJa,
        'diff_count',
        r.diff.tradeCount,
        '',
        r.diff.winRatePct ?? '',
        r.diff.avgReturnPct ?? '',
        r.diff.avgHoldDays ?? '',
      ].join(','),
    );
  }
  return lines.join('\n');
}
