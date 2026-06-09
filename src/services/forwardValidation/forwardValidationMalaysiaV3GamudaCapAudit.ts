/**
 * 最重要監査その72 — Malaysia v3 GAMUDA上場廃止リスク軽減 · 監査70/71固定 · ルール変更なし
 */
import type {
  ForwardMalaysiaV3GamudaCapAuditReport,
  ForwardMalaysiaV3GamudaCapBootstrap,
  ForwardMalaysiaV3GamudaCapCashCompareRow,
  ForwardMalaysiaV3GamudaCapGrade,
  ForwardMalaysiaV3GamudaCapPatternId,
  ForwardMalaysiaV3GamudaCapPatternRow,
  ForwardPassedTradeRecord,
} from '../../types/forwardValidation';
import { bootstrapSampleTrades } from './forwardValidationBootstrapMcAudit';
import {
  collectExecutedTradesForUniverse,
  MALAYSIA_V1_AUDIT_START,
} from './forwardValidationMalaysiaV1Audit';
import { fetchMalaysiaV69AuditBundle } from './forwardValidationMalaysiaV21FourthSymbolAudit';
import { delistSymbol } from './forwardValidationMalaysiaV3CrashAudit';
import {
  simulateMalaysiaV3DcaPath,
  V3_SYMBOLS,
  type MalaysiaV3DcaPathResult,
  type MalaysiaV3PhaseWeights,
} from './forwardValidationMalaysiaV3DcaAudit';
import { mulberry32, percentile } from './forwardValidationMonteCarloAudit';
import { precomputeTradeTemplates } from './forwardValidationRobustnessAudit';
import type { SurvivorshipOhlcvBundle } from './forwardValidationSurvivorshipAudit';

export const BOOTSTRAP_MC_72_RUNS = 10_000;
const INITIAL_CAPITAL = 3000;
const MONTHLY_DCA = 1500;
const CASH_RESERVE_PCT = 15;
const CASH_15 = 15;
const CASH_20 = 20;
const BOOTSTRAP_SEED = 72_001;
const RUIN_EQUITY_PCT = 50;
const GAMUDA_SYMBOL = '5398';
const DEPLOYABLE_SCALE = (100 - CASH_RESERVE_PCT) / 100;

export const MALAYSIA_V3_GAMUDA_CAP_PATTERNS: {
  patternId: ForwardMalaysiaV3GamudaCapPatternId;
  labelJa: string;
  gamudaCapPct: number | null;
}[] = [
  { patternId: 'baseline_v3', labelJa: '⓪ 現行v3均等', gamudaCapPct: null },
  { patternId: 'exclude_gamuda', labelJa: '① GAMUDA完全除外', gamudaCapPct: 0 },
  { patternId: 'cap_25', labelJa: '② GAMUDA上限25%', gamudaCapPct: 25 },
  { patternId: 'cap_20', labelJa: '③ GAMUDA上限20%', gamudaCapPct: 20 },
  { patternId: 'cap_15', labelJa: '④ GAMUDA上限15%', gamudaCapPct: 15 },
  { patternId: 'cap_10', labelJa: '⑤ GAMUDA上限10%', gamudaCapPct: 10 },
];

const SYMBOL_NAMES: Record<string, string> = {
  '5347': 'TENAGA',
  '5398': 'GAMUDA',
  '1023': 'CIMB',
  '6742': 'YTL',
};

const FIXED_CONDITIONS_JA =
  'MY v3 GAMUDA上限 · TENAGA+GAMUDA+CIMB→RM10000でYTL · 月次RM1500 · 勝率重み · 3枠 · ルール変更なし';

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function resolveAuditFromDate(toDate: string): string {
  const tenYearAgo = new Date(`${toDate}T00:00:00Z`);
  tenYearAgo.setUTCFullYear(tenYearAgo.getUTCFullYear() - 10);
  const computedFrom = tenYearAgo.toISOString().slice(0, 10);
  return computedFrom >= MALAYSIA_V1_AUDIT_START ? computedFrom : MALAYSIA_V1_AUDIT_START;
}

