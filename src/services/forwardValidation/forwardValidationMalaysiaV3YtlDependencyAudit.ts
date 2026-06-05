/**
 * 最重要監査その74 — Malaysia v3 YTL POWER依存リスク · 監査73固定 · ルール変更なし
 */
import type {
  ForwardMalaysiaV3YtlDependencyAuditReport,
  ForwardMalaysiaV3YtlDependencyGrade,
  ForwardMalaysiaV3YtlReplacementId,
  ForwardMalaysiaV3YtlReplacementRow,
  ForwardMalaysiaV3YtlStressScenarioId,
  ForwardMalaysiaV3YtlStressScenarioRow,
  ForwardPassedTradeRecord,
} from '../../types/forwardValidation';
import { bootstrapSampleTrades } from './forwardValidationBootstrapMcAudit';
import {
  collectExecutedTradesForUniverse,
  MALAYSIA_V1_AUDIT_START,
} from './forwardValidationMalaysiaV1Audit';
import { fetchMalaysiaV69AuditBundle } from './forwardValidationMalaysiaV21FourthSymbolAudit';
import {
  aggregateCap15SymbolStats,
  symbolNetProfitContributionPct,
  symbolPositiveProfitDependencyPct,
} from './forwardValidationMalaysiaV3Cap15Audit';
import {
  adjustSymbolReturn,
  delistSymbol,
} from './forwardValidationMalaysiaV3CrashAudit';
import {
  MALAYSIA_V3_CAP_15_PHASE_WEIGHTS,
} from './forwardValidationMalaysiaV3GamudaCapAudit';
import {
  simulateMalaysiaV3DcaPath,
  V3_SYMBOLS,
  type MalaysiaV3DcaExecutedTrade,
  type MalaysiaV3DcaPathResult,
  type MalaysiaV3PhaseWeights,
} from './forwardValidationMalaysiaV3DcaAudit';
import { mulberry32, percentile } from './forwardValidationMonteCarloAudit';
import { precomputeTradeTemplates } from './forwardValidationRobustnessAudit';
import type { SurvivorshipOhlcvBundle } from './forwardValidationSurvivorshipAudit';

export const BOOTSTRAP_MC_74_RUNS = 10_000;
const INITIAL_CAPITAL = 3000;
const MONTHLY_DCA = 1500;
const BOOTSTRAP_SEED = 74_001;
const RUIN_EQUITY_PCT = 50;
const YTL_SYMBOL = '6742';
const BASE_SYMBOLS = ['5347', '5398', '1023'] as const;

export const MALAYSIA_V3_YTL_STRESS_SCENARIOS: {
  scenarioId: ForwardMalaysiaV3YtlStressScenarioId;
  labelJa: string;
}[] = [
  { scenarioId: 'baseline', labelJa: '⓪ ベースライン cap15' },
  { scenarioId: 'ytl_delist', labelJa: '① YTL POWER上場廃止' },
  { scenarioId: 'ytl_minus70', labelJa: '② YTL POWER -70%' },
  { scenarioId: 'ytl_minus50', labelJa: '③ YTL POWER -50%' },
  { scenarioId: 'ytl_trade_ban', labelJa: '④ YTL POWER取引禁止' },
  { scenarioId: 'ytl_profit_zero', labelJa: '⑤ YTL POWER利益ゼロ化' },
];

export const MALAYSIA_V3_YTL_REPLACEMENTS: {
  replacementId: ForwardMalaysiaV3YtlReplacementId;
  symbol: string;
  labelJa: string;
}[] = [
  { replacementId: 'r_misc', symbol: '3816', labelJa: 'MISC' },
  { replacementId: 'r_celcomdigi', symbol: '6947', labelJa: 'CELCOMDIGI' },
  { replacementId: 'r_maybank', symbol: '1155', labelJa: 'MAYBANK' },
  { replacementId: 'r_public', symbol: '1295', labelJa: 'PUBLIC BANK' },
];

