/**
 * 最重要監査その13 — 市場依存性 · 米国 vs 欧州/日本/全世界/先進国 · 監査のみ
 *
 * 固定条件: VIX≥24 · ADX+MACD+52w+SPY63 · 同時3枠 · 1日1ETF · 利確+3% · 最大25日
 * SPY63/VIXは米国指標のまま全コホートに適用（「米国VIX高止まり後のリバーサル」が他市場ETFでも再現するか）
 */
import { FORWARD_ETF_UNIVERSE, FORWARD_PRIORITY } from '../../constants/forwardValidation';
import type {
  ForwardMarketDependencyAuditReport,
  ForwardMarketDependencyCohortId,
  ForwardMarketDependencyCohortMetrics,
  ForwardMarketDependencyCompareRow,
  ForwardMarketDependencyVerdict,
  ForwardPassedTradeRecord,
} from '../../types/forwardValidation';
import type { OhlcvBar } from './case4Indicators';
import { portfolioMaxDrawdownPct } from './forwardValidationOperationalAllocationAudit';
import {
  buildExtendedPriority,
  collectPassedTradesForSymbols,
  simulateOperationalTradesWithPriority,
  type SurvivorshipOhlcvBundle,
} from './forwardValidationSurvivorshipAudit';
import { filterVixGteTrades } from './forwardValidationVixSensitivityAudit';
import { fetchForwardOhlcvDetailed } from './yahooOhlcvFetch';
import { EXTENDED_AUDIT_START } from './forwardValidationVix24ExtendedHistoryAudit';

const VIX_THRESHOLD = 24;
const BASELINE_4 = [...FORWARD_ETF_UNIVERSE] as string[];

export const MARKET_EUROPE_ETFS = ['VEA', 'IEFA', 'VGK'] as const;
export const MARKET_JAPAN_ETFS = ['EWJ'] as const;
export const MARKET_GLOBAL_ETFS = ['ACWI', 'VT'] as const;
/** 先進国（米国除く）— VEA/IEFA が代表 */
export const MARKET_DEVELOPED_ETFS = ['VEA', 'IEFA'] as const;

export const MARKET_DEPENDENCY_ALL_REGIONAL = uniqueSymbols([
  ...MARKET_EUROPE_ETFS,
  ...MARKET_JAPAN_ETFS,
  ...MARKET_GLOBAL_ETFS,
]);

const FIXED_CONDITIONS_JA =
  'VIX≥24 · ADX+MACD+52w+SPY63 · 同時3枠 · 1日1ETF · 利確+3% · 最大25日';

const NOTE_JA =
  'VIX(^VIX)とSPY63レジームは米国指標のまま固定。他地域ETFにも同一ルールを適用し、' +
  '「米国特有の現象」か「高VIX後リバーサル一般」かを検証する。';

type CohortDef = {
  id: ForwardMarketDependencyCohortId;
  labelJa: string;
  symbols: readonly string[];
};

const COHORT_DEFS: CohortDef[] = [
  { id: 'us', labelJa: '米国（現行4ETF）', symbols: BASELINE_4 },
  { id: 'europe', labelJa: '欧州', symbols: MARKET_EUROPE_ETFS },
  { id: 'japan', labelJa: '日本', symbols: MARKET_JAPAN_ETFS },
  { id: 'global', labelJa: '全世界', symbols: MARKET_GLOBAL_ETFS },
  { id: 'developed', labelJa: '先進国（米国除く）', symbols: MARKET_DEVELOPED_ETFS },
];

function uniqueSymbols(symbols: readonly string[]): string[] {
  return [...new Set(symbols)];
}

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

export function buildCohortPriority(symbols: string[]): Record<string, number> {
  if (symbols.every((s) => BASELINE_4.includes(s)) && symbols.length <= BASELINE_4.length) {
    return buildExtendedPriority(symbols);
  }
  const priority: Record<string, number> = {};
  for (const s of symbols) {
    priority[s] = FORWARD_PRIORITY[s as keyof typeof FORWARD_PRIORITY] ?? 0;
  }
  return priority;
}

export function buildMarketDependencyCohortMetrics(
  id: ForwardMarketDependencyCohortId,
  labelJa: string,
  symbols: string[],
  executed: ForwardPassedTradeRecord[],
): ForwardMarketDependencyCohortMetrics {
  const wins = executed.filter((t) => t.returnPct > 0);
  const returns = executed.map((t) => t.returnPct);
  return {
    cohortId: id,
    labelJa,
    symbols,
    tradeCount: executed.length,
    winRatePct: executed.length > 0 ? round3((wins.length / executed.length) * 100) : 0,
    avgReturnPct: mean(returns),
    maxDrawdownPct: portfolioMaxDrawdownPct(exitOrderedReturns(executed)),
    cumulativeReturnPct: round3(returns.reduce((s, r) => s + r, 0)),
  };
}

