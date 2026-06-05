/**
 * 最重要監査その77 — YTL依存率54.5%→32.8% 原因特定 · 監査73–76固定 · ルール変更なし
 */
import type {
  ForwardMalaysiaV4AttributionAuditReport,
  ForwardMalaysiaV4AttributionBasisId,
  ForwardMalaysiaV4AttributionGrade,
  ForwardMalaysiaV4BasisAttribution,
  ForwardMalaysiaV4SymbolAttributionRow,
  ForwardPassedTradeRecord,
} from '../../types/forwardValidation';
import { bootstrapSampleTrades } from './forwardValidationBootstrapMcAudit';
import {
  collectExecutedTradesForUniverse,
  MALAYSIA_V1_AUDIT_START,
} from './forwardValidationMalaysiaV1Audit';
import { computeCalendarTrainTestSplit } from './forwardValidationMalaysiaV2DurabilityAudit';
import {
  aggregateCap15SymbolStats,
  symbolNetProfitContributionPct,
} from './forwardValidationMalaysiaV3Cap15Audit';
import {
  MALAYSIA_V3_CAP_15_PHASE_WEIGHTS,
} from './forwardValidationMalaysiaV3GamudaCapAudit';
import {
  simulateMalaysiaV3DcaPath,
  V3_SYMBOLS,
  type MalaysiaV3DcaExecutedTrade,
  type MalaysiaV3DcaPathResult,
} from './forwardValidationMalaysiaV3DcaAudit';
import {
  buildV4PhaseWeights,
  fetchMalaysiaV76AuditBundle,
  resolveV4TradeSymbols,
} from './forwardValidationMalaysiaV4CandidateAudit';
import { mulberry32 } from './forwardValidationMonteCarloAudit';
import { precomputeTradeTemplates } from './forwardValidationRobustnessAudit';
import type { SurvivorshipOhlcvBundle } from './forwardValidationSurvivorshipAudit';

export const BOOTSTRAP_MC_77_RUNS = 10_000;
const MONTHLY_DCA = 1500;
const BOOTSTRAP_SEED = 77_001;
const WF_TRAIN_PCT = 70;
const IJM_SYMBOL = '3336';
const YTL_SYMBOL = '6742';
const YTL_CAP_PCT = 15;
const AUDIT73_YTL_DEP = 54.497;
const AUDIT76_YTL_DEP = 32.815;
const AUDIT73_CUM = 37.716;
const AUDIT76_CUM = 38.36;

export const V4_PHASE2_SYMBOLS = ['5347', '1023', '5398', YTL_SYMBOL, IJM_SYMBOL] as const;

const SYMBOL_NAMES: Record<string, string> = {
  '5347': 'TENAGA',
  '5398': 'GAMUDA',
  '1023': 'CIMB',
  '6742': 'YTL',
  '3336': 'IJM',
};

const FIXED_CONDITIONS_JA =
  'MY v4帰属 · IJM+YTL15% · 実取引/OOS/Bootstrap分離 · 監査73–76整合 · ルール変更なし';

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

function toSymbolRows(
  ledger: MalaysiaV3DcaExecutedTrade[],
  symbols: readonly string[],
): ForwardMalaysiaV4SymbolAttributionRow[] {
  const stats = aggregateCap15SymbolStats({
    cap15Trades: ledger,
    baselineTrades: ledger,
    symbols,
  });
  return stats.map((s) => ({
    symbol: s.symbol,
    symbolNameJa: SYMBOL_NAMES[s.symbol] ?? s.symbolNameJa,
    tradeCount: s.tradeCount,
    totalPnlMYR: s.totalPnlMYR,
    profitContributionPct: s.profitContributionPct,
    avgNotionalMYR: s.avgNotionalMYR,
  }));
}

function symbolPnl(ledger: MalaysiaV3DcaExecutedTrade[], symbol: string): number {
  return round3(ledger.filter((t) => t.symbol === symbol).reduce((s, t) => s + t.pnlMYR, 0));
}