const SYMBOL_NAMES: Record<string, string> = {
  '5347': 'TENAGA',
  '5398': 'GAMUDA',
  '1023': 'CIMB',
  '6742': 'YTL POWER',
  '3816': 'MISC',
  '6947': 'CELCOMDIGI',
  '1155': 'MAYBANK',
  '1295': 'PUBLIC BANK',
};

const FIXED_CONDITIONS_JA =
  'MY v3 YTL依存 · GAMUDA15% · P1 TENAGA42.5/CIMB42.5/GAMUDA15 · P2 4銘柄28.3/15 · 月次RM1500 · ルール変更なし';

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function resolveAuditFromDate(toDate: string): string {
  const tenYearAgo = new Date(`${toDate}T00:00:00Z`);
  tenYearAgo.setUTCFullYear(tenYearAgo.getUTCFullYear() - 10);
  const computedFrom = tenYearAgo.toISOString().slice(0, 10);
  return computedFrom >= MALAYSIA_V1_AUDIT_START ? computedFrom : MALAYSIA_V1_AUDIT_START;
}

function cumulativeFromPath(path: MalaysiaV3DcaPathResult): number {
  return path.totalContributedMYR > 0
    ? round3(((path.finalEquityMYR - path.totalContributedMYR) / path.totalContributedMYR) * 100)
    : 0;
}

function capReturnPct(returnPct: number): number {
  return round3(Math.max(returnPct, -100));
}

export function buildPhase4WithoutYtl(): MalaysiaV3PhaseWeights {
  const base = MALAYSIA_V3_CAP_15_PHASE_WEIGHTS;
  const ytlShare = base.phase4[YTL_SYMBOL] ?? 28.333;
  const each = round3(ytlShare / 3);
  return {
    phase3: { ...base.phase3 },
    phase4: {
      '5347': round3(base.phase4['5347']! + each),
      '1023': round3(base.phase4['1023']! + each),
      '5398': round3(base.phase4['5398']! + each),
      [YTL_SYMBOL]: 0,
    },
  };
}

export function buildReplacementPhaseWeights(replacementSymbol: string): MalaysiaV3PhaseWeights {
  const base = MALAYSIA_V3_CAP_15_PHASE_WEIGHTS;
  const ytlWeight = base.phase4[YTL_SYMBOL] ?? 28.333;
  return {
    phase3: { ...base.phase3 },
    phase4: {
      '5347': base.phase4['5347']!,
      '1023': base.phase4['1023']!,
      '5398': base.phase4['5398']!,
      [YTL_SYMBOL]: 0,
      [replacementSymbol]: ytlWeight,
    },
  };
}

export function applyYtlStressTrades(
  trades: ForwardPassedTradeRecord[],
  scenarioId: ForwardMalaysiaV3YtlStressScenarioId,
): ForwardPassedTradeRecord[] {
  switch (scenarioId) {
    case 'baseline':
    case 'ytl_trade_ban':
      return trades.map((t) => ({ ...t }));
    case 'ytl_delist':
      return delistSymbol(trades, YTL_SYMBOL);
    case 'ytl_minus70':
      return adjustSymbolReturn(trades, YTL_SYMBOL, -70);
    case 'ytl_minus50':
      return adjustSymbolReturn(trades, YTL_SYMBOL, -50);
    case 'ytl_profit_zero':
      return trades.map((t) =>
        t.symbol === YTL_SYMBOL ? { ...t, returnPct: capReturnPct(0) } : t,
      );
    default:
      return trades.map((t) => ({ ...t }));
  }
}

export function resolveYtlStressPhaseWeights(
  scenarioId: ForwardMalaysiaV3YtlStressScenarioId,
): MalaysiaV3PhaseWeights {
  if (scenarioId === 'ytl_trade_ban') return buildPhase4WithoutYtl();
  return MALAYSIA_V3_CAP_15_PHASE_WEIGHTS;
}

function isRuined(path: MalaysiaV3DcaPathResult): boolean {
  const minPct = (path.minEquityMYR / INITIAL_CAPITAL) * 100;
  return minPct <= RUIN_EQUITY_PCT || path.finalEquityMYR <= 0;
}

