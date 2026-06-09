/**
 * VIX≥24 · 38勝トレード強度分析 — 監査のみ
 */
import { FORWARD_ETF_UNIVERSE, FORWARD_SIGNAL_START } from '../../constants/forwardValidation';
import type {
  ForwardDistributionBucketRow,
  ForwardPassedTradeRecord,
  ForwardVix24WinnerStrengthAuditReport,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { barIndexByDate, type OhlcvBar } from './case4Indicators';
import { auditPassedTrades } from './forwardValidationPassedTradesAudit';
import { pearsonCorrelation } from './forwardValidationReturnCorrelationAudit';

const VIX_THRESHOLD = 24;

type BucketDef = { labelJa: string; min: number; max: number | null };

const VIX_BUCKETS: BucketDef[] = [
  { labelJa: '24〜26', min: 24, max: 26 },
  { labelJa: '26〜28', min: 26, max: 28 },
  { labelJa: '28〜30', min: 28, max: 30 },
  { labelJa: '30〜35', min: 30, max: 35 },
  { labelJa: '35以上', min: 35, max: null },
];

const ADX_BUCKETS: BucketDef[] = [
  { labelJa: '25〜30', min: 25, max: 30 },
  { labelJa: '30〜35', min: 30, max: 35 },
  { labelJa: '35〜40', min: 35, max: 40 },
  { labelJa: '40以上', min: 40, max: null },
];

const MACD_BUCKETS: BucketDef[] = [
  { labelJa: '0〜0.2', min: 0, max: 0.2 },
  { labelJa: '0.2〜0.4', min: 0.2, max: 0.4 },
  { labelJa: '0.4以上', min: 0.4, max: null },
];

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function mean(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return round3(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function mode(values: string[]): string | null {
  if (values.length === 0) return null;
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best = values[0]!;
  let max = 0;
  for (const [k, c] of counts) {
    if (c > max) {
      max = c;
      best = k;
    }
  }
  return best;
}

function vixAtDate(vixBars: OhlcvBar[], date: string): number | null {
  const idx = barIndexByDate(vixBars, date);
  if (idx < 0) return null;
  return round3(vixBars[idx]!.close);
}

type EnrichedTrade = ForwardPassedTradeRecord & { vix: number | null };

function inBucket(value: number, def: BucketDef): boolean {
  if (value < def.min) return false;
  if (def.max == null) return true;
  return value < def.max;
}

function buildBucketRows(
  defs: BucketDef[],
  trades: EnrichedTrade[],
  pick: (t: EnrichedTrade) => number,
): ForwardDistributionBucketRow[] {
  return defs.map((def) => {
    const rows = trades.filter((t) => inBucket(pick(t), def));
    return {
      labelJa: def.labelJa,
      tradeCount: rows.length,
      avgReturnPct: mean(rows.map((t) => t.returnPct)),
    };
  });
}

function formatBucketSection(title: string, rows: ForwardDistributionBucketRow[]): string[] {
  return [
    `■ ${title}`,
    ...rows.map((r) => `${r.labelJa}: ${r.tradeCount}件 · 均R${r.avgReturnPct ?? '—'}%`),
  ];
}

export function analyzeTop10Traits(
  top10: EnrichedTrade[],
  vixBars: OhlcvBar[],
): string {
  if (top10.length === 0) return '該当なし';

  const etfCounts = Object.fromEntries(FORWARD_ETF_UNIVERSE.map((s) => [s, 0])) as Record<
    string,
    number
  >;
  for (const t of top10) etfCounts[t.symbol] = (etfCounts[t.symbol] ?? 0) + 1;

  const vixVals = top10.map((t) => t.vix ?? vixAtDate(vixBars, t.signalDate)).filter((v): v is number => v != null);
  const tpCount = top10.filter((t) => t.exitReason === 'take_profit').length;
  const aprMayCount = top10.filter(
    (t) => t.signalDate >= '2025-04-01' && t.signalDate <= '2025-05-31',
  ).length;

  return [
    `上位${top10.length}件（returnPct降順）`,
    `ETF: ${FORWARD_ETF_UNIVERSE.map((s) => `${s}=${etfCounts[s] ?? 0}`).join(' ')} · 最多=${mode(top10.map((t) => t.symbol)) ?? '—'}`,
    `VIX平均 ${mean(vixVals) ?? '—'} · ADX平均 ${mean(top10.map((t) => t.adx14)) ?? '—'} · MACD平均 ${mean(top10.map((t) => t.macdHistPct)) ?? '—'}%`,
    `52w平均 ${mean(top10.map((t) => t.dist52wPct)) ?? '—'}% · 保有日平均 ${mean(top10.map((t) => t.holdDays)) ?? '—'}日`,
    `バケット最多: ${mode(top10.map((t) => t.bucket)) ?? '—'} · SPYレジーム: ${mode(top10.map((t) => t.spyRegime)) ?? '—'}`,
    `利確+3% ${tpCount}/${top10.length} · 2025年4〜5月 ${aprMayCount}/${top10.length}件`,
  ].join('\n');
}

export function auditVix24WinnerStrength(input: {
  bundle: ForwardOhlcvBundle;
}): ForwardVix24WinnerStrengthAuditReport {
  const passed = auditPassedTrades(input);
  const vixBars = input.bundle.vixBars ?? [];
  const cohort: EnrichedTrade[] = passed.trades
    .filter((t) => {
      const vix = vixAtDate(vixBars, t.signalDate);
      return vix != null && vix >= VIX_THRESHOLD && t.returnPct > 0;
    })
    .map((t) => ({ ...t, vix: vixAtDate(vixBars, t.signalDate) }));

  const vixBuckets = buildBucketRows(VIX_BUCKETS, cohort, (t) => t.vix!);
  const adxBuckets = buildBucketRows(ADX_BUCKETS, cohort, (t) => t.adx14);
  const macdBuckets = buildBucketRows(MACD_BUCKETS, cohort, (t) => t.macdHistPct);

  const returns = cohort.map((t) => t.returnPct);
  const vixReturnCorrelation = pearsonCorrelation(
    cohort.map((t) => t.vix!),
    returns,
  );
  const adxReturnCorrelation = pearsonCorrelation(
    cohort.map((t) => t.adx14),
    returns,
  );
  const macdReturnCorrelation = pearsonCorrelation(
    cohort.map((t) => t.macdHistPct),
    returns,
  );

  const top10 = [...cohort]
    .sort((a, b) => b.returnPct - a.returnPct || a.signalDate.localeCompare(b.signalDate))
    .slice(0, 10);
  const top10CommonTraitsJa = analyzeTop10Traits(top10, vixBars);

  const humanLines = [
    `【VIX≥24 · 38勝 強度分析】${FORWARD_SIGNAL_START} ～ ${input.bundle.latestDate}`,
    `対象 VIX≥${VIX_THRESHOLD} 勝ち ${cohort.length}件（監査のみ）`,
    '',
    ...formatBucketSection('1. VIX分布', vixBuckets),
    '',
    ...formatBucketSection('2. ADX分布', adxBuckets),
    '',
    ...formatBucketSection('3. MACD分布', macdBuckets),
    '',
    '■ 4〜6. 利益率との相関',
    `VIX r=${vixReturnCorrelation ?? '—'} · ADX r=${adxReturnCorrelation ?? '—'} · MACD r=${macdReturnCorrelation ?? '—'}`,
    '',
    '■ 7. 上位10件 共通特徴',
    top10CommonTraitsJa,
    '',
    '■ 上位10件一覧',
    ...top10.map(
      (t) =>
        `${t.signalDate} ${t.symbol} R${t.returnPct}% VIX${t.vix} ADX${t.adx14} MACD${t.macdHistPct}%`,
    ),
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate: FORWARD_SIGNAL_START,
    toDate: input.bundle.latestDate,
    totalTrades: passed.tradeCount,
    cohortTradeCount: cohort.length,
    vixThreshold: VIX_THRESHOLD,
    vixBuckets,
    adxBuckets,
    macdBuckets,
    vixReturnCorrelation,
    adxReturnCorrelation,
    macdReturnCorrelation,
    top10CommonTraitsJa,
    top10Trades: top10,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export function formatVix24WinnerStrengthCsv(
  report: ForwardVix24WinnerStrengthAuditReport,
): string {
  const section = (name: string, rows: ForwardDistributionBucketRow[]) => [
    name,
    'bucket,tradeCount,avgReturnPct',
    ...rows.map((r) => [r.labelJa, r.tradeCount, r.avgReturnPct ?? ''].join(',')),
  ];
  const corr = [
    '',
    'metric,correlation',
    `VIX,${report.vixReturnCorrelation ?? ''}`,
    `ADX,${report.adxReturnCorrelation ?? ''}`,
    `MACD,${report.macdReturnCorrelation ?? ''}`,
  ];
  const top10 = [
    '',
    'rank,signalDate,symbol,returnPct,vix,adx14,macdHistPct',
    ...report.top10Trades.map((t, i) =>
      [i + 1, t.signalDate, t.symbol, t.returnPct, t.vix ?? '', t.adx14, t.macdHistPct].join(','),
    ),
  ];
  return [
    ...section('vix', report.vixBuckets),
    '',
    ...section('adx', report.adxBuckets),
    '',
    ...section('macd', report.macdBuckets),
    ...corr,
    ...top10,
  ].join('\n');
}
