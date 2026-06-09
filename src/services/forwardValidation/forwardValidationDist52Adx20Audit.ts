/**
 * 最重要監査その23 — ADX20環境52週高値条件再検証 · 2018〜 · 監査のみ
 */
import type {
  ForwardDist52Adx20AblationRankRow,
  ForwardDist52Adx20AddedTradeRow,
  ForwardDist52Adx20AuditReport,
  ForwardDist52Adx20Metrics,
  ForwardDist52Adx20Recommendation,
  ForwardDist52Adx20YearRow,
  ForwardPassedTradeRecord,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { fetchForwardOhlcvBundle } from './forwardValidationEngine';
import { portfolioMaxDrawdownPct } from './forwardValidationOperationalAllocationAudit';
import {
  buildRuleContributionDegradation,
  buildRuleContributionRow,
  collectPassedTradesWithAblation,
} from './forwardValidationRuleContributionAudit';
import { simulateOperationalTrades } from './forwardValidationOperationalRebacktestAudit';
import { filterVixGteTrades } from './forwardValidationVixSensitivityAudit';
import { EXTENDED_AUDIT_START } from './forwardValidationVix24ExtendedHistoryAudit';
import type { SignalAblationOptions } from './case4Indicators';

const VIX_THRESHOLD = 24;
const ADX20 = 20;

export const DIST52_ADX20_ADDED_YEARS = ['2020', '2022', '2025', '2026'] as const;

const FIXED_CONDITIONS_JA =
  'ADX>20 · VIX≥24 · MACD · SPY63 · 同時3枠 · 1日1ETF · 利確+3% · 最大25営業日';

const ADX20_BASE: SignalAblationOptions = { adxMinOverride: ADX20 };

const ABLATION_RULES: { ruleId: string; labelJa: string; ablation: SignalAblationOptions }[] = [
  { ruleId: 'macd', labelJa: 'MACD除外', ablation: { skipMacd: true } },
  { ruleId: 'dist52', labelJa: '52週高値除外', ablation: { skipDist52: true } },
  { ruleId: 'spy63', labelJa: 'SPY63除外', ablation: { skipSpyRegime: true } },
];

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function mean(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return round3(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function exitOrderedReturns(trades: ForwardPassedTradeRecord[]): number[] {
  return [...trades]
    .sort(
      (a, b) =>
        a.exitDate.localeCompare(b.exitDate) ||
        a.entryDate.localeCompare(b.entryDate) ||
        a.symbol.localeCompare(b.symbol),
    )
    .map((t) => t.returnPct);
}

export function runAdx20Operational(
  bundle: ForwardOhlcvBundle,
  fromDate: string,
  toDate: string,
  extraAblation: SignalAblationOptions = {},
): ForwardPassedTradeRecord[] {
  const passed = collectPassedTradesWithAblation(bundle, fromDate, toDate, {
    ...ADX20_BASE,
    ...extraAblation,
  });
  const vixBars = bundle.vixBars ?? [];
  const filtered = filterVixGteTrades(passed, vixBars, VIX_THRESHOLD);
  return simulateOperationalTrades(filtered).executed;
}

function toMetrics(labelJa: string, executed: ForwardPassedTradeRecord[]): ForwardDist52Adx20Metrics {
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

export function buildAddedTrades(
  with52w: ForwardPassedTradeRecord[],
  without52w: ForwardPassedTradeRecord[],
): ForwardDist52Adx20AddedTradeRow[] {
  const keys = new Set(with52w.map((t) => t.id));
  return without52w
    .filter((t) => !keys.has(t.id))
    .sort((a, b) => a.signalDate.localeCompare(b.signalDate) || a.symbol.localeCompare(b.symbol))
    .map((t) => ({
      signalDate: t.signalDate,
      symbol: t.symbol,
      returnPct: t.returnPct,
      holdDays: t.holdDays,
    }));
}

export function buildAddedYearRows(
  added: ForwardDist52Adx20AddedTradeRow[],
  years: readonly string[],
  toDate: string,
): ForwardDist52Adx20YearRow[] {
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

export function buildAdx20AblationRankings(
  baseline: ForwardDist52Adx20Metrics,
  variants: { ruleId: string; labelJa: string; metrics: ForwardDist52Adx20Metrics }[],
): ForwardDist52Adx20AblationRankRow[] {
  const baselineRow = {
    scenarioId: 'baseline' as const,
    labelJa: baseline.labelJa,
    tradeCount: baseline.tradeCount,
    winRatePct: baseline.winRatePct,
    avgReturnPct: baseline.avgReturnPct,
    maxDrawdownPct: baseline.maxDrawdownPct,
    cumulativeReturnPct: baseline.cumulativeReturnPct,
    profitEfficiency: baseline.profitEfficiency,
  };

  const scenarioIdMap: Record<string, 'no_macd' | 'no_52w' | 'no_spy63'> = {
    macd: 'no_macd',
    dist52: 'no_52w',
    spy63: 'no_spy63',
  };

  return variants
    .map((v) => {
      const variantRow = {
        scenarioId: scenarioIdMap[v.ruleId] ?? 'no_macd',
        labelJa: v.labelJa,
        tradeCount: v.metrics.tradeCount,
        winRatePct: v.metrics.winRatePct,
        avgReturnPct: v.metrics.avgReturnPct,
        maxDrawdownPct: v.metrics.maxDrawdownPct,
        cumulativeReturnPct: v.metrics.cumulativeReturnPct,
        profitEfficiency: v.metrics.profitEfficiency,
      };
      const deg = buildRuleContributionDegradation(baselineRow, variantRow);
      return {
        ruleId: v.ruleId,
        labelJa: v.labelJa,
        cumulativeDegradationPct: deg.cumulativeDegradationPct,
        overallDegradationPct: deg.overallDegradationPct,
      };
    })
    .sort((a, b) => (b.overallDegradationPct ?? -999) - (a.overallDegradationPct ?? -999));
}

export function evaluateDist52Adx20Recommendation(input: {
  with52w: ForwardDist52Adx20Metrics;
  without52w: ForwardDist52Adx20Metrics;
  addedTrades: ForwardDist52Adx20AddedTradeRow[];
  ablationRankings: ForwardDist52Adx20AblationRankRow[];
  addedByYear: ForwardDist52Adx20YearRow[];
}): {
  recommendation: ForwardDist52Adx20Recommendation;
  is52wMostImportant: boolean;
  opportunityLossPct: number;
  recommendationJa: string;
  answer1Ja: string;
  answer2Ja: string;
  answer3Ja: string;
  answer4Ja: string;
} {
  const { with52w, without52w, addedTrades, ablationRankings, addedByYear } = input;
  const opportunityLossPct = round3(addedTrades.reduce((s, t) => s + t.returnPct, 0));
  const topRule = ablationRankings[0];
  const is52wMostImportant = topRule?.ruleId === 'dist52';

  const cumDelta = round3(without52w.cumulativeReturnPct - with52w.cumulativeReturnPct);
  const profitableYears = addedByYear.filter(
    (y) => y.tradeCount > 0 && y.cumulativeReturnPct > 0,
  ).length;
  const activeYears = addedByYear.filter((y) => y.tradeCount > 0).length;

  let recommendation: ForwardDist52Adx20Recommendation;
  let recommendationJa: string;

  if (with52w.cumulativeReturnPct >= without52w.cumulativeReturnPct) {
    recommendation = 'maintain';
    recommendationJa =
      `維持を推奨。52週あり累積${with52w.cumulativeReturnPct}% ≥ なし${without52w.cumulativeReturnPct}%（差${cumDelta}%）。` +
      `除外で得られる追加${addedTrades.length}件のnet${opportunityLossPct}%は${opportunityLossPct > 0 ? 'プラスだが全体品質で相殺' : 'マイナスでフィルタ有効'}。`;
  } else if (
    without52w.cumulativeReturnPct > with52w.cumulativeReturnPct + 3 &&
    opportunityLossPct > 5
  ) {
    recommendation = 'delete';
    recommendationJa =
      `削除検討。52週なしの方が累積+${cumDelta}%優位 · 機会損失${opportunityLossPct}%（追加${addedTrades.length}件）。`;
  } else {
    recommendation = 'relax';
    recommendationJa =
      `緩和検討。累積差${cumDelta}% · 機会損失${opportunityLossPct}% · 追加利益は${activeYears}年中${profitableYears}年でプラス。`;
  }

  const dist52Deg = ablationRankings.find((r) => r.ruleId === 'dist52');

  return {
    recommendation,
    is52wMostImportant,
    opportunityLossPct,
    recommendationJa,
    answer1Ja: is52wMostImportant
      ? `はい。ADX>20環境でも52週高値除外の悪化が最大（累積悪化${dist52Deg?.cumulativeDegradationPct ?? '—'}% · 総合${dist52Deg?.overallDegradationPct ?? '—'}%）。`
      : `限定。最大寄与は${topRule?.labelJa ?? '—'}（52週は${dist52Deg?.overallDegradationPct ?? '—'}%悪化）。`,
    answer2Ja:
      recommendation === 'maintain'
        ? '維持すべき。ADX20採用後も52週条件は品質フィルタとして機能。'
        : recommendation === 'delete'
          ? '維持不要。52週除外で全期間成績が改善。'
          : '条件付き維持。相場局面により緩和余地あり。',
    answer3Ja:
      opportunityLossPct > 0
        ? `機会損失（52週維持で逃す利益）= +${opportunityLossPct}%（追加${addedTrades.length}件）。`
        : `機会損失はマイナス（${opportunityLossPct}%）— 52週条件が${Math.abs(opportunityLossPct)}%の悪トレードを排除。`,
    answer4Ja:
      activeYears >= 2 && profitableYears >= 2
        ? `複数年再現: ${addedByYear.filter((y) => y.tradeCount > 0).map((y) => `${y.year}(${y.tradeCount}件/${y.cumulativeReturnPct}%)`).join('、')}。`
        : activeYears <= 1
          ? `特定年依存: ${addedByYear.filter((y) => y.tradeCount > 0).map((y) => y.year).join('、') || '—'}のみ。`
          : `混合: 活動${activeYears}年 · プラス${profitableYears}年。`,
  };
}

function pad(s: string, w: number): string {
  return s.length >= w ? s : s + ' '.repeat(w - s.length);
}

function formatMetricsLine(m: ForwardDist52Adx20Metrics): string {
  return (
    `${m.labelJa}: ${m.tradeCount}件 · WR${m.winRatePct}% · 均R${m.avgReturnPct ?? '—'}% · ` +
    `累積${m.cumulativeReturnPct}% · DD${m.maxDrawdownPct ?? '—'}% · 効率${m.profitEfficiency ?? '—'}`
  );
}

export function auditDist52Adx20(input: {
  bundle: ForwardOhlcvBundle;
  fromDate?: string;
}): ForwardDist52Adx20AuditReport {
  const fromDate = input.fromDate ?? EXTENDED_AUDIT_START;
  const toDate = input.bundle.latestDate;

  const with52wTrades = runAdx20Operational(input.bundle, fromDate, toDate, {});
  const without52wTrades = runAdx20Operational(input.bundle, fromDate, toDate, {
    skipDist52: true,
  });

  const with52w = toMetrics('① 52週高値あり（現行）', with52wTrades);
  const without52w = toMetrics('② 52週高値なし', without52wTrades);

  const addedTrades = buildAddedTrades(with52wTrades, without52wTrades);
  const addedByYear = buildAddedYearRows(addedTrades, DIST52_ADX20_ADDED_YEARS, toDate);

  const ablationVariants = ABLATION_RULES.map((r) => ({
    ruleId: r.ruleId,
    labelJa: r.labelJa,
    metrics: toMetrics(r.labelJa, runAdx20Operational(input.bundle, fromDate, toDate, r.ablation)),
  }));
  const ablationRankings = buildAdx20AblationRankings(with52w, ablationVariants);

  const evalResult = evaluateDist52Adx20Recommendation({
    with52w,
    without52w,
    addedTrades,
    ablationRankings,
    addedByYear,
  });

  const recLabel: Record<ForwardDist52Adx20Recommendation, string> = {
    maintain: '維持',
    relax: '緩和',
    delete: '削除',
  };

  const humanLines = [
    `【最重要監査その23】ADX20環境52週高値再検証 ${fromDate} ～ ${toDate}`,
    `固定条件: ${FIXED_CONDITIONS_JA}`,
    '比較: ①52週高値あり vs ②52週高値なし · 実運用シミュレーション',
    '監査のみ · ルール変更なし',
    '',
    '■ 比較結果',
    formatMetricsLine(with52w),
    formatMetricsLine(without52w),
    `Δ累積(なし-あり): ${round3(without52w.cumulativeReturnPct - with52w.cumulativeReturnPct)}%`,
    '',
    '■ ADX20環境ルール寄与ランキング（除外時悪化%）',
    ...ablationRankings.map(
      (r, i) =>
        `${i + 1}. ${r.labelJa}: 累積悪化${r.cumulativeDegradationPct ?? '—'}% · 総合${r.overallDegradationPct ?? '—'}%`,
    ),
    '',
    `■ 52週なしで追加されたトレード（${addedTrades.length}件 · net ${evalResult.opportunityLossPct}%）`,
    ...(addedTrades.length > 0
      ? addedTrades.map(
          (t) => `${t.signalDate} · ${t.symbol} · R${t.returnPct}% · ${t.holdDays}日`,
        )
      : ['（該当なし）']),
    '',
    '■ 追加トレード年別（2020 / 2022 / 2025 / 2026）',
    ...addedByYear.map(
      (y) =>
        `${y.year}: ${y.tradeCount}件 · WR${y.winRatePct}% · 累積${y.cumulativeReturnPct}%`,
    ),
    '',
    '■ 必須回答',
    `1. ADX20環境でも52週最重要か → ${evalResult.answer1Ja}`,
    `2. ADX20採用後も52週維持すべきか → ${evalResult.answer2Ja}`,
    `3. 機会損失量 → ${evalResult.answer3Ja}`,
    `4. 追加利益の年依存 → ${evalResult.answer4Ja}`,
    '',
    `■ 推奨: 【${recLabel[evalResult.recommendation]}】`,
    evalResult.recommendationJa,
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate,
    toDate,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    with52w,
    without52w,
    cumulativeDeltaWithoutMinusWith: round3(
      without52w.cumulativeReturnPct - with52w.cumulativeReturnPct,
    ),
    addedTrades,
    addedByYear,
    ablationRankings,
    is52wMostImportant: evalResult.is52wMostImportant,
    opportunityLossPct: evalResult.opportunityLossPct,
    recommendation: evalResult.recommendation,
    recommendationJa: evalResult.recommendationJa,
    answer1Ja: evalResult.answer1Ja,
    answer2Ja: evalResult.answer2Ja,
    answer3Ja: evalResult.answer3Ja,
    answer4Ja: evalResult.answer4Ja,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export async function runDist52Adx20Audit(): Promise<ForwardDist52Adx20AuditReport | null> {
  const bundle = await fetchForwardOhlcvBundle(EXTENDED_AUDIT_START);
  if (!bundle) return null;
  return auditDist52Adx20({ bundle });
}

export function formatDist52Adx20Csv(report: ForwardDist52Adx20AuditReport): string {
  const mRow = (label: string, m: ForwardDist52Adx20Metrics) =>
    [
      label,
      m.tradeCount,
      m.winRatePct,
      m.avgReturnPct ?? '',
      m.maxDrawdownPct ?? '',
      m.cumulativeReturnPct,
      m.profitEfficiency ?? '',
    ].join(',');

  const addedRows = report.addedTrades.map((t) =>
    [t.signalDate, t.symbol, t.returnPct, t.holdDays].join(','),
  );
  const yearRows = report.addedByYear.map((y) =>
    [y.year, y.tradeCount, y.winRatePct, y.cumulativeReturnPct].join(','),
  );
  const rankRows = report.ablationRankings.map((r) =>
    [r.ruleId, r.cumulativeDegradationPct ?? '', r.overallDegradationPct ?? ''].join(','),
  );

  return [
    'scenario,tradeCount,winRatePct,avgReturnPct,maxDrawdownPct,cumulativeReturnPct,profitEfficiency',
    mRow('with_52w', report.with52w),
    mRow('without_52w', report.without52w),
    '',
    'signalDate,symbol,returnPct,holdDays',
    ...addedRows,
    '',
    'year,tradeCount,winRatePct,cumulativeReturnPct',
    ...yearRows,
    '',
    'ruleId,cumulativeDegradationPct,overallDegradationPct',
    ...rankRows,
    '',
    `opportunityLossPct,${report.opportunityLossPct}`,
    `recommendation,${report.recommendation}`,
  ].join('\n');
}
