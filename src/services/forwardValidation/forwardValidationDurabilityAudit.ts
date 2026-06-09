/**
 * 最重要監査その53 — 実運用耐久性 · 監査52最終ルール固定 · 監査のみ
 */
import type {
  ForwardDurabilityAuditReport,
  ForwardDurabilityCapitalMetrics,
  ForwardDurabilityCapitalModeId,
  ForwardDurabilityMcSummary,
  ForwardDurabilityOperationalGrade,
  ForwardDurabilityStressId,
  ForwardDurabilityStressMetrics,
  ForwardPassedTradeRecord,
} from '../../types/forwardValidation';
import { simulateCompoundingPath } from './forwardValidationCompoundingAudit';
import {
  simulateLotSizingPath,
  type LotPathResult,
  type LotSizingSpec,
} from './forwardValidationLotSizeAudit';
import {
  collectFullHistoryExecutedTrades,
  mulberry32,
  percentile,
  shuffleInPlace,
} from './forwardValidationMonteCarloAudit';
import { buildWalkForward31PhaseMetrics } from './forwardValidationWalkForward31Audit';
import {
  fetchRobustnessAuditBundle,
  ROBUSTNESS_ETF_UNIVERSE,
} from './forwardValidationRobustnessAudit';
import { EXTENDED_AUDIT_START } from './forwardValidationVix24ExtendedHistoryAudit';
import type { SurvivorshipOhlcvBundle } from './forwardValidationSurvivorshipAudit';

export const DURABILITY_MC_RUNS = 10_000;
const RM3000 = 3000;
const RM700_PER_SLOT = 700;
const BASE_COST_RT_PCT = 0.1;
const RUIN_EQUITY_PCT = 50;
const DEMOTED_WIN_RETURN_PCT = -2;

const FIXED_CONDITIONS_JA =
  'HDV/DGRO/QQQ/SCHD · ADX>20 · VIX≥24 · 52週高値 · SPY63 · +4%/25日 · 損切なし · 勝率重み · 3枠 · 現金15% · RM700/枠@RM3000';

export const DURABILITY_STRESS_DEFS: {
  stressId: ForwardDurabilityStressId;
  labelJa: string;
}[] = [
  { stressId: 'cost_2x', labelJa: '1 取引コスト2倍' },
  { stressId: 'cost_3x', labelJa: '2 取引コスト3倍' },
  { stressId: 'slip_05', labelJa: '3 スリッページ0.5%' },
  { stressId: 'slip_10', labelJa: '4 スリッページ1.0%' },
  { stressId: 'slip_20', labelJa: '5 スリッページ2.0%' },
  { stressId: 'win_rate_m5', labelJa: '6 勝率-5%' },
  { stressId: 'win_rate_m10', labelJa: '7 勝率-10%' },
  { stressId: 'return_m10', labelJa: '8 利益率-10%' },
  { stressId: 'return_m20', labelJa: '9 利益率-20%' },
  { stressId: 'return_m30', labelJa: '10 利益率-30%' },
];

