/**
 * 最重要監査その76 — Malaysia v4 第4銘柄候補 · YTLリスク軽減 · 監査75固定 · ルール変更なし
 */
import { parseYahooChartBars } from '../../utils/yahooChartParser';
import type {
  ForwardMalaysiaV4AdoptionGrade,
  ForwardMalaysiaV4CandidateAuditReport,
  ForwardMalaysiaV4CandidateId,
  ForwardMalaysiaV4CandidateRow,
  ForwardMalaysiaV4RankedEntry,
  ForwardMalaysiaV4YtlPolicyId,
  ForwardPassedTradeRecord,
} from '../../types/forwardValidation';
import { fetchHttpWithRetry } from '../quoteProviders/providerFetchUtil';
import { bootstrapSampleTrades } from './forwardValidationBootstrapMcAudit';
import type { OhlcvBar } from './case4Indicators';
import {
  collectExecutedTradesForUniverse,
  MALAYSIA_V1_AUDIT_START,
} from './forwardValidationMalaysiaV1Audit';
import { fetchMalaysiaV69AuditBundle } from './forwardValidationMalaysiaV21FourthSymbolAudit';
import { symbolNetProfitContributionPct } from './forwardValidationMalaysiaV3Cap15Audit';
import { delistSymbol } from './forwardValidationMalaysiaV3CrashAudit';
import {
  MALAYSIA_V3_CAP_15_PHASE_WEIGHTS,
} from './forwardValidationMalaysiaV3GamudaCapAudit';
import {
  simulateMalaysiaV3DcaPath,
  type MalaysiaV3DcaExecutedTrade,
  type MalaysiaV3DcaPathResult,
  type MalaysiaV3PhaseWeights,
} from './forwardValidationMalaysiaV3DcaAudit';
import { buildReplacementPhaseWeights } from './forwardValidationMalaysiaV3YtlDependencyAudit';
import { mulberry32, percentile } from './forwardValidationMonteCarloAudit';
import { precomputeTradeTemplates } from './forwardValidationRobustnessAudit';
import type { SurvivorshipOhlcvBundle } from './forwardValidationSurvivorshipAudit';
import { buildYahooOhlcvUrl } from './yahooOhlcvFetch';

export const BOOTSTRAP_MC_76_RUNS = 10_000;
const INITIAL_CAPITAL = 3000;
const MONTHLY_DCA = 1500;
const BOOTSTRAP_SEED = 76_001;
const RUIN_EQUITY_PCT = 50;
const YTL_SYMBOL = '6742';
const GAMUDA_SYMBOL = '5398';
const GAMUDA_CAP_PCT = 15;
const BASELINE_CUM_TARGET = 37.716;
const BASE_SYMBOLS = ['5347', '5398', '1023'] as const;

export const MALAYSIA_V4_CANDIDATE_DEFS: {
  candidateId: ForwardMalaysiaV4CandidateId;
  symbol: string;
  labelJa: string;
  yahooSymbol: string;
}[] = [
  { candidateId: 'v4_misc', symbol: '3816', labelJa: 'MISC', yahooSymbol: '3816.KL' },
  { candidateId: 'v4_maybank', symbol: '1155', labelJa: 'MAYBANK', yahooSymbol: '1155.KL' },
  { candidateId: 'v4_celcomdigi', symbol: '6947', labelJa: 'CELCOMDIGI', yahooSymbol: '6947.KL' },
  { candidateId: 'v4_pbbank', symbol: '1295', labelJa: 'PBBANK', yahooSymbol: '1295.KL' },
  { candidateId: 'v4_sunway', symbol: '5211', labelJa: 'SUNWAY', yahooSymbol: '5211.KL' },
  { candidateId: 'v4_genting', symbol: '3182', labelJa: 'GENTING', yahooSymbol: '3182.KL' },
  { candidateId: 'v4_ijm', symbol: '3336', labelJa: 'IJM', yahooSymbol: '3336.KL' },
  { candidateId: 'v4_inari', symbol: '0166', labelJa: 'INARI', yahooSymbol: '0166.KL' },
  { candidateId: 'v4_axiata', symbol: '6888', labelJa: 'AXIATA', yahooSymbol: '6888.KL' },
  { candidateId: 'v4_tm', symbol: '5031', labelJa: 'TM', yahooSymbol: '5031.KL' },
];