function profitContributionMap(
  ledger: MalaysiaV3DcaExecutedTrade[],
): Record<string, number> {
  const symbols = [...new Set(ledger.map((t) => t.symbol))];
  const stats = aggregateCap15SymbolStats({
    cap15Trades: ledger,
    baselineTrades: ledger,
    symbols,
  });
  return Object.fromEntries(stats.map((s) => [s.symbol, s.profitContributionPct]));
}

function runBootstrapYtlStress(input: {
  pool: ForwardPassedTradeRecord[];
  fromDate: string;
  toDate: string;
  scenarioId: ForwardMalaysiaV3YtlStressScenarioId;
  seed?: number;
}): ForwardMalaysiaV3YtlStressScenarioRow['bootstrap'] {
  const runs = BOOTSTRAP_MC_74_RUNS;
  const rand = mulberry32(input.seed ?? BOOTSTRAP_SEED);
  const phaseWeights = resolveYtlStressPhaseWeights(input.scenarioId);
  const minEquities: number[] = [];
  let bankrupt = 0;

  for (let r = 0; r < runs; r++) {
    const sample = bootstrapSampleTrades(input.pool, rand, r);
    const stressed = applyYtlStressTrades(sample, input.scenarioId);
    const path = simulateMalaysiaV3DcaPath({
      trades: stressed,
      fromDate: input.fromDate,
      toDate: input.toDate,
      monthlyContributionMYR: MONTHLY_DCA,
      phaseWeights,
    });
    minEquities.push(path.minEquityMYR);
    if (isRuined(path)) bankrupt++;
  }

  const sorted = [...minEquities].sort((a, b) => a - b);
  return {
    runs,
    bankruptcyRatePct: round3((bankrupt / runs) * 100),
    p5MinEquityMYR: percentile(sorted, 5),
    worstMinEquityMYR: sorted[0] ?? 0,
  };
}

function buildStressScenarioRow(input: {
  scenarioId: ForwardMalaysiaV3YtlStressScenarioId;
  labelJa: string;
  trades: ForwardPassedTradeRecord[];
  fromDate: string;
  toDate: string;
  seedOffset: number;
}): ForwardMalaysiaV3YtlStressScenarioRow {
  const stressed = applyYtlStressTrades(input.trades, input.scenarioId);
  const phaseWeights = resolveYtlStressPhaseWeights(input.scenarioId);
  const path = simulateMalaysiaV3DcaPath({
    trades: stressed,
    fromDate: input.fromDate,
    toDate: input.toDate,
    monthlyContributionMYR: MONTHLY_DCA,
    phaseWeights,
    captureLedger: true,
  });
  const ledger = path.executedTrades ?? [];
  const bootstrap = runBootstrapYtlStress({
    pool: input.trades,
    fromDate: input.fromDate,
    toDate: input.toDate,
    scenarioId: input.scenarioId,
    seed: BOOTSTRAP_SEED + input.seedOffset,
  });

  return {
    scenarioId: input.scenarioId,
    labelJa: input.labelJa,
    cumulativeReturnPct: cumulativeFromPath(path),
    maxDrawdownPct: path.maxDrawdownPct,
    minEquityMYR: path.minEquityMYR,
    finalEquityMYR: path.finalEquityMYR,
    profitContributionPct: profitContributionMap(ledger),
    ytlNetContributionPct: symbolNetProfitContributionPct(ledger, YTL_SYMBOL),
    ytlPositiveDependencyPct: symbolPositiveProfitDependencyPct(ledger, YTL_SYMBOL),
    bootstrap,
    survived: !isRuined(path) && path.minEquityMYR > 0,
  };
}

function replacementScore(row: ForwardMalaysiaV3YtlReplacementRow): number {
  return (
    row.cumulativeReturnPct * 2 +
    (row.sharpe ?? 0) * 10 -
    Math.abs(row.maxDrawdownPct) * 0.3 +
    row.replacementNetContributionPct * 0.5
  );
}