export function evaluateMarketDependency(
  us: ForwardMarketDependencyCohortMetrics,
  regional: ForwardMarketDependencyCohortMetrics[],
): { verdict: ForwardMarketDependencyVerdict; verdictJa: string } {
  const nonUs = regional.filter((c) => c.cohortId !== 'us');
  const withData = nonUs.filter((c) => c.tradeCount >= 3);
  const meaningful = nonUs.filter((c) => c.tradeCount >= 5);

  if (us.tradeCount === 0) {
    return { verdict: 'mixed', verdictJa: '米国ベースラインの実行トレードが不足。' };
  }
  if (withData.length === 0) {
    return {
      verdict: 'mixed',
      verdictJa: '非米国コホートのサンプル不足（各3件未満）。市場依存性は判定不能。',
    };
  }

  const strongRegional = meaningful.filter(
    (c) =>
      c.winRatePct >= us.winRatePct - 15 &&
      c.cumulativeReturnPct > 0 &&
      (c.avgReturnPct ?? 0) > 0,
  );
  const weakRegional = withData.filter(
    (c) =>
      c.winRatePct < us.winRatePct - 20 ||
      c.cumulativeReturnPct <= 0 ||
      (c.avgReturnPct ?? 0) <= 0,
  );

  const usStrong = us.winRatePct >= 75 && us.cumulativeReturnPct > 20;

  if (strongRegional.length >= 2 && usStrong) {
    const names = strongRegional.map((c) => c.labelJa).join('・');
    return {
      verdict: 'universal_reversal',
      verdictJa:
        `高VIX後リバーサルは米国特有ではない可能性が高い: ${names}が米国(WR${us.winRatePct}%/` +
        `累積${us.cumulativeReturnPct}%)と同程度の好成績。` +
        `同一ルール(SPY63+VIX24)でも他地域ETFで再現。`,
    };
  }

  if (usStrong && weakRegional.length >= withData.length - 1 && strongRegional.length === 0) {
    return {
      verdict: 'us_specific',
      verdictJa:
        `米国特有の現象の可能性: 米国WR${us.winRatePct}%・累積${us.cumulativeReturnPct}%に対し、` +
        `非米国コホートは勝率・累積ともに劣後。高VIX後リバーサルは米国配当ETFに限定されうる。`,
    };
  }

  if (strongRegional.length >= 1 && weakRegional.length >= 1) {
    const strong = strongRegional.map((c) => `${c.labelJa}(WR${c.winRatePct}%)`).join('、');
    const weak = weakRegional.map((c) => `${c.labelJa}(WR${c.winRatePct}%)`).join('、');
    return {
      verdict: 'partial_universal',
      verdictJa:
        `部分的に再現: 好調=${strong} / 弱い=${weak}。` +
        `米国(WR${us.winRatePct}%)と比較し地域差あり。`,
    };
  }

  return {
    verdict: 'mixed',
    verdictJa:
      `混合・サンプル制約: 米国${us.tradeCount}件 WR${us.winRatePct}% · ` +
      `非米国${withData.map((c) => `${c.labelJa}${c.tradeCount}件`).join(' · ')}。`,
  };
}

function buildComparison(
  cohorts: ForwardMarketDependencyCohortMetrics[],
): ForwardMarketDependencyCompareRow[] {
  const byId = (id: ForwardMarketDependencyCohortId) =>
    cohorts.find((c) => c.cohortId === id);
  const us = byId('us')!;
  const europe = byId('europe')!;
  const japan = byId('japan')!;
  const global = byId('global')!;
  const developed = byId('developed')!;

  const fmtPct = (v: number | null, suffix = '%') => (v != null ? `${v}${suffix}` : '—');

  return [
    {
      metricJa: '件数',
      usBaseline: String(us.tradeCount),
      europe: String(europe.tradeCount),
      japan: String(japan.tradeCount),
      global: String(global.tradeCount),
      developed: String(developed.tradeCount),
    },
    {
      metricJa: '勝率',
      usBaseline: fmtPct(us.winRatePct),
      europe: fmtPct(europe.winRatePct),
      japan: fmtPct(japan.winRatePct),
      global: fmtPct(global.winRatePct),
      developed: fmtPct(developed.winRatePct),
    },
    {
      metricJa: '平均利益率',
      usBaseline: fmtPct(us.avgReturnPct),
      europe: fmtPct(europe.avgReturnPct),
      japan: fmtPct(japan.avgReturnPct),
      global: fmtPct(global.avgReturnPct),
      developed: fmtPct(developed.avgReturnPct),
    },
    {
      metricJa: '最大DD',
      usBaseline: fmtPct(us.maxDrawdownPct),
      europe: fmtPct(europe.maxDrawdownPct),
      japan: fmtPct(japan.maxDrawdownPct),
      global: fmtPct(global.maxDrawdownPct),
      developed: fmtPct(developed.maxDrawdownPct),
    },
    {
      metricJa: '累積利益率',
      usBaseline: fmtPct(us.cumulativeReturnPct),
      europe: fmtPct(europe.cumulativeReturnPct),
      japan: fmtPct(japan.cumulativeReturnPct),
      global: fmtPct(global.cumulativeReturnPct),
      developed: fmtPct(developed.cumulativeReturnPct),
    },
  ];
}

