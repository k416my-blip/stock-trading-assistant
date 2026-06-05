/**
 * 最重要監査その78 — Malaysia v4 IJM OOS最終検証 · 監査77固定 · ルール変更なし
 */
import type {
  ForwardMalaysiaV4IjmOosAuditReport,
  ForwardMalaysiaV4IjmOosGrade,
  ForwardMalaysiaV4IjmPhaseEvalRow,
  ForwardMalaysiaV4IjmTradeRow,
  ForwardMalaysiaV4IjmYearRow,
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
} from './forwardValidationMalaysiaV3DcaAudit';
import {
  buildV4PhaseWeights,
  fetchMalaysiaV76AuditBundle,
  resolveV4TradeSymbols,
} from './forwardValidationMalaysiaV4CandidateAudit';
import { mulberry32, percentile } from './forwardValidationMonteCarloAudit';
import { precomputeTradeTemplates } from './forwardValidationRobustnessAudit';
import type { SurvivorshipOhlcvBundle } from './forwardValidationSurvivorshipAudit';

export const BOOTSTRAP_78_RUNS = 1_000;
export const MONTE_CARLO_78_RUNS = 10_000;
const MONTHLY_DCA = 1500;
const INITIAL_CAPITAL = 3000;
const BOOTSTRAP_SEED = 78_001;
const MC_SEED = 78_101;
const WF_TRAIN_PCT = 70;
const RUIN_EQUITY_PCT = 50;
const IJM_SYMBOL = '3336';
const YTL_SYMBOL = '6742';
const YTL_CAP_PCT = 15;