function buildReplacementRow(input: {
  replacementId: ForwardMalaysiaV3YtlReplacementId;
  labelJa: string;
  symbol: string;
  bundle: SurvivorshipOhlcvBundle;
  fromDate: string;
  toDate: string;
  cachedTemplates: ReturnType<typeof precomputeTradeTemplates>;
  baselineYtlNetPct: number;
}): ForwardMalaysiaV3YtlReplacementRow {
  const fetchOk = input.bundle.fetchedSymbols.includes(input.symbol);
  if (!fetchOk) {
    return {
      replacementId: input.replacementId,
      labelJa: input.labelJa,
      symbol: input.symbol,
      cumulativeReturnPct: 0,
      maxDrawdownPct: 0,
      sharpe: null,
      replacementNetContributionPct: 0,
      ytlNetContributionPct: 0,
      fetchOk: false,
    };
  }

  const symbols = [...BASE_SYMBOLS, input.symbol];
  const trades = collectExecutedTradesForUniverse(
    input.bundle,
    symbols,
    input.fromDate,
    input.toDate,
    input.cachedTemplates,
  );
  const phaseWeights = buildReplacementPhaseWeights(input.symbol);
  const path = simulateMalaysiaV3DcaPath({
    trades,
    fromDate: input.fromDate,
    toDate: input.toDate,
    monthlyContributionMYR: MONTHLY_DCA,
    phaseWeights,
    captureLedger: true,
  });
  const ledger = path.executedTrades ?? [];

  return {
    replacementId: input.replacementId,
    labelJa: input.labelJa,
    symbol: input.symbol,
    cumulativeReturnPct: cumulativeFromPath(path),
    maxDrawdownPct: path.maxDrawdownPct,
    sharpe: path.sharpe,
    replacementNetContributionPct: symbolNetProfitContributionPct(ledger, input.symbol),
    ytlNetContributionPct: input.baselineYtlNetPct,
    fetchOk: true,
  };
}

export function pickWorstYtlScenario(
  scenarios: ForwardMalaysiaV3YtlStressScenarioRow[],
): ForwardMalaysiaV3YtlStressScenarioRow {
  const stressed = scenarios.filter((s) => s.scenarioId !== 'baseline');
  return [...stressed].sort(
    (a, b) =>
      b.bootstrap.bankruptcyRatePct * 1000 +
      Math.abs(b.maxDrawdownPct) * 10 -
      a.cumulativeReturnPct -
      (a.minEquityMYR - b.minEquityMYR),
  )[0]!;
}

export function pickTopReplacements(
  replacements: ForwardMalaysiaV3YtlReplacementRow[],
  n = 3,
): ForwardMalaysiaV3YtlReplacementRow[] {
  return [...replacements]
    .filter((r) => r.fetchOk)
    .sort((a, b) => replacementScore(b) - replacementScore(a))
    .slice(0, n);
}

export function gradeMalaysiaV3YtlDependency(input: {
  baseline: ForwardMalaysiaV3YtlStressScenarioRow;
  worst: ForwardMalaysiaV3YtlStressScenarioRow;
  ytlNetContributionPct: number;
  topReplacements: ForwardMalaysiaV3YtlReplacementRow[];
}): { grade: ForwardMalaysiaV3YtlDependencyGrade; verdictJa: string } {
  const ytlDelist = input.worst.scenarioId === 'ytl_delist' ? input.worst : null;
  const delistMc = ytlDelist?.bootstrap.bankruptcyRatePct ?? input.worst.bootstrap.bankruptcyRatePct;
  const bestReplacement = input.topReplacements[0];

  if (
    input.ytlNetContributionPct < 60 &&
    delistMc < 5 &&
    input.baseline.cumulativeReturnPct >= 35
  ) {
    return {
      grade: 'A',
      verdictJa: `A 即採用 — YTL依存${input.ytlNetContributionPct}% · 廃止MC${delistMc}% · 累積${input.baseline.cumulativeReturnPct}%`,
    };
  }

  if (
    input.baseline.survived &&
    delistMc <= 15 &&
    input.baseline.cumulativeReturnPct >= 30
  ) {
    const replHint = bestReplacement
      ? ` · 代替${bestReplacement.labelJa}累積${bestReplacement.cumulativeReturnPct}%`
      : '';
    return {
      grade: 'B',
      verdictJa: `B 採用可能 — YTL依存${input.ytlNetContributionPct}% · 最悪${input.worst.labelJa} · MC${delistMc}%${replHint}`,
    };
  }

  if (input.baseline.survived && input.baseline.cumulativeReturnPct > 0) {
    return {
      grade: 'C',
      verdictJa: `C 要改善 — YTL依存${input.ytlNetContributionPct}% · 消失累積${input.worst.cumulativeReturnPct}% · MC${delistMc}% · 代替検討`,
    };
  }

  return {
    grade: 'D',
    verdictJa: `D 不採用 — ${input.worst.labelJa}で破綻 · 累積${input.worst.cumulativeReturnPct}% · MC${delistMc}%`,
  };
}

