/**
 * 最重要監査その71 — Malaysia v3 暴落耐性 · 監査70固定 · ルール変更なし
 */
import type {
  ForwardMalaysiaV3CrashAuditReport,
  ForwardMalaysiaV3CrashGrade,
  ForwardMalaysiaV3CrashScenarioId,
  ForwardMalaysiaV3CrashScenarioRow,
  ForwardMalaysiaV3CashCompareRow,
  ForwardPassedTradeRecord,
} from '../../types/forwardValidation';
import { bootstrapSampleTrades } from './forwardValidationBootstrapMcAudit';
import {
  COVID_PERIOD,
  HIGH_RATE_PERIOD,
} from './forwardValidationMalaysiaV2DurabilityAudit';
import {
  collectExecutedTradesForUniverse,
  MALAYSIA_V1_AUDIT_START,
} from './forwardValidationMalaysiaV1Audit';
import { fetchMalaysiaV69AuditBundle } from './forwardValidationMalaysiaV21FourthSymbolAudit';
import { precomputeTradeTemplates } from './forwardValidationRobustnessAudit';
import {
  simulateMalaysiaV3DcaPath,
  V3_SYMBOLS,
  type MalaysiaV3DcaPathResult,
} from './forwardValidationMalaysiaV3DcaAudit';
import { mulberry32, percentile } from './forwardValidationMonteCarloAudit';
import type { SurvivorshipOhlcvBundle } from './forwardValidationSurvivorshipAudit';

export const BOOTSTRAP_MC_71_RUNS = 10_000;
const INITIAL_CAPITAL = 3000;
const MONTHLY_DCA = 1500;
const CASH_15 = 15;
const CASH_20 = 20;
const BOOTSTRAP_SEED = 71_001;
const RUIN_EQUITY_PCT = 50;
const YTL_SYMBOL = '6742';

export const MALAYSIA_V3_CRASH_SCENARIOS: {
  scenarioId: ForwardMalaysiaV3CrashScenarioId;
  labelJa: string;
}[] = [
  { scenarioId: 'baseline', labelJa: '⓪ ベースライン' },
  { scenarioId: 'crisis_2008', labelJa: '① 2008金融危機級' },
  { scenarioId: 'crisis_2020', labelJa: '② 2020コロナ級' },
  { scenarioId: 'crisis_2022', labelJa: '③ 2022高金利ショック級' },
  { scenarioId: 'single_minus50', labelJa: '④ 単一銘柄-50%' },
  { scenarioId: 'single_delist', labelJa: '⑤ 単一銘柄上場廃止' },
  { scenarioId: 'gamuda_minus70', labelJa: '⑥ GAMUDA -70%' },
  { scenarioId: 'ytl_minus70', labelJa: '⑦ YTL POWER -70%' },
  { scenarioId: 'cimb_minus50', labelJa: '⑧ CIMB -50%' },
  { scenarioId: 'tenaga_minus50', labelJa: '⑨ TENAGA -50%' },
  { scenarioId: 'triple_crash', labelJa: '⑩ 3銘柄同時暴落' },
];

const SYMBOL_NAMES: Record<string, string> = {
  '5347': 'TENAGA',
  '5398': 'GAMUDA',
  '1023': 'CIMB',
  '6742': 'YTL POWER',
};

const FIXED_CONDITIONS_JA =
  'MY v3暴落耐性 · TENAGA+GAMUDA+CIMB→RM10000でYTL · 月次RM1500 · 勝率重み · 3枠 · RM700@RM3000 · ルール変更なし';

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function resolveAuditFromDate(toDate: string): string {
  const tenYearAgo = new Date(`${toDate}T00:00:00Z`);
  tenYearAgo.setUTCFullYear(tenYearAgo.getUTCFullYear() - 10);
  const computedFrom = tenYearAgo.toISOString().slice(0, 10);
  return computedFrom >= MALAYSIA_V1_AUDIT_START ? computedFrom : MALAYSIA_V1_AUDIT_START;
}

function cloneTrades(trades: ForwardPassedTradeRecord[]): ForwardPassedTradeRecord[] {
  return trades.map((t) => ({ ...t }));
}

function capReturnPct(returnPct: number): number {
  return round3(Math.max(returnPct, -100));
}

