/**
 * 最重要監査その79 — Malaysia v4 最終候補同条件比較 · IJM vs 4候補 · ルール変更なし
 */
import type {
  ForwardMalaysiaV4CandidateId,
  ForwardMalaysiaV4FinalCompareAuditReport,
  ForwardMalaysiaV4FinalCompareGrade,
  ForwardMalaysiaV4FinalCompareRankedEntry,
  ForwardMalaysiaV4FinalCompareRow,
  ForwardPassedTradeRecord,
} from '../../types/forwardValidation';
import { bootstrapSampleTrades } from './forwardValidationBootstrapMcAudit';
import {
  collectExecutedTradesForUniverse,
  MALAYSIA_V1_AUDIT_START,
} from './forwardValidationMalaysiaV1Audit';
import { computeCalendarTrainTestSplit } from './forwardValidationMalaysiaV2DurabilityAudit';
import { delistSymbol } from './forwardValidationMalaysiaV3CrashAudit';
import {
  simulateMalaysiaV3DcaPath,
  type MalaysiaV3DcaExecutedTrade,
  type MalaysiaV3DcaPathResult,
  type MalaysiaV3PhaseWeights,
} from './forwardValidationMalaysiaV3DcaAudit';
import {
  buildV4PhaseWeights,
  fetchMalaysiaV76AuditBundle,
  resolveV4TradeSymbols,
} from './forwardValidationMalaysiaV4CandidateAudit';
import { mulberry32, percentile } from './forwardValidationMonteCarloAudit';
import { precomputeTradeTemplates } from './forwardValidationRobustnessAudit';
import type { SurvivorshipOhlcvBundle } from './forwardValidationSurvivorshipAudit';

export const BOOTSTRAP_79_RUNS = 1_000;
export const MONTE_CARLO_79_RUNS = 10_000;
const MONTHLY_DCA = 1500;
const INITIAL_CAPITAL = 3000;
const BOOTSTRAP_SEED = 79_001;
const MC_SEED = 79_101;
const WF_TRAIN_PCT = 70;
const RUIN_EQUITY_PCT = 50;
const YTL_SYMBOL = '6742';
const YTL_CAP_PCT = 15;
const CUMULATIVE_TARGET_PCT = 37.716;

export const MALAYSIA_V4_FINAL_COMPARE_CANDIDATES: {
  candidateId: ForwardMalaysiaV4CandidateId;
  symbol: string;
  labelJa: string;
}[] = [
  { candidateId: 'v4_ijm', symbol: '3336', labelJa: 'IJM' },
  { candidateId: 'v4_celcomdigi', symbol: '6947', labelJa: 'CELCOMDIGI' },
  { candidateId: 'v4_misc', symbol: '3816', labelJa: 'MISC' },
  { candidateId: 'v4_maybank', symbol: '1155', labelJa: 'MAYBANK' },
  { candidateId: 'v4_inari', symbol: '0166', labelJa: 'INARI' },
];

export const COMPOSITE_WEIGHTS = {
  cumulative: 0.4,
  delistMc: 0.3,
  maxDd: 0.2,
  oos: 0.1,
} as const;

const FIXED_CONDITIONS_JA =
  'MY v4最終比較 · YTL15% · GAMUDA15% · TENAGA23.3% · CIMB23.3% · 候補23.3% · ルール変更なし';

const COMPOSITE_WEIGHTS_JA = '累積40% · 廃止MC30% · MaxDD20% · OOS10%';

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

function isRuined(path: MalaysiaV3DcaPathResult): boolean {
  const minPct = (path.minEquityMYR / INITIAL_CAPITAL) * 100;
  return minPct <= RUIN_EQUITY_PCT || path.finalEquityMYR <= 0;
}

function profitFactorFromPnls(pnls: number[]): number | null {
  const wins = pnls.filter((p) => p > 0).reduce((s, p) => s + p, 0);
  const losses = pnls.filter((p) => p < 0).reduce((s, p) => s + Math.abs(p), 0);
  if (losses <= 0) return wins > 0 ? null : null;
  return round3(wins / losses);
}

function winRatePct(trades: { pnlMYR: number }[]): number {
  if (trades.length === 0) return 0;
  return round3((trades.filter((t) => t.pnlMYR > 0).length / trades.length) * 100);
}