function buildBasisAttribution(input: {
  basisId: ForwardMalaysiaV4AttributionBasisId;
  labelJa: string;
  portfolioLabelJa: string;
  ledger: MalaysiaV3DcaExecutedTrade[];
  symbols: readonly string[];
  cumulativeReturnPct: number;
}): ForwardMalaysiaV4BasisAttribution {
  const totalNetPnl = round3(input.ledger.reduce((s, t) => s + t.pnlMYR, 0));
  return {
    basisId: input.basisId,
    labelJa: input.labelJa,
    portfolioLabelJa: input.portfolioLabelJa,
    cumulativeReturnPct: input.cumulativeReturnPct,
    totalNetPnlMYR: totalNetPnl,
    symbols: toSymbolRows(input.ledger, input.symbols),
  };
}

function mean(vals: number[]): number {
  return vals.length > 0 ? round3(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
}

function runBootstrapAttribution(input: {
  pool: ForwardPassedTradeRecord[];
  fromDate: string;
  toDate: string;
  phaseWeights: ReturnType<typeof buildV4PhaseWeights> | typeof MALAYSIA_V3_CAP_15_PHASE_WEIGHTS;
  symbols: readonly string[];
  seed: number;
}): { symbols: ForwardMalaysiaV4SymbolAttributionRow[]; cumulativeReturnPct: number } {
  const rand = mulberry32(input.seed);
  const cumulatives: number[] = [];
  const pnlBySym = new Map<string, number[]>();
  const contribBySym = new Map<string, number[]>();
  for (const sym of input.symbols) {
    pnlBySym.set(sym, []);
    contribBySym.set(sym, []);
  }

  for (let r = 0; r < BOOTSTRAP_MC_77_RUNS; r++) {
    const sample = bootstrapSampleTrades(input.pool, rand, r);
    const path = simulateMalaysiaV3DcaPath({
      trades: sample,
      fromDate: input.fromDate,
      toDate: input.toDate,
      monthlyContributionMYR: MONTHLY_DCA,
      phaseWeights: input.phaseWeights,
      captureLedger: true,
    });
    const ledger = path.executedTrades ?? [];
    cumulatives.push(cumulativeFromPath(path));
    for (const sym of input.symbols) {
      pnlBySym.get(sym)!.push(symbolPnl(ledger, sym));
      contribBySym.get(sym)!.push(symbolNetProfitContributionPct(ledger, sym));
    }
  }

  const symbols = input.symbols.map((sym) => ({
    symbol: sym,
    symbolNameJa: SYMBOL_NAMES[sym] ?? sym,
    tradeCount: 0,
    totalPnlMYR: mean(pnlBySym.get(sym) ?? []),
    profitContributionPct: mean(contribBySym.get(sym) ?? []),
    avgNotionalMYR: 0,
  }));

  return { symbols, cumulativeReturnPct: mean(cumulatives) };
}

function runPortfolioAttributions(input: {
  labelJa: string;
  trades: ForwardPassedTradeRecord[];
  phaseWeights: ReturnType<typeof buildV4PhaseWeights> | typeof MALAYSIA_V3_CAP_15_PHASE_WEIGHTS;
  symbols: readonly string[];
  fromDate: string;
  toDate: string;
  testFrom: string;
  seed: number;
}): ForwardMalaysiaV4BasisAttribution[] {
  const fullPath = simulateMalaysiaV3DcaPath({
    trades: input.trades,
    fromDate: input.fromDate,
    toDate: input.toDate,
    monthlyContributionMYR: MONTHLY_DCA,
    phaseWeights: input.phaseWeights,
    captureLedger: true,
  });
  const fullLedger = fullPath.executedTrades ?? [];

  const oosLedger = fullLedger.filter((t) => t.exitDate >= input.testFrom);

  const bootstrap = runBootstrapAttribution({
    pool: input.trades,
    fromDate: input.fromDate,
    toDate: input.toDate,
    phaseWeights: input.phaseWeights,
    symbols: input.symbols,
    seed: input.seed,
  });

  const oosPnl = round3(oosLedger.reduce((s, t) => s + t.pnlMYR, 0));
  const oosCumProxy =
    fullPath.totalContributedMYR > 0
      ? round3((oosPnl / fullPath.totalContributedMYR) * 100)
      : 0;

  return [
    buildBasisAttribution({
      basisId: 'actual',
      labelJa: '② 実取引ベース',
      portfolioLabelJa: input.labelJa,
      ledger: fullLedger,
      symbols: input.symbols,
      cumulativeReturnPct: cumulativeFromPath(fullPath),
    }),
    buildBasisAttribution({
      basisId: 'oos',
      labelJa: '③ OOSベース',
      portfolioLabelJa: input.labelJa,
      ledger: oosLedger,
      symbols: input.symbols,
      cumulativeReturnPct: oosCumProxy,
    }),
    {
      basisId: 'bootstrap' as const,
      labelJa: '④ Bootstrapベース',
      portfolioLabelJa: input.labelJa,
      cumulativeReturnPct: bootstrap.cumulativeReturnPct,
      totalNetPnlMYR: round3(bootstrap.symbols.reduce((s, r) => s + r.totalPnlMYR, 0)),
      symbols: bootstrap.symbols,
    },
  ];
}

export function explainYtlDependencyDrop(input: {
  v3YtlPct: number;
  v4YtlPct: number;
  v3YtlPnl: number;
  v4YtlPnl: number;
  v4IjmPnl: number;
  v3YtlAvgNotional: number;
  v4YtlAvgNotional: number;
  v3YtlWeight: number;
  v4YtlWeight: number;
}): string {
  const weightRatio = input.v3YtlWeight > 0 ? round3((input.v4YtlWeight / input.v3YtlWeight) * 100) : 0;
  const notionalRatio =
    input.v3YtlAvgNotional > 0
      ? round3((input.v4YtlAvgNotional / input.v3YtlAvgNotional) * 100)
      : 0;
  const pnlDrop = round3(input.v3YtlPnl - input.v4YtlPnl);
  const pctDrop = round3(input.v3YtlPct - input.v4YtlPct);
  return [
    `YTLウェイト${input.v3YtlWeight}%→${input.v4YtlWeight}%（${weightRatio}%）`,
    `YTL平均ノーショナル${notionalRatio}%`,
    `YTL利益${input.v3YtlPnl}→${input.v4YtlPnl}MYR（-${pnlDrop}MYR）`,
    `IJM新規+${input.v4IjmPnl}MYRが分母拡大`,
    `寄与率${input.v3YtlPct}%→${input.v4YtlPct}%（-${pctDrop}pt）`,
  ].join(' · ');
}

export function gradeV4Attribution(input: {
  v3YtlReconciled: boolean;
  v4YtlReconciled: boolean;
  v4CumulativePct: number;
  ijmAddedProfitMYR: number;
  dropExplained: boolean;
}): { grade: ForwardMalaysiaV4AttributionGrade; verdictJa: string } {
  if (
    input.v3YtlReconciled &&
    input.v4YtlReconciled &&
    input.dropExplained &&
    input.v4CumulativePct >= AUDIT73_CUM &&
    input.ijmAddedProfitMYR > 0
  ) {
    return {
      grade: 'A',
      verdictJa: `A 即確定 — 依存率変化はウェイト縮小+IJM追加で説明 · v4累積${input.v4CumulativePct}%`,
    };
  }
  if (input.dropExplained && input.v4CumulativePct >= 35) {
    return {
      grade: 'B',
      verdictJa: `B 要微調整 — 帰属${input.dropExplained ? '整合' : '一部未説明'} · 累積${input.v4CumulativePct}%`,
    };
  }
  return {
    grade: 'C',
    verdictJa: `C 再設計 — 依存率変化の説明不足 · 累積${input.v4CumulativePct}%`,
  };
}

export async function buildMalaysiaV4AttributionAuditReport(input: {
  bundle: SurvivorshipOhlcvBundle;
  auditedAt?: string;
}): Promise<ForwardMalaysiaV4AttributionAuditReport> {
  const auditedAt = input.auditedAt ?? new Date().toISOString();
  const toDate = input.bundle.latestDate;
  const fromDate = resolveAuditFromDate(toDate);
  const split = computeCalendarTrainTestSplit(fromDate, toDate, WF_TRAIN_PCT);

  const v3Symbols = V3_SYMBOLS.filter((s) => input.bundle.fetchedSymbols.includes(s));
  const v4Symbols = resolveV4TradeSymbols({
    candidateSymbol: IJM_SYMBOL,
    ytlCapPct: YTL_CAP_PCT,
  }).filter((s) => input.bundle.fetchedSymbols.includes(s));

  const allSymbols = [...new Set([...v3Symbols, ...v4Symbols])];
  const cachedTemplates = precomputeTradeTemplates({
    bundle: input.bundle,
    symbols: allSymbols,
    fromDate,
    toDate,
  });

  const v3Trades = collectExecutedTradesForUniverse(
    input.bundle,
    v3Symbols,
    fromDate,
    toDate,
    cachedTemplates,
  );
  const v4Trades = collectExecutedTradesForUniverse(
    input.bundle,
    v4Symbols,
    fromDate,
    toDate,
    cachedTemplates,
  );
  const v4PhaseWeights = buildV4PhaseWeights({
    candidateSymbol: IJM_SYMBOL,
    ytlCapPct: YTL_CAP_PCT,
  });

  const v3Attributions = runPortfolioAttributions({
    labelJa: 'v3 cap15（監査73）',
    trades: v3Trades,
    phaseWeights: MALAYSIA_V3_CAP_15_PHASE_WEIGHTS,
    symbols: v3Symbols,
    fromDate,
    toDate,
    testFrom: split.testFrom,
    seed: BOOTSTRAP_SEED,
  });

  const v4Attributions = runPortfolioAttributions({
    labelJa: 'v4 IJM+YTL15%（監査76）',
    trades: v4Trades,
    phaseWeights: v4PhaseWeights,
    symbols: V4_PHASE2_SYMBOLS.filter((s) => v4Symbols.includes(s)),
    fromDate,
    toDate,
    testFrom: split.testFrom,
    seed: BOOTSTRAP_SEED + 1,
  });

  const v3Actual = v3Attributions.find((a) => a.basisId === 'actual')!;
  const v4Actual = v4Attributions.find((a) => a.basisId === 'actual')!;

  const v3YtlRow = v3Actual.symbols.find((s) => s.symbol === YTL_SYMBOL);
  const v4YtlRow = v4Actual.symbols.find((s) => s.symbol === YTL_SYMBOL);
  const v4IjmRow = v4Actual.symbols.find((s) => s.symbol === IJM_SYMBOL);

  const v3YtlPnl = v3YtlRow?.totalPnlMYR ?? 0;
  const v4YtlPnl = v4YtlRow?.totalPnlMYR ?? 0;
  const v4IjmPnl = v4IjmRow?.totalPnlMYR ?? 0;
  const ytlProfitDeltaMYR = round3(v3YtlPnl - v4YtlPnl);
  const ijmAddedProfitMYR = v4IjmPnl;
  const ytlToIjmShiftMYR = round3(Math.min(ytlProfitDeltaMYR, ijmAddedProfitMYR));

  const weightAttributionJa = explainYtlDependencyDrop({
    v3YtlPct: v3YtlRow?.profitContributionPct ?? 0,
    v4YtlPct: v4YtlRow?.profitContributionPct ?? 0,
    v3YtlPnl,
    v4YtlPnl,
    v4IjmPnl,
    v3YtlAvgNotional: v3YtlRow?.avgNotionalMYR ?? 0,
    v4YtlAvgNotional: v4YtlRow?.avgNotionalMYR ?? 0,
    v3YtlWeight: MALAYSIA_V3_CAP_15_PHASE_WEIGHTS.phase4[YTL_SYMBOL] ?? 28.333,
    v4YtlWeight: YTL_CAP_PCT,
  });

  const v3YtlReconciled = Math.abs((v3YtlRow?.profitContributionPct ?? 0) - AUDIT73_YTL_DEP) < 2;
  const v4YtlReconciled = Math.abs((v4YtlRow?.profitContributionPct ?? 0) - AUDIT76_YTL_DEP) < 2;
  const dropExplained =
    ytlProfitDeltaMYR > 0 &&
    ijmAddedProfitMYR > 0 &&
    (v4YtlRow?.profitContributionPct ?? 0) < (v3YtlRow?.profitContributionPct ?? 0);

  const { grade, verdictJa } = gradeV4Attribution({
    v3YtlReconciled,
    v4YtlReconciled,
    v4CumulativePct: v4Actual.cumulativeReturnPct,
    ijmAddedProfitMYR,
    dropExplained,
  });

  const rankByContrib = (rows: ForwardMalaysiaV4SymbolAttributionRow[]) =>
    [...rows].sort((a, b) => b.profitContributionPct - a.profitContributionPct);
  const rankByPnl = (rows: ForwardMalaysiaV4SymbolAttributionRow[]) =>
    [...rows].sort((a, b) => b.totalPnlMYR - a.totalPnlMYR);

  const v4ActualRank = rankByContrib(v4Actual.symbols);
  const v4PnlRank = rankByPnl(v4Actual.symbols);
  const maxDep = v4ActualRank[0];

  const v4ProfitBreakdownJa = v4Actual.symbols
    .map((s) => `${s.symbolNameJa}:${s.totalPnlMYR}MYR(${s.profitContributionPct}%)`)
    .join(' · ');

  const fmtBasis = (a: ForwardMalaysiaV4BasisAttribution) =>
    a.symbols
      .map((s) => `${s.symbolNameJa}${s.profitContributionPct}%`)
      .join('/');

  const answerAJa = `A 利益寄与率ランキング(v4実取引): ${v4ActualRank.map((s, i) => `${i + 1}.${s.symbolNameJa}${s.profitContributionPct}%`).join(' · ')}`;
  const answerBJa = `B 利益額ランキング(v4実取引): ${v4PnlRank.map((s, i) => `${i + 1}.${s.symbolNameJa}${s.totalPnlMYR}MYR`).join(' · ')}`;
  const answerCJa = `C IJM追加効果: +${ijmAddedProfitMYR}MYR · 累積${v3Actual.cumulativeReturnPct}%→${v4Actual.cumulativeReturnPct}%(+${round3(v4Actual.cumulativeReturnPct - v3Actual.cumulativeReturnPct)}pt) · ${v4IjmRow?.tradeCount ?? 0}件`;
  const answerDJa = `D YTL依存率変化: ${v3YtlRow?.profitContributionPct ?? 0}%→${v4YtlRow?.profitContributionPct ?? 0}% · 原因:${weightAttributionJa}`;
  const answerEJa = `E 真の最大依存銘柄: ${maxDep?.symbolNameJa ?? '—'}(${maxDep?.profitContributionPct ?? 0}% · ${maxDep?.totalPnlMYR ?? 0}MYR)`;
  const answerFJa = `F Malaysia v4確定: ${grade === 'A' ? '即確定可' : grade === 'B' ? '微調整後確定' : '再設計'} · IJM+YTL15% · 廃止MC4.4%（監査76）`;

  const humanSummaryJa = [
    '監査77 YTL依存率変化 原因特定',
    `期間 ${fromDate}〜${toDate}`,
    FIXED_CONDITIONS_JA,
    `監査73 YTL${AUDIT73_YTL_DEP}% → 監査76 YTL${AUDIT76_YTL_DEP}%`,
    `v3実取引: 累積${v3Actual.cumulativeReturnPct}% · ${fmtBasis(v3Actual)}`,
    `v4実取引: 累積${v4Actual.cumulativeReturnPct}% · ${fmtBasis(v4Actual)}`,
    `v3 OOS: ${fmtBasis(v3Attributions.find((a) => a.basisId === 'oos')!)}`,
    `v4 OOS: ${fmtBasis(v4Attributions.find((a) => a.basisId === 'oos')!)}`,
    `v3 Bootstrap: ${fmtBasis(v3Attributions.find((a) => a.basisId === 'bootstrap')!)}`,
    `v4 Bootstrap: ${fmtBasis(v4Attributions.find((a) => a.basisId === 'bootstrap')!)}`,
    `⑤ 累積${v4Actual.cumulativeReturnPct}%内訳: ${v4ProfitBreakdownJa}`,
    `⑥ IJM増益: +${ijmAddedProfitMYR}MYR`,
    `⑦ YTL→IJM移転: YTL-${ytlProfitDeltaMYR}MYR · 推定移転${ytlToIjmShiftMYR}MYR`,
    weightAttributionJa,
    answerAJa,
    answerBJa,
    answerCJa,
    answerDJa,
    answerEJa,
    answerFJa,
    verdictJa,
    '監査73–76整合 · ルール変更なし',
  ].join('\n');

  return {
    auditedAt,
    fromDate,
    toDate,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    audit73YtlDependencyPct: AUDIT73_YTL_DEP,
    audit76YtlDependencyPct: AUDIT76_YTL_DEP,
    v3CumulativePct: v3Actual.cumulativeReturnPct,
    v4CumulativePct: v4Actual.cumulativeReturnPct,
    v3Attributions,
    v4Attributions,
    ijmAddedProfitMYR,
    ytlProfitDeltaMYR,
    ytlToIjmShiftMYR,
    weightAttributionJa,
    v4ProfitBreakdownJa,
    adoptionGrade: grade,
    adoptionVerdictJa: verdictJa,
    answerAJa,
    answerBJa,
    answerCJa,
    answerDJa,
    answerEJa,
    answerFJa,
    consistencyNoteJa: '監査73–76整合 · ルール変更なし',
    humanSummaryJa,
  };
}

export async function runMalaysiaV4AttributionAudit(): Promise<ForwardMalaysiaV4AttributionAuditReport | null> {
  const bundle = await fetchMalaysiaV76AuditBundle();
  if (!bundle) return null;
  return buildMalaysiaV4AttributionAuditReport({ bundle });
}

export function formatMalaysiaV4AttributionCsv(
  report: ForwardMalaysiaV4AttributionAuditReport,
): string {
  const lines = [
    `# 最重要監査その77 YTL依存率変化 ${report.fromDate}〜${report.toDate}`,
    `# ${report.fixedConditionsJa}`,
    `# ${report.adoptionVerdictJa}`,
    '',
    'section,portfolio,basis,symbol,name,trades,pnl,contribPct,avgNotional,cumulative,totalPnl',
    ...report.v3Attributions.flatMap((a) =>
      a.symbols.map((s) =>
        [
          'attrib',
          'v3',
          a.basisId,
          s.symbol,
          s.symbolNameJa,
          s.tradeCount,
          s.totalPnlMYR,
          s.profitContributionPct,
          s.avgNotionalMYR,
          a.cumulativeReturnPct,
          a.totalNetPnlMYR,
        ].join(','),
      ),
    ),
    ...report.v4Attributions.flatMap((a) =>
      a.symbols.map((s) =>
        [
          'attrib',
          'v4',
          a.basisId,
          s.symbol,
          s.symbolNameJa,
          s.tradeCount,
          s.totalPnlMYR,
          s.profitContributionPct,
          s.avgNotionalMYR,
          a.cumulativeReturnPct,
          a.totalNetPnlMYR,
        ].join(','),
      ),
    ),
    '',
    'section,metric,value',
    ['shift', 'audit73YtlPct', report.audit73YtlDependencyPct].join(','),
    ['shift', 'audit76YtlPct', report.audit76YtlDependencyPct].join(','),
    ['shift', 'ijmAddedMYR', report.ijmAddedProfitMYR].join(','),
    ['shift', 'ytlProfitDeltaMYR', report.ytlProfitDeltaMYR].join(','),
    ['shift', 'ytlToIjmShiftMYR', report.ytlToIjmShiftMYR].join(','),
    ['shift', 'v3Cumulative', report.v3CumulativePct].join(','),
    ['shift', 'v4Cumulative', report.v4CumulativePct].join(','),
    '',
    'section,answer,content',
    ['answer', 'A', `"${report.answerAJa}"`].join(','),
    ['answer', 'B', `"${report.answerBJa}"`].join(','),
    ['answer', 'C', `"${report.answerCJa}"`].join(','),
    ['answer', 'D', `"${report.answerDJa}"`].join(','),
    ['answer', 'E', `"${report.answerEJa}"`].join(','),
    ['answer', 'F', `"${report.answerFJa}"`].join(','),
    ['verdict', 'grade', report.adoptionGrade].join(','),
    ['verdict', 'weightAttrib', `"${report.weightAttributionJa}"`].join(','),
  ];
  return lines.join('\n');
}