export function adjustSymbolReturn(
  trades: ForwardPassedTradeRecord[],
  symbol: string,
  deltaPct: number,
): ForwardPassedTradeRecord[] {
  return trades.map((t) =>
    t.symbol === symbol ? { ...t, returnPct: capReturnPct(t.returnPct + deltaPct) } : t,
  );
}

export function delistSymbol(
  trades: ForwardPassedTradeRecord[],
  symbol: string,
): ForwardPassedTradeRecord[] {
  return trades.map((t) => (t.symbol === symbol ? { ...t, returnPct: -100 } : t));
}

function inPeriod(date: string, from: string, to: string): boolean {
  return date >= from && date <= to;
}

export function applyMalaysiaV3CrashStress(
  trades: ForwardPassedTradeRecord[],
  scenarioId: ForwardMalaysiaV3CrashScenarioId,
): ForwardPassedTradeRecord[] {
  const base = cloneTrades(trades);

  switch (scenarioId) {
    case 'baseline':
      return base;
    case 'crisis_2008':
      return base.map((t) => ({ ...t, returnPct: capReturnPct(t.returnPct * 0.55) }));
    case 'crisis_2020':
      return base.map((t) =>
        inPeriod(t.entryDate, COVID_PERIOD.from, COVID_PERIOD.to)
          ? { ...t, returnPct: capReturnPct(t.returnPct - 18) }
          : t,
      );
    case 'crisis_2022':
      return base.map((t) =>
        inPeriod(t.entryDate, HIGH_RATE_PERIOD.from, HIGH_RATE_PERIOD.to)
          ? { ...t, returnPct: capReturnPct(t.returnPct - 14) }
          : t,
      );
    case 'single_minus50':
      return base;
    case 'single_delist':
      return delistSymbol(base, '5398');
    case 'gamuda_minus70':
      return adjustSymbolReturn(base, '5398', -70);
    case 'ytl_minus70':
      return adjustSymbolReturn(base, YTL_SYMBOL, -70);
    case 'cimb_minus50':
      return adjustSymbolReturn(base, '1023', -50);
    case 'tenaga_minus50':
      return adjustSymbolReturn(base, '5347', -50);
    case 'triple_crash':
      return base.map((t) =>
        ['5347', '5398', '1023'].includes(t.symbol)
          ? { ...t, returnPct: capReturnPct(t.returnPct - 40) }
          : t,
      );
    default:
      return base;
  }
}

function resolveSingleMinus50WorstSymbol(
  trades: ForwardPassedTradeRecord[],
  fromDate: string,
  toDate: string,
  cashReservePct: number,
): string {
  let worstSym = V3_SYMBOLS[0]!;
  let worstMin = Infinity;
  for (const sym of V3_SYMBOLS) {
    const path = simulateMalaysiaV3DcaPath({
      trades: adjustSymbolReturn(trades, sym, -50),
      fromDate,
      toDate,
      monthlyContributionMYR: MONTHLY_DCA,
      cashReservePct,
    });
    if (path.minEquityMYR < worstMin) {
      worstMin = path.minEquityMYR;
      worstSym = sym;
    }
  }
  return worstSym;
}

export function applyMalaysiaV3CrashStressResolved(
  trades: ForwardPassedTradeRecord[],
  scenarioId: ForwardMalaysiaV3CrashScenarioId,
  fromDate: string,
  toDate: string,
  cashReservePct: number,
): ForwardPassedTradeRecord[] {
  if (scenarioId === 'single_minus50') {
    const sym = resolveSingleMinus50WorstSymbol(trades, fromDate, toDate, cashReservePct);
    return adjustSymbolReturn(trades, sym, -50);
  }
  return applyMalaysiaV3CrashStress(trades, scenarioId);
}

function fmtMonths(m: number | null): string {
  if (m == null) return '未到達';
  if (m < 12) return `${m}ヶ月`;
  const y = Math.floor(m / 12);
  const mo = m % 12;
  return mo > 0 ? `${y}年${mo}ヶ月` : `${y}年`;
}

function isRuined(path: MalaysiaV3DcaPathResult): boolean {
  const minPct = (path.minEquityMYR / INITIAL_CAPITAL) * 100;
  return minPct <= RUIN_EQUITY_PCT || path.finalEquityMYR <= 0;
}