export const MALAYSIA_V4_YTL_POLICIES: {
  policyId: ForwardMalaysiaV4YtlPolicyId;
  labelJa: string;
  ytlCapPct: number;
}[] = [
  { policyId: 'ytl_exclude', labelJa: '① YTL完全除外', ytlCapPct: 0 },
  { policyId: 'ytl_cap_20', labelJa: '② YTL上限20%', ytlCapPct: 20 },
  { policyId: 'ytl_cap_15', labelJa: '③ YTL上限15%', ytlCapPct: 15 },
  { policyId: 'ytl_cap_10', labelJa: '④ YTL上限10%', ytlCapPct: 10 },
];

const FIXED_CONDITIONS_JA =
  'MY v4候補 · GAMUDA15% · Phase2第4銘柄総当たり · YTL4政策 · 累積37.7%目標 · 月次RM1500 · ルール変更なし';

type OhlcvBarWithVolume = OhlcvBar & { volume: number };

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

export function buildV4PhaseWeights(input: {
  candidateSymbol: string;
  ytlCapPct: number;
}): MalaysiaV3PhaseWeights {
  if (input.ytlCapPct <= 0) {
    return buildReplacementPhaseWeights(input.candidateSymbol);
  }

  const base = MALAYSIA_V3_CAP_15_PHASE_WEIGHTS;
  const rem = round3(100 - GAMUDA_CAP_PCT - input.ytlCapPct);
  const each = round3(rem / 3);

  return {
    phase3: { ...base.phase3 },
    phase4: {
      '5347': each,
      '1023': each,
      [GAMUDA_SYMBOL]: GAMUDA_CAP_PCT,
      [YTL_SYMBOL]: input.ytlCapPct,
      [input.candidateSymbol]: each,
    },
  };
}

export function resolveV4TradeSymbols(input: {
  candidateSymbol: string;
  ytlCapPct: number;
}): string[] {
  const symbols = [...BASE_SYMBOLS, input.candidateSymbol];
  if (input.ytlCapPct > 0) symbols.push(YTL_SYMBOL);
  return symbols;
}

function isRuined(path: MalaysiaV3DcaPathResult): boolean {
  const minPct = (path.minEquityMYR / INITIAL_CAPITAL) * 100;
  return minPct <= RUIN_EQUITY_PCT || path.finalEquityMYR <= 0;
}

async function fetchMalaysiaBarsWithVolume(
  yahooSymbol: string,
  startDate: string,
): Promise<{ bars: OhlcvBarWithVolume[]; ok: boolean }> {
  const url = buildYahooOhlcvUrl(yahooSymbol, startDate);
  try {
    const { response, bodyText } = await fetchHttpWithRetry(url, {
      timeoutMs: 15_000,
      logLabel: 'forward_validation_ohlcv',
      symbol: yahooSymbol,
    });
    if (!response.ok) return { bars: [], ok: false };
    const raw = parseYahooChartBars(JSON.parse(bodyText) as unknown);
    const bars: OhlcvBarWithVolume[] = raw.map((b) => ({
      date: b.date,
      open: b.open ?? b.close,
      high: b.high ?? b.close,
      low: b.low ?? b.close,
      close: b.close,
      volume: b.volume ?? 0,
    }));
    return { bars, ok: bars.length >= 80 };
  } catch {
    return { bars: [], ok: false };
  }
}

export async function fetchMalaysiaV76AuditBundle(
  startDate = MALAYSIA_V1_AUDIT_START,
): Promise<SurvivorshipOhlcvBundle | null> {
  const base = await fetchMalaysiaV69AuditBundle(startDate);
  if (!base) return null;

  const etfBars = { ...base.etfBars };
  const fetchedSymbols = [...base.fetchedSymbols];
  const failedSymbols = [...base.failedSymbols];
  const firstBarDates = { ...base.firstBarDates };

  const extra = MALAYSIA_V4_CANDIDATE_DEFS.filter(
    (d) => !fetchedSymbols.includes(d.symbol),
  );

  for (const def of extra) {
    const { bars, ok } = await fetchMalaysiaBarsWithVolume(def.yahooSymbol, startDate);
    if (!ok) {
      if (!failedSymbols.includes(def.symbol)) failedSymbols.push(def.symbol);
      continue;
    }
    etfBars[def.symbol] = bars;
    fetchedSymbols.push(def.symbol);
    firstBarDates[def.symbol] = bars[0]!.date;
  }

  const dateSet = new Set<string>(base.tradingDates);
  for (const sym of fetchedSymbols) {
    for (const b of etfBars[sym] ?? []) dateSet.add(b.date);
  }
  const tradingDates = [...dateSet].sort();

  return {
    etfBars,
    spyBars: base.spyBars,
    vixBars: base.vixBars,
    tradingDates,
    latestDate: tradingDates[tradingDates.length - 1] ?? base.latestDate,
    fetchedSymbols,
    failedSymbols,
    firstBarDates,
  };
}