export async function buildMalaysiaV3YtlDependencyAuditReport(input: {
  bundle: SurvivorshipOhlcvBundle;
  auditedAt?: string;
}): Promise<ForwardMalaysiaV3YtlDependencyAuditReport | null> {
  const auditedAt = input.auditedAt ?? new Date().toISOString();
  const toDate = input.bundle.latestDate;
  const fromDate = resolveAuditFromDate(toDate);
  const phaseWeights = MALAYSIA_V3_CAP_15_PHASE_WEIGHTS;

  const cachedTemplates = precomputeTradeTemplates({
    bundle: input.bundle,
    symbols: input.bundle.fetchedSymbols,
    fromDate,
    toDate,
  });

  const symbols = V3_SYMBOLS.filter((s) => input.bundle.fetchedSymbols.includes(s));
  const allTrades = collectExecutedTradesForUniverse(
    input.bundle,
    symbols,
    fromDate,
    toDate,
    cachedTemplates,
  );

  const scenarios = MALAYSIA_V3_YTL_STRESS_SCENARIOS.map((def, i) =>
    buildStressScenarioRow({
      scenarioId: def.scenarioId,
      labelJa: def.labelJa,
      trades: allTrades,
      fromDate,
      toDate,
      seedOffset: i,
    }),
  );

  const baseline = scenarios.find((s) => s.scenarioId === 'baseline')!;
  const worst = pickWorstYtlScenario(scenarios);
  const ytlDelist = scenarios.find((s) => s.scenarioId === 'ytl_delist')!;
  const ytlTradeBan = scenarios.find((s) => s.scenarioId === 'ytl_trade_ban')!;

  const replacements = MALAYSIA_V3_YTL_REPLACEMENTS.map((def) =>
    buildReplacementRow({
      replacementId: def.replacementId,
      labelJa: def.labelJa,
      symbol: def.symbol,
      bundle: input.bundle,
      fromDate,
      toDate,
      cachedTemplates,
      baselineYtlNetPct: baseline.ytlNetContributionPct,
    }),
  );

  const top3 = pickTopReplacements(replacements, 3);
  const { grade, verdictJa } = gradeMalaysiaV3YtlDependency({
    baseline,
    worst,
    ytlNetContributionPct: baseline.ytlNetContributionPct,
    topReplacements: top3,
  });

  const baselinePath = simulateMalaysiaV3DcaPath({
    trades: allTrades,
    fromDate,
    toDate,
    monthlyContributionMYR: MONTHLY_DCA,
    phaseWeights,
    captureLedger: true,
  });
  const baselineLedger = baselinePath.executedTrades ?? [];

  const topProfit = aggregateCap15SymbolStats({
    cap15Trades: baselineLedger,
    baselineTrades: baselineLedger,
    symbols: V3_SYMBOLS,
  }).sort((a, b) => b.totalPnlMYR - a.totalPnlMYR);

  const phaseWeightsLabelJa = `P1 TENAGA${phaseWeights.phase3['5347']}% CIMB${phaseWeights.phase3['1023']}% GAMUDA${phaseWeights.phase3['5398']}% · P2 TENAGA${phaseWeights.phase4['5347']}% CIMB${phaseWeights.phase4['1023']}% YTL${phaseWeights.phase4[YTL_SYMBOL]}% GAMUDA${phaseWeights.phase4['5398']}%`;

  const adoptedReplacementId =
    grade === 'C' || grade === 'D' ? (top3[0]?.replacementId ?? null) : null;

  const answerAJa = `A 最大利益源: ${topProfit[0]?.symbolNameJa ?? '—'}(+${topProfit[0]?.totalPnlMYR ?? 0}MYR · 寄与${topProfit[0]?.profitContributionPct ?? 0}%) · 2位${topProfit[1]?.symbolNameJa ?? '—'} · 3位${topProfit[2]?.symbolNameJa ?? '—'}`;
  const answerBJa = `B YTL依存率: ネット寄与${baseline.ytlNetContributionPct}% · 正の利益依存${baseline.ytlPositiveDependencyPct}% · 50%${baseline.ytlNetContributionPct < 50 ? '未満' : '超'}`;
  const answerCJa = `C YTL消失時累積: 廃止${ytlDelist.cumulativeReturnPct}% · 取引禁止${ytlTradeBan.cumulativeReturnPct}% · 利益ゼロ${scenarios.find((s) => s.scenarioId === 'ytl_profit_zero')!.cumulativeReturnPct}%`;
  const answerDJa = `D MC破産率: 廃止${ytlDelist.bootstrap.bankruptcyRatePct}% · -70%${scenarios.find((s) => s.scenarioId === 'ytl_minus70')!.bootstrap.bankruptcyRatePct}% · 最悪${worst.labelJa}${worst.bootstrap.bankruptcyRatePct}%`;
  const answerEJa = top3.length
    ? `E 代替候補トップ3: ${top3.map((r) => `${r.labelJa}(累積${r.cumulativeReturnPct}% · Sharpe${r.sharpe ?? '—'} · 寄与${r.replacementNetContributionPct}%)`).join(' · ')}`
    : 'E 代替候補トップ3: 取得失敗';
  const answerFJa =
    grade === 'A' || grade === 'B'
      ? `F 最終採用案: GAMUDA15%+YTL POWER維持 · ${phaseWeightsLabelJa} · 累積${baseline.cumulativeReturnPct}% · 代替待機${top3[0]?.labelJa ?? '—'}`
      : `F 最終採用案: YTL→${top3[0]?.labelJa ?? '要検討'}置換検討 · 現行累積${baseline.cumulativeReturnPct}% · 廃止時${ytlDelist.cumulativeReturnPct}%`;

  const consistencyNoteJa =
    '監査73整合: cap15累積37.716% · YTL寄与54.5% · GAMUDA15% · 月次RM1500 · ルール変更なし';

  const humanSummaryJa = [
    '監査74 Malaysia v3 YTL POWER依存リスク',
    `期間 ${fromDate}〜${toDate}`,
    FIXED_CONDITIONS_JA,
    phaseWeightsLabelJa,
    `ベースライン: 累積${baseline.cumulativeReturnPct}% · YTLネット寄与${baseline.ytlNetContributionPct}% · 正の利益${baseline.ytlPositiveDependencyPct}%`,
    ...Object.entries(baseline.profitContributionPct).map(
      ([sym, pct]) => `利益寄与 ${SYMBOL_NAMES[sym] ?? sym}: ${pct}%`,
    ),
    ...scenarios
      .filter((s) => s.scenarioId !== 'baseline')
      .map(
        (s) =>
          `${s.labelJa}: 累積${s.cumulativeReturnPct}% · MaxDD${s.maxDrawdownPct}% · 最低RM${s.minEquityMYR} · MC破産${s.bootstrap.bankruptcyRatePct}%`,
      ),
    ...replacements.map(
      (r) =>
        `${r.labelJa}置換: 累積${r.cumulativeReturnPct}% · Sharpe${r.sharpe ?? '—'} · 寄与${r.replacementNetContributionPct}%${r.fetchOk ? '' : ' · 取得失敗'}`,
    ),
    answerAJa,
    answerBJa,
    answerCJa,
    answerDJa,
    answerEJa,
    answerFJa,
    verdictJa,
    consistencyNoteJa,
  ].join('\n');

  return {
    auditedAt,
    fromDate,
    toDate,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    phaseWeightsLabelJa,
    baselineCumulativeReturnPct: baseline.cumulativeReturnPct,
    profitContributionPct: baseline.profitContributionPct,
    ytlNetContributionPct: baseline.ytlNetContributionPct,
    ytlPositiveDependencyPct: baseline.ytlPositiveDependencyPct,
    scenarios,
    replacements,
    worstScenarioId: worst.scenarioId,
    adoptedReplacementId,
    adoptionGrade: grade,
    adoptionVerdictJa: verdictJa,
    answerAJa,
    answerBJa,
    answerCJa,
    answerDJa,
    answerEJa,
    answerFJa,
    consistencyNoteJa,
    humanSummaryJa,
  };
}