function pathToRow(input: {
  scenarioId: ForwardMalaysiaV3CrashScenarioId;
  labelJa: string;
  path: MalaysiaV3DcaPathResult;
  cashReservePct: number;
  bootstrap: ForwardMalaysiaV3CrashScenarioRow['bootstrap'];
}): ForwardMalaysiaV3CrashScenarioRow {
  const cum =
    input.path.totalContributedMYR > 0
      ? round3(
          ((input.path.finalEquityMYR - input.path.totalContributedMYR) /
            input.path.totalContributedMYR) *
            100,
        )
      : 0;
  return {
    scenarioId: input.scenarioId,
    labelJa: input.labelJa,
    cashReservePct: input.cashReservePct,
    cumulativeReturnPct: cum,
    maxDrawdownPct: input.path.maxDrawdownPct,
    minEquityMYR: input.path.minEquityMYR,
    finalEquityMYR: input.path.finalEquityMYR,
    totalContributedMYR: input.path.totalContributedMYR,
    monthsToRm10000: input.path.monthsToRm10000,
    monthsToRm100000: input.path.monthsToRm100000,
    bootstrap: input.bootstrap,
    survived: !isRuined(input.path) && input.path.minEquityMYR > 0,
  };
}

function runBootstrapCrash(input: {
  pool: ForwardPassedTradeRecord[];
  fromDate: string;
  toDate: string;
  scenarioId: ForwardMalaysiaV3CrashScenarioId;
  cashReservePct: number;
  seed?: number;
}): ForwardMalaysiaV3CrashScenarioRow['bootstrap'] {
  const runs = BOOTSTRAP_MC_71_RUNS;
  const rand = mulberry32(input.seed ?? BOOTSTRAP_SEED);
  const minEquities: number[] = [];
  let bankrupt = 0;

  for (let r = 0; r < runs; r++) {
    const sample = bootstrapSampleTrades(input.pool, rand, r);
    const stressed = applyMalaysiaV3CrashStressResolved(
      sample,
      input.scenarioId,
      input.fromDate,
      input.toDate,
      input.cashReservePct,
    );
    const path = simulateMalaysiaV3DcaPath({
      trades: stressed,
      fromDate: input.fromDate,
      toDate: input.toDate,
      monthlyContributionMYR: MONTHLY_DCA,
      cashReservePct: input.cashReservePct,
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

function buildScenarioRow(input: {
  scenarioId: ForwardMalaysiaV3CrashScenarioId;
  labelJa: string;
  trades: ForwardPassedTradeRecord[];
  fromDate: string;
  toDate: string;
  cashReservePct: number;
  seedOffset: number;
}): ForwardMalaysiaV3CrashScenarioRow {
  const stressed = applyMalaysiaV3CrashStressResolved(
    input.trades,
    input.scenarioId,
    input.fromDate,
    input.toDate,
    input.cashReservePct,
  );
  const path = simulateMalaysiaV3DcaPath({
    trades: stressed,
    fromDate: input.fromDate,
    toDate: input.toDate,
    monthlyContributionMYR: MONTHLY_DCA,
    cashReservePct: input.cashReservePct,
  });
  const bootstrap = runBootstrapCrash({
    pool: input.trades,
    fromDate: input.fromDate,
    toDate: input.toDate,
    scenarioId: input.scenarioId,
    cashReservePct: input.cashReservePct,
    seed: BOOTSTRAP_SEED + input.seedOffset,
  });
  return pathToRow({
    scenarioId: input.scenarioId,
    labelJa: input.labelJa,
    path,
    cashReservePct: input.cashReservePct,
    bootstrap,
  });
}

function scenarioSeverity(row: ForwardMalaysiaV3CrashScenarioRow): number {
  return (
    row.bootstrap.bankruptcyRatePct * 1000 +
    Math.abs(row.maxDrawdownPct) * 10 -
    row.cumulativeReturnPct +
    (row.monthsToRm100000 ?? 200) * 0.1
  );
}

export function pickWorstScenario(
  scenarios: ForwardMalaysiaV3CrashScenarioRow[],
): ForwardMalaysiaV3CrashScenarioRow {
  const stressed = scenarios.filter((s) => s.scenarioId !== 'baseline');
  return [...stressed].sort((a, b) => scenarioSeverity(b) - scenarioSeverity(a))[0]!;
}

export function gradeMalaysiaV3Crash(input: {
  scenarios: ForwardMalaysiaV3CrashScenarioRow[];
  worst: ForwardMalaysiaV3CrashScenarioRow;
  cash20Better: boolean;
}): { grade: ForwardMalaysiaV3CrashGrade; verdictJa: string } {
  const allSurvive = input.scenarios.every((s) => s.survived && s.bootstrap.bankruptcyRatePct === 0);
  const worst = input.worst;

  if (
    allSurvive &&
    worst.minEquityMYR >= INITIAL_CAPITAL * 0.5 &&
    worst.bootstrap.bankruptcyRatePct === 0 &&
    worst.maxDrawdownPct > -25
  ) {
    return {
      grade: 'A',
      verdictJa: `A 即運用 — 全シナリオ生存 · 最悪${worst.labelJa} · 最低RM${worst.minEquityMYR} · MC破産0%`,
    };
  }

  if (worst.survived && worst.bootstrap.bankruptcyRatePct <= 2 && worst.minEquityMYR > 0) {
    return {
      grade: 'B',
      verdictJa: `B 運用可能 — 最悪${worst.labelJa} · 最低RM${worst.minEquityMYR} · 現金${input.cash20Better ? '20%推奨' : '15%可'}`,
    };
  }

  if (worst.survived) {
    return {
      grade: 'C',
      verdictJa: `C 要改善 — 最悪${worst.labelJa} · MC破産${worst.bootstrap.bankruptcyRatePct}% · 積立継続必須`,
    };
  }

  return {
    grade: 'D',
    verdictJa: `D 不採用 — ${worst.labelJa}で破綻 · 最低RM${worst.minEquityMYR}`,
  };
}

export async function buildMalaysiaV3CrashAuditReport(input: {
  bundle: SurvivorshipOhlcvBundle;
  auditedAt?: string;
}): Promise<ForwardMalaysiaV3CrashAuditReport | null> {
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

  const scenarios: ForwardMalaysiaV3CrashScenarioRow[] = MALAYSIA_V3_CRASH_SCENARIOS.map(
    (def, i) =>
      buildScenarioRow({
        scenarioId: def.scenarioId,
        labelJa: def.labelJa,
        trades: allTrades,
        fromDate,
        toDate,
        cashReservePct: CASH_15,
        seedOffset: i,
      }),
  );

  const worst = pickWorstScenario(scenarios);

  const cashCompare: ForwardMalaysiaV3CashCompareRow[] = [CASH_15, CASH_20].map((cashPct) => {
    const row = buildScenarioRow({
      scenarioId: worst.scenarioId,
      labelJa: `${worst.labelJa} · 現金${cashPct}%`,
      trades: allTrades,
      fromDate,
      toDate,
      cashReservePct: cashPct,
      seedOffset: 99 + cashPct,
    });
    return {
      cashReservePct: cashPct,
      labelJa: `現金${cashPct}%`,
      worstScenarioId: worst.scenarioId,
      minEquityMYR: row.minEquityMYR,
      maxDrawdownPct: row.maxDrawdownPct,
      bankruptcyRatePct: row.bootstrap.bankruptcyRatePct,
      monthsToRm100000: row.monthsToRm100000,
    };
  });

  const cash15 = cashCompare.find((c) => c.cashReservePct === CASH_15)!;
  const cash20 = cashCompare.find((c) => c.cashReservePct === CASH_20)!;
  const cash20Better =
    cash20.minEquityMYR > cash15.minEquityMYR ||
    cash20.bankruptcyRatePct < cash15.bankruptcyRatePct;

  const { grade, verdictJa } = gradeMalaysiaV3Crash({
    scenarios,
    worst,
    cash20Better,
  });

  const baseline = scenarios.find((s) => s.scenarioId === 'baseline')!;
  const weakest = worst;

  const answerAJa = `A 最大弱点: ${weakest.labelJa} · 最低RM${weakest.minEquityMYR} · MaxDD${weakest.maxDrawdownPct}% · MC破産${weakest.bootstrap.bankruptcyRatePct}%`;
  const answerBJa = `B 生存可能: ${scenarios.filter((s) => s.survived).length}/${scenarios.length}シナリオ · 全MC破産${Math.max(...scenarios.map((s) => s.bootstrap.bankruptcyRatePct))}%`;
  const answerCJa = `C 現金15%: 最悪${worst.labelJa} · 最低RM${cash15.minEquityMYR} · p5最低RM${worst.bootstrap.p5MinEquityMYR} · ${cash15.bankruptcyRatePct === 0 ? '十分' : '不足'}`;
  const answerDJa = `D 現金20%比較: 15%最低RM${cash15.minEquityMYR} vs 20%RM${cash20.minEquityMYR} · 破産${cash15.bankruptcyRatePct}% vs ${cash20.bankruptcyRatePct}% · ${cash20Better ? '20%優位' : '15%同等'}`;
  const answerEJa = `E 最悪ケース: ${worst.labelJa} · 最低RM${worst.minEquityMYR} · 累積${worst.cumulativeReturnPct}% · RM10k${fmtMonths(worst.monthsToRm10000)} · RM100k${fmtMonths(worst.monthsToRm100000)}`;
  const answerFJa = [
    'F 実運用可否:',
    grade === 'A' || grade === 'B' ? '可' : '条件付',
    `月次RM${MONTHLY_DCA}`,
    `現金${cash20Better && cash20.minEquityMYR > cash15.minEquityMYR + 500 ? '20' : '15'}%`,
    'RM10000到達後YTL追加',
    `最悪${weakest.labelJa}でも最低RM${weakest.minEquityMYR}`,
  ].join(' · ');

  const consistencyNoteJa =
    '監査70整合: v3積立RM1500 · RM10000でYTL · US版監査継続 · ルール変更なし';

  const humanSummaryJa = [
    '監査71 Malaysia v3 暴落耐性',
    `期間 ${fromDate}〜${toDate}`,
    FIXED_CONDITIONS_JA,
    `ベースライン: 累積${baseline.cumulativeReturnPct}% · 最低RM${baseline.minEquityMYR} · RM100k${fmtMonths(baseline.monthsToRm100000)}`,
    ...scenarios
      .filter((s) => s.scenarioId !== 'baseline')
      .map(
        (s) =>
          `${s.labelJa}: 累積${s.cumulativeReturnPct}% · MaxDD${s.maxDrawdownPct}% · 最低RM${s.minEquityMYR} · RM10k${fmtMonths(s.monthsToRm10000)} · RM100k${fmtMonths(s.monthsToRm100000)} · MC破産${s.bootstrap.bankruptcyRatePct}% · ${s.survived ? '生存' : '破綻'}`,
      ),
    `現金比較: 15%最低RM${cash15.minEquityMYR} · 20%最低RM${cash20.minEquityMYR}`,
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
    scenarios,
    cashCompare,
    worstScenarioId: worst.scenarioId,
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

export async function runMalaysiaV3CrashAudit(): Promise<ForwardMalaysiaV3CrashAuditReport | null> {
  const bundle = await fetchMalaysiaV69AuditBundle();
  if (!bundle) return null;
  return buildMalaysiaV3CrashAuditReport({ bundle });
}

export function formatMalaysiaV3CrashCsv(report: ForwardMalaysiaV3CrashAuditReport): string {
  const lines = [
    `# 最重要監査その71 Malaysia v3 暴落耐性 ${report.fromDate}〜${report.toDate}`,
    `# ${report.fixedConditionsJa}`,
    `# ${report.adoptionVerdictJa}`,
    '',
    'section,scenarioId,label,cashPct,cumulative,maxDD,minEquity,final,contributed,m10k,m100k,bankruptcy,p5Min,worstMin,survived',
    ...report.scenarios.map((s) =>
      [
        'scenario',
        s.scenarioId,
        `"${s.labelJa}"`,
        s.cashReservePct,
        s.cumulativeReturnPct,
        s.maxDrawdownPct,
        s.minEquityMYR,
        s.finalEquityMYR,
        s.totalContributedMYR,
        s.monthsToRm10000 ?? '',
        s.monthsToRm100000 ?? '',
        s.bootstrap.bankruptcyRatePct,
        s.bootstrap.p5MinEquityMYR,
        s.bootstrap.worstMinEquityMYR,
        s.survived,
      ].join(','),
    ),
    '',
    'section,cashPct,label,worstScenario,minEquity,maxDD,bankruptcy,m100k',
    ...report.cashCompare.map((c) =>
      [
        'cash_compare',
        c.cashReservePct,
        `"${c.labelJa}"`,
        c.worstScenarioId,
        c.minEquityMYR,
        c.maxDrawdownPct,
        c.bankruptcyRatePct,
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
    ['verdict', 'worst', report.worstScenarioId].join(','),
    ['consistency', 'note', `"${report.consistencyNoteJa}"`].join(','),
  ];
  return lines.join('\n');
}