function normalizeInCohort(
  values: number[],
  value: number,
  higherBetter: boolean,
): number {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return 100;
  const raw = ((value - min) / (max - min)) * 100;
  return round3(higherBetter ? raw : 100 - raw);
}

export function computeCompositeScores(rows: ForwardMalaysiaV4FinalCompareRow[]): void {
  const ok = rows.filter((r) => r.fetchOk);
  if (ok.length === 0) return;

  const cumVals = ok.map((r) => r.cumulativeReturnPct);
  const mcVals = ok.map((r) => r.delistBankruptcyRatePct);
  const ddVals = ok.map((r) => r.maxDrawdownPct);
  const oosVals = ok.map((r) => r.oosCumulativeReturnPct);

  for (const row of ok) {
    const cumNorm = normalizeInCohort(cumVals, row.cumulativeReturnPct, true);
    const mcNorm = normalizeInCohort(mcVals, row.delistBankruptcyRatePct, false);
    const ddNorm = normalizeInCohort(ddVals, row.maxDrawdownPct, true);
    const oosNorm = normalizeInCohort(oosVals, row.oosCumulativeReturnPct, true);
    row.compositeScore = round3(
      cumNorm * COMPOSITE_WEIGHTS.cumulative +
        mcNorm * COMPOSITE_WEIGHTS.delistMc +
        ddNorm * COMPOSITE_WEIGHTS.maxDd +
        oosNorm * COMPOSITE_WEIGHTS.oos,
    );
  }

  const sorted = [...ok].sort((a, b) => b.compositeScore - a.compositeScore);
  sorted.forEach((row, i) => {
    row.compositeRank = i + 1;
  });
}

function runBootstrap1000(input: {
  pool: ForwardPassedTradeRecord[];
  fromDate: string;
  toDate: string;
  phaseWeights: MalaysiaV3PhaseWeights;
  candidateSymbol: string;
  oosFrom: string;
  seedOffset: number;
}): ForwardMalaysiaV4FinalCompareRow['bootstrap1000'] {
  const rand = mulberry32(BOOTSTRAP_SEED + input.seedOffset);
  const cumulatives: number[] = [];
  const candidatePnls: number[] = [];
  let oosNegative = 0;

  for (let r = 0; r < BOOTSTRAP_79_RUNS; r++) {
    const sample = bootstrapSampleTrades(input.pool, rand, r);
    const path = simulateMalaysiaV3DcaPath({
      trades: sample,
      fromDate: input.fromDate,
      toDate: input.toDate,
      monthlyContributionMYR: MONTHLY_DCA,
      phaseWeights: input.phaseWeights,
      captureLedger: true,
    });
    cumulatives.push(cumulativeFromPath(path));
    const cand = (path.executedTrades ?? []).filter((t) => t.symbol === input.candidateSymbol);
    const candOos = cand.filter((t) => t.exitDate >= input.oosFrom);
    const oosPnl = round3(candOos.reduce((s, t) => s + t.pnlMYR, 0));
    candidatePnls.push(round3(cand.reduce((s, t) => s + t.pnlMYR, 0)));
    if (oosPnl < 0) oosNegative++;
  }

  const sorted = [...cumulatives].sort((a, b) => a - b);
  return {
    runs: BOOTSTRAP_79_RUNS,
    meanCumulativePct: round3(cumulatives.reduce((s, v) => s + v, 0) / cumulatives.length),
    p5CumulativePct: percentile(sorted, 5),
    meanCandidatePnlMYR: round3(candidatePnls.reduce((s, v) => s + v, 0) / candidatePnls.length),
    oosNegativeRatePct: round3((oosNegative / BOOTSTRAP_79_RUNS) * 100),
  };
}