function fmtMonths(m: number | null): string {
  if (m == null) return '未到達';
  if (m < 12) return `${m}ヶ月`;
  const y = Math.floor(m / 12);
  const mo = m % 12;
  return mo > 0 ? `${y}年${mo}ヶ月` : `${y}年`;
}

function cumulativeFromPath(path: MalaysiaV3DcaPathResult): number {
  return path.totalContributedMYR > 0
    ? round3(((path.finalEquityMYR - path.totalContributedMYR) / path.totalContributedMYR) * 100)
    : 0;
}

function weightMultiplier(weights: Record<string, number>, symbol: string): number {
  const vals = Object.values(weights).filter((v) => v > 0);
  const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 1;
  const w = weights[symbol] ?? 0;
  return avg > 0 ? w / avg : 0;
}

function weightedSymbolDependencyPct(
  trades: ForwardPassedTradeRecord[],
  weights: Record<string, number>,
): Record<string, number> {
  const bySym = new Map<string, number>();
  for (const t of trades) {
    const mult = weightMultiplier(weights, t.symbol);
    bySym.set(t.symbol, (bySym.get(t.symbol) ?? 0) + t.returnPct * DEPLOYABLE_SCALE * mult);
  }
  const total = [...bySym.values()].reduce((s, v) => s + Math.max(v, 0), 0);
  const out: Record<string, number> = {};
  for (const [sym, val] of bySym) {
    out[sym] = total > 0 ? round3((Math.max(val, 0) / total) * 100) : 0;
  }
  return out;
}

function maxSingleDependencyPct(dep: Record<string, number>): number {
  return Math.max(0, ...Object.values(dep));
}

function formatWeightLabel(weights: Record<string, number>): string {
  return Object.entries(weights)
    .filter(([, w]) => w > 0)
    .map(([sym, w]) => `${SYMBOL_NAMES[sym] ?? sym}${w}%`)
    .join(' · ');
}

export const MALAYSIA_V3_GAMUDA_CAP_15_PCT = 15;
export const MALAYSIA_V3_CAP_15_PHASE_WEIGHTS = buildGamudaCapPhaseWeights(MALAYSIA_V3_GAMUDA_CAP_15_PCT);

export function buildGamudaCapPhaseWeights(gamudaCapPct: number): MalaysiaV3PhaseWeights {
  const phase3Others = ['5347', '1023'];
  const phase4Others = ['5347', '1023', '6742'];
  const phase3Rem = 100 - gamudaCapPct;
  const phase4Rem = 100 - gamudaCapPct;
  const each3 = round3(phase3Rem / phase3Others.length);
  const each4 = round3(phase4Rem / phase4Others.length);

  const phase3: Record<string, number> = { [GAMUDA_SYMBOL]: gamudaCapPct };
  const phase4: Record<string, number> = { [GAMUDA_SYMBOL]: gamudaCapPct };
  for (const sym of phase3Others) phase3[sym] = each3;
  for (const sym of phase4Others) phase4[sym] = each4;

  return { phase3, phase4 };
}

function isRuined(path: MalaysiaV3DcaPathResult): boolean {
  const minPct = (path.minEquityMYR / INITIAL_CAPITAL) * 100;
  return minPct <= RUIN_EQUITY_PCT || path.finalEquityMYR <= 0;
}

