/**
 * 4条件組み合わせ監査 — レジーム×ADX×MACD×52w · 条件適合96件 · ルール変更なし
 */
import { FORWARD_MACD_MIN, FORWARD_SIGNAL_START } from '../../constants/forwardValidation';
import type {
  ForwardAdxBucketId,
  ForwardDist52BucketId,
  ForwardFourFactorComboAuditReport,
  ForwardFourFactorComboCell,
  ForwardMacdBucketId,
  ForwardPassedTradeRecord,
  ForwardRegimeGroupId,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { classifyAdxBucket } from './forwardValidationAdxDist52CrossAudit';
import { classifyDist52Bucket } from './forwardValidationDist52Audit';
import { auditPassedTrades } from './forwardValidationPassedTradesAudit';
import { classifyRegimeGroup } from './forwardValidationRegimePerformanceAudit';

const MIN_CELL_TRADES = 3;
const TOP_N = 10;

const ADX_LABELS: Record<ForwardAdxBucketId, string> = {
  a25_30: '25-30',
  a30_35: '30-35',
  a35_40: '35-40',
  a40_50: '40-50',
  a50_plus: '50+',
};

const MACD_BUCKET_DEFS: { id: ForwardMacdBucketId; labelJa: string }[] = [
  { id: 'm01_02', labelJa: '0.1-0.2' },
  { id: 'm02_03', labelJa: '0.2-0.3' },
  { id: 'm03_05', labelJa: '0.3-0.5' },
  { id: 'm05_plus', labelJa: '0.5+' },
];

const DIST52_LABELS: Record<ForwardDist52BucketId, string> = {
  m2_m4: '-2～-4',
  m4_m6: '-4～-6',
  m6_m8: '-6～-8',
  m8_m10: '-8～-10',
  m10_m12: '-10～-12',
  m12_plus: '-12以上',
};

const REGIME_LABELS: Record<ForwardRegimeGroupId, string> = {
  up: 'up',
  down: 'down',
  sideways: 'sideways',
  sideways_shallow: 'sideways_shallow',
};

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function mean(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return round3(vals.reduce((a, b) => a + b, 0) / vals.length);
}

/** MACD帯: 適合下限0.1超 · (0.1,0.2] … */
export function classifyMacdBucket(macdHistPct: number): ForwardMacdBucketId | null {
  if (macdHistPct <= FORWARD_MACD_MIN) return null;
  if (macdHistPct <= 0.2) return 'm01_02';
  if (macdHistPct <= 0.3) return 'm02_03';
  if (macdHistPct <= 0.5) return 'm03_05';
  return 'm05_plus';
}

function cellKey(
  regime: ForwardRegimeGroupId,
  adx: ForwardAdxBucketId,
  macd: ForwardMacdBucketId,
  dist: ForwardDist52BucketId,
): string {
  return `${regime}|${adx}|${macd}|${dist}`;
}

function buildCell(
  regime: ForwardRegimeGroupId,
  adx: ForwardAdxBucketId,
  macd: ForwardMacdBucketId,
  dist: ForwardDist52BucketId,
  trades: ForwardPassedTradeRecord[],
): ForwardFourFactorComboCell {
  const wins = trades.filter((t) => t.returnPct > 0);
  const regimeLabel = REGIME_LABELS[regime];
  const adxLabel = ADX_LABELS[adx];
  const macdLabel = MACD_BUCKET_DEFS.find((m) => m.id === macd)!.labelJa;
  const distLabel = DIST52_LABELS[dist];
  return {
    regimeId: regime,
    regimeLabelJa: regimeLabel,
    adxBucketId: adx,
    adxLabelJa: adxLabel,
    macdBucketId: macd,
    macdLabelJa: macdLabel,
    dist52BucketId: dist,
    dist52LabelJa: distLabel,
    labelJa: `${regimeLabel} × ADX${adxLabel} × MACD${macdLabel} × 52w${distLabel}`,
    tradeCount: trades.length,
    winCount: wins.length,
    winRatePct: trades.length > 0 ? round3((wins.length / trades.length) * 100) : 0,
    avgReturnPct: mean(trades.map((t) => t.returnPct)),
    avgHoldDays: mean(trades.map((t) => t.holdDays)),
  };
}

function formatCellLine(c: ForwardFourFactorComboCell): string {
  return (
    `${c.labelJa}: ${c.tradeCount}件 · 勝率${c.winRatePct}% · 均R${c.avgReturnPct ?? '—'}% · 保有${c.avgHoldDays ?? '—'}日`
  );
}

function matchesSpotlight(t: ForwardPassedTradeRecord): boolean {
  return (
    classifyRegimeGroup(t.bucket) === 'down' &&
    t.adx14 >= 35 &&
    t.macdHistPct > 0 &&
    t.dist52wPct <= -10
  );
}

export function auditFourFactorCombo(input: {
  bundle: ForwardOhlcvBundle;
}): ForwardFourFactorComboAuditReport {
  const passed = auditPassedTrades(input);
  const grid = new Map<string, ForwardPassedTradeRecord[]>();
  const spotlightTrades: ForwardPassedTradeRecord[] = [];
  let unclassifiedCount = 0;

  for (const trade of passed.trades) {
    if (matchesSpotlight(trade)) spotlightTrades.push(trade);

    const regime = classifyRegimeGroup(trade.bucket);
    const adx = classifyAdxBucket(trade.adx14);
    const macd = classifyMacdBucket(trade.macdHistPct);
    const dist = classifyDist52Bucket(trade.dist52wPct);
    if (regime == null || adx == null || macd == null || dist == null) {
      unclassifiedCount++;
      continue;
    }
    const key = cellKey(regime, adx, macd, dist);
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key)!.push(trade);
  }

  const allCells: ForwardFourFactorComboCell[] = [];
  for (const [key, trades] of grid) {
    const [regime, adx, macd, dist] = key.split('|') as [
      ForwardRegimeGroupId,
      ForwardAdxBucketId,
      ForwardMacdBucketId,
      ForwardDist52BucketId,
    ];
    allCells.push(buildCell(regime, adx, macd, dist, trades));
  }

  const cellsMinCount = allCells
    .filter((c) => c.tradeCount >= MIN_CELL_TRADES)
    .sort((a, b) => (b.avgReturnPct ?? -999) - (a.avgReturnPct ?? -999));

  const top10ByReturn = cellsMinCount.slice(0, TOP_N);

  const spotlightDownAdx35MacdPosDist10 = ((): ForwardFourFactorComboCell => {
    const wins = spotlightTrades.filter((t) => t.returnPct > 0);
    return {
      regimeId: 'down',
      regimeLabelJa: 'down',
      adxBucketId: 'a35_40',
      adxLabelJa: '35+',
      macdBucketId: 'm01_02',
      macdLabelJa: '0+',
      dist52BucketId: 'm8_m10',
      dist52LabelJa: '≤-10%',
      labelJa: 'down × ADX≥35 × MACD+ × 52w≤-10%',
      tradeCount: spotlightTrades.length,
      winCount: wins.length,
      winRatePct:
        spotlightTrades.length > 0 ? round3((wins.length / spotlightTrades.length) * 100) : 0,
      avgReturnPct: mean(spotlightTrades.map((t) => t.returnPct)),
      avgHoldDays: mean(spotlightTrades.map((t) => t.holdDays)),
    };
  })();

  const humanLines = [
    `【4条件組み合わせ監査】${FORWARD_SIGNAL_START} ～ ${input.bundle.latestDate}`,
    `条件適合 ${passed.tradeCount}件 · 有効セル ${allCells.length} · ${MIN_CELL_TRADES}件以上 ${cellsMinCount.length}セル`,
    '',
    '■ 明示: SPY down × ADX35以上 × MACDプラス × 52週乖離-10%以下',
    formatCellLine(spotlightDownAdx35MacdPosDist10),
    '',
    `■ 利益率上位${TOP_N}セル（${MIN_CELL_TRADES}件以上）`,
    ...top10ByReturn.map((c, i) => `${i + 1}. ${formatCellLine(c)}`),
    '',
    `■ 全セル（${MIN_CELL_TRADES}件以上のみ）`,
    ...cellsMinCount.map((c) => formatCellLine(c)),
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate: FORWARD_SIGNAL_START,
    toDate: input.bundle.latestDate,
    totalTrades: passed.tradeCount,
    unclassifiedCount,
    minCellTrades: MIN_CELL_TRADES,
    cellsMinCount,
    top10ByReturn,
    spotlightDownAdx35MacdPosDist10,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export function formatFourFactorComboCsv(report: ForwardFourFactorComboAuditReport): string {
  const header =
    'kind,label,regime,adx,macd,dist52,tradeCount,winCount,winRatePct,avgReturnPct,avgHoldDays';
  const spot = report.spotlightDownAdx35MacdPosDist10;
  const spotRow = [
    'spotlight',
    spot.labelJa,
    spot.regimeLabelJa,
    spot.adxLabelJa,
    spot.macdLabelJa,
    spot.dist52LabelJa,
    spot.tradeCount,
    spot.winCount,
    spot.winRatePct,
    spot.avgReturnPct ?? '',
    spot.avgHoldDays ?? '',
  ].join(',');
  const rows = report.cellsMinCount.map((c) =>
    [
      'cell',
      c.labelJa,
      c.regimeLabelJa,
      c.adxLabelJa,
      c.macdLabelJa,
      c.dist52LabelJa,
      c.tradeCount,
      c.winCount,
      c.winRatePct,
      c.avgReturnPct ?? '',
      c.avgHoldDays ?? '',
    ].join(','),
  );
  return [header, spotRow, ...rows].join('\n');
}