function runMonteCarlo10000(input: {
  pool: ForwardPassedTradeRecord[];
  fromDate: string;
  toDate: string;
  phaseWeights: MalaysiaV3PhaseWeights;
  seedOffset: number;
}): ForwardMalaysiaV4FinalCompareRow['monteCarlo10000'] {
  const rand = mulberry32(MC_SEED + input.seedOffset);
  const cumulatives: number[] = [];
  let bankrupt = 0;

  for (let r = 0; r < MONTE_CARLO_79_RUNS; r++) {
    let sample = bootstrapSampleTrades(input.pool, rand, r);
    sample = delistSymbol(sample, YTL_SYMBOL);
    const path = simulateMalaysiaV3DcaPath({
      trades: sample,
      fromDate: input.fromDate,
      toDate: input.toDate,
      monthlyContributionMYR: MONTHLY_DCA,
      phaseWeights: input.phaseWeights,
    });
    cumulatives.push(cumulativeFromPath(path));
    if (isRuined(path)) bankrupt++;
  }

  const sorted = [...cumulatives].sort((a, b) => a - b);
  return {
    runs: MONTE_CARLO_79_RUNS,
    bankruptcyRatePct: round3((bankrupt / MONTE_CARLO_79_RUNS) * 100),
    meanCumulativePct: round3(cumulatives.reduce((s, v) => s + v, 0) / cumulatives.length),
    p5CumulativePct: percentile(sorted, 5),
  };
}

function buildCandidateRow(input: {
  candidateId: ForwardMalaysiaV4CandidateId;
  candidateLabelJa: string;
  candidateSymbol: string;
  bundle: SurvivorshipOhlcvBundle;
  fromDate: string;
  toDate: string;
  oosFrom: string;
  cachedTemplates: ReturnType<typeof precomputeTradeTemplates>;
  seedOffset: number;
}): ForwardMalaysiaV4FinalCompareRow {
  const fetchOk = input.bundle.fetchedSymbols.includes(input.candidateSymbol);
  const emptyBootstrap = {
    runs: BOOTSTRAP_79_RUNS,
    meanCumulativePct: 0,
    p5CumulativePct: 0,
    meanCandidatePnlMYR: 0,
    oosNegativeRatePct: 0,
  };
  const emptyMc = {
    runs: MONTE_CARLO_79_RUNS,
    bankruptcyRatePct: 0,
    meanCumulativePct: 0,
    p5CumulativePct: 0,
  };

  if (!fetchOk) {
    return {
      candidateId: input.candidateId,
      candidateLabelJa: input.candidateLabelJa,
      candidateSymbol: input.candidateSymbol,
      cumulativeReturnPct: 0,
      sharpe: null,
      profitFactor: null,
      maxDrawdownPct: 0,
      minEquityMYR: 0,
      delistBankruptcyRatePct: 0,
      delistP5MinEquityMYR: 0,
      oosCumulativeReturnPct: 0,
      oosCandidatePnlMYR: 0,
      oosTradeCount: 0,
      oosWinRatePct: 0,
      oosProfitFactor: null,
      bootstrap1000: emptyBootstrap,
      monteCarlo10000: emptyMc,
      compositeScore: -Infinity,
      compositeRank: 99,
      fetchOk: false,
    };
  }

  const symbols = resolveV4TradeSymbols({
    candidateSymbol: input.candidateSymbol,
    ytlCapPct: YTL_CAP_PCT,
  });
  const trades = collectExecutedTradesForUniverse(
    input.bundle,
    symbols,
    input.fromDate,
    input.toDate,
    input.cachedTemplates,
  );
  const phaseWeights = buildV4PhaseWeights({
    candidateSymbol: input.candidateSymbol,
    ytlCapPct: YTL_CAP_PCT,
  });

  const path = simulateMalaysiaV3DcaPath({
    trades,
    fromDate: input.fromDate,
    toDate: input.toDate,
    monthlyContributionMYR: MONTHLY_DCA,
    phaseWeights,
    captureLedger: true,
  });
  const ledger: MalaysiaV3DcaExecutedTrade[] = path.executedTrades ?? [];

  const oosTrades = trades.filter((t) => t.exitDate >= input.oosFrom);
  const oosPath = simulateMalaysiaV3DcaPath({
    trades: oosTrades,
    fromDate: input.oosFrom,
    toDate: input.toDate,
    monthlyContributionMYR: MONTHLY_DCA,
    phaseWeights,
    captureLedger: true,
  });
  const oosLedger = (oosPath.executedTrades ?? []).filter(
    (t) => t.symbol === input.candidateSymbol,
  );
  const oosPnls = oosLedger.map((t) => t.pnlMYR);

  const monteCarlo10000 = runMonteCarlo10000({
    pool: trades,
    fromDate: input.fromDate,
    toDate: input.toDate,
    phaseWeights,
    seedOffset: input.seedOffset,
  });
  const bootstrap1000 = runBootstrap1000({
    pool: trades,
    fromDate: input.fromDate,
    toDate: input.toDate,
    phaseWeights,
    candidateSymbol: input.candidateSymbol,
    oosFrom: input.oosFrom,
    seedOffset: input.seedOffset,
  });

  return {
    candidateId: input.candidateId,
    candidateLabelJa: input.candidateLabelJa,
    candidateSymbol: input.candidateSymbol,
    cumulativeReturnPct: cumulativeFromPath(path),
    sharpe: path.sharpe,
    profitFactor: path.profitFactor,
    maxDrawdownPct: path.maxDrawdownPct,
    minEquityMYR: path.minEquityMYR,
    delistBankruptcyRatePct: monteCarlo10000.bankruptcyRatePct,
    delistP5MinEquityMYR: 0,
    oosCumulativeReturnPct: cumulativeFromPath(oosPath),
    oosCandidatePnlMYR: round3(oosPnls.reduce((s, p) => s + p, 0)),
    oosTradeCount: oosLedger.length,
    oosWinRatePct: winRatePct(oosLedger),
    oosProfitFactor: profitFactorFromPnls(oosPnls),
    bootstrap1000,
    monteCarlo10000,
    compositeScore: 0,
    compositeRank: 0,
    fetchOk: true,
  };
}