function pad(s: string, w: number): string {
  return s.length >= w ? s : s + ' '.repeat(w - s.length);
}

function runCohortOperational(
  bundle: SurvivorshipOhlcvBundle,
  symbols: string[],
  fromDate: string,
  toDate: string,
): ForwardPassedTradeRecord[] {
  const available = symbols.filter((s) => bundle.fetchedSymbols.includes(s));
  if (available.length === 0) return [];
  const passed = collectPassedTradesForSymbols(bundle, available, fromDate, toDate);
  const vixFiltered = filterVixGteTrades(passed, bundle.vixBars, VIX_THRESHOLD);
  const priority = buildCohortPriority(available);
  return simulateOperationalTradesWithPriority(vixFiltered, priority).executed;
}

export async function fetchMarketDependencyAuditBundle(
  startDate = EXTENDED_AUDIT_START,
): Promise<SurvivorshipOhlcvBundle | null> {
  const allSymbols = uniqueSymbols([
    ...BASELINE_4,
    ...MARKET_DEPENDENCY_ALL_REGIONAL,
  ]);
  const etfBars: Record<string, OhlcvBar[]> = {};
  const fetchedSymbols: string[] = [];
  const failedSymbols: string[] = [];
  const firstBarDates: Record<string, string> = {};

  for (const sym of allSymbols) {
    const { bars, result } = await fetchForwardOhlcvDetailed(sym, 15_000, startDate);
    if (!result.ok || bars.length < 80) {
      failedSymbols.push(sym);
      continue;
    }
    etfBars[sym] = bars;
    fetchedSymbols.push(sym);
    firstBarDates[sym] = bars[0]!.date;
  }

  if (!fetchedSymbols.some((s) => BASELINE_4.includes(s))) return null;

  const spyFetch = await fetchForwardOhlcvDetailed('SPY', 15_000, startDate);
  if (!spyFetch.result.ok) return null;

  const vixFetch = await fetchForwardOhlcvDetailed('^VIX', 15_000, startDate);
  const spyBars = spyFetch.bars;
  const vixBars = vixFetch.result.ok ? vixFetch.bars : [];

  const dateSet = new Set<string>();
  for (const sym of fetchedSymbols) {
    for (const b of etfBars[sym] ?? []) dateSet.add(b.date);
  }
  const tradingDates = [...dateSet].sort();
  const latestDate = tradingDates[tradingDates.length - 1] ?? '';

  return {
    etfBars,
    spyBars,
    vixBars,
    tradingDates,
    latestDate,
    fetchedSymbols,
    failedSymbols,
    firstBarDates,
  };
}