function runDelistBootstrap(input: {
  pool: ForwardPassedTradeRecord[];
  fromDate: string;
  toDate: string;
  phaseWeights: MalaysiaV3PhaseWeights;
  ytlCapPct: number;
  seed: number;
}): { bankruptcyRatePct: number; p5MinEquityMYR: number } {
  if (input.ytlCapPct <= 0) {
    return { bankruptcyRatePct: 0, p5MinEquityMYR: INITIAL_CAPITAL };
  }

  const runs = BOOTSTRAP_MC_76_RUNS;
  const rand = mulberry32(input.seed);
  const minEquities: number[] = [];
  let bankrupt = 0;

  for (let r = 0; r < runs; r++) {
    let sample = bootstrapSampleTrades(input.pool, rand, r);
    sample = delistSymbol(sample, YTL_SYMBOL);
    const path = simulateMalaysiaV3DcaPath({
      trades: sample,
      fromDate: input.fromDate,
      toDate: input.toDate,
      monthlyContributionMYR: MONTHLY_DCA,
      phaseWeights: input.phaseWeights,
    });
    minEquities.push(path.minEquityMYR);
    if (isRuined(path)) bankrupt++;
  }

  const sorted = [...minEquities].sort((a, b) => a - b);
  return {
    bankruptcyRatePct: round3((bankrupt / runs) * 100),
    p5MinEquityMYR: percentile(sorted, 5),
  };
}

