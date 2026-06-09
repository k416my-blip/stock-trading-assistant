/**
 * ADX × 52週高値乖離 クロス集計 — 条件適合96件 · ルール変更なし
 */
import { FORWARD_SIGNAL_START } from '../../constants/forwardValidation';
import type {
  ForwardAdxBucketId,
  ForwardAdxDist52CrossAuditReport,
  ForwardCrossTabCell,
  ForwardDist52BucketId,
  ForwardPassedTradeRecord,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { classifyDist52Bucket } from './forwardValidationDist52Audit';
import { auditPassedTrades } from './forwardValidationPassedTradesAudit';

const ADX_BUCKET_DEFS: { id: ForwardAdxBucketId; labelJa: string }[] = [
  { id: 'a25_30', labelJa: '25-30' },
  { id: 'a30_35', labelJa: '30-35' },
  { id: 'a35_40', labelJa: '35-40' },
  { id: 'a40_50', labelJa: '40-50' },
  { id: 'a50_plus', labelJa: '50+' },
];

const DIST52_BUCKET_DEFS: { id: ForwardDist52BucketId; labelJa: string }[] = [
  { id: 'm2_m4', labelJa: '-2～-4' },
  { id: 'm4_m6', labelJa: '-4～-6' },
  { id: 'm6_m8', labelJa: '-6～-8' },
  { id: 'm8_m10', labelJa: '-8～-10' },
  { id: 'm10_m12', labelJa: '-10～-12' },
  { id: 'm12_plus', labelJa: '-12以上' },
];

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function mean(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return round3(vals.reduce((a, b) => a + b, 0) / vals.length);
}

/** ADX帯: 下限不含・上限含む（25-30 = (25,30]） */
export function classifyAdxBucket(adx14: number): ForwardAdxBucketId | null {
  if (adx14 <= 25) return null;
  if (adx14 <= 30) return 'a25_30';
  if (adx14 <= 35) return 'a30_35';
  if (adx14 <= 40) return 'a35_40';
  if (adx14 <= 50) return 'a40_50';
  return 'a50_plus';
}

function cellStats(
  adxDef: (typeof ADX_BUCKET_DEFS)[number],
  distDef: (typeof DIST52_BUCKET_DEFS)[number],
  trades: ForwardPassedTradeRecord[],
): ForwardCrossTabCell {
  const wins = trades.filter((t) => t.returnPct > 0);
  return {
    adxBucketId: adxDef.id,
    adxLabelJa: adxDef.labelJa,
    dist52BucketId: distDef.id,
    dist52LabelJa: distDef.labelJa,
    tradeCount: trades.length,
    winCount: wins.length,
    winRatePct: trades.length > 0 ? round3((wins.length / trades.length) * 100) : 0,
    avgReturnPct: mean(trades.map((t) => t.returnPct)),
    avgHoldDays: mean(trades.map((t) => t.holdDays)),
  };
}

function formatCellLine(cell: ForwardCrossTabCell): string {
  if (cell.tradeCount === 0) {
    return `ADX ${cell.adxLabelJa} × 52w ${cell.dist52LabelJa}: 0件`;
  }
  return (
    `ADX ${cell.adxLabelJa} × 52w ${cell.dist52LabelJa}: ${cell.tradeCount}件 · ` +
    `勝率${cell.winRatePct}% · 均R${cell.avgReturnPct ?? '—'}% · 保有${cell.avgHoldDays ?? '—'}日`
  );
}

export function auditAdxDist52Cross(input: {
  bundle: ForwardOhlcvBundle;
}): ForwardAdxDist52CrossAuditReport {
  const passed = auditPassedTrades(input);
  const grid = new Map<string, ForwardPassedTradeRecord[]>();
  for (const adx of ADX_BUCKET_DEFS) {
    for (const dist of DIST52_BUCKET_DEFS) {
      grid.set(`${adx.id}_${dist.id}`, []);
    }
  }

  let unclassifiedCount = 0;
  for (const trade of passed.trades) {
    const adxBucket = classifyAdxBucket(trade.adx14);
    const distBucket = classifyDist52Bucket(trade.dist52wPct);
    if (adxBucket == null || distBucket == null) {
      unclassifiedCount++;
      continue;
    }
    grid.get(`${adxBucket}_${distBucket}`)!.push(trade);
  }

  const cells: ForwardCrossTabCell[] = [];
  for (const adxDef of ADX_BUCKET_DEFS) {
    for (const distDef of DIST52_BUCKET_DEFS) {
      cells.push(cellStats(adxDef, distDef, grid.get(`${adxDef.id}_${distDef.id}`) ?? []));
    }
  }

  const nonEmpty = cells.filter((c) => c.tradeCount > 0);
  const humanLines = [
    `【ADX × 52w乖離 クロス集計】${FORWARD_SIGNAL_START} ～ ${input.bundle.latestDate}`,
    `条件適合 ${passed.tradeCount}件 · 分類 ${passed.tradeCount - unclassifiedCount}件${unclassifiedCount > 0 ? ` · 帯外 ${unclassifiedCount}件` : ''}`,
    '',
    '■ 全セル',
    ...cells.map(formatCellLine),
    '',
    `■ データありセル ${nonEmpty.length}/${cells.length}`,
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate: FORWARD_SIGNAL_START,
    toDate: input.bundle.latestDate,
    totalTrades: passed.tradeCount,
    classifiedCount: passed.tradeCount - unclassifiedCount,
    unclassifiedCount,
    adxBuckets: ADX_BUCKET_DEFS,
    dist52Buckets: DIST52_BUCKET_DEFS,
    cells,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export function formatAdxDist52CrossCsv(report: ForwardAdxDist52CrossAuditReport): string {
  const header =
    'adxBucket,adxLabel,dist52Bucket,dist52Label,tradeCount,winCount,winRatePct,avgReturnPct,avgHoldDays';
  const rows = report.cells.map((c) =>
    [
      c.adxBucketId,
      c.adxLabelJa,
      c.dist52BucketId,
      c.dist52LabelJa,
      c.tradeCount,
      c.winCount,
      c.winRatePct,
      c.avgReturnPct ?? '',
      c.avgHoldDays ?? '',
    ].join(','),
  );
  return [header, ...rows].join('\n');
}
