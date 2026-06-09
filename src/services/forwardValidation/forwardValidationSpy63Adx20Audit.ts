/**
 * 最重要監査その25 — ADX20環境SPY63フィルタ再検証 · 2018〜 · 監査のみ
 */
import type {
  ForwardPassedTradeRecord,
  ForwardSpy63Adx20AddedTradeRow,
  ForwardSpy63Adx20AuditReport,
  ForwardSpy63Adx20FinalRuleRow,
  ForwardSpy63Adx20Metrics,
  ForwardSpy63Adx20Recommendation,
  ForwardSpy63Adx20RegimeRow,
  ForwardSpy63Adx20YearRow,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { fetchForwardOhlcvBundle } from './forwardValidationEngine';
import {
  buildRuleContributionRow,
  collectPassedTradesWithAblation,
} from './forwardValidationRuleContributionAudit';
import { simulateOperationalTrades } from './forwardValidationOperationalRebacktestAudit';
import { filterVixGteTrades } from './forwardValidationVixSensitivityAudit';
import { EXTENDED_AUDIT_START } from './forwardValidationVix24ExtendedHistoryAudit';
import type { SignalAblationOptions } from './case4Indicators';

const VIX24 = 24;
const ADX20 = 20;

export const SPY63_ADX20_ADDED_YEARS = ['2020', '2021', '2022', '2025', '2026'] as const;

const FIXED_CONDITIONS_JA =
  'ADX>20 · VIX≥24 · MACD · 52週高値 · SPY63 · 同時3枠 · 1日1ETF · 利確+3% · 最大25営業日';

const ADX20_BASE: SignalAblationOptions = { adxMinOverride: ADX20 };

export type SpyRegimeGroup = 'up' | 'sideways' | 'down' | 'unknown';

const SPY_REGIME_DEFS: { regime: SpyRegimeGroup; labelJa: string }[] = [
  { regime: 'up', labelJa: 'SPY up' },
  { regime: 'sideways', labelJa: 'SPY sideways' },
  { regime: 'down', labelJa: 'SPY down' },
];

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function normalizeSpyRegime(spyRegime: string): SpyRegimeGroup {
  if (spyRegime === 'up' || spyRegime === 'sideways' || spyRegime === 'down') return spyRegime;
  return 'unknown';
}

export function runAdx20OperationalSpy63(
  bundle: ForwardOhlcvBundle,
  fromDate: string,
  toDate: string,
  skipSpyRegime: boolean,
): ForwardPassedTradeRecord[] {
  const ablation: SignalAblationOptions = skipSpyRegime
    ? { ...ADX20_BASE, skipSpyRegime: true }
    : ADX20_BASE;
  const passed = collectPassedTradesWithAblation(bundle, fromDate, toDate, ablation);
  const vixBars = bundle.vixBars ?? [];
  const filtered = filterVixGteTrades(passed, vixBars, VIX24);
  return simulateOperationalTrades(filtered).executed;
}

function toMetrics(labelJa: string, executed: ForwardPassedTradeRecord[]): ForwardSpy63Adx20Metrics {
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

export function buildSpy63AddedTrades(
  withSpy63: ForwardPassedTradeRecord[],
  withoutSpy63: ForwardPassedTradeRecord[],
): ForwardSpy63Adx20AddedTradeRow[] {
  const keys = new Set(withSpy63.map((t) => t.id));
  return withoutSpy63
    .filter((t) => !keys.has(t.id))
    .sort((a, b) => a.signalDate.localeCompare(b.signalDate) || a.symbol.localeCompare(b.symbol))
    .map((t) => ({
      signalDate: t.signalDate,
      symbol: t.symbol,
      returnPct: t.returnPct,
      holdDays: t.holdDays,
      spyRegime: t.spyRegime,
    }));
}

export function buildSpy63AddedYearRows(
  added: ForwardSpy63Adx20AddedTradeRow[],
  years: readonly string[],
  toDate: string,
): ForwardSpy63Adx20YearRow[] {
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

export function buildSpy63RegimeRows(added: ForwardSpy63Adx20AddedTradeRow[]): ForwardSpy63Adx20RegimeRow[] {
  return SPY_REGIME_DEFS.map(({ regime, labelJa }) => {
    const rows = added.filter((t) => normalizeSpyRegime(t.spyRegime) === regime);
    const wins = rows.filter((t) => t.returnPct > 0);
    return {
      regime,
      labelJa,
      tradeCount: rows.length,
      winRatePct: rows.length > 0 ? round3((wins.length / rows.length) * 100) : 0,
      cumulativeReturnPct: round3(rows.reduce((s, t) => s + t.returnPct, 0)),
    };
  });
}

export function buildFinalRuleRecommendations(
  spy63Recommendation: ForwardSpy63Adx20Recommendation,
): ForwardSpy63Adx20FinalRuleRow[] {
  return [
    {
      ruleId: 'adx',
      labelJa: 'ADX',
      currentSettingJa: 'ADX>25（現行）',
      recommendedSettingJa: 'ADX>20',
      recommendationJa: '採用（監査22 WF検証）',
      auditRef: '監査22',
    },
    {
      ruleId: 'vix',
      labelJa: 'VIX',
      currentSettingJa: 'VIX≥24',
      recommendedSettingJa: 'VIX≥24 維持',
      recommendationJa: '維持（品質フィルタ · 監査24）',
      auditRef: '監査24',
    },
    {
      ruleId: 'dist52',
      labelJa: '52週高値',
      currentSettingJa: 'あり（現行）',
      recommendedSettingJa: '維持',
      recommendationJa: '維持（品質フィルタ · 監査23）',
      auditRef: '監査23',
    },
    {
      ruleId: 'spy63',
      labelJa: 'SPY63',
      currentSettingJa: 'あり（現行）',
      recommendedSettingJa:
        spy63Recommendation === 'maintain'
          ? '維持'
          : spy63Recommendation === 'relax'
            ? '緩和検討'
            : '削除検討',
      recommendationJa:
        spy63Recommendation === 'maintain'
          ? '維持（監査25）'
          : spy63Recommendation === 'relax'
            ? '緩和（監査25）'
            : '削除（監査25）',
      auditRef: '監査25',
    },
  ];
}

export function evaluateSpy63Adx20Recommendation(input: {
  withSpy63: ForwardSpy63Adx20Metrics;
  withoutSpy63: ForwardSpy63Adx20Metrics;
  addedTrades: ForwardSpy63Adx20AddedTradeRow[];
  addedByYear: ForwardSpy63Adx20YearRow[];
  regimeRows: ForwardSpy63Adx20RegimeRow[];
  withSpy63Trades: ForwardPassedTradeRecord[];
  withoutSpy63Trades: ForwardPassedTradeRecord[];
  toDate: string;
}): {
  recommendation: ForwardSpy63Adx20Recommendation;
  recommendationJa: string;
  auditConsistencyJa: string;
  answer1Ja: string;
  answer2Ja: string;
  answer3Ja: string;
  answer4Ja: string;
  answer5Ja: string;
} {
  const {
    withSpy63,
    withoutSpy63,
    addedTrades,
    addedByYear,
    regimeRows,
    withSpy63Trades,
    withoutSpy63Trades,
    toDate,
  } = input;

  const addedNet = round3(addedTrades.reduce((s, t) => s + t.returnPct, 0));
  const cumDelta = round3(withoutSpy63.cumulativeReturnPct - withSpy63.cumulativeReturnPct);
  const wrDelta = round3(withSpy63.winRatePct - withoutSpy63.winRatePct);
  const ddShallowerWith = round3(
    Math.abs(withoutSpy63.maxDrawdownPct ?? 0) - Math.abs(withSpy63.maxDrawdownPct ?? 0),
  );

  const y2022Added = addedByYear.find((y) => y.year === '2022');
  const y2022With = buildSpy63AddedYearRows(
    withSpy63Trades.map((t) => ({
      signalDate: t.signalDate,
      symbol: t.symbol,
      returnPct: t.returnPct,
      holdDays: t.holdDays,
      spyRegime: t.spyRegime,
    })),
    ['2022'],
    toDate,
  )[0]!;
  const y2022Without = buildSpy63AddedYearRows(
    withoutSpy63Trades.map((t) => ({
      signalDate: t.signalDate,
      symbol: t.symbol,
      returnPct: t.returnPct,
      holdDays: t.holdDays,
      spyRegime: t.spyRegime,
    })),
    ['2022'],
    toDate,
  )[0]!;

  const isQualityFilter = wrDelta >= 3 && ddShallowerWith >= 0;
  const addedWinRate =
    addedTrades.length > 0
      ? round3((addedTrades.filter((t) => t.returnPct > 0).length / addedTrades.length) * 100)
      : 0;
  const addedGenuine = addedNet > 0 && addedWinRate >= 70;

  let recommendation: ForwardSpy63Adx20Recommendation;
  let recommendationJa: string;

  if (
    wrDelta >= 5 &&
    ddShallowerWith >= 3 &&
    withSpy63.cumulativeReturnPct >= withoutSpy63.cumulativeReturnPct * 0.75
  ) {
    recommendation = 'maintain';
    recommendationJa =
      `維持（SPY63あり）。WR+${wrDelta}pt · DD${ddShallowerWith}pt浅 · 累積${withSpy63.cumulativeReturnPct}% vs なし${withoutSpy63.cumulativeReturnPct}%。` +
      `追加${addedTrades.length}件net${addedNet}% — 品質フィルタとして機能。`;
  } else if (
    withoutSpy63.cumulativeReturnPct > withSpy63.cumulativeReturnPct + 20 &&
    addedNet > 10 &&
    wrDelta < 8
  ) {
    recommendation = 'delete';
    recommendationJa =
      `削除検討。SPY63なし累積+${cumDelta}% · 追加net+${addedNet}% · WR差${wrDelta}ptのみ。`;
  } else if (
    withoutSpy63.cumulativeReturnPct > withSpy63.cumulativeReturnPct + 5 &&
    addedNet > 0
  ) {
    recommendation = 'relax';
    recommendationJa =
      `緩和検討。SPY63なしで累積+${cumDelta}% · 追加${addedTrades.length}件net+${addedNet}% · ただしWR${wrDelta}pt/DD${ddShallowerWith}ptのトレードオフ。`;
  } else {
    recommendation = 'maintain';
    recommendationJa =
      `維持（SPY63あり）。累積差${cumDelta}% · WR+${wrDelta}pt · リスク調整後は現行維持。`;
  }

  const auditConsistencyJa =
    `監査22: ADX>20採用 → SPY63は独立レジームフィルタとして整合。` +
    `監査23: 52週維持 → SPY63+52週の二層品質フィルタ。` +
    `監査24: VIX24維持 → 三層（VIX+52週+SPY63）品質構成と同方向。`;

  const downRegime = regimeRows.find((r) => r.regime === 'down');
  const ddWorsened2022 =
    y2022Without.cumulativeReturnPct < y2022With.cumulativeReturnPct - 5 ||
    (y2022Added?.cumulativeReturnPct ?? 0) < -5;

  return {
    recommendation,
    recommendationJa,
    auditConsistencyJa,
    answer1Ja: isQualityFilter
      ? `必要（品質面）。SPY63あり WR+${wrDelta}pt · DD${ddShallowerWith}pt浅 · 累積差${cumDelta}%は許容。`
      : `限定的。SPY63なし累積${withoutSpy63.cumulativeReturnPct}% > あり${withSpy63.cumulativeReturnPct}%。`,
    answer2Ja:
      cumDelta > 5 && wrDelta < 5
        ? `利益向上寄り。SPY63なしで累積+${cumDelta}% · 追加net+${addedNet}%。`
        : `品質フィルタ。WR/DD改善 · 追加${addedTrades.length}件net${addedNet}%（機会損失${addedNet > 0 ? '+' : ''}${addedNet}%）。`,
    answer3Ja: addedGenuine
      ? `本物の可能性。追加${addedTrades.length}件net+${addedNet}% · 勝率${addedWinRate}%。`
      : `限定的/混合。追加net${addedNet}% · up${regimeRows.find((r) => r.regime === 'up')?.cumulativeReturnPct ?? 0}% / down${downRegime?.cumulativeReturnPct ?? 0}%。`,
    answer4Ja: ddWorsened2022
      ? `寄与あり。2022: SPY63あり累積${y2022With.cumulativeReturnPct}% vs なし${y2022Without.cumulativeReturnPct}% · 追加${y2022Added?.tradeCount ?? 0}件net${y2022Added?.cumulativeReturnPct ?? 0}%。全体DD ${withSpy63.maxDrawdownPct ?? '—'}% vs ${withoutSpy63.maxDrawdownPct ?? '—'}%。`
      : `限定的。2022追加${y2022Added?.tradeCount ?? 0}件net${y2022Added?.cumulativeReturnPct ?? 0}% · 全体DD差${ddShallowerWith}pt。`,
    answer5Ja:
      recommendation === 'maintain'
        ? `維持。SPY63はADX20環境でも品質フィルタとして有効（監査23/24と同方向）。`
        : recommendation === 'relax'
          ? `緩和。累積+${cumDelta}%の機会とWR/DDトレードオフ。`
          : `削除検討。SPY63なしが累積・追加netで優位。`,
  };
}

function formatMetricsLine(m: ForwardSpy63Adx20Metrics): string {
  return (
    `${m.labelJa}: ${m.tradeCount}件 · WR${m.winRatePct}% · 均R${m.avgReturnPct ?? '—'}% · ` +
    `累積${m.cumulativeReturnPct}% · DD${m.maxDrawdownPct ?? '—'}% · 効率${m.profitEfficiency ?? '—'}`
  );
}

export function auditSpy63Adx20(input: {
  bundle: ForwardOhlcvBundle;
  fromDate?: string;
}): ForwardSpy63Adx20AuditReport {
  const fromDate = input.fromDate ?? EXTENDED_AUDIT_START;
  const toDate = input.bundle.latestDate;

  const withSpy63Trades = runAdx20OperationalSpy63(input.bundle, fromDate, toDate, false);
  const withoutSpy63Trades = runAdx20OperationalSpy63(input.bundle, fromDate, toDate, true);

  const withSpy63 = toMetrics('① SPY63あり（現行）', withSpy63Trades);
  const withoutSpy63 = toMetrics('② SPY63なし', withoutSpy63Trades);

  const addedTrades = buildSpy63AddedTrades(withSpy63Trades, withoutSpy63Trades);
  const addedByYear = buildSpy63AddedYearRows(addedTrades, SPY63_ADX20_ADDED_YEARS, toDate);
  const regimeRows = buildSpy63RegimeRows(addedTrades);

  const evalResult = evaluateSpy63Adx20Recommendation({
    withSpy63,
    withoutSpy63,
    addedTrades,
    addedByYear,
    regimeRows,
    withSpy63Trades,
    withoutSpy63Trades,
    toDate,
  });

  const finalRuleRecommendations = buildFinalRuleRecommendations(evalResult.recommendation);

  const recLabel: Record<ForwardSpy63Adx20Recommendation, string> = {
    maintain: '維持',
    relax: '緩和',
    delete: '削除',
  };

  const humanLines = [
    `【最重要監査その25】ADX20環境SPY63再検証 ${fromDate} ～ ${toDate}`,
    `固定条件: ${FIXED_CONDITIONS_JA}`,
    '比較: ①SPY63あり vs ②SPY63なし · 実運用シミュレーション',
    '監査のみ · ルール変更なし',
    '',
    '■ 比較結果',
    formatMetricsLine(withSpy63),
    formatMetricsLine(withoutSpy63),
    `Δ累積(なし-あり): ${round3(withoutSpy63.cumulativeReturnPct - withSpy63.cumulativeReturnPct)}%`,
    '',
    `■ SPY63なしで追加トレード（${addedTrades.length}件 · net ${round3(addedTrades.reduce((s, t) => s + t.returnPct, 0))}%）`,
    ...(addedTrades.length > 0
      ? addedTrades.map(
          (t) =>
            `${t.signalDate} · ${t.symbol} · R${t.returnPct}% · ${t.holdDays}日 · SPY ${t.spyRegime}`,
        )
      : ['（該当なし）']),
    '',
    '■ 追加トレード年別',
    ...addedByYear.map(
      (y) => `${y.year}: ${y.tradeCount}件 · WR${y.winRatePct}% · 累積${y.cumulativeReturnPct}%`,
    ),
    '',
    '■ 追加トレード SPY局面別',
    ...regimeRows.map(
      (r) => `${r.labelJa}: ${r.tradeCount}件 · WR${r.winRatePct}% · 累積${r.cumulativeReturnPct}%`,
    ),
    '',
    '■ 監査22/23/24との整合性',
    evalResult.auditConsistencyJa,
    '',
    '■ 必須回答',
    `1. ADX20でもSPY63必要か → ${evalResult.answer1Ja}`,
    `2. 利益向上 vs 品質フィルタ → ${evalResult.answer2Ja}`,
    `3. 削除で増える利益は本物か → ${evalResult.answer3Ja}`,
    `4. 2022 DD悪化に寄与か → ${evalResult.answer4Ja}`,
    `5. 推奨 → ${evalResult.answer5Ja}`,
    '',
    `■ 推奨: 【${recLabel[evalResult.recommendation]}】`,
    evalResult.recommendationJa,
    '',
    '■ 最終推奨ルール一覧',
    ...finalRuleRecommendations.map(
      (r) =>
        `${r.labelJa}: 現行=${r.currentSettingJa} → 推奨=${r.recommendedSettingJa}（${r.recommendationJa} · ${r.auditRef}）`,
    ),
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate,
    toDate,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    withSpy63,
    withoutSpy63,
    cumulativeDeltaWithoutMinusWith: round3(
      withoutSpy63.cumulativeReturnPct - withSpy63.cumulativeReturnPct,
    ),
    addedTrades,
    addedByYear,
    regimeRows,
    finalRuleRecommendations,
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

export async function runSpy63Adx20Audit(): Promise<ForwardSpy63Adx20AuditReport | null> {
  const bundle = await fetchForwardOhlcvBundle(EXTENDED_AUDIT_START);
  if (!bundle) return null;
  return auditSpy63Adx20({ bundle });
}

export function formatSpy63Adx20Csv(report: ForwardSpy63Adx20AuditReport): string {
  const mRow = (label: string, m: ForwardSpy63Adx20Metrics) =>
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
    mRow('with_spy63', report.withSpy63),
    mRow('without_spy63', report.withoutSpy63),
    '',
    'signalDate,symbol,returnPct,holdDays,spyRegime',
    ...report.addedTrades.map((t) =>
      [t.signalDate, t.symbol, t.returnPct, t.holdDays, t.spyRegime].join(','),
    ),
    '',
    'year,tradeCount,winRatePct,cumulativeReturnPct',
    ...report.addedByYear.map((y) =>
      [y.year, y.tradeCount, y.winRatePct, y.cumulativeReturnPct].join(','),
    ),
    '',
    'regime,tradeCount,winRatePct,cumulativeReturnPct',
    ...report.regimeRows.map((r) =>
      [r.regime, r.tradeCount, r.winRatePct, r.cumulativeReturnPct].join(','),
    ),
    '',
    'ruleId,current,recommended,note',
    ...report.finalRuleRecommendations.map((r) =>
      [r.ruleId, r.currentSettingJa, r.recommendedSettingJa, r.recommendationJa].join(','),
    ),
    '',
    `recommendation,${report.recommendation}`,
  ].join('\n');
}