export const DURABILITY_CAPITAL_DEFS: {
  modeId: ForwardDurabilityCapitalModeId;
  labelJa: string;
}[] = [
  { modeId: 'fixed', labelJa: '固定額RM700/枠' },
  { modeId: 'compound', labelJa: '複利' },
  { modeId: 'kelly_25', labelJa: 'Kelly 25%' },
  { modeId: 'kelly_50', labelJa: 'Kelly 50%' },
  { modeId: 'kelly_100', labelJa: 'Kelly 100%' },
];

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function mean(vals: (number | null | undefined)[]): number | null {
  const nums = vals.filter((v): v is number => v != null && Number.isFinite(v));
  if (nums.length === 0) return null;
  return round3(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function calendarYears(fromDate: string, toDate: string): number {
  const ms = new Date(toDate).getTime() - new Date(fromDate).getTime();
  return Math.max(ms / (365.25 * 24 * 3600 * 1000), 1 / 365.25);
}

function cloneTrade(t: ForwardPassedTradeRecord): ForwardPassedTradeRecord {
  return { ...t };
}

export function applyDurabilityStress(
  trades: ForwardPassedTradeRecord[],
  stressId: ForwardDurabilityStressId,
): ForwardPassedTradeRecord[] {
  switch (stressId) {
    case 'cost_2x':
      return trades.map((t) =>
        cloneTrade({ ...t, returnPct: round3(t.returnPct - BASE_COST_RT_PCT * 2) }),
      );
    case 'cost_3x':
      return trades.map((t) =>
        cloneTrade({ ...t, returnPct: round3(t.returnPct - BASE_COST_RT_PCT * 3) }),
      );
    case 'slip_05':
      return trades.map((t) => cloneTrade({ ...t, returnPct: round3(t.returnPct - 0.5) }));
    case 'slip_10':
      return trades.map((t) => cloneTrade({ ...t, returnPct: round3(t.returnPct - 1.0) }));
    case 'slip_20':
      return trades.map((t) => cloneTrade({ ...t, returnPct: round3(t.returnPct - 2.0) }));
    case 'win_rate_m5':
      return demoteWins(trades, 0.05);
    case 'win_rate_m10':
      return demoteWins(trades, 0.1);
    case 'return_m10':
      return trades.map((t) => cloneTrade({ ...t, returnPct: round3(t.returnPct * 0.9) }));
    case 'return_m20':
      return trades.map((t) => cloneTrade({ ...t, returnPct: round3(t.returnPct * 0.8) }));
    case 'return_m30':
      return trades.map((t) => cloneTrade({ ...t, returnPct: round3(t.returnPct * 0.7) }));
    default:
      return trades;
  }
}

function demoteWins(
  trades: ForwardPassedTradeRecord[],
  fraction: number,
): ForwardPassedTradeRecord[] {
  const wins = trades
    .map((t, i) => ({ t, i }))
    .filter((x) => x.t.returnPct > 0)
    .sort((a, b) => a.t.returnPct - b.t.returnPct);
  const n = Math.ceil(wins.length * fraction);
  const demoteIdx = new Set(wins.slice(0, n).map((x) => x.i));
  return trades.map((t, i) =>
    demoteIdx.has(i)
      ? cloneTrade({ ...t, returnPct: DEMOTED_WIN_RETURN_PCT })
      : cloneTrade(t),
  );
}

function profitFactorFromTrades(trades: ForwardPassedTradeRecord[]): number | null {
  const grossWin = trades.filter((t) => t.returnPct > 0).reduce((s, t) => s + t.returnPct, 0);
  const grossLoss = Math.abs(
    trades.filter((t) => t.returnPct < 0).reduce((s, t) => s + t.returnPct, 0),
  );
  if (grossLoss <= 0) return grossWin > 0 ? null : null;
  return round3(grossWin / grossLoss);
}

function pathToStressMetrics(
  stressId: ForwardDurabilityStressId,
  labelJa: string,
  path: LotPathResult,
  trades: ForwardPassedTradeRecord[],
  baselineCum: number,
): ForwardDurabilityStressMetrics {
  const phase = buildWalkForward31PhaseMetrics(labelJa, '2018-01-01', '2099-12-31', trades);
  return {
    stressId,
    labelJa,
    tradeCount: path.tradeCount,
    winRatePct: phase.winRatePct,
    profitFactor: profitFactorFromTrades(trades.slice(0, path.tradeCount)) ?? phase.profitFactor,
    sharpe: path.sharpe,
    maxDrawdownPct: path.maxDrawdownPct,
    cumulativeReturnPct: path.cumulativeReturnPct,
    finalEquityMYR: path.finalEquity,
    deltaCumulativeVsBaselinePt: round3(path.cumulativeReturnPct - baselineCum),
  };
}

function winRateSpec(): LotSizingSpec {
  return {
    kind: 'win_rate',
    schemeId: 'win_rate_baseline',
    labelJa: '勝率重み（現行）',
  };
}

function kellySpec(fraction: number): LotSizingSpec {
  return {
    kind: 'kelly',
    schemeId: `kelly_${Math.round(fraction * 100)}`,
    labelJa: `Kelly ${Math.round(fraction * 100)}%`,
    kellyFraction: fraction,
  };
}

export function simulateRm3000WinRatePath(
  trades: ForwardPassedTradeRecord[],
  symbols: string[],
): LotPathResult {
  return simulateLotSizingPath({
    trades,
    symbols,
    spec: winRateSpec(),
    initialCapitalMYR: RM3000,
  });
}

export function isRuinPath(path: LotPathResult): boolean {
  return path.minEquityPct <= RUIN_EQUITY_PCT || path.finalEquity <= 0;
}

export function runDurabilityMonteCarlo(input: {
  trades: ForwardPassedTradeRecord[];
  symbols: string[];
  runs?: number;
  seed?: number;
}): ForwardDurabilityMcSummary {
  const runs = input.runs ?? DURABILITY_MC_RUNS;
  const rand = mulberry32(input.seed ?? 53_001);
  const cumulatives: number[] = [];
  const maxDds: number[] = [];
  const sharpes: number[] = [];
  const pfs: number[] = [];
  let bankrupt = 0;

  for (let i = 0; i < runs; i++) {
    const shuffled = shuffleInPlace([...input.trades], rand);
    const path = simulateRm3000WinRatePath(shuffled, input.symbols);
    cumulatives.push(path.cumulativeReturnPct);
    maxDds.push(path.maxDrawdownPct ?? 0);
    if (path.sharpe != null) sharpes.push(path.sharpe);
    const pf = profitFactorFromTrades(shuffled);
    if (pf != null) pfs.push(pf);
    if (isRuinPath(path)) bankrupt++;
  }

  const sortedCum = [...cumulatives].sort((a, b) => a - b);
  const sortedDd = [...maxDds].sort((a, b) => a - b);

  return {
    runs,
    meanCumulativePct: mean(cumulatives) ?? 0,
    medianCumulativePct: percentile(sortedCum, 50),
    ci95LowPct: percentile(sortedCum, 2.5),
    ci95HighPct: percentile(sortedCum, 97.5),
    worstCumulativePct: sortedCum[0] ?? 0,
    worstMaxDrawdownPct: sortedDd[0] ?? 0,
    meanSharpe: mean(sharpes),
    meanProfitFactor: mean(pfs),
    bankruptcyRatePct: round3((bankrupt / runs) * 100),
  };
}

function simulateCapitalMode(
  trades: ForwardPassedTradeRecord[],
  symbols: string[],
  modeId: ForwardDurabilityCapitalModeId,
): ForwardDurabilityCapitalMetrics {
  const def = DURABILITY_CAPITAL_DEFS.find((d) => d.modeId === modeId)!;

  if (modeId === 'fixed') {
    const path = simulateCompoundingPath({
      trades,
      modeId: 'compound_no',
      initialCapitalMYR: RM3000,
      lotPerSlotMYR: RM700_PER_SLOT,
    });
    return {
      modeId,
      labelJa: def.labelJa,
      finalEquityMYR: path.finalEquity,
      cumulativeReturnPct: path.cumulativeReturnPct,
      maxDrawdownPct: path.maxDrawdownPct,
      sharpe: path.sharpe,
      profitFactor: profitFactorFromTrades(trades),
      minEquityPct: path.minEquityPct,
      avgSlotMYR: RM700_PER_SLOT,
    };
  }

  if (modeId === 'compound') {
    const path = simulateCompoundingPath({
      trades,
      modeId: 'compound_yes',
      initialCapitalMYR: RM3000,
      lotPerSlotMYR: RM700_PER_SLOT,
    });
    return {
      modeId,
      labelJa: def.labelJa,
      finalEquityMYR: path.finalEquity,
      cumulativeReturnPct: path.cumulativeReturnPct,
      maxDrawdownPct: path.maxDrawdownPct,
      sharpe: path.sharpe,
      profitFactor: profitFactorFromTrades(trades),
      minEquityPct: path.minEquityPct,
      avgSlotMYR: round3(RM700_PER_SLOT * (path.finalEquity / RM3000)),
    };
  }

  const kellyMap: Record<string, number> = {
    kelly_25: 0.25,
    kelly_50: 0.5,
    kelly_100: 1.0,
  };
  const path = simulateLotSizingPath({
    trades,
    symbols,
    spec: kellySpec(kellyMap[modeId]!),
    initialCapitalMYR: RM3000,
  });
  return {
    modeId,
    labelJa: def.labelJa,
    finalEquityMYR: path.finalEquity,
    cumulativeReturnPct: path.cumulativeReturnPct,
    maxDrawdownPct: path.maxDrawdownPct,
    sharpe: path.sharpe,
    profitFactor: profitFactorFromTrades(trades),
    minEquityPct: path.minEquityPct,
    avgSlotMYR: path.avgSlotMYR,
  };
}

export function gradeDurabilityOperational(input: {
  monteCarlo: ForwardDurabilityMcSummary;
  worstStressCum: number;
  baselinePath: LotPathResult;
}): { grade: ForwardDurabilityOperationalGrade; verdictJa: string } {
  const { monteCarlo, worstStressCum, baselinePath } = input;

  if (
    monteCarlo.bankruptcyRatePct === 0 &&
    monteCarlo.ci95LowPct > 15 &&
    worstStressCum > 0 &&
    baselinePath.minEquityPct > 70
  ) {
    return {
      grade: 'A',
      verdictJa: 'A評価 · 即実運用 — 破産0% · ストレス耐性 · MC95%CI下限プラス',
    };
  }

  if (
    monteCarlo.bankruptcyRatePct <= 2 &&
    monteCarlo.medianCumulativePct > 10 &&
    worstStressCum > -15 &&
    baselinePath.minEquityPct > 55
  ) {
    return {
      grade: 'B',
      verdictJa: 'B評価 · 少額実運用 — 破産率低 · 固定額RM700推奨 · 監査51-52整合',
    };
  }

  if (monteCarlo.bankruptcyRatePct <= 10 && worstStressCum > -30) {
    return {
      grade: 'C',
      verdictJa: 'C評価 · 要改善 — ストレス下でDD拡大 · ロット縮小必須',
    };
  }

  return {
    grade: 'D',
    verdictJa: 'D評価 · 運用禁止 — 破産リスクまたは最悪ケース累積マイナス',
  };
}

export function buildDurabilityAuditReport(input: {
  bundle: SurvivorshipOhlcvBundle;
  fromDate?: string;
  toDate?: string;
  auditedAt?: string;
  mcRuns?: number;
}): ForwardDurabilityAuditReport | null {
  const symbols = [...ROBUSTNESS_ETF_UNIVERSE].filter((s) =>
    input.bundle.fetchedSymbols.includes(s),
  );
  if (symbols.length < 2) return null;

  const fromDate = input.fromDate ?? EXTENDED_AUDIT_START;
  const toDate = input.toDate ?? input.bundle.latestDate;
  const auditedAt = input.auditedAt ?? new Date().toISOString();

  const trades = collectFullHistoryExecutedTrades(input.bundle, fromDate, toDate);
  const baselinePath = simulateRm3000WinRatePath(trades, symbols);
  const baselineCum = baselinePath.cumulativeReturnPct;

  const stressRows: ForwardDurabilityStressMetrics[] = DURABILITY_STRESS_DEFS.map((def) => {
    const stressed = applyDurabilityStress(trades, def.stressId);
    const path = simulateRm3000WinRatePath(stressed, symbols);
    return pathToStressMetrics(def.stressId, def.labelJa, path, stressed, baselineCum);
  });

  const monteCarlo = runDurabilityMonteCarlo({
    trades,
    symbols,
    runs: input.mcRuns ?? DURABILITY_MC_RUNS,
  });

  const capitalRows = DURABILITY_CAPITAL_DEFS.map((def) =>
    simulateCapitalMode(trades, symbols, def.modeId),
  );

  const worstStress = [...stressRows].sort(
    (a, b) => a.cumulativeReturnPct - b.cumulativeReturnPct,
  )[0]!;
  const fixedRow = capitalRows.find((r) => r.modeId === 'fixed')!;
  const compoundRow = capitalRows.find((r) => r.modeId === 'compound')!;
  const kelly25 = capitalRows.find((r) => r.modeId === 'kelly_25')!;

  const { grade, verdictJa } = gradeDurabilityOperational({
    monteCarlo,
    worstStressCum: worstStress.cumulativeReturnPct,
    baselinePath,
  });

  const safeCapital =
    fixedRow.minEquityPct >= kelly25.minEquityPct
      ? fixedRow
      : kelly25.minEquityPct > compoundRow.minEquityPct
        ? kelly25
        : compoundRow;

  const rm3000Yes = grade === 'A' || grade === 'B';

  const answerAJa = `A 最悪ケース累積: ${worstStress.cumulativeReturnPct}%（${worstStress.labelJa} · 終値RM${worstStress.finalEquityMYR}）— 評価${worstStress.cumulativeReturnPct > 0 ? 'A' : worstStress.cumulativeReturnPct > -15 ? 'B' : 'C'}`;
  const answerBJa = `B 破産確率: ${monteCarlo.bankruptcyRatePct}%（MC${monteCarlo.runs}回 · 中央累積${monteCarlo.medianCumulativePct}% · 95%CI${monteCarlo.ci95LowPct}〜${monteCarlo.ci95HighPct}%）— 評価${monteCarlo.bankruptcyRatePct <= 1 ? 'A' : monteCarlo.bankruptcyRatePct <= 5 ? 'B' : 'C'}`;
  const answerCJa = `C 安全な資金管理: ${safeCapital.labelJa}（最低資産${safeCapital.minEquityPct}% · DD${safeCapital.maxDrawdownPct ?? '—'}% · Sharpe${safeCapital.sharpe ?? '—'}）— 評価A`;
  const answerDJa = `D 推奨ロット: RM700/枠固定（複利なし）· 1枠最大損失≈RM${Math.round(RM700_PER_SLOT * 0.11)}（2022型-11%想定）— 評価A`;
  const answerEJa = rm3000Yes
    ? `E 2026実運用: ${grade === 'A' ? '可（即実運用）' : '可（少額・固定額から）'} — RM3000で運用すべき · ${verdictJa}`
    : `E 2026実運用: 不可または要改善 — RM3000全額投入は非推奨 · ${verdictJa}`;

  const rm3000RecommendationJa = rm3000Yes
    ? `RM3000運用: 推奨（${grade === 'A' ? '即' : '少額から'}）· 固定RM700/枠 · 現金15% · 監査39-52現行ルール維持`
    : `RM3000運用: 非推奨またはロット半減以下 · ${verdictJa}`;

  const operationalNoteJa = [
    `基準累積${baselineCum}% · 最悪${worstStress.labelJa}`,
    `MC破産${monteCarlo.bankruptcyRatePct}%`,
    rm3000RecommendationJa,
  ].join(' · ');

  const humanSummaryJa = [
    `監査53 耐久性 ${fromDate}〜${toDate}`,
    FIXED_CONDITIONS_JA,
    answerAJa,
    answerBJa,
    answerCJa,
    answerDJa,
    answerEJa,
    rm3000RecommendationJa,
  ].join('\n');

  return {
    auditedAt,
    fromDate,
    toDate,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    baselineTradeCount: trades.length,
    stressRows,
    monteCarlo,
    capitalRows,
    operationalGrade: grade,
    operationalVerdictJa: verdictJa,
    rm3000RecommendationJa,
    answerAJa,
    answerBJa,
    answerCJa,
    answerDJa,
    answerEJa,
    operationalNoteJa,
    humanSummaryJa,
  };
}

export async function runDurabilityAudit(): Promise<ForwardDurabilityAuditReport | null> {
  const bundle = await fetchRobustnessAuditBundle();
  if (!bundle) return null;
  return buildDurabilityAuditReport({ bundle });
}

export function formatDurabilityCsv(report: ForwardDurabilityAuditReport): string {
  const lines = [
    `# 最重要監査その53 耐久性 ${report.fromDate}〜${report.toDate}`,
    `# ${report.fixedConditionsJa}`,
    `# ${report.operationalVerdictJa}`,
    '',
    'section,stressId,label,trades,winRatePct,profitFactor,sharpe,maxDD,cumulative,finalMYR,deltaCum',
    ...report.stressRows.map((r) =>
      [
        'stress',
        r.stressId,
        `"${r.labelJa}"`,
        r.tradeCount,
        r.winRatePct,
        r.profitFactor ?? '',
        r.sharpe ?? '',
        r.maxDrawdownPct ?? '',
        r.cumulativeReturnPct,
        r.finalEquityMYR,
        r.deltaCumulativeVsBaselinePt,
      ].join(','),
    ),
    '',
    'section,runs,meanCum,medianCum,ci95Low,ci95High,worstCum,worstDD,meanSharpe,meanPF,bankruptcyPct',
    [
      'monte_carlo',
      report.monteCarlo.runs,
      report.monteCarlo.meanCumulativePct,
      report.monteCarlo.medianCumulativePct,
      report.monteCarlo.ci95LowPct,
      report.monteCarlo.ci95HighPct,
      report.monteCarlo.worstCumulativePct,
      report.monteCarlo.worstMaxDrawdownPct,
      report.monteCarlo.meanSharpe ?? '',
      report.monteCarlo.meanProfitFactor ?? '',
      report.monteCarlo.bankruptcyRatePct,
    ].join(','),
    '',
    'section,modeId,label,finalMYR,cumulative,maxDD,sharpe,profitFactor,minEquityPct,avgSlotMYR',
    ...report.capitalRows.map((r) =>
      [
        'capital',
        r.modeId,
        `"${r.labelJa}"`,
        r.finalEquityMYR,
        r.cumulativeReturnPct,
        r.maxDrawdownPct ?? '',
        r.sharpe ?? '',
        r.profitFactor ?? '',
        r.minEquityPct,
        r.avgSlotMYR ?? '',
      ].join(','),
    ),
    '',
    'section,key,value',
    `baseline,tradeCount,${report.baselineTradeCount}`,
    `verdict,operationalGrade,${report.operationalGrade}`,
    '',
    'answer,content',
    `A,"${report.answerAJa}"`,
    `B,"${report.answerBJa}"`,
    `C,"${report.answerCJa}"`,
    `D,"${report.answerDJa}"`,
    `E,"${report.answerEJa}"`,
    `rm3000,"${report.rm3000RecommendationJa}"`,
    `operational,"${report.operationalNoteJa}"`,
  ];
  return lines.join('\n');
}
