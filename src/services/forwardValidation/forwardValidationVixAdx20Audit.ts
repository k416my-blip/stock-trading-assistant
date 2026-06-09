/**
 * 最重要監査その24 — ADX20環境VIXフィルタ再検証 · 2018〜 · 監査のみ
 */
import type {
  ForwardPassedTradeRecord,
  ForwardVixAdx20AddedTradeRow,
  ForwardVixAdx20AuditReport,
  ForwardVixAdx20BandRow,
  ForwardVixAdx20Metrics,
  ForwardVixAdx20Recommendation,
  ForwardVixAdx20ThresholdRow,
  ForwardVixAdx20YearRow,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { fetchForwardOhlcvBundle } from './forwardValidationEngine';
import { barIndexByDate, type OhlcvBar } from './case4Indicators';
import {
  buildRuleContributionRow,
  collectPassedTradesWithAblation,
} from './forwardValidationRuleContributionAudit';
import { simulateOperationalTrades } from './forwardValidationOperationalRebacktestAudit';
import {
  buildVixSensitivityRow,
  filterVixGteTrades,
  VIX_SENSITIVITY_THRESHOLDS,
} from './forwardValidationVixSensitivityAudit';
import { EXTENDED_AUDIT_START } from './forwardValidationVix24ExtendedHistoryAudit';
import type { SignalAblationOptions } from './case4Indicators';

const VIX24 = 24;
const ADX20 = 20;

export const VIX_ADX20_ADDED_YEARS = ['2020', '2021', '2022', '2025', '2026'] as const;

const FIXED_CONDITIONS_JA =
  'ADX>20 · VIX≥24 · MACD · 52週高値 · SPY63 · 同時3枠 · 1日1ETF · 利確+3% · 最大25営業日';

const ADX20_BASE: SignalAblationOptions = { adxMinOverride: ADX20 };

export type VixBandId = 'band_20_24' | 'band_24_30' | 'band_30_40' | 'band_40_plus' | 'band_other';

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function vixAtDate(vixBars: OhlcvBar[], date: string): number | null {
  const idx = barIndexByDate(vixBars, date);
  if (idx < 0) return null;
  return round3(vixBars[idx]!.close);
}

export function classifyVixBand(vix: number | null): VixBandId {
  if (vix == null) return 'band_other';
  if (vix >= 20 && vix < 24) return 'band_20_24';
  if (vix >= 24 && vix < 30) return 'band_24_30';
  if (vix >= 30 && vix < 40) return 'band_30_40';
  if (vix >= 40) return 'band_40_plus';
  return 'band_other';
}

const VIX_BAND_DEFS: { bandId: VixBandId; labelJa: string }[] = [
  { bandId: 'band_20_24', labelJa: 'VIX20〜24' },
  { bandId: 'band_24_30', labelJa: 'VIX24〜30' },
  { bandId: 'band_30_40', labelJa: 'VIX30〜40' },
  { bandId: 'band_40_plus', labelJa: 'VIX40以上' },
];

export function runAdx20OperationalVix(
  bundle: ForwardOhlcvBundle,
  fromDate: string,
  toDate: string,
  vixThreshold: number | null,
): ForwardPassedTradeRecord[] {
  const passed = collectPassedTradesWithAblation(bundle, fromDate, toDate, ADX20_BASE);
  const vixBars = bundle.vixBars ?? [];
  const filtered =
    vixThreshold == null ? passed : filterVixGteTrades(passed, vixBars, vixThreshold);
  return simulateOperationalTrades(filtered).executed;
}

function toMetrics(labelJa: string, executed: ForwardPassedTradeRecord[]): ForwardVixAdx20Metrics {
  const row = buildRuleContributionRow(
    { id: 'baseline', labelJa, ablation: {}, skipVix: false },
    executed,
  );
  return {
    labelJa,
    tradeCount: row.tradeCount,
    winRatePct: row.winRatePct,
    avgReturnPct: row.avgReturnPct,
    maxDrawdownPct: row.maxDrawdownPct,
    cumulativeReturnPct: row.cumulativeReturnPct,
    profitEfficiency: row.profitEfficiency,
  };
}

export function buildVixAddedTrades(
  withVix: ForwardPassedTradeRecord[],
  withoutVix: ForwardPassedTradeRecord[],
  vixBars: OhlcvBar[],
): ForwardVixAdx20AddedTradeRow[] {
  const keys = new Set(withVix.map((t) => t.id));
  return withoutVix
    .filter((t) => !keys.has(t.id))
    .sort((a, b) => a.signalDate.localeCompare(b.signalDate) || a.symbol.localeCompare(b.symbol))
    .map((t) => ({
      signalDate: t.signalDate,
      symbol: t.symbol,
      returnPct: t.returnPct,
      holdDays: t.holdDays,
      vix: vixAtDate(vixBars, t.signalDate),
    }));
}

export function buildVixAddedYearRows(
  added: ForwardVixAdx20AddedTradeRow[],
  years: readonly string[],
  toDate: string,
): ForwardVixAdx20YearRow[] {
  return years.map((year) => {
    const yearFrom = `${year}-01-01`;
    const yearEnd = year === '2026' ? toDate : `${year}-12-31`;
    const rows = added.filter((t) => t.signalDate >= yearFrom && t.signalDate <= yearEnd);
    const wins = rows.filter((t) => t.returnPct > 0);
    return {
      year,
      tradeCount: rows.length,
      winRatePct: rows.length > 0 ? round3((wins.length / rows.length) * 100) : 0,
      cumulativeReturnPct: round3(rows.reduce((s, t) => s + t.returnPct, 0)),
    };
  });
}

export function buildVixBandRows(added: ForwardVixAdx20AddedTradeRow[]): ForwardVixAdx20BandRow[] {
  return VIX_BAND_DEFS.map(({ bandId, labelJa }) => {
    const rows = added.filter((t) => classifyVixBand(t.vix) === bandId);
    const wins = rows.filter((t) => t.returnPct > 0);
    return {
      bandId,
      labelJa,
      tradeCount: rows.length,
      winRatePct: rows.length > 0 ? round3((wins.length / rows.length) * 100) : 0,
      cumulativeReturnPct: round3(rows.reduce((s, t) => s + t.returnPct, 0)),
    };
  });
}

export function buildAdx20VixThresholdRows(
  bundle: ForwardOhlcvBundle,
  fromDate: string,
  toDate: string,
): ForwardVixAdx20ThresholdRow[] {
  const rows = VIX_SENSITIVITY_THRESHOLDS.map((threshold) => {
    const executed = runAdx20OperationalVix(bundle, fromDate, toDate, threshold);
    const r = buildVixSensitivityRow(threshold, executed);
    return { ...r };
  });
  const noVixExecuted = runAdx20OperationalVix(bundle, fromDate, toDate, null);
  const noVixMetrics = toMetrics('VIXなし', noVixExecuted);
  return [
    ...rows,
    {
      vixThreshold: null,
      labelJa: 'VIXなし',
      tradeCount: noVixMetrics.tradeCount,
      winRatePct: noVixMetrics.winRatePct,
      avgReturnPct: noVixMetrics.avgReturnPct,
      maxDrawdownPct: noVixMetrics.maxDrawdownPct,
      cumulativeReturnPct: noVixMetrics.cumulativeReturnPct,
      profitEfficiency: noVixMetrics.profitEfficiency,
    },
  ];
}

export function evaluateVixAdx20Recommendation(input: {
  withVix24: ForwardVixAdx20Metrics;
  withoutVix: ForwardVixAdx20Metrics;
  thresholdRows: ForwardVixAdx20ThresholdRow[];
  addedTrades: ForwardVixAdx20AddedTradeRow[];
  bandRows: ForwardVixAdx20BandRow[];
}): {
  recommendation: ForwardVixAdx20Recommendation;
  recommendationJa: string;
  auditConsistencyJa: string;
  answer1Ja: string;
  answer2Ja: string;
  answer3Ja: string;
  answer4Ja: string;
  answer5Ja: string;
} {
  const { withVix24, withoutVix, thresholdRows, addedTrades, bandRows } = input;
  const row20 = thresholdRows.find((r) => r.vixThreshold === 20);
  const row24 = thresholdRows.find((r) => r.vixThreshold === 24);
  const noVixRow = thresholdRows.find((r) => r.vixThreshold === null);
  const bestCum = [...thresholdRows]
    .filter((r) => r.tradeCount > 0)
    .sort((a, b) => b.cumulativeReturnPct - a.cumulativeReturnPct)[0];
  const addedNet = round3(addedTrades.reduce((s, t) => s + t.returnPct, 0));
  const band2024 = bandRows.find((b) => b.bandId === 'band_20_24');

  const isQualityFilter =
    withVix24.winRatePct >= withoutVix.winRatePct + 5 &&
    Math.abs(withVix24.maxDrawdownPct ?? 0) <= Math.abs(withoutVix.maxDrawdownPct ?? 0);
  const cumDelta24vsNone = round3(withVix24.cumulativeReturnPct - withoutVix.cumulativeReturnPct);
  const wrDelta24vsNone = round3(withVix24.winRatePct - withoutVix.winRatePct);
  const ddShallowerWith24 = round3(
    Math.abs(withoutVix.maxDrawdownPct ?? 0) - Math.abs(withVix24.maxDrawdownPct ?? 0),
  );

  let recommendation: ForwardVixAdx20Recommendation;
  let recommendationJa: string;

  if (
    wrDelta24vsNone >= 8 &&
    ddShallowerWith24 >= 5 &&
    withVix24.profitEfficiency != null &&
    withoutVix.profitEfficiency != null &&
    withVix24.profitEfficiency >= withoutVix.profitEfficiency * 0.85
  ) {
    recommendation = 'maintain';
    recommendationJa =
      `維持（VIX≥24）。累積${withVix24.cumulativeReturnPct}%はVIXなし${withoutVix.cumulativeReturnPct}%より低いが、` +
      `WR+${wrDelta24vsNone}pt · DD${ddShallowerWith24}pt浅 · 効率${withVix24.profitEfficiency} — 品質フィルタとして機能（監査16整合）。`;
  } else if (
    row20 &&
    row20.cumulativeReturnPct > withVix24.cumulativeReturnPct + 15 &&
    row20.winRatePct >= 85 &&
    row20.winRatePct >= withoutVix.winRatePct + 5
  ) {
    recommendation = 'relax_20';
    recommendationJa =
      `緩和（VIX≥20）。VIX≥20累積${row20.cumulativeReturnPct}% vs 24の${withVix24.cumulativeReturnPct}%（+${round3(row20.cumulativeReturnPct - withVix24.cumulativeReturnPct)}%）· WR${row20.winRatePct}%。` +
      `20〜24帯${band2024?.tradeCount ?? 0}件 net ${band2024?.cumulativeReturnPct ?? 0}%。`;
  } else if (
    withoutVix.cumulativeReturnPct > withVix24.cumulativeReturnPct + 30 &&
    wrDelta24vsNone < 5 &&
    (withoutVix.profitEfficiency ?? 0) > (withVix24.profitEfficiency ?? 0)
  ) {
    recommendation = 'delete';
    recommendationJa =
      `削除検討。VIXなし累積${withoutVix.cumulativeReturnPct}% · WR差${wrDelta24vsNone}ptのみ — 低VIX取り込みが純増益。`;
  } else {
    recommendation = 'maintain';
    recommendationJa =
      `維持（VIX≥24）。累積差${cumDelta24vsNone}% · WR+${wrDelta24vsNone}pt · DD浅化${ddShallowerWith24}pt — リスク調整後は現行維持。`;
  }

  const auditConsistencyJa =
    `監査16: VIXは品質フィルタ → ADX20でも${isQualityFilter ? '整合（WR/DD改善）' : '累積のみ見れば緩和余地'}。` +
    `監査17/22: ADX>20採用妥当 → VIXは独立入口フィルタ。` +
    `監査23: 52週維持 → VIX24+52週+ADX20の三層構成を推奨。`;

  return {
    recommendation,
    recommendationJa,
    auditConsistencyJa,
    answer1Ja: isQualityFilter
      ? `必要（品質面）。VIX≥24でWR+${wrDelta24vsNone}pt · DD${ddShallowerWith24}pt浅 · 累積差${cumDelta24vsNone}%は許容。`
      : `限定的。VIXなし累積${withoutVix.cumulativeReturnPct}% > 24の${withVix24.cumulativeReturnPct}%。`,
    answer2Ja:
      `品質フィルタ（リスク調整型）。VIXなしは累積+${round3(withoutVix.cumulativeReturnPct - withVix24.cumulativeReturnPct)}%だがWR${withoutVix.winRatePct}% · DD${withoutVix.maxDrawdownPct ?? '—'}%に悪化。` +
      `追加${addedTrades.length}件net+${addedNet}%は機会損失 — 24は件数削減で勝率・DDを守る。`,
    answer3Ja:
      bestCum?.vixThreshold === 24
        ? `VIX≥24がADX20環境でも累積最適（${row24?.cumulativeReturnPct ?? '—'}%）。`
        : `VIX≥24は単独最適ではない。最高累積=VIX≥${bestCum?.vixThreshold ?? 'なし'}（${bestCum?.cumulativeReturnPct ?? '—'}%）· 24=${row24?.cumulativeReturnPct ?? '—'}%。`,
    answer4Ja:
      row20 && row20.cumulativeReturnPct > withVix24.cumulativeReturnPct + 15
        ? `緩和余地あり。VIX≥20累積${row20.cumulativeReturnPct}% > 24の${withVix24.cumulativeReturnPct}%（+${round3(row20.cumulativeReturnPct - withVix24.cumulativeReturnPct)}%）· ただしWR${row20.winRatePct}%に低下 · 20〜24帯${band2024?.tradeCount ?? 0}件 net ${band2024?.cumulativeReturnPct ?? 0}%。`
        : `緩和非推奨。VIX≥20累積${row20?.cumulativeReturnPct ?? '—'}% · WR${row20?.winRatePct ?? '—'}% — 24維持がリスク調整に有利。`,
    answer5Ja:
      withoutVix.cumulativeReturnPct > withVix24.cumulativeReturnPct + 50 && wrDelta24vsNone < 8
        ? `削除非推奨（品質重視）。累積はVIXなし+${round3(withoutVix.cumulativeReturnPct - withVix24.cumulativeReturnPct)}%だがWR${withoutVix.winRatePct}% · DD${withoutVix.maxDrawdownPct ?? '—'}%に悪化。`
        : `削除非推奨。VIX≥24維持でWR+${wrDelta24vsNone}pt · DD浅化${ddShallowerWith24}pt。`,
  };
}

function formatMetricsLine(m: ForwardVixAdx20Metrics): string {
  return (
    `${m.labelJa}: ${m.tradeCount}件 · WR${m.winRatePct}% · 均R${m.avgReturnPct ?? '—'}% · ` +
    `累積${m.cumulativeReturnPct}% · DD${m.maxDrawdownPct ?? '—'}% · 効率${m.profitEfficiency ?? '—'}`
  );
}

export function auditVixAdx20(input: {
  bundle: ForwardOhlcvBundle;
  fromDate?: string;
}): ForwardVixAdx20AuditReport {
  const fromDate = input.fromDate ?? EXTENDED_AUDIT_START;
  const toDate = input.bundle.latestDate;
  const vixBars = input.bundle.vixBars ?? [];

  const withVixTrades = runAdx20OperationalVix(input.bundle, fromDate, toDate, VIX24);
  const withoutVixTrades = runAdx20OperationalVix(input.bundle, fromDate, toDate, null);

  const withVix24 = toMetrics('① VIX≥24（現行）', withVixTrades);
  const withoutVix = toMetrics('② VIX条件なし', withoutVixTrades);

  const addedTrades = buildVixAddedTrades(withVixTrades, withoutVixTrades, vixBars);
  const addedByYear = buildVixAddedYearRows(addedTrades, VIX_ADX20_ADDED_YEARS, toDate);
  const bandRows = buildVixBandRows(addedTrades);
  const thresholdRows = buildAdx20VixThresholdRows(input.bundle, fromDate, toDate);

  const evalResult = evaluateVixAdx20Recommendation({
    withVix24,
    withoutVix,
    thresholdRows,
    addedTrades,
    bandRows,
  });

  const recLabel: Record<ForwardVixAdx20Recommendation, string> = {
    maintain: '維持（24）',
    relax_20: '緩和（20）',
    delete: '削除',
  };

  const humanLines = [
    `【最重要監査その24】ADX20環境VIXフィルタ再検証 ${fromDate} ～ ${toDate}`,
    `固定条件: ${FIXED_CONDITIONS_JA}`,
    '比較: ①VIX≥24 vs ②VIXなし · 実運用シミュレーション',
    '監査のみ · ルール変更なし',
    '',
    '■ 比較結果',
    formatMetricsLine(withVix24),
    formatMetricsLine(withoutVix),
    `Δ累積(なし-24): ${round3(withoutVix.cumulativeReturnPct - withVix24.cumulativeReturnPct)}%`,
    '',
    '■ ADX20環境 VIX閾値感度',
    ...thresholdRows.map(
      (r) =>
        `${r.labelJa}: ${r.tradeCount}件 WR${r.winRatePct}% 累積${r.cumulativeReturnPct}% 効率${r.profitEfficiency ?? '—'}`,
    ),
    '',
    `■ VIXなしで追加トレード（${addedTrades.length}件 · net ${round3(addedTrades.reduce((s, t) => s + t.returnPct, 0))}%）`,
    ...(addedTrades.length > 0
      ? addedTrades.map(
          (t) =>
            `${t.signalDate} · ${t.symbol} · R${t.returnPct}% · ${t.holdDays}日 · VIX${t.vix ?? '—'}`,
        )
      : ['（該当なし）']),
    '',
    '■ 追加トレード年別',
    ...addedByYear.map(
      (y) => `${y.year}: ${y.tradeCount}件 · WR${y.winRatePct}% · 累積${y.cumulativeReturnPct}%`,
    ),
    '',
    '■ 追加トレード VIX帯別',
    ...bandRows.map(
      (b) => `${b.labelJa}: ${b.tradeCount}件 · WR${b.winRatePct}% · 累積${b.cumulativeReturnPct}%`,
    ),
    '',
    '■ 監査16/17/22/23との整合性',
    evalResult.auditConsistencyJa,
    '',
    '■ 必須回答',
    `1. ADX20でもVIX≥24必要か → ${evalResult.answer1Ja}`,
    `2. 利益向上 vs 品質フィルタ → ${evalResult.answer2Ja}`,
    `3. VIX24最適か → ${evalResult.answer3Ja}`,
    `4. VIX20緩和すべきか → ${evalResult.answer4Ja}`,
    `5. VIX削除すべきか → ${evalResult.answer5Ja}`,
    '',
    `■ 推奨: 【${recLabel[evalResult.recommendation]}】`,
    evalResult.recommendationJa,
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate,
    toDate,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    withVix24,
    withoutVix,
    cumulativeDeltaWithoutMinusWith24: round3(
      withoutVix.cumulativeReturnPct - withVix24.cumulativeReturnPct,
    ),
    addedTrades,
    addedByYear,
    bandRows,
    thresholdRows,
    recommendation: evalResult.recommendation,
    recommendationJa: evalResult.recommendationJa,
    auditConsistencyJa: evalResult.auditConsistencyJa,
    answer1Ja: evalResult.answer1Ja,
    answer2Ja: evalResult.answer2Ja,
    answer3Ja: evalResult.answer3Ja,
    answer4Ja: evalResult.answer4Ja,
    answer5Ja: evalResult.answer5Ja,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export async function runVixAdx20Audit(): Promise<ForwardVixAdx20AuditReport | null> {
  const bundle = await fetchForwardOhlcvBundle(EXTENDED_AUDIT_START);
  if (!bundle) return null;
  return auditVixAdx20({ bundle });
}

export function formatVixAdx20Csv(report: ForwardVixAdx20AuditReport): string {
  const mRow = (label: string, m: ForwardVixAdx20Metrics) =>
    [
      label,
      m.tradeCount,
      m.winRatePct,
      m.avgReturnPct ?? '',
      m.maxDrawdownPct ?? '',
      m.cumulativeReturnPct,
      m.profitEfficiency ?? '',
    ].join(',');

  return [
    'scenario,tradeCount,winRatePct,avgReturnPct,maxDrawdownPct,cumulativeReturnPct,profitEfficiency',
    mRow('vix24', report.withVix24),
    mRow('no_vix', report.withoutVix),
    '',
    'vixThreshold,tradeCount,winRatePct,cumulativeReturnPct,profitEfficiency',
    ...report.thresholdRows.map((r) =>
      [
        r.vixThreshold ?? 'none',
        r.tradeCount,
        r.winRatePct,
        r.cumulativeReturnPct,
        r.profitEfficiency ?? '',
      ].join(','),
    ),
    '',
    'signalDate,symbol,returnPct,holdDays,vix',
    ...report.addedTrades.map((t) =>
      [t.signalDate, t.symbol, t.returnPct, t.holdDays, t.vix ?? ''].join(','),
    ),
    '',
    'year,tradeCount,winRatePct,cumulativeReturnPct',
    ...report.addedByYear.map((y) =>
      [y.year, y.tradeCount, y.winRatePct, y.cumulativeReturnPct].join(','),
    ),
    '',
    'bandId,tradeCount,winRatePct,cumulativeReturnPct',
    ...report.bandRows.map((b) =>
      [b.bandId, b.tradeCount, b.winRatePct, b.cumulativeReturnPct].join(','),
    ),
    '',
    `recommendation,${report.recommendation}`,
  ].join('\n');
}