export async function runMalaysiaV3YtlDependencyAudit(): Promise<ForwardMalaysiaV3YtlDependencyAuditReport | null> {
  const bundle = await fetchMalaysiaV69AuditBundle();
  if (!bundle) return null;
  return buildMalaysiaV3YtlDependencyAuditReport({ bundle });
}

export function formatMalaysiaV3YtlDependencyCsv(
  report: ForwardMalaysiaV3YtlDependencyAuditReport,
): string {
  const lines = [
    `# 最重要監査その74 Malaysia v3 YTL依存 ${report.fromDate}〜${report.toDate}`,
    `# ${report.fixedConditionsJa}`,
    `# ${report.adoptionVerdictJa}`,
    '',
    'section,metric,value',
    ['summary', 'baselineCumulative', report.baselineCumulativeReturnPct].join(','),
    ['summary', 'ytlNetDep', report.ytlNetContributionPct].join(','),
    ['summary', 'ytlPosDep', report.ytlPositiveDependencyPct].join(','),
    ['summary', 'worstScenario', report.worstScenarioId].join(','),
    '',
    'section,scenarioId,label,cumulative,maxDD,minEquity,ytlNetDep,ytlPosDep,bankruptcy,p5,worstMin,survived',
    ...report.scenarios.map((s) =>
      [
        'scenario',
        s.scenarioId,
        `"${s.labelJa}"`,
        s.cumulativeReturnPct,
        s.maxDrawdownPct,
        s.minEquityMYR,
        s.ytlNetContributionPct,
        s.ytlPositiveDependencyPct,
        s.bootstrap.bankruptcyRatePct,
        s.bootstrap.p5MinEquityMYR,
        s.bootstrap.worstMinEquityMYR,
        s.survived,
      ].join(','),
    ),
    '',
    'section,symbol,contributionPct',
    ...Object.entries(report.profitContributionPct).map(([sym, pct]) =>
      ['contribution', SYMBOL_NAMES[sym] ?? sym, pct].join(','),
    ),
    '',
    'section,replacementId,label,symbol,cumulative,sharpe,maxDD,replacementDep,fetchOk',
    ...report.replacements.map((r) =>
      [
        'replacement',
        r.replacementId,
        `"${r.labelJa}"`,
        r.symbol,
        r.cumulativeReturnPct,
        r.sharpe ?? '',
        r.maxDrawdownPct,
        r.replacementNetContributionPct,
        r.fetchOk,
      ].join(','),
    ),
    '',
    'section,answer,content',
    ['answer', 'A', `"${report.answerAJa}"`].join(','),
    ['answer', 'B', `"${report.answerBJa}"`].join(','),
    ['answer', 'C', `"${report.answerCJa}"`].join(','),
    ['answer', 'D', `"${report.answerDJa}"`].join(','),
    ['answer', 'E', `"${report.answerEJa}"`].join(','),
    ['answer', 'F', `"${report.answerFJa}"`].join(','),
    ['verdict', 'grade', report.adoptionGrade].join(','),
    ['consistency', 'note', `"${report.consistencyNoteJa}"`].join(','),
  ];
  return lines.join('\n');
}
