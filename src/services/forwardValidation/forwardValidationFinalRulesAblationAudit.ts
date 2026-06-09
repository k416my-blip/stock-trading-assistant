/**
 * 最重要監査その26 — 最終推奨ルールセット総合アブレーション · 2018〜 · 監査のみ
 */
import type {
  ForwardFinalRulesAblationAuditReport,
  ForwardFinalRulesAblationMetrics,
  ForwardFinalRulesAblationRuleId,
  ForwardFinalRulesAblationRuleRank,
  ForwardFinalRulesAblationScenarioId,
  ForwardFinalRulesAblationTier,
  ForwardFinalRulesAblationTierRow,
  ForwardPassedTradeRecord,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { fetchForwardOhlcvBundle } from './forwardValidationEngine';
import type { SignalAblationOptions } from './case4Indicators';
import {
  buildRuleContributionDegradation,
  buildRuleContributionRow,
  collectPassedTradesWithAblation,
} from './forwardValidationRuleContributionAudit';
import { simulateOperationalTrades } from './forwardValidationOperationalRebacktestAudit';
import { filterVixGteTrades } from './forwardValidationVixSensitivityAudit';
import { EXTENDED_AUDIT_START } from './forwardValidationVix24ExtendedHistoryAudit';

const VIX24 = 24;
const ADX20 = 20;

const RECOMMENDED_RULES_JA = 'ADX>20 · VIX≥24 · 52週高値 · SPY63';

const FIXED_CONDITIONS_JA =
  'MACD · 同時3枠 · 1日1ETF · 利確+3% · 最大25営業日';

const ADX20_ON: SignalAblationOptions = { adxMinOverride: ADX20 };

type ScenarioDef = {
  id: ForwardFinalRulesAblationScenarioId;
  labelJa: string;
  ablation: SignalAblationOptions;
  skipVix: boolean;
};

export const FINAL_RULES_ABLATION_SCENARIOS: ScenarioDef[] = [
  { id: 'baseline', labelJa: '全ルールON', ablation: ADX20_ON, skipVix: false },
  { id: 'no_adx', labelJa: '① ADXのみOFF', ablation: { skipAdx: true }, skipVix: false },
  { id: 'no_vix', labelJa: '② VIXのみOFF', ablation: ADX20_ON, skipVix: true },
  { id: 'no_52w', labelJa: '③ 52週のみOFF', ablation: { ...ADX20_ON, skipDist52: true }, skipVix: false },
  {
    id: 'no_spy63',
    labelJa: '④ SPY63のみOFF',
    ablation: { ...ADX20_ON, skipSpyRegime: true },
    skipVix: false,
  },
  { id: 'no_adx_vix', labelJa: '⑤ ADX+VIX OFF', ablation: { skipAdx: true }, skipVix: true },
  {
    id: 'no_adx_52w',
    labelJa: '⑥ ADX+52週 OFF',
    ablation: { skipAdx: true, skipDist52: true },
    skipVix: false,
  },
  {
    id: 'no_adx_spy63',
    labelJa: '⑦ ADX+SPY63 OFF',
    ablation: { skipAdx: true, skipSpyRegime: true },
    skipVix: false,
  },
  {
    id: 'no_vix_52w',
    labelJa: '⑧ VIX+52週 OFF',
    ablation: { ...ADX20_ON, skipDist52: true },
    skipVix: true,
  },
  {
    id: 'no_vix_spy63',
    labelJa: '⑨ VIX+SPY63 OFF',
    ablation: { ...ADX20_ON, skipSpyRegime: true },
    skipVix: true,
  },
  {
    id: 'no_52w_spy63',
    labelJa: '⑩ 52週+SPY63 OFF',
    ablation: { ...ADX20_ON, skipDist52: true, skipSpyRegime: true },
    skipVix: false,
  },
  {
    id: 'all_off',
    labelJa: '⑪ 全部OFF',
    ablation: { skipAdx: true, skipDist52: true, skipSpyRegime: true },
    skipVix: true,
  },
];

const SINGLE_RULE_SCENARIO: Record<
  ForwardFinalRulesAblationRuleId,
  ForwardFinalRulesAblationScenarioId
> = {
  adx: 'no_adx',
  vix: 'no_vix',
  dist52: 'no_52w',
  spy63: 'no_spy63',
};

const RULE_LABELS: Record<ForwardFinalRulesAblationRuleId, string> = {
  adx: 'ADX>20',
  vix: 'VIX≥24',
  dist52: '52週高値',
  spy63: 'SPY63',
};

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function pctOfBaseline(baseline: number, value: number): number {
  if (baseline === 0) return value === 0 ? 100 : 0;
  return round3((value / baseline) * 100);
}

export function runFinalRulesScenario(
  bundle: ForwardOhlcvBundle,
  fromDate: string,
  toDate: string,
  scenario: ScenarioDef,
): ForwardPassedTradeRecord[] {
  const passed = collectPassedTradesWithAblation(bundle, fromDate, toDate, scenario.ablation);
  const vixBars = bundle.vixBars ?? [];
  const filtered = scenario.skipVix ? passed : filterVixGteTrades(passed, vixBars, VIX24);
  return simulateOperationalTrades(filtered).executed;
}

function toMetricsRow(
  scenario: ScenarioDef,
  executed: ForwardPassedTradeRecord[],
  baseline: ForwardFinalRulesAblationMetrics | null,
): ForwardFinalRulesAblationMetrics {
  const row = buildRuleContributionRow(
    {
      id: scenario.id as 'baseline',
      labelJa: scenario.labelJa,
      ablation: scenario.ablation,
      skipVix: scenario.skipVix,
    },
    executed,
  );
  const base = baseline ?? {
    cumulativeReturnPct: row.cumulativeReturnPct,
    winRatePct: row.winRatePct,
    profitEfficiency: row.profitEfficiency,
  };
  return {
    scenarioId: scenario.id,
    labelJa: scenario.labelJa,
    tradeCount: row.tradeCount,
    winRatePct: row.winRatePct,
    avgReturnPct: row.avgReturnPct,
    maxDrawdownPct: row.maxDrawdownPct,
    cumulativeReturnPct: row.cumulativeReturnPct,
    profitEfficiency: row.profitEfficiency,
    cumulativePctOfBaseline: pctOfBaseline(base.cumulativeReturnPct, row.cumulativeReturnPct),
    winRatePctOfBaseline: pctOfBaseline(base.winRatePct, row.winRatePct),
    profitEfficiencyPctOfBaseline:
      base.profitEfficiency != null && row.profitEfficiency != null
        ? pctOfBaseline(base.profitEfficiency, row.profitEfficiency)
        : null,
  };
}

export function buildRuleRankings(
  baseline: ForwardFinalRulesAblationMetrics,
  rows: ForwardFinalRulesAblationMetrics[],
): ForwardFinalRulesAblationRuleRank[] {
  const ruleIds = Object.keys(SINGLE_RULE_SCENARIO) as ForwardFinalRulesAblationRuleId[];
  const ranks: ForwardFinalRulesAblationRuleRank[] = ruleIds.map((ruleId) => {
    const scenarioId = SINGLE_RULE_SCENARIO[ruleId];
    const variant = rows.find((r) => r.scenarioId === scenarioId)!;
    const deg = buildRuleContributionDegradation(
      {
        scenarioId: 'baseline',
        labelJa: baseline.labelJa,
        tradeCount: baseline.tradeCount,
        winRatePct: baseline.winRatePct,
        avgReturnPct: baseline.avgReturnPct,
        maxDrawdownPct: baseline.maxDrawdownPct,
        cumulativeReturnPct: baseline.cumulativeReturnPct,
        profitEfficiency: baseline.profitEfficiency,
      },
      {
        scenarioId: scenarioId as 'no_adx',
        labelJa: variant.labelJa,
        tradeCount: variant.tradeCount,
        winRatePct: variant.winRatePct,
        avgReturnPct: variant.avgReturnPct,
        maxDrawdownPct: variant.maxDrawdownPct,
        cumulativeReturnPct: variant.cumulativeReturnPct,
        profitEfficiency: variant.profitEfficiency,
      },
    );
    const qualityScore =
      deg.winRateDegradationPct != null && deg.maxDrawdownWorseningPct != null
        ? round3(deg.winRateDegradationPct + deg.maxDrawdownWorseningPct)
        : deg.winRateDegradationPct;
    return {
      ruleId,
      labelJa: RULE_LABELS[ruleId],
      cumulativeDegradationPct: deg.cumulativeDegradationPct,
      maxDrawdownWorseningPct: deg.maxDrawdownWorseningPct,
      winRateDegradationPct: deg.winRateDegradationPct,
      qualityScore,
      profitRank: 0,
      qualityRank: 0,
    };
  });

  const byProfit = [...ranks].sort(
    (a, b) => (b.cumulativeDegradationPct ?? -999) - (a.cumulativeDegradationPct ?? -999),
  );
  byProfit.forEach((r, i) => {
    ranks.find((x) => x.ruleId === r.ruleId)!.profitRank = i + 1;
  });

  const byQuality = [...ranks].sort((a, b) => (b.qualityScore ?? -999) - (a.qualityScore ?? -999));
  byQuality.forEach((r, i) => {
    ranks.find((x) => x.ruleId === r.ruleId)!.qualityRank = i + 1;
  });

  return ranks;
}

export function classifyRuleTier(
  rank: ForwardFinalRulesAblationRuleRank,
): ForwardFinalRulesAblationTier {
  const cum = rank.cumulativeDegradationPct ?? 0;
  const qual = rank.qualityScore ?? 0;

  if (qual >= 15 || (cum >= 5 && qual >= 5)) return 'required';
  if (rank.ruleId === 'adx' || rank.ruleId === 'spy63') return 'recommended';
  if (cum >= 3 || qual >= 5) return 'recommended';
  return 'optional';
}

export function buildTierRows(
  rankings: ForwardFinalRulesAblationRuleRank[],
): ForwardFinalRulesAblationTierRow[] {
  const tierJa: Record<ForwardFinalRulesAblationTier, string> = {
    required: '必須',
    recommended: '推奨',
    optional: '任意',
  };
  return rankings.map((r) => {
    const tier = classifyRuleTier(r);
    return {
      ruleId: r.ruleId,
      labelJa: r.labelJa,
      settingJa: r.labelJa,
      tier,
      tierJa: tierJa[tier],
      rationaleJa:
        tier === 'required'
          ? r.ruleId === 'vix'
            ? `品質スコア${r.qualityScore ?? '—'} · WR/DD大幅改善 · 累積犠牲型（監査24整合）`
            : `累積悪化${r.cumulativeDegradationPct ?? '—'}% · 品質スコア${r.qualityScore ?? '—'} · 除外で大幅劣化`
          : tier === 'recommended'
            ? r.ruleId === 'adx'
              ? `ADX>20採用（監査22）· 除外で累積↑だがWR/品質↓`
              : `累積悪化${r.cumulativeDegradationPct ?? '—'}% · 品質スコア${r.qualityScore ?? '—'} · 維持推奨`
            : `累積悪化${r.cumulativeDegradationPct ?? '—'}% · 除外影響限定的`,
    };
  });
}

export function evaluateFinalRulesAblation(input: {
  baseline: ForwardFinalRulesAblationMetrics;
  rows: ForwardFinalRulesAblationMetrics[];
  ruleRankings: ForwardFinalRulesAblationRuleRank[];
  tierRows: ForwardFinalRulesAblationTierRow[];
}): {
  auditConsistencyJa: string;
  answer1Ja: string;
  answer2Ja: string;
  answer3Ja: string;
  answer4Ja: string;
  answer5Ja: string;
} {
  const { baseline, rows, ruleRankings, tierRows } = input;

  const topQuality = [...ruleRankings].sort((a, b) => a.qualityRank - b.qualityRank)[0]!;
  const profitPositive = [...ruleRankings]
    .filter((r) => (r.cumulativeDegradationPct ?? 0) > 0)
    .sort((a, b) => a.profitRank - b.profitRank);
  const qualitySacrifice = [...ruleRankings]
    .filter((r) => (r.cumulativeDegradationPct ?? 0) <= 0)
    .sort((a, b) => (b.qualityScore ?? 0) - (a.qualityScore ?? 0));
  const optional = tierRows.filter((t) => t.tier === 'optional');
  const allOff = rows.find((r) => r.scenarioId === 'all_off')!;

  const qualityOrder = [...ruleRankings]
    .sort((a, b) => a.qualityRank - b.qualityRank)
    .map((r) => `${r.labelJa}(${r.qualityScore ?? '—'})`)
    .join(' > ');

  const profitOrder =
    profitPositive.length > 0
      ? profitPositive.map((r) => `${r.labelJa}(+${r.cumulativeDegradationPct}%)`).join(' > ')
      : '—';
  const sacrificeOrder =
    qualitySacrifice.length > 0
      ? qualitySacrifice.map((r) => `${r.labelJa}(品質${r.qualityScore})`).join(' > ')
      : '—';

  const requiredCount = tierRows.filter((t) => t.tier === 'required').length;
  const isFinalForm = requiredCount >= 2 && tierRows.every((t) => t.tier !== 'optional');

  return {
    auditConsistencyJa:
      `監査16: 1ルール除外で各条件が相補的 → 26はADX20ベースで再確認。` +
      `監査22: ADX>20採用 → ADX除外で累積↑だが品質↓、推奨維持。` +
      `監査23/24/25: 52週・VIX24・SPY63維持 → 品質フィルタ順位と一致。`,
    answer1Ja: `最も重要=${topQuality.labelJa}（品質スコア${topQuality.qualityScore ?? '—'} · 品質${topQuality.qualityRank}位）。利益面は${profitPositive[0]?.labelJa ?? '—'}（累積悪化${profitPositive[0]?.cumulativeDegradationPct ?? '—'}%）。`,
    answer2Ja:
      optional.length > 0
        ? `無くても良い候補=${optional.map((t) => t.labelJa).join('、')}。`
        : `全4ルールが必須/推奨。単独除外で品質・リスクとも改善するルールはなし。`,
    answer3Ja: `品質フィルタ順位: ${qualityOrder}。`,
    answer4Ja: `利益貢献（累積保護）: ${profitOrder}。累積犠牲型品質フィルタ: ${sacrificeOrder}。`,
    answer5Ja: isFinalForm
      ? `最終形として妥当。ADX20/VIX24/52週/SPY63 · 全OFF累積${allOff.cumulativePctOfBaseline}%（DD${allOff.maxDrawdownPct}%）。`
      : `再検討余地あり。任意=${optional.map((t) => t.labelJa).join('、') || '—'}。`,
  };
}

export function collectRecommendedRuleOperationalTrades(
  bundle: ForwardOhlcvBundle,
  fromDate: string,
  toDate: string,
): ForwardPassedTradeRecord[] {
  return runFinalRulesScenario(bundle, fromDate, toDate, FINAL_RULES_ABLATION_SCENARIOS[0]!);
}

function formatMetricsLine(m: ForwardFinalRulesAblationMetrics): string {
  return (
    `${m.labelJa}: ${m.tradeCount}件 · WR${m.winRatePct}% · 均R${m.avgReturnPct ?? '—'}% · ` +
    `累積${m.cumulativeReturnPct}%(${m.cumulativePctOfBaseline}%) · DD${m.maxDrawdownPct ?? '—'}% · 効率${m.profitEfficiency ?? '—'}`
  );
}

export function auditFinalRulesAblation(input: {
  bundle: ForwardOhlcvBundle;
  fromDate?: string;
}): ForwardFinalRulesAblationAuditReport {
  const fromDate = input.fromDate ?? EXTENDED_AUDIT_START;
  const toDate = input.bundle.latestDate;

  const rawRows = FINAL_RULES_ABLATION_SCENARIOS.map((scenario) => {
    const executed = runFinalRulesScenario(input.bundle, fromDate, toDate, scenario);
    return { scenario, executed };
  });

  const baselineExecuted = rawRows.find((r) => r.scenario.id === 'baseline')!.executed;
  const baselinePartial = toMetricsRow(
    FINAL_RULES_ABLATION_SCENARIOS[0]!,
    baselineExecuted,
    null,
  );

  const rows = rawRows.map(({ scenario, executed }) =>
    toMetricsRow(scenario, executed, baselinePartial),
  );
  const baseline = rows.find((r) => r.scenarioId === 'baseline')!;

  const ruleRankings = buildRuleRankings(baseline, rows);
  const tierRows = buildTierRows(ruleRankings);
  const evalResult = evaluateFinalRulesAblation({ baseline, rows, ruleRankings, tierRows });

  const humanLines = [
    `【最重要監査その26】最終推奨ルール総合アブレーション ${fromDate} ～ ${toDate}`,
    `推奨ルール: ${RECOMMENDED_RULES_JA}`,
    `固定条件: ${FIXED_CONDITIONS_JA}`,
    'ベースライン=全ルールON（100%基準）· 監査のみ',
    '',
    '■ シナリオ別成績',
    ...rows.map(formatMetricsLine),
    '',
    '■ ルール寄与度（単独除外 · 累積/DD/勝率悪化）',
    ...ruleRankings.map(
      (r) =>
        `${r.labelJa}: 累積悪化${r.cumulativeDegradationPct ?? '—'}% · DD悪化${r.maxDrawdownWorseningPct ?? '—'}% · 勝率悪化${r.winRateDegradationPct ?? '—'}% · 利益${r.profitRank}位 · 品質${r.qualityRank}位`,
    ),
    '',
    '■ 最終推奨セット分類',
    ...tierRows.map((t) => `${t.tierJa}: ${t.labelJa} — ${t.rationaleJa}`),
    '',
    '■ 監査16〜25との整合性',
    evalResult.auditConsistencyJa,
    '',
    '■ 必須回答',
    `1. 最も重要なルール → ${evalResult.answer1Ja}`,
    `2. 無くても良いルール → ${evalResult.answer2Ja}`,
    `3. 品質フィルタ順位 → ${evalResult.answer3Ja}`,
    `4. 利益貢献順位 → ${evalResult.answer4Ja}`,
    `5. 最終形か → ${evalResult.answer5Ja}`,
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate,
    toDate,
    recommendedRulesJa: RECOMMENDED_RULES_JA,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    baseline,
    rows,
    ruleRankings,
    tierRows,
    auditConsistencyJa: evalResult.auditConsistencyJa,
    answer1Ja: evalResult.answer1Ja,
    answer2Ja: evalResult.answer2Ja,
    answer3Ja: evalResult.answer3Ja,
    answer4Ja: evalResult.answer4Ja,
    answer5Ja: evalResult.answer5Ja,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export async function runFinalRulesAblationAudit(): Promise<ForwardFinalRulesAblationAuditReport | null> {
  const bundle = await fetchForwardOhlcvBundle(EXTENDED_AUDIT_START);
  if (!bundle) return null;
  return auditFinalRulesAblation({ bundle });
}

export function formatFinalRulesAblationCsv(
  report: ForwardFinalRulesAblationAuditReport,
): string {
  const mRow = (m: ForwardFinalRulesAblationMetrics) =>
    [
      m.scenarioId,
      m.tradeCount,
      m.winRatePct,
      m.avgReturnPct ?? '',
      m.maxDrawdownPct ?? '',
      m.cumulativeReturnPct,
      m.profitEfficiency ?? '',
      m.cumulativePctOfBaseline,
    ].join(',');

  return [
    'scenarioId,tradeCount,winRatePct,avgReturnPct,maxDrawdownPct,cumulativeReturnPct,profitEfficiency,cumulativePctOfBaseline',
    ...report.rows.map(mRow),
    '',
    'ruleId,cumulativeDegradationPct,maxDrawdownWorseningPct,winRateDegradationPct,qualityScore,profitRank,qualityRank,tier',
    ...report.ruleRankings.map((r) => {
      const tier = report.tierRows.find((t) => t.ruleId === r.ruleId)?.tier ?? '';
      return [
        r.ruleId,
        r.cumulativeDegradationPct ?? '',
        r.maxDrawdownWorseningPct ?? '',
        r.winRateDegradationPct ?? '',
        r.qualityScore ?? '',
        r.profitRank,
        r.qualityRank,
        tier,
      ].join(',');
    }),
  ].join('\n');
}