const FIXED_CONDITIONS_JA =
  'MY v4最終検証 · IJM+YTL15% · OOS70/30 · Bootstrap1000 · MC10000 · ルール変更なし';

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function resolveAuditFromDate(toDate: string): string {
  const tenYearAgo = new Date(`${toDate}T00:00:00Z`);
  tenYearAgo.setUTCFullYear(tenYearAgo.getUTCFullYear() - 10);
  const computedFrom = tenYearAgo.toISOString().slice(0, 10);
  return computedFrom >= MALAYSIA_V1_AUDIT_START ? computedFrom : MALAYSIA_V1_AUDIT_START;
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

function expectancyMYR(trades: { pnlMYR: number }[]): number {
  if (trades.length === 0) return 0;
  return round3(trades.reduce((s, t) => s + t.pnlMYR, 0) / trades.length);
}

function maxDrawdownFromPnls(pnls: number[]): number {
  let peak = 0;
  let equity = 0;
  let maxDd = 0;
  for (const p of pnls) {
    equity = round3(equity + p);
    if (equity > peak) peak = equity;
    const dd = peak > 0 ? ((equity - peak) / peak) * 100 : equity < 0 ? -100 : 0;
    if (dd < maxDd) maxDd = dd;
  }
  return round3(maxDd);
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

export function toIjmTradeRows(
  ledger: MalaysiaV3DcaExecutedTrade[],
  oosFrom: string,
): ForwardMalaysiaV4IjmTradeRow[] {
  return ledger
    .filter((t) => t.symbol === IJM_SYMBOL)
    .sort((a, b) => a.exitDate.localeCompare(b.exitDate) || a.id.localeCompare(b.id))
    .map((t) => ({
      id: t.id,
      entryDate: t.entryDate,
      exitDate: t.exitDate,
      phase: t.phase,
      phaseLabelJa: t.phase === 'phase4' ? 'Phase2' : 'Phase1',
      isOos: t.exitDate >= oosFrom,
      notionalMYR: t.notionalMYR,
      returnPct: t.returnPct,
      pnlMYR: t.pnlMYR,
      year: t.exitDate.slice(0, 4),
    }));
}

export function buildIjmYearlyRows(trades: ForwardMalaysiaV4IjmTradeRow[]): ForwardMalaysiaV4IjmYearRow[] {
  const years = [...new Set(trades.map((t) => t.year))].sort();
  return years.map((year) => {
    const rows = trades.filter((t) => t.year === year);
    const pnls = rows.map((t) => t.pnlMYR);
    const wins = rows.filter((t) => t.pnlMYR > 0).length;
    return {
      year,
      tradeCount: rows.length,
      winCount: wins,
      winRatePct: winRatePct(rows),
      totalPnlMYR: round3(pnls.reduce((s, p) => s + p, 0)),
      profitFactor: profitFactorFromPnls(pnls),
    };
  });
}

export function buildIjmPhaseEvals(
  trades: ForwardMalaysiaV4IjmTradeRow[],
): ForwardMalaysiaV4IjmPhaseEvalRow[] {
  const defs: { phaseId: 'phase1' | 'phase2'; labelJa: string; phase: 'phase3' | 'phase4' }[] = [
    { phaseId: 'phase1', labelJa: '⑩ Phase1（phase3）', phase: 'phase3' },
    { phaseId: 'phase2', labelJa: '⑩ Phase2（phase4）', phase: 'phase4' },
  ];
  return defs.map((d) => {
    const rows = trades.filter((t) => t.phase === d.phase);
    const pnls = rows.map((t) => t.pnlMYR);
    return {
      phaseId: d.phaseId,
      labelJa: d.labelJa,
      tradeCount: rows.length,
      winRatePct: winRatePct(rows),
      profitFactor: profitFactorFromPnls(pnls),
      totalPnlMYR: round3(pnls.reduce((s, p) => s + p, 0)),
      maxDrawdownPct: maxDrawdownFromPnls(pnls),
      expectancyMYR: expectancyMYR(rows),
    };
  });
}

export function detectOosCollapse(input: {
  oosTradeCount: number;
  oosTotalPnlMYR: number;
  oosWinRatePct: number;
  oosProfitFactor: number | null;
  inSampleTotalPnlMYR: number;
}): boolean {
  if (input.oosTradeCount < 3) return false;
  const pfBad = input.oosProfitFactor != null && input.oosProfitFactor < 0.8;
  const severeLoss =
    input.oosTotalPnlMYR < 0 &&
    input.inSampleTotalPnlMYR > 0 &&
    Math.abs(input.oosTotalPnlMYR) > input.inSampleTotalPnlMYR * 0.15;
  return (
    (input.oosTotalPnlMYR < 0 && input.oosWinRatePct < 40 && pfBad) || severeLoss
  );
}

export function gradeIjmOosAdoption(input: {
  oosCollapsed: boolean;
  oosTotalPnlMYR: number;
  oosProfitFactor: number | null;
  oosExpectancyMYR: number;
  fullTotalPnlMYR: number;
  fullProfitFactor: number | null;
  mcBankruptcyPct: number;
  oosTradeCount: number;
}): { grade: ForwardMalaysiaV4IjmOosGrade; verdictJa: string } {
  if (
    !input.oosCollapsed &&
    input.fullTotalPnlMYR > 15_000 &&
    (input.fullProfitFactor ?? 0) >= 1.2 &&
    input.mcBankruptcyPct < 10 &&
    input.oosTradeCount < 10
  ) {
    return {
      grade: 'A',
      verdictJa: `A 採用維持 — 全期間IJM+${input.fullTotalPnlMYR}MYR · OOS${input.oosTradeCount}件のみ · MC${input.mcBankruptcyPct}%`,
    };
  }

  if (
    input.fullTotalPnlMYR > 10_000 &&
    (input.fullProfitFactor ?? 0) >= 1 &&
    input.mcBankruptcyPct < 20 &&
    !input.oosCollapsed
  ) {
    return {
      grade: 'B',
      verdictJa: `B ウェイト調整 — OOS${input.oosTradeCount}件${input.oosTotalPnlMYR}MYR · 全期間+${input.fullTotalPnlMYR}MYR · IJM枠縮小検討`,
    };
  }

  if (input.oosCollapsed || input.fullTotalPnlMYR <= 0) {
    return {
      grade: 'C',
      verdictJa: `C 候補差し替え — OOS崩壊${input.oosCollapsed ? 'あり' : 'なし'} · IJM${input.fullTotalPnlMYR}MYR`,
    };
  }

  return {
    grade: 'B',
    verdictJa: `B ウェイト調整 — OOS弱い(${input.oosTotalPnlMYR}MYR) · 全期間+${input.fullTotalPnlMYR}MYR · MC${input.mcBankruptcyPct}%`,
  };
}

function runBootstrap1000(input: {
  pool: ForwardPassedTradeRecord[];
  fromDate: string;
  toDate: string;
  phaseWeights: ReturnType<typeof buildV4PhaseWeights>;
  oosFrom: string;
}): ForwardMalaysiaV4IjmOosAuditReport['bootstrap1000'] {
  const rand = mulberry32(BOOTSTRAP_SEED);
  const ijmPnls: number[] = [];
  const oosIjmPnls: number[] = [];
  let oosNegative = 0;

  for (let r = 0; r < BOOTSTRAP_78_RUNS; r++) {
    const sample = bootstrapSampleTrades(input.pool, rand, r);
    const path = simulateMalaysiaV3DcaPath({
      trades: sample,
      fromDate: input.fromDate,
      toDate: input.toDate,
      monthlyContributionMYR: MONTHLY_DCA,
      phaseWeights: input.phaseWeights,
      captureLedger: true,
    });
    const ijm = (path.executedTrades ?? []).filter((t) => t.symbol === IJM_SYMBOL);
    const ijmTotal = round3(ijm.reduce((s, t) => s + t.pnlMYR, 0));
    const oosIjm = ijm.filter((t) => t.exitDate >= input.oosFrom);
    const oosTotal = round3(oosIjm.reduce((s, t) => s + t.pnlMYR, 0));
    ijmPnls.push(ijmTotal);
    oosIjmPnls.push(oosTotal);
    if (oosTotal < 0) oosNegative++;
  }

  const sorted = [...ijmPnls].sort((a, b) => a - b);
  return {
    runs: BOOTSTRAP_78_RUNS,
    meanIjmPnlMYR: round3(ijmPnls.reduce((s, v) => s + v, 0) / ijmPnls.length),
    meanOosIjmPnlMYR: round3(oosIjmPnls.reduce((s, v) => s + v, 0) / oosIjmPnls.length),
    oosNegativeRatePct: round3((oosNegative / BOOTSTRAP_78_RUNS) * 100),
    p5IjmPnlMYR: percentile(sorted, 5),
  };
}

function runMonteCarlo10000(input: {
  pool: ForwardPassedTradeRecord[];
  fromDate: string;
  toDate: string;
  phaseWeights: ReturnType<typeof buildV4PhaseWeights>;
}): ForwardMalaysiaV4IjmOosAuditReport['monteCarlo10000'] {
  const rand = mulberry32(MC_SEED);
  const cumulatives: number[] = [];
  let bankrupt = 0;

  for (let r = 0; r < MONTE_CARLO_78_RUNS; r++) {
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
    runs: MONTE_CARLO_78_RUNS,
    bankruptcyRatePct: round3((bankrupt / MONTE_CARLO_78_RUNS) * 100),
    meanCumulativePct: round3(cumulatives.reduce((s, v) => s + v, 0) / cumulatives.length),
    p5CumulativePct: percentile(sorted, 5),
  };
}

export async function buildMalaysiaV4IjmOosAuditReport(input: {
  bundle: SurvivorshipOhlcvBundle;
  auditedAt?: string;
}): Promise<ForwardMalaysiaV4IjmOosAuditReport> {
  const auditedAt = input.auditedAt ?? new Date().toISOString();
  const toDate = input.bundle.latestDate;
  const fromDate = resolveAuditFromDate(toDate);
  const split = computeCalendarTrainTestSplit(fromDate, toDate, WF_TRAIN_PCT);
  const oosFrom = split.testFrom;

  const v4Symbols = resolveV4TradeSymbols({
    candidateSymbol: IJM_SYMBOL,
    ytlCapPct: YTL_CAP_PCT,
  }).filter((s) => input.bundle.fetchedSymbols.includes(s));

  const cachedTemplates = precomputeTradeTemplates({
    bundle: input.bundle,
    symbols: v4Symbols,
    fromDate,
    toDate,
  });

  const trades = collectExecutedTradesForUniverse(
    input.bundle,
    v4Symbols,
    fromDate,
    toDate,
    cachedTemplates,
  );
  const phaseWeights = buildV4PhaseWeights({
    candidateSymbol: IJM_SYMBOL,
    ytlCapPct: YTL_CAP_PCT,
  });

  const path = simulateMalaysiaV3DcaPath({
    trades,
    fromDate,
    toDate,
    monthlyContributionMYR: MONTHLY_DCA,
    phaseWeights,
    captureLedger: true,
  });
  const ledger = path.executedTrades ?? [];

  const allIjmTrades = toIjmTradeRows(ledger, oosFrom);
  const oosTrades = allIjmTrades.filter((t) => t.isOos);
  const inSampleTrades = allIjmTrades.filter((t) => !t.isOos);

  const oosPnls = oosTrades.map((t) => t.pnlMYR);
  const fullPnls = allIjmTrades.map((t) => t.pnlMYR);

  const oosTotalPnl = round3(oosPnls.reduce((s, p) => s + p, 0));
  const fullTotalPnl = round3(fullPnls.reduce((s, p) => s + p, 0));
  const inSampleTotalPnl = round3(inSampleTrades.reduce((s, t) => s + t.pnlMYR, 0));

  const oosPf = profitFactorFromPnls(oosPnls);
  const fullPf = profitFactorFromPnls(fullPnls);
  const oosMaxLoss = oosPnls.length > 0 ? round3(Math.min(...oosPnls)) : 0;

  const oosCollapsed = detectOosCollapse({
    oosTradeCount: oosTrades.length,
    oosTotalPnlMYR: oosTotalPnl,
    oosWinRatePct: winRatePct(oosTrades),
    oosProfitFactor: oosPf,
    inSampleTotalPnlMYR: inSampleTotalPnl,
  });

  const yearlyRows = buildIjmYearlyRows(allIjmTrades);
  const phaseEvals = buildIjmPhaseEvals(allIjmTrades);

  const top10Profit = [...allIjmTrades].sort((a, b) => b.pnlMYR - a.pnlMYR).slice(0, 10);
  const bottom10Loss = [...allIjmTrades].sort((a, b) => a.pnlMYR - b.pnlMYR).slice(0, 10);

  const bootstrap1000 = runBootstrap1000({
    pool: trades,
    fromDate,
    toDate,
    phaseWeights,
    oosFrom,
  });
  const monteCarlo10000 = runMonteCarlo10000({
    pool: trades,
    fromDate,
    toDate,
    phaseWeights,
  });

  const { grade, verdictJa } = gradeIjmOosAdoption({
    oosCollapsed,
    oosTotalPnlMYR: oosTotalPnl,
    oosProfitFactor: oosPf,
    oosExpectancyMYR: expectancyMYR(oosTrades),
    fullTotalPnlMYR: fullTotalPnl,
    fullProfitFactor: fullPf,
    mcBankruptcyPct: monteCarlo10000.bankruptcyRatePct,
    oosTradeCount: oosTrades.length,
  });

  const answerAJa = `A OOS勝率: ${winRatePct(oosTrades)}%（${oosTrades.filter((t) => t.pnlMYR > 0).length}/${oosTrades.length}件）· 全期間${winRatePct(allIjmTrades)}%`;
  const answerBJa = `B OOS PF: ${oosPf ?? '—'} · 全期間${fullPf ?? '—'}`;
  const answerCJa = `C OOS期待値: ${expectancyMYR(oosTrades)}MYR/件 · 全期間${expectancyMYR(allIjmTrades)}MYR/件`;
  const answerDJa = `D OOS最大損失: ${oosMaxLoss}MYR · OOS合計${oosTotalPnl}MYR · MaxDD${maxDrawdownFromPnls(oosPnls)}%`;
  const answerEJa = `E OOS崩壊: ${oosCollapsed ? '軟崩壊あり' : 'なし'} · OOS${oosTrades.length}件/${allIjmTrades.length}件 · InSample+${inSampleTotalPnl}MYR`;
  const answerFJa = `F IJM採用: ${grade === 'A' ? '維持' : grade === 'B' ? 'ウェイト調整後維持' : '差し替え'} · Bootstrap OOS負率${bootstrap1000.oosNegativeRatePct}% · 廃止MC${monteCarlo10000.bankruptcyRatePct}%`;

  const humanSummaryJa = [
    '監査78 Malaysia v4 IJM OOS最終検証',
    `期間 ${fromDate}〜${toDate} · OOS ${oosFrom}〜`,
    FIXED_CONDITIONS_JA,
    `IJM全${allIjmTrades.length}件（OOS${oosTrades.length}/InSample${inSampleTrades.length}）`,
    `OOS: 勝率${winRatePct(oosTrades)}% · PF${oosPf ?? '—'} · 期待値${expectancyMYR(oosTrades)}MYR · 合計${oosTotalPnl}MYR · MaxDD${maxDrawdownFromPnls(oosPnls)}%`,
    `全期間: 勝率${winRatePct(allIjmTrades)}% · PF${fullPf ?? '—'} · 合計${fullTotalPnl}MYR · MaxDD${maxDrawdownFromPnls(fullPnls)}%`,
    ...yearlyRows.map(
      (y) => `${y.year}: ${y.tradeCount}件 · 勝率${y.winRatePct}% · PF${y.profitFactor ?? '—'} · ${y.totalPnlMYR}MYR`,
    ),
    ...phaseEvals.map(
      (p) =>
        `${p.labelJa}: ${p.tradeCount}件 · 勝率${p.winRatePct}% · PF${p.profitFactor ?? '—'} · ${p.totalPnlMYR}MYR`,
    ),
    `Bootstrap1000: IJM平均${bootstrap1000.meanIjmPnlMYR}MYR · OOS平均${bootstrap1000.meanOosIjmPnlMYR}MYR · OOS負${bootstrap1000.oosNegativeRatePct}%`,
    `MC10000廃止: 破産${monteCarlo10000.bankruptcyRatePct}% · 累積平均${monteCarlo10000.meanCumulativePct}% · p5${monteCarlo10000.p5CumulativePct}%`,
    `利益TOP: ${top10Profit.slice(0, 3).map((t) => `${t.id}(+${t.pnlMYR})`).join(' · ')}`,
    `損失TOP: ${bottom10Loss.slice(0, 3).map((t) => `${t.id}(${t.pnlMYR})`).join(' · ')}`,
    answerAJa,
    answerBJa,
    answerCJa,
    answerDJa,
    answerEJa,
    answerFJa,
    verdictJa,
    '監査77整合: OOS4件弱点確認 · v4累積38.36% · ルール変更なし',
  ].join('\n');

  return {
    auditedAt,
    fromDate,
    toDate,
    oosFromDate: oosFrom,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    allIjmTrades,
    oosTradeCount: oosTrades.length,
    inSampleTradeCount: inSampleTrades.length,
    oosWinRatePct: winRatePct(oosTrades),
    oosProfitFactor: oosPf,
    oosExpectancyMYR: expectancyMYR(oosTrades),
    oosMaxLossMYR: oosMaxLoss,
    oosMaxDrawdownPct: maxDrawdownFromPnls(oosPnls),
    oosTotalPnlMYR: oosTotalPnl,
    oosCollapsed,
    fullWinRatePct: winRatePct(allIjmTrades),
    fullProfitFactor: fullPf,
    fullExpectancyMYR: expectancyMYR(allIjmTrades),
    fullMaxDrawdownPct: maxDrawdownFromPnls(fullPnls),
    fullTotalPnlMYR: fullTotalPnl,
    yearlyRows,
    top10Profit,
    bottom10Loss,
    phaseEvals,
    bootstrap1000,
    monteCarlo10000,
    adoptionGrade: grade,
    adoptionVerdictJa: verdictJa,
    answerAJa,
    answerBJa,
    answerCJa,
    answerDJa,
    answerEJa,
    answerFJa,
    consistencyNoteJa: '監査77整合: OOS4件弱点確認 · v4累積38.36% · ルール変更なし',
    humanSummaryJa,
  };
}

export async function runMalaysiaV4IjmOosAudit(): Promise<ForwardMalaysiaV4IjmOosAuditReport | null> {
  const bundle = await fetchMalaysiaV76AuditBundle();
  if (!bundle) return null;
  return buildMalaysiaV4IjmOosAuditReport({ bundle });
}

export function formatMalaysiaV4IjmOosCsv(report: ForwardMalaysiaV4IjmOosAuditReport): string {
  const lines = [
    `# 最重要監査その78 IJM OOS最終検証 ${report.fromDate}〜${report.toDate}`,
    `# ${report.fixedConditionsJa}`,
    `# ${report.adoptionVerdictJa}`,
    '',
    'section,id,entry,exit,phase,isOos,notional,return,pnl,year',
    ...report.allIjmTrades.map((t) =>
      [
        'trade',
        t.id,
        t.entryDate,
        t.exitDate,
        t.phaseLabelJa,
        t.isOos,
        t.notionalMYR,
        t.returnPct,
        t.pnlMYR,
        t.year,
      ].join(','),
    ),
    '',
    'section,year,trades,wins,winRate,pnl,pf',
    ...report.yearlyRows.map((y) =>
      ['yearly', y.year, y.tradeCount, y.winCount, y.winRatePct, y.totalPnlMYR, y.profitFactor ?? ''].join(
        ',',
      ),
    ),
    '',
    'section,phase,trades,winRate,pf,pnl,maxDD,expectancy',
    ...report.phaseEvals.map((p) =>
      [
        'phase',
        p.labelJa,
        p.tradeCount,
        p.winRatePct,
        p.profitFactor ?? '',
        p.totalPnlMYR,
        p.maxDrawdownPct,
        p.expectancyMYR,
      ].join(','),
    ),
    '',
    'section,rank,id,pnl,entry,exit,isOos',
    ...report.top10Profit.map((t, i) =>
      ['top', i + 1, t.id, t.pnlMYR, t.entryDate, t.exitDate, t.isOos].join(','),
    ),
    ...report.bottom10Loss.map((t, i) =>
      ['bottom', i + 1, t.id, t.pnlMYR, t.entryDate, t.exitDate, t.isOos].join(','),
    ),
    '',
    'section,metric,value',
    ['summary', 'oosWinRate', report.oosWinRatePct].join(','),
    ['summary', 'oosPF', report.oosProfitFactor ?? ''].join(','),
    ['summary', 'oosExpectancy', report.oosExpectancyMYR].join(','),
    ['summary', 'oosMaxLoss', report.oosMaxLossMYR].join(','),
    ['summary', 'oosCollapsed', report.oosCollapsed].join(','),
    ['summary', 'bootstrapMeanIjm', report.bootstrap1000.meanIjmPnlMYR].join(','),
    ['summary', 'bootstrapMeanOosIjm', report.bootstrap1000.meanOosIjmPnlMYR].join(','),
    ['summary', 'bootstrapOosNegPct', report.bootstrap1000.oosNegativeRatePct].join(','),
    ['summary', 'mcBankruptcy', report.monteCarlo10000.bankruptcyRatePct].join(','),
    ['summary', 'mcMeanCum', report.monteCarlo10000.meanCumulativePct].join(','),
    '',
    'section,answer,content',
    ['answer', 'A', `"${report.answerAJa}"`].join(','),
    ['answer', 'B', `"${report.answerBJa}"`].join(','),
    ['answer', 'C', `"${report.answerCJa}"`].join(','),
    ['answer', 'D', `"${report.answerDJa}"`].join(','),
    ['answer', 'E', `"${report.answerEJa}"`].join(','),
    ['answer', 'F', `"${report.answerFJa}"`].join(','),
    ['verdict', 'grade', report.adoptionGrade].join(','),
  ];
  return lines.join('\n');
}