function buildV4Row(input: {
  candidateId: ForwardMalaysiaV4CandidateId;
  candidateLabelJa: string;
  candidateSymbol: string;
  ytlPolicyId: ForwardMalaysiaV4YtlPolicyId;
  ytlPolicyLabelJa: string;
  ytlCapPct: number;
  bundle: SurvivorshipOhlcvBundle;
  fromDate: string;
  toDate: string;
  cachedTemplates: ReturnType<typeof precomputeTradeTemplates>;
  seedOffset: number;
}): ForwardMalaysiaV4CandidateRow {
  const rowId = `${input.candidateId}_${input.ytlPolicyId}`;
  const fetchOk = input.bundle.fetchedSymbols.includes(input.candidateSymbol);

  if (!fetchOk) {
    return {
      rowId,
      candidateId: input.candidateId,
      candidateLabelJa: input.candidateLabelJa,
      candidateSymbol: input.candidateSymbol,
      ytlPolicyId: input.ytlPolicyId,
      ytlPolicyLabelJa: input.ytlPolicyLabelJa,
      ytlCapPct: input.ytlCapPct,
      cumulativeReturnPct: 0,
      sharpe: null,
      maxDrawdownPct: 0,
      minEquityMYR: 0,
      delistBankruptcyRatePct: 0,
      delistP5MinEquityMYR: 0,
      candidateNetContributionPct: 0,
      ytlNetContributionPct: 0,
      fetchOk: false,
      meetsCumulativeTarget: false,
    };
  }

  const symbols = resolveV4TradeSymbols({
    candidateSymbol: input.candidateSymbol,
    ytlCapPct: input.ytlCapPct,
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
    ytlCapPct: input.ytlCapPct,
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

  const delist = runDelistBootstrap({
    pool: trades,
    fromDate: input.fromDate,
    toDate: input.toDate,
    phaseWeights,
    ytlCapPct: input.ytlCapPct,
    seed: BOOTSTRAP_SEED + input.seedOffset,
  });

  const cumulative = cumulativeFromPath(path);

  return {
    rowId,
    candidateId: input.candidateId,
    candidateLabelJa: input.candidateLabelJa,
    candidateSymbol: input.candidateSymbol,
    ytlPolicyId: input.ytlPolicyId,
    ytlPolicyLabelJa: input.ytlPolicyLabelJa,
    ytlCapPct: input.ytlCapPct,
    cumulativeReturnPct: cumulative,
    sharpe: path.sharpe,
    maxDrawdownPct: path.maxDrawdownPct,
    minEquityMYR: path.minEquityMYR,
    delistBankruptcyRatePct: delist.bankruptcyRatePct,
    delistP5MinEquityMYR: delist.p5MinEquityMYR,
    candidateNetContributionPct: symbolNetProfitContributionPct(ledger, input.candidateSymbol),
    ytlNetContributionPct: symbolNetProfitContributionPct(ledger, YTL_SYMBOL),
    fetchOk: true,
    meetsCumulativeTarget: cumulative >= BASELINE_CUM_TARGET,
  };
}

export function compositeV4Score(row: ForwardMalaysiaV4CandidateRow): number {
  if (!row.fetchOk) return -Infinity;
  const cumPart = row.cumulativeReturnPct * 2;
  const targetBonus = row.meetsCumulativeTarget ? 50 : 0;
  const sharpePart = (row.sharpe ?? 0) * 12;
  const ddPart = row.maxDrawdownPct * 0.5;
  const mcPenalty = row.delistBankruptcyRatePct * 3;
  return round3(cumPart + targetBonus + sharpePart + ddPart - mcPenalty);
}

export function gradeV4Candidate(input: {
  best: ForwardMalaysiaV4CandidateRow | null;
  anyMeetsTarget: boolean;
  anyLowMc: boolean;
}): { grade: ForwardMalaysiaV4AdoptionGrade; verdictJa: string } {
  const best = input.best;
  if (!best || !best.fetchOk) {
    return { grade: 'C', verdictJa: 'C 不採用 — 有効候補なし · データ取得失敗' };
  }

  if (
    best.meetsCumulativeTarget &&
    best.delistBankruptcyRatePct < 5
  ) {
    return {
      grade: 'A',
      verdictJa: `A 即採用 — ${best.candidateLabelJa}·${best.ytlPolicyLabelJa} · 累積${best.cumulativeReturnPct}% · 廃止MC${best.delistBankruptcyRatePct}%`,
    };
  }

  if (
    best.cumulativeReturnPct >= 35 ||
    (best.cumulativeReturnPct >= 32 && best.delistBankruptcyRatePct < 20)
  ) {
    return {
      grade: 'B',
      verdictJa: `B 採用候補 — ${best.candidateLabelJa}·${best.ytlPolicyLabelJa} · 累積${best.cumulativeReturnPct}% · 廃止MC${best.delistBankruptcyRatePct}% · 37.7%未達`,
    };
  }

  return {
    grade: 'C',
    verdictJa: `C 不採用 — 最良${best.candidateLabelJa}累積${best.cumulativeReturnPct}% · 廃止MC${best.delistBankruptcyRatePct}% · 目標未達`,
  };
}

function buildRanked(
  rows: ForwardMalaysiaV4CandidateRow[],
  metric: 'cumulative' | 'sharpe' | 'maxDd' | 'delistMc' | 'composite',
  n = 10,
): ForwardMalaysiaV4RankedEntry[] {
  const ok = rows.filter((r) => r.fetchOk);
  const sorted = [...ok].sort((a, b) => {
    switch (metric) {
      case 'cumulative':
        return b.cumulativeReturnPct - a.cumulativeReturnPct;
      case 'sharpe':
        return (b.sharpe ?? -Infinity) - (a.sharpe ?? -Infinity);
      case 'maxDd':
        return b.maxDrawdownPct - a.maxDrawdownPct;
      case 'delistMc':
        return a.delistBankruptcyRatePct - b.delistBankruptcyRatePct;
      case 'composite':
        return compositeV4Score(b) - compositeV4Score(a);
      default:
        return 0;
    }
  });

  return sorted.slice(0, n).map((r, i) => {
    let value = 0;
    let valueLabelJa = '';
    switch (metric) {
      case 'cumulative':
        value = r.cumulativeReturnPct;
        valueLabelJa = `累積${value}%`;
        break;
      case 'sharpe':
        value = r.sharpe ?? 0;
        valueLabelJa = `Sharpe${r.sharpe ?? '—'}`;
        break;
      case 'maxDd':
        value = r.maxDrawdownPct;
        valueLabelJa = `MaxDD${value}%`;
        break;
      case 'delistMc':
        value = r.delistBankruptcyRatePct;
        valueLabelJa = `廃止MC${value}%`;
        break;
      case 'composite':
        value = compositeV4Score(r);
        valueLabelJa = `総合${value}`;
        break;
    }
    return {
      rank: i + 1,
      rowId: r.rowId,
      candidateLabelJa: r.candidateLabelJa,
      ytlPolicyLabelJa: r.ytlPolicyLabelJa,
      value,
      valueLabelJa,
    };
  });
}

export async function buildMalaysiaV4CandidateAuditReport(input: {
  bundle: SurvivorshipOhlcvBundle;
  auditedAt?: string;
}): Promise<ForwardMalaysiaV4CandidateAuditReport> {
  const auditedAt = input.auditedAt ?? new Date().toISOString();
  const toDate = input.bundle.latestDate;
  const fromDate = resolveAuditFromDate(toDate);

  const allSymbols = [
    ...new Set([
      ...BASE_SYMBOLS,
      YTL_SYMBOL,
      ...MALAYSIA_V4_CANDIDATE_DEFS.map((d) => d.symbol),
    ]),
  ];
  const cachedTemplates = precomputeTradeTemplates({
    bundle: input.bundle,
    symbols: allSymbols.filter((s) => input.bundle.fetchedSymbols.includes(s)),
    fromDate,
    toDate,
  });

  let seedOffset = 0;
  const rows: ForwardMalaysiaV4CandidateRow[] = [];
  for (const cand of MALAYSIA_V4_CANDIDATE_DEFS) {
    for (const policy of MALAYSIA_V4_YTL_POLICIES) {
      rows.push(
        buildV4Row({
          candidateId: cand.candidateId,
          candidateLabelJa: cand.labelJa,
          candidateSymbol: cand.symbol,
          ytlPolicyId: policy.policyId,
          ytlPolicyLabelJa: policy.labelJa,
          ytlCapPct: policy.ytlCapPct,
          bundle: input.bundle,
          fromDate,
          toDate,
          cachedTemplates,
          seedOffset: seedOffset++,
        }),
      );
    }
  }

  const top10Cumulative = buildRanked(rows, 'cumulative');
  const top10Sharpe = buildRanked(rows, 'sharpe');
  const top10MaxDd = buildRanked(rows, 'maxDd');
  const top10DelistMc = buildRanked(rows, 'delistMc');
  const compositeRanking = buildRanked(rows, 'composite', rows.filter((r) => r.fetchOk).length);

  const bestComposite = rows
    .filter((r) => r.fetchOk)
    .sort((a, b) => compositeV4Score(b) - compositeV4Score(a))[0] ?? null;

  const anyMeetsTarget = rows.some((r) => r.meetsCumulativeTarget);
  const anyLowMc = rows.some((r) => r.fetchOk && r.delistBankruptcyRatePct < 5);
  const { grade, verdictJa } = gradeV4Candidate({
    best: bestComposite,
    anyMeetsTarget,
    anyLowMc,
  });

  const fmtRank = (entries: ForwardMalaysiaV4RankedEntry[]) =>
    entries
      .map(
        (e) =>
          `${e.rank}.${e.candidateLabelJa}·${e.ytlPolicyLabelJa}(${e.valueLabelJa})`,
      )
      .join(' · ');

  const answerAJa = `A 累積トップ10: ${fmtRank(top10Cumulative)}`;
  const answerBJa = `B Sharpeトップ10: ${fmtRank(top10Sharpe)}`;
  const answerCJa = `C MaxDDトップ10: ${fmtRank(top10MaxDd)}`;
  const answerDJa = `D MC破産率トップ10: ${fmtRank(top10DelistMc)}`;
  const answerEJa = `E 総合ランキング: ${fmtRank(compositeRanking.slice(0, 10))}`;
  const answerFJa = bestComposite
    ? `F Malaysia v4候補: ${bestComposite.candidateLabelJa} · ${bestComposite.ytlPolicyLabelJa} · 累積${bestComposite.cumulativeReturnPct}% · 廃止MC${bestComposite.delistBankruptcyRatePct}% · ${grade}`
    : `F Malaysia v4候補: なし · ${grade}`;

  const humanSummaryJa = [
    '監査76 Malaysia v4 第4銘柄候補 · YTLリスク軽減',
    `期間 ${fromDate}〜${toDate}`,
    FIXED_CONDITIONS_JA,
    `目標累積 ${BASELINE_CUM_TARGET}% · 候補${MALAYSIA_V4_CANDIDATE_DEFS.length}×政策${MALAYSIA_V4_YTL_POLICIES.length}=${rows.length}通り`,
    ...rows
      .filter((r) => r.fetchOk)
      .sort((a, b) => compositeV4Score(b) - compositeV4Score(a))
      .slice(0, 15)
      .map(
        (r) =>
          `${r.candidateLabelJa}·${r.ytlPolicyLabelJa}: 累積${r.cumulativeReturnPct}% · Sharpe${r.sharpe ?? '—'} · MaxDD${r.maxDrawdownPct}% · 廃止MC${r.delistBankruptcyRatePct}% · 候補寄与${r.candidateNetContributionPct}%`,
      ),
    answerAJa,
    answerBJa,
    answerCJa,
    answerDJa,
    answerEJa,
    answerFJa,
    verdictJa,
    '監査75整合: YTL廃止MC74%実リスク · cap15累積37.716% · ルール変更なし',
  ].join('\n');

  return {
    auditedAt,
    fromDate,
    toDate,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    baselineCumulativePct: BASELINE_CUM_TARGET,
    cumulativeTargetPct: BASELINE_CUM_TARGET,
    rows,
    top10Cumulative,
    top10Sharpe,
    top10MaxDd,
    top10DelistMc,
    compositeRanking,
    v4CandidateId: bestComposite?.candidateId ?? null,
    v4CandidateLabelJa: bestComposite?.candidateLabelJa ?? null,
    v4YtlPolicyId: bestComposite?.ytlPolicyId ?? null,
    adoptionGrade: grade,
    adoptionVerdictJa: verdictJa,
    answerAJa,
    answerBJa,
    answerCJa,
    answerDJa,
    answerEJa,
    answerFJa,
    consistencyNoteJa: '監査75整合: YTL廃止MC74%実リスク · cap15累積37.716% · ルール変更なし',
    humanSummaryJa,
  };
}

export async function runMalaysiaV4CandidateAudit(): Promise<ForwardMalaysiaV4CandidateAuditReport | null> {
  const bundle = await fetchMalaysiaV76AuditBundle();
  if (!bundle) return null;
  return buildMalaysiaV4CandidateAuditReport({ bundle });
}

export function formatMalaysiaV4CandidateCsv(
  report: ForwardMalaysiaV4CandidateAuditReport,
): string {
  const lines = [
    `# 最重要監査その76 Malaysia v4候補 ${report.fromDate}〜${report.toDate}`,
    `# ${report.fixedConditionsJa}`,
    `# ${report.adoptionVerdictJa}`,
    '',
    'section,rowId,candidate,symbol,ytlPolicy,ytlCap,cumulative,sharpe,maxDD,minEquity,delistMC,delistP5,candDep,ytlDep,meetsTarget,fetchOk',
    ...report.rows.map((r) =>
      [
        'row',
        r.rowId,
        r.candidateLabelJa,
        r.candidateSymbol,
        r.ytlPolicyLabelJa,
        r.ytlCapPct,
        r.cumulativeReturnPct,
        r.sharpe ?? '',
        r.maxDrawdownPct,
        r.minEquityMYR,
        r.delistBankruptcyRatePct,
        r.delistP5MinEquityMYR,
        r.candidateNetContributionPct,
        r.ytlNetContributionPct,
        r.meetsCumulativeTarget,
        r.fetchOk,
      ].join(','),
    ),
    '',
    'section,rank,rowId,candidate,ytlPolicy,value,label',
    ...report.top10Cumulative.map((e) =>
      ['topCum', e.rank, e.rowId, e.candidateLabelJa, e.ytlPolicyLabelJa, e.value, e.valueLabelJa].join(','),
    ),
    ...report.top10Sharpe.map((e) =>
      ['topSharpe', e.rank, e.rowId, e.candidateLabelJa, e.ytlPolicyLabelJa, e.value, e.valueLabelJa].join(','),
    ),
    ...report.top10MaxDd.map((e) =>
      ['topMaxDd', e.rank, e.rowId, e.candidateLabelJa, e.ytlPolicyLabelJa, e.value, e.valueLabelJa].join(','),
    ),
    ...report.top10DelistMc.map((e) =>
      ['topMc', e.rank, e.rowId, e.candidateLabelJa, e.ytlPolicyLabelJa, e.value, e.valueLabelJa].join(','),
    ),
    ...report.compositeRanking.map((e) =>
      ['composite', e.rank, e.rowId, e.candidateLabelJa, e.ytlPolicyLabelJa, e.value, e.valueLabelJa].join(','),
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
    ['verdict', 'v4Candidate', report.v4CandidateLabelJa ?? ''].join(','),
    ['verdict', 'v4Policy', report.v4YtlPolicyId ?? ''].join(','),
  ];
  return lines.join('\n');
}