export function auditMarketDependency(input: {
  bundle: SurvivorshipOhlcvBundle;
  fromDate?: string;
}): ForwardMarketDependencyAuditReport {
  const fromDate = input.fromDate ?? EXTENDED_AUDIT_START;
  const toDate = input.bundle.latestDate;

  const cohortMetrics: ForwardMarketDependencyCohortMetrics[] = COHORT_DEFS.map((def) => {
    const symbols = [...def.symbols].filter((s) => input.bundle.fetchedSymbols.includes(s));
    const executed = runCohortOperational(input.bundle, symbols, fromDate, toDate);
    return buildMarketDependencyCohortMetrics(def.id, def.labelJa, symbols, executed);
  });

  const usBaseline = cohortMetrics.find((c) => c.cohortId === 'us')!;
  const regionalOnly = cohortMetrics.filter((c) => c.cohortId !== 'us');

  const combinedNonUsSymbols = MARKET_DEPENDENCY_ALL_REGIONAL.filter((s) =>
    input.bundle.fetchedSymbols.includes(s),
  );
  const combinedNonUsExecuted = runCohortOperational(
    input.bundle,
    combinedNonUsSymbols,
    fromDate,
    toDate,
  );
  const combinedNonUs = buildMarketDependencyCohortMetrics(
    'combined_non_us',
    '非米国統合',
    combinedNonUsSymbols,
    combinedNonUsExecuted,
  );

  const allMarketSymbols = uniqueSymbols([...BASELINE_4, ...combinedNonUsSymbols]).filter((s) =>
    input.bundle.fetchedSymbols.includes(s),
  );
  const allMarketsExecuted = runCohortOperational(
    input.bundle,
    allMarketSymbols,
    fromDate,
    toDate,
  );
  const allMarkets = buildMarketDependencyCohortMetrics(
    'all_markets',
    '全市場統合',
    allMarketSymbols,
    allMarketsExecuted,
  );

  const comparison = buildComparison(cohortMetrics);
  const { verdict, verdictJa } = evaluateMarketDependency(usBaseline, regionalOnly);

  const verdictLabel: Record<ForwardMarketDependencyVerdict, string> = {
    universal_reversal: '汎用リバーサル',
    us_specific: '米国特有',
    partial_universal: '部分的再現',
    mixed: '混合/不足',
  };

  const fmtLine = (m: ForwardMarketDependencyCohortMetrics) =>
    `${m.labelJa}: ${m.tradeCount}件 · WR${m.winRatePct}% · 均R${m.avgReturnPct ?? '—'}% · DD${m.maxDrawdownPct ?? '—'}% · 累積${m.cumulativeReturnPct}%`;

  const humanLines = [
    `【最重要監査その13】市場依存性 ${fromDate} ～ ${toDate}`,
    `固定条件: ${FIXED_CONDITIONS_JA}`,
    NOTE_JA,
    '監査のみ · ルール変更なし',
    '',
    `取得ETF ${input.bundle.fetchedSymbols.length}銘柄 · 失敗 ${input.bundle.failedSymbols.join(', ') || 'なし'}`,
    '',
    '■ コホート別（各ユニバース内で独立運用）',
    ...cohortMetrics.map(fmtLine),
    '',
    `■ 非米国統合: ${fmtLine(combinedNonUs)}`,
    `■ 全市場統合: ${fmtLine(allMarkets)}`,
    '',
    '■ 比較表',
    pad('指標', 12) +
      pad('米国4', 10) +
      pad('欧州', 10) +
      pad('日本', 10) +
      pad('全世界', 10) +
      pad('先進国', 10),
    ...comparison.map(
      (r) =>
        pad(r.metricJa, 12) +
        pad(r.usBaseline, 10) +
        pad(r.europe, 10) +
        pad(r.japan, 10) +
        pad(r.global, 10) +
        pad(r.developed, 10),
    ),
    '',
    '■ 上場開始日',
    ...combinedNonUsSymbols.map((s) => `${s}: ${input.bundle.firstBarDates[s] ?? '—'}`),
    '',
    `■ 市場依存性: 【${verdictLabel[verdict]}】`,
    verdictJa,
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate,
    toDate,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    noteJa: NOTE_JA,
    cohorts: cohortMetrics,
    usBaseline,
    combinedNonUs,
    allMarkets,
    comparison,
    fetchedSymbols: input.bundle.fetchedSymbols,
    failedSymbols: input.bundle.failedSymbols,
    firstBarDates: input.bundle.firstBarDates,
    dependencyVerdict: verdict,
    dependencyVerdictJa: verdictJa,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export async function runMarketDependencyAudit(): Promise<ForwardMarketDependencyAuditReport | null> {
  const bundle = await fetchMarketDependencyAuditBundle();
  if (!bundle) return null;
  return auditMarketDependency({ bundle });
}

export function formatMarketDependencyCsv(report: ForwardMarketDependencyAuditReport): string {
  const row = (m: ForwardMarketDependencyCohortMetrics) =>
    [
      m.cohortId,
      m.labelJa,
      m.symbols.join(';'),
      m.tradeCount,
      m.winRatePct,
      m.avgReturnPct ?? '',
      m.maxDrawdownPct ?? '',
      m.cumulativeReturnPct,
    ].join(',');

  return [
    'cohortId,labelJa,symbols,tradeCount,winRatePct,avgReturnPct,maxDrawdownPct,cumulativeReturnPct',
    ...report.cohorts.map(row),
    row(report.combinedNonUs),
    row(report.allMarkets),
    '',
    'metric,us,europe,japan,global,developed',
    ...report.comparison.map((r) =>
      [r.metricJa, r.usBaseline, r.europe, r.japan, r.global, r.developed].join(','),
    ),
    '',
    `dependencyVerdict,${report.dependencyVerdict}`,
    `failedSymbols,"${report.failedSymbols.join(';')}"`,
  ].join('\n');
}