function buildRanking(
  rows: ForwardMalaysiaV4FinalCompareRow[],
  pick: (r: ForwardMalaysiaV4FinalCompareRow) => number,
  labelJa: (v: number) => string,
  higherBetter: boolean,
): ForwardMalaysiaV4FinalCompareRankedEntry[] {
  const ok = rows.filter((r) => r.fetchOk);
  const sorted = [...ok].sort((a, b) =>
    higherBetter ? pick(b) - pick(a) : pick(a) - pick(b),
  );
  return sorted.map((r, i) => ({
    rank: i + 1,
    candidateId: r.candidateId,
    candidateLabelJa: r.candidateLabelJa,
    value: pick(r),
    valueLabelJa: labelJa(pick(r)),
  }));
}

export function gradeFinalCompareAdoption(input: {
  best: ForwardMalaysiaV4FinalCompareRow | null;
  ijm: ForwardMalaysiaV4FinalCompareRow | null;
}): { grade: ForwardMalaysiaV4FinalCompareGrade; verdictJa: string } {
  const best = input.best;
  const ijm = input.ijm;

  if (!best || !best.fetchOk) {
    return { grade: 'C', verdictJa: 'C 不採用 — 有効候補なし' };
  }

  if (
    best.candidateId === 'v4_ijm' &&
    best.cumulativeReturnPct >= CUMULATIVE_TARGET_PCT &&
    best.delistBankruptcyRatePct < 5
  ) {
    return {
      grade: 'A',
      verdictJa: `A 即採用 — IJM+YTL15% 最終確定 · 累積${best.cumulativeReturnPct}% · 廃止MC${best.delistBankruptcyRatePct}% · 総合${best.compositeScore}`,
    };
  }

  if (
    ijm &&
    ijm.fetchOk &&
    ijm.compositeRank === 1 &&
    ijm.delistBankruptcyRatePct < 5 &&
    ijm.cumulativeReturnPct >= 35
  ) {
    return {
      grade: 'A',
      verdictJa: `A 即採用 — IJM総合1位 · 累積${ijm.cumulativeReturnPct}% · 廃止MC${ijm.delistBankruptcyRatePct}%`,
    };
  }

  if (best.delistBankruptcyRatePct < 10 && best.cumulativeReturnPct >= 35) {
    return {
      grade: 'B',
      verdictJa: `B 採用候補 — ${best.candidateLabelJa} · 累積${best.cumulativeReturnPct}% · 廃止MC${best.delistBankruptcyRatePct}% · IJM差し替え検討`,
    };
  }

  return {
    grade: 'C',
    verdictJa: `C 不採用 — 最良${best.candidateLabelJa}も廃止MC${best.delistBankruptcyRatePct}% · 累積${best.cumulativeReturnPct}%`,
  };
}

function formatDelta(v: number, suffix = ''): string {
  const sign = v > 0 ? '+' : '';
  return `${sign}${round3(v)}${suffix}`;
}

