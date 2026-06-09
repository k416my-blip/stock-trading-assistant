/**
 * 最重要監査その16 — ルール寄与度分析 · 1ルール除外アブレーション · 2018〜 · 監査のみ
 */
import {
  FORWARD_ETF_UNIVERSE,
  FORWARD_HOLD_DAYS,
  FORWARD_TAKE_PROFIT_PCT,
} from '../../constants/forwardValidation';
import type {
  ForwardPassedTradeRecord,
  ForwardRuleContributionAuditReport,
  ForwardRuleContributionDegradation,
  ForwardRuleContributionRow,
  ForwardRuleContributionScenarioId,
  ForwardRuleContributionVerdict,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { fetchForwardOhlcvBundle } from './forwardValidationEngine';
import {
  barIndexByDate,
  buildSpyRegimeMap,
  scanSignalAtBarAblation,
  simulateExitFromEntry,
  type SignalAblationOptions,
} from './case4Indicators';
import { portfolioMaxDrawdownPct } from './forwardValidationOperationalAllocationAudit';
import { simulateOperationalTrades } from './forwardValidationOperationalRebacktestAudit';
import { filterVixGteTrades } from './forwardValidationVixSensitivityAudit';
import { EXTENDED_AUDIT_START } from './forwardValidationVix24ExtendedHistoryAudit';

const VIX_THRESHOLD = 24;

const FIXED_RULES_JA =
  'VIX≥24 · ADX · MACD · 52週高値 · SPY63 · 同時3枠 · 1日1ETF · 利確+3% · 最大25営業日';

type ScenarioDef = {
  id: ForwardRuleContributionScenarioId;
  labelJa: string;
  ablation: SignalAblationOptions;
  skipVix: boolean;
};

export const RULE_CONTRIBUTION_SCENARIOS: ScenarioDef[] = [
  { id: 'baseline', labelJa: '現行フルルール', ablation: {}, skipVix: false },
  { id: 'no_adx', labelJa: '① ADX除外', ablation: { skipAdx: true }, skipVix: false },
  { id: 'no_macd', labelJa: '② MACD除外', ablation: { skipMacd: true }, skipVix: false },
  { id: 'no_52w', labelJa: '③ 52週高値除外', ablation: { skipDist52: true }, skipVix: false },
  { id: 'no_spy63', labelJa: '④ SPY63除外', ablation: { skipSpyRegime: true }, skipVix: false },
  { id: 'no_vix', labelJa: '⑤ VIX除外', ablation: {}, skipVix: true },
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

export function collectPassedTradesWithAblation(
  bundle: ForwardOhlcvBundle,
  fromDate: string,
  toDate: string,
  ablation: SignalAblationOptions = {},
): ForwardPassedTradeRecord[] {
  const regimeMap = buildSpyRegimeMap(bundle.spyBars);
  const dates = bundle.tradingDates.filter((d) => d >= fromDate && d <= toDate);
  const trades: ForwardPassedTradeRecord[] = [];

  for (const signalDate of dates) {
    for (const symbol of FORWARD_ETF_UNIVERSE) {
      const bars = bundle.etfBars[symbol];
      const signalIdx = barIndexByDate(bars, signalDate);
      if (signalIdx < 0) continue;

      const scan = scanSignalAtBarAblation(bars, signalIdx, regimeMap, ablation);
      if (!scan?.passes) continue;

      const entryIdx = signalIdx + 1;
      if (entryIdx >= bars.length) continue;

      const entryBar = bars[entryIdx]!;
      const exit = simulateExitFromEntry(
        bars,
        entryIdx,
        FORWARD_HOLD_DAYS,
        FORWARD_TAKE_PROFIT_PCT,
      );
      if (!exit) continue;

      const exitIdx = barIndexByDate(bars, exit.exitDate);
      const holdDays = exitIdx >= entryIdx ? exitIdx - entryIdx : 0;
      const regime = regimeMap.get(signalDate) ?? 'unknown';

      trades.push({
        id: `${signalDate}_${symbol}`,
        symbol,
        signalDate,
        entryDate: entryBar.date,
        exitDate: exit.exitDate,
        entryPrice: round3(entryBar.close),
        exitPrice: round3(exit.exitPrice),
        returnPct: exit.returnPct,
        holdDays,
        exitReason: exit.reason,
        adx14: scan.adx14,
        macdHistPct: scan.macdHistPct,
        dist52wPct: scan.dist52wPct,
        bucket: scan.bucket,
        spyRegime: regime,
      });
    }
  }

  return trades.sort((a, b) => a.signalDate.localeCompare(b.signalDate));
}

export function buildRuleContributionRow(
  scenario: ScenarioDef,
  executed: ForwardPassedTradeRecord[],
): ForwardRuleContributionRow {
  const wins = executed.filter((t) => t.returnPct > 0);
  const returns = executed.map((t) => t.returnPct);
  const cumulativeReturnPct = round3(returns.reduce((s, r) => s + r, 0));
  const maxDrawdownPct = portfolioMaxDrawdownPct(exitOrderedReturns(executed));
  const profitEfficiency =
    maxDrawdownPct != null && maxDrawdownPct !== 0
      ? round3(cumulativeReturnPct / Math.abs(maxDrawdownPct))
      : null;

  return {
    scenarioId: scenario.id,
    labelJa: scenario.labelJa,
    tradeCount: executed.length,
    winRatePct: executed.length > 0 ? round3((wins.length / executed.length) * 100) : 0,
    avgReturnPct: mean(returns),
    maxDrawdownPct,
    cumulativeReturnPct,
    profitEfficiency,
  };
}

function degradationHigherIsBetter(baseline: number, variant: number): number | null {
  if (baseline === 0) return variant === 0 ? 0 : null;
  return round3(((baseline - variant) / Math.abs(baseline)) * 100);
}

function degradationDdWorsening(baseline: number | null, variant: number | null): number | null {
  if (baseline == null || variant == null || baseline === 0) return null;
  return round3(((Math.abs(variant) - Math.abs(baseline)) / Math.abs(baseline)) * 100);
}

export function buildRuleContributionDegradation(
  baseline: ForwardRuleContributionRow,
  variant: ForwardRuleContributionRow,
): ForwardRuleContributionDegradation {
  const winRateDegradationPct = degradationHigherIsBetter(
    baseline.winRatePct,
    variant.winRatePct,
  );
  const avgReturnDegradationPct =
    baseline.avgReturnPct != null && variant.avgReturnPct != null
      ? degradationHigherIsBetter(baseline.avgReturnPct, variant.avgReturnPct)
      : null;
  const cumulativeDegradationPct = degradationHigherIsBetter(
    baseline.cumulativeReturnPct,
    variant.cumulativeReturnPct,
  );
  const profitEfficiencyDegradationPct =
    baseline.profitEfficiency != null && variant.profitEfficiency != null
      ? degradationHigherIsBetter(baseline.profitEfficiency, variant.profitEfficiency)
      : null;
  const maxDrawdownWorseningPct = degradationDdWorsening(
    baseline.maxDrawdownPct,
    variant.maxDrawdownPct,
  );

  const parts = [
    cumulativeDegradationPct,
    winRateDegradationPct,
    profitEfficiencyDegradationPct,
    avgReturnDegradationPct,
  ].filter((v): v is number => v != null);
  const overallDegradationPct =
    parts.length > 0 ? round3(parts.reduce((a, b) => a + b, 0) / parts.length) : null;

  return {
    scenarioId: variant.scenarioId,
    labelJa: variant.labelJa,
    tradeCountDelta: variant.tradeCount - baseline.tradeCount,
    tradeCountDeltaPct:
      baseline.tradeCount > 0
        ? round3(((variant.tradeCount - baseline.tradeCount) / baseline.tradeCount) * 100)
        : null,
    winRateDegradationPct,
    avgReturnDegradationPct,
    maxDrawdownWorseningPct,
    cumulativeDegradationPct,
    profitEfficiencyDegradationPct,
    overallDegradationPct,
  };
}

export function evaluateRuleContribution(
  baseline: ForwardRuleContributionRow,
  degradations: ForwardRuleContributionDegradation[],
): { verdict: ForwardRuleContributionVerdict; verdictJa: string; rankedRuleLabelsJa: string[] } {
  const ablationDeg = degradations.filter((d) => d.scenarioId !== 'baseline');
  const ranked = [...ablationDeg].sort(
    (a, b) => (b.overallDegradationPct ?? -999) - (a.overallDegradationPct ?? -999),
  );
  const rankedRuleLabelsJa = ranked.map((d) => d.labelJa);

  const top = ranked[0];
  const harmful = ranked.filter((d) => (d.overallDegradationPct ?? 0) > 5);
  const possiblyRedundant = ranked.filter((d) => (d.overallDegradationPct ?? 0) < -5);

  if (!top) {
    return {
      verdict: 'mixed',
      verdictJa: '比較可能なアブレーション結果が不足。',
      rankedRuleLabelsJa: [],
    };
  }

  if (harmful.length >= 3 && (top.overallDegradationPct ?? 0) > 15) {
    return {
      verdict: 'multi_rule_critical',
      verdictJa:
        `複数ルールが利益に寄与: 除外時悪化最大=${top.labelJa}（総合悪化${top.overallDegradationPct ?? '—'}% · 累積悪化${top.cumulativeDegradationPct ?? '—'}%）。` +
        `不要ルールは見当たらず、現行5条件は相補的。`,
      rankedRuleLabelsJa,
    };
  }

  if (possiblyRedundant.length > 0 && harmful.length > 0) {
    const redundant = possiblyRedundant.map((d) => d.labelJa).join('、');
    return {
      verdict: 'mixed_contribution',
      verdictJa:
        `寄与度に差あり: 重要=${harmful.map((d) => d.labelJa).join('、')} / 除外で改善=${redundant}。` +
        `最寄与=${top.labelJa}（総合悪化${top.overallDegradationPct ?? '—'}%）。`,
      rankedRuleLabelsJa,
    };
  }

  if ((top.overallDegradationPct ?? 0) > 8) {
    return {
      verdict: 'clear_contributor',
      verdictJa:
        `${top.labelJa}除外で最大悪化（総合${top.overallDegradationPct}% · 累積${top.cumulativeDegradationPct ?? '—'}%）。` +
        `現行ルールセットに不可欠な条件。`,
      rankedRuleLabelsJa,
    };
  }

  return {
    verdict: 'mixed',
    verdictJa:
      `ルール寄与は分散: 最大悪化=${top.labelJa}（${top.overallDegradationPct ?? '—'}%）。` +
      `全除外で劇的悪化は限定的だが、ベースライン維持に各条件が小幅寄与。`,
    rankedRuleLabelsJa,
  };
}

function pad(s: string, w: number): string {
  return s.length >= w ? s : s + ' '.repeat(w - s.length);
}

function formatMetricsTable(rows: ForwardRuleContributionRow[]): string[] {
  const cols = [
    { w: 14, h: 'シナリオ' },
    { w: 5, h: '件数' },
    { w: 7, h: '勝率%' },
    { w: 7, h: '均R%' },
    { w: 8, h: '最大DD%' },
    { w: 8, h: '累積%' },
    { w: 8, h: '効率' },
  ];
  const line = (cells: string[]) => cols.map((c, i) => pad(cells[i] ?? '', c.w)).join(' ');
  return [
    line(cols.map((c) => c.h)),
    cols.map((c) => '-'.repeat(c.w)).join(' '),
    ...rows.map((r) =>
      line([
        r.labelJa,
        String(r.tradeCount),
        String(r.winRatePct),
        r.avgReturnPct != null ? String(r.avgReturnPct) : '—',
        r.maxDrawdownPct != null ? String(r.maxDrawdownPct) : '—',
        String(r.cumulativeReturnPct),
        r.profitEfficiency != null ? String(r.profitEfficiency) : '—',
      ]),
    ),
  ];
}

function formatDegradationTable(degs: ForwardRuleContributionDegradation[]): string[] {
  const ablation = degs.filter((d) => d.scenarioId !== 'baseline');
  const cols = [
    { w: 14, h: '除外ルール' },
    { w: 8, h: '件数Δ%' },
    { w: 8, h: '勝率悪化%' },
    { w: 8, h: '累積悪化%' },
    { w: 8, h: '効率悪化%' },
    { w: 8, h: '総合悪化%' },
  ];
  const line = (cells: string[]) => cols.map((c, i) => pad(cells[i] ?? '', c.w)).join(' ');
  const fmt = (v: number | null) => (v != null ? String(v) : '—');
  return [
    line(cols.map((c) => c.h)),
    cols.map((c) => '-'.repeat(c.w)).join(' '),
    ...ablation.map((d) =>
      line([
        d.labelJa,
        fmt(d.tradeCountDeltaPct),
        fmt(d.winRateDegradationPct),
        fmt(d.cumulativeDegradationPct),
        fmt(d.profitEfficiencyDegradationPct),
        fmt(d.overallDegradationPct),
      ]),
    ),
  ];
}

export function runScenarioOperational(
  bundle: ForwardOhlcvBundle,
  fromDate: string,
  toDate: string,
  scenario: ScenarioDef,
): ForwardPassedTradeRecord[] {
  const passed = collectPassedTradesWithAblation(bundle, fromDate, toDate, scenario.ablation);
  const vixBars = bundle.vixBars ?? [];
  const filtered = scenario.skipVix ? passed : filterVixGteTrades(passed, vixBars, VIX_THRESHOLD);
  return simulateOperationalTrades(filtered).executed;
}

export function auditRuleContribution(input: {
  bundle: ForwardOhlcvBundle;
  fromDate?: string;
}): ForwardRuleContributionAuditReport {
  const fromDate = input.fromDate ?? EXTENDED_AUDIT_START;
  const toDate = input.bundle.latestDate;

  const rows = RULE_CONTRIBUTION_SCENARIOS.map((scenario) => {
    const executed = runScenarioOperational(input.bundle, fromDate, toDate, scenario);
    return buildRuleContributionRow(scenario, executed);
  });

  const baseline = rows.find((r) => r.scenarioId === 'baseline')!;
  const degradations = rows.map((r) =>
    r.scenarioId === 'baseline'
      ? {
          scenarioId: 'baseline' as const,
          labelJa: r.labelJa,
          tradeCountDelta: 0,
          tradeCountDeltaPct: 0,
          winRateDegradationPct: 0,
          avgReturnDegradationPct: 0,
          maxDrawdownWorseningPct: 0,
          cumulativeDegradationPct: 0,
          profitEfficiencyDegradationPct: 0,
          overallDegradationPct: 0,
        }
      : buildRuleContributionDegradation(baseline, r),
  );

  const { verdict, verdictJa, rankedRuleLabelsJa } = evaluateRuleContribution(
    baseline,
    degradations,
  );

  const verdictLabel: Record<ForwardRuleContributionVerdict, string> = {
    multi_rule_critical: '複数ルール必須',
    clear_contributor: '特定ルール高寄与',
    mixed_contribution: '寄与度に差',
    mixed: '混合',
  };

  const humanLines = [
    `【最重要監査その16】ルール寄与度分析 ${fromDate} ～ ${toDate}`,
    `基準ルール: ${FIXED_RULES_JA}`,
    '監査のみ · 1ルールずつ除外アブレーション · ルール変更・最適化禁止',
    '',
    '■ シナリオ別成績（実運用シミュレーション）',
    ...formatMetricsTable(rows),
    '',
    '■ 成績悪化率（ベースライン比 · 正=除外で悪化 · 負=除外で改善）',
    ...formatDegradationTable(degradations),
    '',
    '■ ルール寄与度ランキング（総合悪化率降順）',
    ...rankedRuleLabelsJa.map((label, i) => `${i + 1}. ${label}`),
    '',
    `■ 評価: 【${verdictLabel[verdict]}】`,
    verdictJa,
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate,
    toDate,
    fixedRulesJa: FIXED_RULES_JA,
    baseline,
    rows,
    degradations,
    rankedRuleLabelsJa,
    verdict,
    verdictJa,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export async function runRuleContributionAudit(): Promise<ForwardRuleContributionAuditReport | null> {
  const bundle = await fetchForwardOhlcvBundle(EXTENDED_AUDIT_START);
  if (!bundle) return null;
  return auditRuleContribution({ bundle });
}

export function formatRuleContributionCsv(report: ForwardRuleContributionAuditReport): string {
  const metricRows = report.rows.map((r) =>
    [
      r.scenarioId,
      r.labelJa,
      r.tradeCount,
      r.winRatePct,
      r.avgReturnPct ?? '',
      r.maxDrawdownPct ?? '',
      r.cumulativeReturnPct,
      r.profitEfficiency ?? '',
    ].join(','),
  );

  const degRows = report.degradations.map((d) =>
    [
      d.scenarioId,
      d.labelJa,
      d.tradeCountDelta,
      d.tradeCountDeltaPct ?? '',
      d.winRateDegradationPct ?? '',
      d.avgReturnDegradationPct ?? '',
      d.maxDrawdownWorseningPct ?? '',
      d.cumulativeDegradationPct ?? '',
      d.profitEfficiencyDegradationPct ?? '',
      d.overallDegradationPct ?? '',
    ].join(','),
  );

  return [
    'scenarioId,labelJa,tradeCount,winRatePct,avgReturnPct,maxDrawdownPct,cumulativeReturnPct,profitEfficiency',
    ...metricRows,
    '',
    'scenarioId,labelJa,tradeCountDelta,tradeCountDeltaPct,winRateDegradationPct,avgReturnDegradationPct,maxDrawdownWorseningPct,cumulativeDegradationPct,profitEfficiencyDegradationPct,overallDegradationPct',
    ...degRows,
    '',
    `verdict,${report.verdict}`,
  ].join('\n');
}
