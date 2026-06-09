/**
 * 2025年4月クラスター除外監査 — 条件適合96件 · ルール変更なし
 */
import { FORWARD_SIGNAL_START } from '../../constants/forwardValidation';
import type {
  ForwardAdxBucketId,
  ForwardApril2025ExcludeAuditReport,
  ForwardAprilExcludeCompareRow,
  ForwardAprilExcludeSnapshot,
  ForwardDist52BucketId,
  ForwardPassedTradeRecord,
  ForwardRegimeGroupId,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { classifyAdxBucket } from './forwardValidationAdxDist52CrossAudit';
import { classifyDist52Bucket } from './forwardValidationDist52Audit';
import { classifyMacdBucket } from './forwardValidationFourFactorComboAudit';
import { auditPassedTrades } from './forwardValidationPassedTradesAudit';
import { classifyRegimeGroup } from './forwardValidationRegimePerformanceAudit';

const EXCLUDE_MONTH = '2025-04';
const MIN_FOUR_FACTOR_DISPLAY = 3;

const REGIME_ORDER: { id: ForwardRegimeGroupId; label: string }[] = [
  { id: 'up', label: 'up' },
  { id: 'down', label: 'down' },
  { id: 'sideways', label: 'sideways' },
  { id: 'sideways_shallow', label: 'sideways_shallow' },
];

const ADX_ORDER: { id: ForwardAdxBucketId; label: string }[] = [
  { id: 'a25_30', label: 'ADX 25-30' },
  { id: 'a30_35', label: 'ADX 30-35' },
  { id: 'a35_40', label: 'ADX 35-40' },
  { id: 'a40_50', label: 'ADX 40-50' },
  { id: 'a50_plus', label: 'ADX 50+' },
];

const DIST52_ORDER: { id: ForwardDist52BucketId; label: string }[] = [
  { id: 'm2_m4', label: '52w -2～-4' },
  { id: 'm4_m6', label: '52w -4～-6' },
  { id: 'm6_m8', label: '52w -6～-8' },
  { id: 'm8_m10', label: '52w -8～-10' },
  { id: 'm10_m12', label: '52w -10～-12' },
  { id: 'm12_plus', label: '52w -12以上' },
];

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function mean(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return round3(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function monthKey(d: string): string {
  return d.slice(0, 7);
}

function snapshot(trades: ForwardPassedTradeRecord[]): ForwardAprilExcludeSnapshot {
  const wins = trades.filter((t) => t.returnPct > 0);
  return {
    tradeCount: trades.length,
    winCount: wins.length,
    winRatePct: trades.length > 0 ? round3((wins.length / trades.length) * 100) : 0,
    avgReturnPct: mean(trades.map((t) => t.returnPct)),
    avgHoldDays: mean(trades.map((t) => t.holdDays)),
  };
}

function compareRow(label: string, before: ForwardPassedTradeRecord[], after: ForwardPassedTradeRecord[]): ForwardAprilExcludeCompareRow {
  return { label, before: snapshot(before), after: snapshot(after) };
}

function filterByMonth(trades: ForwardPassedTradeRecord[], month: string): ForwardPassedTradeRecord[] {
  return trades.filter((t) => monthKey(t.signalDate) === month);
}

function excludeApril(trades: ForwardPassedTradeRecord[]): ForwardPassedTradeRecord[] {
  return trades.filter((t) => monthKey(t.signalDate) !== EXCLUDE_MONTH);
}

function fourFactorLabel(t: ForwardPassedTradeRecord): string | null {
  const regime = classifyRegimeGroup(t.bucket);
  const adx = classifyAdxBucket(t.adx14);
  const macd = classifyMacdBucket(t.macdHistPct);
  const dist = classifyDist52Bucket(t.dist52wPct);
  if (regime == null || adx == null || macd == null || dist == null) return null;
  const adxL = ADX_ORDER.find((a) => a.id === adx)!.label.replace('ADX ', '');
  const distL = DIST52_ORDER.find((d) => d.id === dist)!.label.replace('52w ', '');
  const macdL = macd === 'm01_02' ? '0.1-0.2' : macd === 'm02_03' ? '0.2-0.3' : macd === 'm03_05' ? '0.3-0.5' : '0.5+';
  return `${regime} × ADX${adxL} × MACD${macdL} × ${distL}`;
}

function buildFourFactorRows(
  all: ForwardPassedTradeRecord[],
  remaining: ForwardPassedTradeRecord[],
): ForwardAprilExcludeCompareRow[] {
  const labels = new Set<string>();
  for (const t of all) {
    const l = fourFactorLabel(t);
    if (l) labels.add(l);
  }
  const rows: ForwardAprilExcludeCompareRow[] = [];
  for (const label of [...labels].sort()) {
    const before = all.filter((t) => fourFactorLabel(t) === label);
    const after = remaining.filter((t) => fourFactorLabel(t) === label);
    if (before.length >= MIN_FOUR_FACTOR_DISPLAY || after.length >= MIN_FOUR_FACTOR_DISPLAY) {
      rows.push(compareRow(label, before, after));
    }
  }
  return rows.sort((a, b) => (b.before.tradeCount + b.after.tradeCount) - (a.before.tradeCount + a.after.tradeCount));
}

function formatSnap(s: ForwardAprilExcludeSnapshot): string {
  return `${s.tradeCount}件 · 勝率${s.winRatePct}% · 均R${s.avgReturnPct ?? '—'}% · 保有${s.avgHoldDays ?? '—'}日`;
}

function formatCompareTable(title: string, rows: ForwardAprilExcludeCompareRow[]): string[] {
  return [
    `■ ${title}`,
    ...rows.map(
      (r) =>
        `${r.label}\n  除外前: ${formatSnap(r.before)}\n  除外後: ${formatSnap(r.after)}`,
    ),
  ];
}

export function auditApril2025Exclusion(input: {
  bundle: ForwardOhlcvBundle;
}): ForwardApril2025ExcludeAuditReport {
  const passed = auditPassedTrades(input);
  const all = passed.trades;
  const april = filterByMonth(all, EXCLUDE_MONTH);
  const remaining = excludeApril(all);

  const overall = compareRow('全体', all, remaining);

  const regimeRows = REGIME_ORDER.map((r) =>
    compareRow(
      r.label,
      all.filter((t) => classifyRegimeGroup(t.bucket) === r.id),
      remaining.filter((t) => classifyRegimeGroup(t.bucket) === r.id),
    ),
  );

  const adxRows = ADX_ORDER.map((a) =>
    compareRow(
      a.label,
      all.filter((t) => classifyAdxBucket(t.adx14) === a.id),
      remaining.filter((t) => classifyAdxBucket(t.adx14) === a.id),
    ),
  );

  const dist52Rows = DIST52_ORDER.map((d) =>
    compareRow(
      d.label,
      all.filter((t) => classifyDist52Bucket(t.dist52wPct) === d.id),
      remaining.filter((t) => classifyDist52Bucket(t.dist52wPct) === d.id),
    ),
  );

  const fourFactorRows = buildFourFactorRows(all, remaining);

  const humanLines = [
    `【2025年4月クラスター除外監査】${FORWARD_SIGNAL_START} ～ ${input.bundle.latestDate}`,
    `除外: ${EXCLUDE_MONTH}シグナル ${april.length}件 · 残り ${remaining.length}件`,
    '',
    '■ 全体',
    `除外前: ${formatSnap(overall.before)}`,
    `除外後: ${formatSnap(overall.after)}`,
    '',
    ...formatCompareTable('SPYレジーム別', regimeRows),
    '',
    ...formatCompareTable('ADX別', adxRows),
    '',
    ...formatCompareTable('52週乖離別', dist52Rows),
    '',
    ...formatCompareTable(`4条件組み合わせ（${MIN_FOUR_FACTOR_DISPLAY}件以上）`, fourFactorRows),
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate: FORWARD_SIGNAL_START,
    toDate: input.bundle.latestDate,
    excludeMonth: EXCLUDE_MONTH,
    excludedCount: april.length,
    totalTrades: all.length,
    remainingCount: remaining.length,
    overall,
    regimeRows,
    adxRows,
    dist52Rows,
    fourFactorRows,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export function formatApril2025ExcludeCsv(report: ForwardApril2025ExcludeAuditReport): string {
  const header = 'section,label,period,tradeCount,winRatePct,avgReturnPct,avgHoldDays';
  const lines = [header];
  const push = (section: string, row: ForwardAprilExcludeCompareRow) => {
    for (const [period, snap] of [
      ['before', row.before],
      ['after', row.after],
    ] as const) {
      lines.push(
        [section, row.label, period, snap.tradeCount, snap.winRatePct, snap.avgReturnPct ?? '', snap.avgHoldDays ?? ''].join(
          ',',
        ),
      );
    }
  };
  push('overall', report.overall);
  for (const r of report.regimeRows) push('regime', r);
  for (const r of report.adxRows) push('adx', r);
  for (const r of report.dist52Rows) push('dist52', r);
  for (const r of report.fourFactorRows) push('four_factor', r);
  return lines.join('\n');
}