export async function buildMalaysiaV4FinalCompareAuditReport(input: {
  bundle: SurvivorshipOhlcvBundle;
  auditedAt?: string;
}): Promise<ForwardMalaysiaV4FinalCompareAuditReport> {
  const auditedAt = input.auditedAt ?? new Date().toISOString();
  const toDate = input.bundle.latestDate;
  const fromDate = resolveAuditFromDate(toDate);
  const split = computeCalendarTrainTestSplit(fromDate, toDate, WF_TRAIN_PCT);
  const oosFrom = split.testFrom;

  const allSymbols = [
    ...new Set(
      MALAYSIA_V4_FINAL_COMPARE_CANDIDATES.flatMap((c) =>
        resolveV4TradeSymbols({ candidateSymbol: c.symbol, ytlCapPct: YTL_CAP_PCT }),
      ),
    ),
  ].filter((s) => input.bundle.fetchedSymbols.includes(s));

  const cachedTemplates = precomputeTradeTemplates({
    bundle: input.bundle,
    symbols: allSymbols,
    fromDate,
    toDate,
  });

  const rows = MALAYSIA_V4_FINAL_COMPARE_CANDIDATES.map((def, i) =>
    buildCandidateRow({
      candidateId: def.candidateId,
      candidateLabelJa: def.labelJa,
      candidateSymbol: def.symbol,
      bundle: input.bundle,
      fromDate,
      toDate,
      oosFrom,
      cachedTemplates,
      seedOffset: i * 17,
    }),
  );

  computeCompositeScores(rows);

  const compositeRanking = buildRanking(
    rows,
    (r) => r.compositeScore,
    (v) => `総合${v}`,
    true,
  );
  const oosRanking = buildRanking(
    rows,
    (r) => r.oosCumulativeReturnPct,
    (v) => `OOS累積${v}%`,
    true,
  );
  const mcRanking = buildRanking(
    rows,
    (r) => r.delistBankruptcyRatePct,
    (v) => `廃止MC${v}%`,
    false,
  );

  const ijmRow = rows.find((r) => r.candidateId === 'v4_ijm') ?? null;
  const bestCompositeRow =
    compositeRanking.length > 0
      ? rows.find((r) => r.candidateId === compositeRanking[0]!.candidateId) ?? null
      : null;

  const { grade, verdictJa } = gradeFinalCompareAdoption({
    best: bestCompositeRow,
    ijm: ijmRow,
  });

  const answerAJa = `A 総合ランキング: ${compositeRanking.map((e) => `${e.rank}.${e.candidateLabelJa}(${e.value})`).join(' · ')}`;
  const answerBJa = ijmRow
    ? `B IJMとの差: ${rows
        .filter((r) => r.candidateId !== 'v4_ijm' && r.fetchOk)
        .map(
          (r) =>
            `${r.candidateLabelJa} 累積${formatDelta(r.cumulativeReturnPct - ijmRow.cumulativeReturnPct, '%')} MC${formatDelta(r.delistBankruptcyRatePct - ijmRow.delistBankruptcyRatePct, '%')} 総合${formatDelta(r.compositeScore - ijmRow.compositeScore)}`,
        )
        .join(' · ')}`
    : 'B IJMとの差: —';
  const answerCJa = `C OOSランキング: ${oosRanking.map((e) => `${e.rank}.${e.candidateLabelJa}(${e.valueLabelJa})`).join(' · ')}`;
  const answerDJa = `D MCランキング: ${mcRanking.map((e) => `${e.rank}.${e.candidateLabelJa}(${e.valueLabelJa})`).join(' · ')}`;
  const answerEJa =
    grade === 'A'
      ? `E 実運用推奨: IJM+YTL15%をv4第4銘柄として即確定 · CELCOMDIGI等は累積優位でも廃止MC>20%で不採用`
      : grade === 'B'
        ? `E 実運用推奨: ${bestCompositeRow?.candidateLabelJa ?? '—'}を候補として継続検証 · IJM比較要再確認`
        : `E 実運用推奨: v4採用保留 · 候補再探索`;

  const humanSummaryJa = [
    '監査79 Malaysia v4 最終候補同条件比較',
    `期間 ${fromDate}〜${toDate} · OOS ${oosFrom}〜`,
    FIXED_CONDITIONS_JA,
    COMPOSITE_WEIGHTS_JA,
    ...rows
      .filter((r) => r.fetchOk)
      .sort((a, b) => a.compositeRank - b.compositeRank)
      .map(
        (r) =>
          `${r.compositeRank}. ${r.candidateLabelJa}: 累積${r.cumulativeReturnPct}% · Sharpe${r.sharpe ?? '—'} · PF${r.profitFactor ?? '—'} · MaxDD${r.maxDrawdownPct}% · 廃止MC${r.delistBankruptcyRatePct}% · OOS${r.oosCumulativeReturnPct}% · 総合${r.compositeScore}`,
      ),
    answerAJa,
    answerBJa,
    answerCJa,
    answerDJa,
    answerEJa,
    verdictJa,
    '監査76/78整合 · ルール変更なし',
  ].join('\n');

  return {
    auditedAt,
    fromDate,
    toDate,
    oosFromDate: oosFrom,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    compositeWeightsJa: COMPOSITE_WEIGHTS_JA,
    rows,
    compositeRanking,
    oosRanking,
    mcRanking,
    ijmRow,
    bestCompositeRow,
    adoptionGrade: grade,
    adoptionVerdictJa: verdictJa,
    answerAJa,
    answerBJa,
    answerCJa,
    answerDJa,
    answerEJa,
    consistencyNoteJa: '監査76/78整合 · ルール変更なし',
    humanSummaryJa,
  };
}