function runBootstrapDca(input: {
  pool: ForwardPassedTradeRecord[];
  fromDate: string;
  toDate: string;
  phaseWeights?: MalaysiaV3PhaseWeights;
  cashReservePct: number;
  delistGamuda: boolean;
  seed?: number;
}): ForwardMalaysiaV3GamudaCapBootstrap {
  const runs = BOOTSTRAP_MC_72_RUNS;
  const rand = mulberry32(input.seed ?? BOOTSTRAP_SEED);
  const minEquities: number[] = [];
  let bankrupt = 0;

  for (let r = 0; r < runs; r++) {
    let sample = bootstrapSampleTrades(input.pool, rand, r);
    if (input.delistGamuda) sample = delistSymbol(sample, GAMUDA_SYMBOL);
    const path = simulateMalaysiaV3DcaPath({
      trades: sample,
      fromDate: input.fromDate,
      toDate: input.toDate,
      monthlyContributionMYR: MONTHLY_DCA,
      cashReservePct: input.cashReservePct,
      phaseWeights: input.phaseWeights,
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

function buildPatternRow(input: {
  patternId: ForwardMalaysiaV3GamudaCapPatternId;
  labelJa: string;
  phaseWeights?: MalaysiaV3PhaseWeights;
  trades: ForwardPassedTradeRecord[];
  fromDate: string;
  toDate: string;
  cashReservePct: number;
  seedOffset: number;
}): ForwardMalaysiaV3GamudaCapPatternRow {
  const path = simulateMalaysiaV3DcaPath({
    trades: input.trades,
    fromDate: input.fromDate,
    toDate: input.toDate,
    monthlyContributionMYR: MONTHLY_DCA,
    cashReservePct: input.cashReservePct,
    phaseWeights: input.phaseWeights,
  });

  const delistTrades = delistSymbol(input.trades, GAMUDA_SYMBOL);
  const delistPath = simulateMalaysiaV3DcaPath({
    trades: delistTrades,
    fromDate: input.fromDate,
    toDate: input.toDate,
    monthlyContributionMYR: MONTHLY_DCA,
    cashReservePct: input.cashReservePct,
    phaseWeights: input.phaseWeights,
  });

  const bootstrap = runBootstrapDca({
    pool: input.trades,
    fromDate: input.fromDate,
    toDate: input.toDate,
    phaseWeights: input.phaseWeights,
    cashReservePct: input.cashReservePct,
    delistGamuda: false,
    seed: BOOTSTRAP_SEED + input.seedOffset,
  });

  const delistBootstrap = runBootstrapDca({
    pool: input.trades,
    fromDate: input.fromDate,
    toDate: input.toDate,
    phaseWeights: input.phaseWeights,
    cashReservePct: input.cashReservePct,
    delistGamuda: true,
    seed: BOOTSTRAP_SEED + 100 + input.seedOffset,
  });

  const phase4Weights =
    input.phaseWeights?.phase4 ??
    Object.fromEntries(V3_SYMBOLS.map((s) => [s, round3(100 / V3_SYMBOLS.length)]));
  const symDep = weightedSymbolDependencyPct(input.trades, phase4Weights);

  return {
    patternId: input.patternId,
    labelJa: input.labelJa,
    phase3Weights: input.phaseWeights?.phase3 ?? {},
    phase4Weights,
    weightLabelJa: input.phaseWeights
      ? `P1 ${formatWeightLabel(input.phaseWeights.phase3)} · P2 ${formatWeightLabel(input.phaseWeights.phase4)}`
      : '均等',
    cumulativeReturnPct: cumulativeFromPath(path),
    profitFactor: path.profitFactor,
    sharpe: path.sharpe,
    maxDrawdownPct: path.maxDrawdownPct,
    bootstrap,
    delist: {
      cumulativeReturnPct: cumulativeFromPath(delistPath),
      maxDrawdownPct: delistPath.maxDrawdownPct,
      minEquityMYR: delistPath.minEquityMYR,
      finalEquityMYR: delistPath.finalEquityMYR,
      bootstrap: delistBootstrap,
    },
    gamudaDependencyPct: symDep[GAMUDA_SYMBOL] ?? 0,
    maxSingleDependencyPct: maxSingleDependencyPct(symDep),
    symbolDependencyPct: symDep,
    monthsToRm10000: path.monthsToRm10000,
    monthsToRm100000: path.monthsToRm100000,
  };
}

function operationalScore(row: ForwardMalaysiaV3GamudaCapPatternRow): number {
  return (
    (row.sharpe ?? 0) * 10 +
    row.cumulativeReturnPct * 0.5 -
    Math.abs(row.maxDrawdownPct) * 0.3 -
    row.delist.bootstrap.bankruptcyRatePct * 5 -
    row.gamudaDependencyPct * 0.4
  );
}

export function pickBestSharpePattern(
  patterns: ForwardMalaysiaV3GamudaCapPatternRow[],
): ForwardMalaysiaV3GamudaCapPatternRow {
  return [...patterns].sort((a, b) => (b.sharpe ?? -99) - (a.sharpe ?? -99))[0]!;
}

export function pickBestMaxDdPattern(
  patterns: ForwardMalaysiaV3GamudaCapPatternRow[],
): ForwardMalaysiaV3GamudaCapPatternRow {
  return [...patterns].sort((a, b) => b.maxDrawdownPct - a.maxDrawdownPct)[0]!;
}

export function pickBestBankruptcyPattern(
  patterns: ForwardMalaysiaV3GamudaCapPatternRow[],
): ForwardMalaysiaV3GamudaCapPatternRow {
  return [...patterns].sort(
    (a, b) => a.delist.bootstrap.bankruptcyRatePct - b.delist.bootstrap.bankruptcyRatePct,
  )[0]!;
}

export function pickAdoptedGamudaCapPattern(input: {
  patterns: ForwardMalaysiaV3GamudaCapPatternRow[];
  delistMcUnder5Pct: boolean;
  gamudaDependencyUnder50Pct: boolean;
}): ForwardMalaysiaV3GamudaCapPatternId {
  const baseline = input.patterns.find((p) => p.patternId === 'baseline_v3')!;
  const eligible = input.patterns.filter(
    (p) =>
      p.delist.bootstrap.bankruptcyRatePct < 5 &&
      p.gamudaDependencyPct < 50 &&
      p.cumulativeReturnPct >= baseline.cumulativeReturnPct * 0.75,
  );
  if (eligible.length > 0) {
    return [...eligible].sort((a, b) => operationalScore(b) - operationalScore(a))[0]!
      .patternId;
  }
  const improved = input.patterns.filter(
    (p) =>
      p.delist.bootstrap.bankruptcyRatePct < baseline.delist.bootstrap.bankruptcyRatePct - 1 &&
      p.cumulativeReturnPct >= baseline.cumulativeReturnPct * 0.7,
  );
  if (improved.length > 0) {
    return [...improved].sort((a, b) => operationalScore(b) - operationalScore(a))[0]!.patternId;
  }
  if (input.delistMcUnder5Pct) {
    return pickBestBankruptcyPattern(input.patterns).patternId;
  }
  return 'exclude_gamuda';
}

export function gradeMalaysiaV3GamudaCap(input: {
  patterns: ForwardMalaysiaV3GamudaCapPatternRow[];
  adoptedId: ForwardMalaysiaV3GamudaCapPatternId;
  delistMcUnder5Pct: boolean;
  gamudaDependencyUnder50Pct: boolean;
}): { grade: ForwardMalaysiaV3GamudaCapGrade; verdictJa: string } {
  const adopted = input.patterns.find((p) => p.patternId === input.adoptedId)!;
  const baseline = input.patterns.find((p) => p.patternId === 'baseline_v3')!;
  const bestDelist = pickBestBankruptcyPattern(input.patterns);

  if (
    input.delistMcUnder5Pct &&
    adopted.delist.bootstrap.bankruptcyRatePct < 5 &&
    adopted.gamudaDependencyPct < 50 &&
    adopted.cumulativeReturnPct >= baseline.cumulativeReturnPct * 0.8
  ) {
    return {
      grade: 'A',
      verdictJa: `A 即採用 — ${adopted.labelJa} · GAMUDA廃止MC${adopted.delist.bootstrap.bankruptcyRatePct}% · 依存${adopted.gamudaDependencyPct}% · 累積${adopted.cumulativeReturnPct}%`,
    };
  }

  if (bestDelist.delist.bootstrap.bankruptcyRatePct < 5) {
    return {
      grade: 'B',
      verdictJa: `B 採用可能 — ${bestDelist.labelJa} · GAMUDA廃止MC${bestDelist.delist.bootstrap.bankruptcyRatePct}%（基準${baseline.delist.bootstrap.bankruptcyRatePct}%） · 依存${bestDelist.gamudaDependencyPct}%`,
    };
  }

  if (bestDelist.delist.bootstrap.bankruptcyRatePct < baseline.delist.bootstrap.bankruptcyRatePct) {
    return {
      grade: 'C',
      verdictJa: `C 要改善 — 最良${bestDelist.labelJa} · GAMUDA廃止MC${bestDelist.delist.bootstrap.bankruptcyRatePct}% · 5%未満${input.delistMcUnder5Pct ? '達成' : '未達'}`,
    };
  }

  return {
    grade: 'D',
    verdictJa: `D 不採用 — GAMUDA上限調整でもMC${bestDelist.delist.bootstrap.bankruptcyRatePct}% · 基準${baseline.delist.bootstrap.bankruptcyRatePct}%`,
  };
}

export async function buildMalaysiaV3GamudaCapAuditReport(input: {
  bundle: SurvivorshipOhlcvBundle;
  auditedAt?: string;
}): Promise<ForwardMalaysiaV3GamudaCapAuditReport | null> {
  const auditedAt = input.auditedAt ?? new Date().toISOString();
  const toDate = input.bundle.latestDate;
  const fromDate = resolveAuditFromDate(toDate);

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

  const patterns: ForwardMalaysiaV3GamudaCapPatternRow[] = MALAYSIA_V3_GAMUDA_CAP_PATTERNS.map(
    (def, i) => {
      const phaseWeights =
        def.gamudaCapPct == null ? undefined : buildGamudaCapPhaseWeights(def.gamudaCapPct);
      return buildPatternRow({
        patternId: def.patternId,
        labelJa: def.labelJa,
        phaseWeights,
        trades: allTrades,
        fromDate,
        toDate,
        cashReservePct: CASH_RESERVE_PCT,
        seedOffset: i,
      });
    },
  );

  const baseline = patterns.find((p) => p.patternId === 'baseline_v3')!;
  const baselineDelistBankruptcyPct = baseline.delist.bootstrap.bankruptcyRatePct;
  const delistMcUnder5Pct = patterns.some((p) => p.delist.bootstrap.bankruptcyRatePct < 5);
  const gamudaDependencyUnder50Pct = patterns.some((p) => p.gamudaDependencyPct < 50);

  const adoptedPatternId = pickAdoptedGamudaCapPattern({
    patterns,
    delistMcUnder5Pct,
    gamudaDependencyUnder50Pct,
  });

  const adopted = patterns.find((p) => p.patternId === adoptedPatternId)!;
  const adoptedPhaseWeights =
    adopted.patternId === 'baseline_v3'
      ? undefined
      : buildGamudaCapPhaseWeights(
          MALAYSIA_V3_GAMUDA_CAP_PATTERNS.find((d) => d.patternId === adoptedPatternId)!
            .gamudaCapPct ?? 0,
        );

  const cashCompare: ForwardMalaysiaV3GamudaCapCashCompareRow[] = [CASH_15, CASH_20].map(
    (cashPct) => {
      const delistPath = simulateMalaysiaV3DcaPath({
        trades: delistSymbol(allTrades, GAMUDA_SYMBOL),
        fromDate,
        toDate,
        monthlyContributionMYR: MONTHLY_DCA,
        cashReservePct: cashPct,
        phaseWeights: adoptedPhaseWeights,
      });
      const delistBootstrap = runBootstrapDca({
        pool: allTrades,
        fromDate,
        toDate,
        phaseWeights: adoptedPhaseWeights,
        cashReservePct: cashPct,
        delistGamuda: true,
        seed: BOOTSTRAP_SEED + 200 + cashPct,
      });
      return {
        cashReservePct: cashPct,
        labelJa: `現金${cashPct}% · ${adopted.labelJa}`,
        adoptedPatternId,
        delistMinEquityMYR: delistPath.minEquityMYR,
        delistMaxDrawdownPct: delistPath.maxDrawdownPct,
        delistBankruptcyRatePct: delistBootstrap.bankruptcyRatePct,
        monthsToRm100000: delistPath.monthsToRm100000,
      };
    },
  );

  const { grade, verdictJa } = gradeMalaysiaV3GamudaCap({
    patterns,
    adoptedId: adoptedPatternId,
    delistMcUnder5Pct,
    gamudaDependencyUnder50Pct,
  });

  const bestSharpe = pickBestSharpePattern(patterns);
  const bestMaxDd = pickBestMaxDdPattern(patterns);
  const bestBankruptcy = pickBestBankruptcyPattern(patterns);
  const under50 = patterns.filter((p) => p.gamudaDependencyPct < 50);

  const cash15 = cashCompare.find((c) => c.cashReservePct === CASH_15)!;
  const cash20 = cashCompare.find((c) => c.cashReservePct === CASH_20)!;

  const answerAJa = `A 最良Sharpe: ${bestSharpe.labelJa} · Sharpe${bestSharpe.sharpe ?? '—'} · 累積${bestSharpe.cumulativeReturnPct}% · GAMUDA廃止MC${bestSharpe.delist.bootstrap.bankruptcyRatePct}%`;
  const answerBJa = `B 最良MaxDD: ${bestMaxDd.labelJa} · MaxDD${bestMaxDd.maxDrawdownPct}% · GAMUDA廃止MaxDD${bestMaxDd.delist.maxDrawdownPct}% · 最低RM${bestMaxDd.delist.minEquityMYR}`;
  const answerCJa = `C 最良破産率: ${bestBankruptcy.labelJa} · GAMUDA廃止MC${bestBankruptcy.delist.bootstrap.bankruptcyRatePct}% · 基準${baselineDelistBankruptcyPct}% · 5%未満${delistMcUnder5Pct ? '達成' : '未達'}`;
  const answerDJa = gamudaDependencyUnder50Pct
    ? `D GAMUDA依存50%未満: ${under50.map((p) => `${p.patternId}(${p.gamudaDependencyPct}%)`).join(' · ')}`
    : `D GAMUDA依存50%未満: 未達 — 最小${Math.min(...patterns.map((p) => p.gamudaDependencyPct))}%`;
  const answerEJa = `E 実運用最適: ${adopted.labelJa} · ${adopted.weightLabelJa} · 累積${adopted.cumulativeReturnPct}% · GAMUDA廃止MC${adopted.delist.bootstrap.bankruptcyRatePct}% · RM10k${fmtMonths(adopted.monthsToRm10000)} · RM100k${fmtMonths(adopted.monthsToRm100000)}`;
  const answerFJa = `F 現金比較(${adopted.labelJa} · GAMUDA廃止): 15%最低RM${cash15.delistMinEquityMYR} · MC${cash15.delistBankruptcyRatePct}% vs 20%RM${cash20.delistMinEquityMYR} · MC${cash20.delistBankruptcyRatePct}% · ${cash20.delistBankruptcyRatePct < cash15.delistBankruptcyRatePct ? '20%優位' : '15%同等'}`;

  const consistencyNoteJa =
    '監査71整合: 基準GAMUDA廃止MC11.06% · 監査70積立RM1500 · ルール変更なし';

  const humanSummaryJa = [
    '監査72 Malaysia v3 GAMUDA上場廃止リスク軽減',
    `期間 ${fromDate}〜${toDate}`,
    FIXED_CONDITIONS_JA,
    `基準v3: 累積${baseline.cumulativeReturnPct}% · GAMUDA依存${baseline.gamudaDependencyPct}% · GAMUDA廃止累積${baseline.delist.cumulativeReturnPct}% · MC破産${baselineDelistBankruptcyPct}%`,
    ...patterns
      .filter((p) => p.patternId !== 'baseline_v3')
      .map(
        (p) =>
          `${p.labelJa}: 累積${p.cumulativeReturnPct}% · Sharpe${p.sharpe ?? '—'} · PF${p.profitFactor ?? '—'} · MaxDD${p.maxDrawdownPct}% · GAMUDA依存${p.gamudaDependencyPct}% · 廃止累積${p.delist.cumulativeReturnPct}% · 廃止MC${p.delist.bootstrap.bankruptcyRatePct}% · RM10k${fmtMonths(p.monthsToRm10000)} · RM100k${fmtMonths(p.monthsToRm100000)}`,
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
    monthlyContributionMYR: MONTHLY_DCA,
    baselineDelistBankruptcyPct,
    patterns,
    cashCompare,
    adoptedPatternId,
    delistMcUnder5Pct,
    gamudaDependencyUnder50Pct,
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

export async function runMalaysiaV3GamudaCapAudit(): Promise<ForwardMalaysiaV3GamudaCapAuditReport | null> {
  const bundle = await fetchMalaysiaV69AuditBundle();
  if (!bundle) return null;
  return buildMalaysiaV3GamudaCapAuditReport({ bundle });
}

export function formatMalaysiaV3GamudaCapCsv(
  report: ForwardMalaysiaV3GamudaCapAuditReport,
): string {
  const lines = [
    `# 最重要監査その72 Malaysia v3 GAMUDA上限 ${report.fromDate}〜${report.toDate}`,
    `# ${report.fixedConditionsJa}`,
    `# ${report.adoptionVerdictJa}`,
    '',
    'section,patternId,label,weights,cumulative,PF,sharpe,maxDD,gamudaDep,maxDep,bankruptcy,delistCum,delistMaxDD,delistMin,delistBankruptcy,delistP5,m10k,m100k',
    ...report.patterns.map((p) =>
      [
        'pattern',
        p.patternId,
        `"${p.labelJa}"`,
        `"${p.weightLabelJa}"`,
        p.cumulativeReturnPct,
        p.profitFactor ?? '',
        p.sharpe ?? '',
        p.maxDrawdownPct,
        p.gamudaDependencyPct,
        p.maxSingleDependencyPct,
        p.bootstrap.bankruptcyRatePct,
        p.delist.cumulativeReturnPct,
        p.delist.maxDrawdownPct,
        p.delist.minEquityMYR,
        p.delist.bootstrap.bankruptcyRatePct,
        p.delist.bootstrap.p5MinEquityMYR,
        p.monthsToRm10000 ?? '',
        p.monthsToRm100000 ?? '',
      ].join(','),
    ),
    '',
    'section,cashPct,label,adoptedPattern,delistMin,delistMaxDD,delistBankruptcy,m100k',
    ...report.cashCompare.map((c) =>
      [
        'cash_compare',
        c.cashReservePct,
        `"${c.labelJa}"`,
        c.adoptedPatternId,
        c.delistMinEquityMYR,
        c.delistMaxDrawdownPct,
        c.delistBankruptcyRatePct,
        c.monthsToRm100000 ?? '',
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
    ['verdict', 'adopted', report.adoptedPatternId].join(','),
    ['verdict', 'delistMcUnder5', report.delistMcUnder5Pct].join(','),
    ['verdict', 'gamudaDepUnder50', report.gamudaDependencyUnder50Pct].join(','),
    ['consistency', 'note', `"${report.consistencyNoteJa}"`].join(','),
  ];
  return lines.join('\n');
}