export async function runMalaysiaV4FinalCompareAudit(): Promise<ForwardMalaysiaV4FinalCompareAuditReport | null> {
  const bundle = await fetchMalaysiaV76AuditBundle();
  if (!bundle) return null;
  return buildMalaysiaV4FinalCompareAuditReport({ bundle });
}

export function formatMalaysiaV4FinalCompareCsv(
  report: ForwardMalaysiaV4FinalCompareAuditReport,
): string {
  const lines = [
    `# 最重要監査その79 v4最終候補比較 ${report.fromDate}〜${report.toDate}`,
    `# ${report.fixedConditionsJa}`,
    `# ${report.compositeWeightsJa}`,
    `# ${report.adoptionVerdictJa}`,
    '',
    'section,candidate,symbol,cum,sharpe,pf,maxDD,delistMC,oosCum,oosCandPnl,oosTrades,composite,rank',
    ...report.rows.map((r) =>
      [
        'row',
        r.candidateLabelJa,
        r.candidateSymbol,
        r.cumulativeReturnPct,
        r.sharpe ?? '',
        r.profitFactor ?? '',
        r.maxDrawdownPct,
        r.delistBankruptcyRatePct,
        r.oosCumulativeReturnPct,
        r.oosCandidatePnlMYR,
        r.oosTradeCount,
        r.compositeScore,
        r.compositeRank,
      ].join(','),
    ),
    '',
    'section,rank,candidate,metric,value',
    ...report.compositeRanking.map((e) =>
      ['composite', e.rank, e.candidateLabelJa, 'score', e.value].join(','),
    ),
    ...report.oosRanking.map((e) =>
      ['oos', e.rank, e.candidateLabelJa, 'oosCum', e.value].join(','),
    ),
    ...report.mcRanking.map((e) =>
      ['mc', e.rank, e.candidateLabelJa, 'delistMc', e.value].join(','),
    ),
    '',
    'section,candidate,bootstrapMeanCum,bootstrapP5,oosNegPct,mcBankruptcy,mcMeanCum',
    ...report.rows.map((r) =>
      [
        'robust',
        r.candidateLabelJa,
        r.bootstrap1000.meanCumulativePct,
        r.bootstrap1000.p5CumulativePct,
        r.bootstrap1000.oosNegativeRatePct,
        r.monteCarlo10000.bankruptcyRatePct,
        r.monteCarlo10000.meanCumulativePct,
      ].join(','),
    ),
    '',
    'section,answer,content',
    ['answer', 'A', `"${report.answerAJa}"`].join(','),
    ['answer', 'B', `"${report.answerBJa}"`].join(','),
    ['answer', 'C', `"${report.answerCJa}"`].join(','),
    ['answer', 'D', `"${report.answerDJa}"`].join(','),
    ['answer', 'E', `"${report.answerEJa}"`].join(','),
    ['verdict', 'grade', report.adoptionGrade].join(','),
  ];
  return lines.join('\n');
}
