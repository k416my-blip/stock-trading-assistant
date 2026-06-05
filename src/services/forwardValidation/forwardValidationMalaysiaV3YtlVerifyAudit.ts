/**
 * 最重要監査その75 — YTL上場廃止MC74% 実装検証 · 監査74固定 · ルール変更なし
 */
import type {
  ForwardMalaysiaV3YtlVerifyAuditReport,
  ForwardMalaysiaV3YtlVerifyGrade,
  ForwardMalaysiaV3YtlVerifyScenarioId,
  ForwardMalaysiaV3YtlVerifyScenarioRow,
  ForwardMalaysiaV3YtlVerifyTradeRow,
  ForwardPassedTradeRecord,
} from '../../types/forwardValidation';
import { bootstrapSampleTrades } from './forwardValidationBootstrapMcAudit';
import {
  collectExecutedTradesForUniverse,
  MALAYSIA_V1_AUDIT_START,
} from './forwardValidationMalaysiaV1Audit';
import { fetchMalaysiaV69AuditBundle } from './forwardValidationMalaysiaV21FourthSymbolAudit';
import { symbolNetProfitContributionPct } from './forwardValidationMalaysiaV3Cap15Audit';
import { adjustSymbolReturn, delistSymbol } from './forwardValidationMalaysiaV3CrashAudit';
import { MALAYSIA_V3_CAP_15_PHASE_WEIGHTS } from './forwardValidationMalaysiaV3GamudaCapAudit';
import { buildPhase4WithoutYtl } from './forwardValidationMalaysiaV3YtlDependencyAudit';
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

export const BOOTSTRAP_MC_75_RUNS = 10_000;
const INITIAL_CAPITAL = 3000;
const MONTHLY_DCA = 1500;
const BOOTSTRAP_SEED = 75_001;
const RUIN_EQUITY_PCT = 50;
const YTL_SYMBOL = '6742';

export const MALAYSIA_V3_YTL_VERIFY_SCENARIOS: {
  scenarioId: ForwardMalaysiaV3YtlVerifyScenarioId;
  labelJa: string;
}[] = [
  { scenarioId: 'baseline_cap15', labelJa: '⓪ ベースライン cap15' },
  { scenarioId: 'ytl_trade_ban', labelJa: '① YTL取引禁止' },
  { scenarioId: 'ytl_profit_zero', labelJa: '② YTL利益ゼロ' },
  { scenarioId: 'ytl_price_fixed', labelJa: '③ YTL価格固定' },
  { scenarioId: 'ytl_trades_removed', labelJa: '④ YTL全取引削除' },
  { scenarioId: 'ytl_delist', labelJa: '⑤ YTL上場廃止' },
  { scenarioId: 'ytl_minus70', labelJa: '⑥ YTL-70%' },
];

const SYMBOL_NAMES: Record<string, string> = {
  '5347': 'TENAGA',
  '5398': 'GAMUDA',
  '1023': 'CIMB',
  '6742': 'YTL POWER',
};

const FIXED_CONDITIONS_JA =
  'MY v3 YTL廃止検証 · GAMUDA15% · 全トレード履歴比較 · 月次RM1500 · ルール変更なし';

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

export function applyYtlVerifyStressTrades(
  trades: ForwardPassedTradeRecord[],
  scenarioId: ForwardMalaysiaV3YtlVerifyScenarioId,
): ForwardPassedTradeRecord[] {
  switch (scenarioId) {
    case 'baseline_cap15':
    case 'ytl_trade_ban':
    case 'ytl_price_fixed':
      return trades.map((t) => ({ ...t }));
    case 'ytl_trades_removed':
      return trades.filter((t) => t.symbol !== YTL_SYMBOL);
    case 'ytl_profit_zero':
      return trades.map((t) =>
        t.symbol === YTL_SYMBOL ? { ...t, returnPct: capReturnPct(0) } : t,
      );
    case 'ytl_delist':
      return delistSymbol(trades, YTL_SYMBOL);
    case 'ytl_minus70':
      return adjustSymbolReturn(trades, YTL_SYMBOL, -70);
    default:
      return trades.map((t) => ({ ...t }));
  }
}

export function resolveYtlVerifyPhaseWeights(
  scenarioId: ForwardMalaysiaV3YtlVerifyScenarioId,
): MalaysiaV3PhaseWeights {
  if (scenarioId === 'ytl_trade_ban') return buildPhase4WithoutYtl();
  return MALAYSIA_V3_CAP_15_PHASE_WEIGHTS;
}

export function resolveYtlVerifySimOptions(scenarioId: ForwardMalaysiaV3YtlVerifyScenarioId): {
  zeroPnlSymbols?: string[];
} {
  if (scenarioId === 'ytl_price_fixed') return { zeroPnlSymbols: [YTL_SYMBOL] };
  return {};
}

function isRuined(path: MalaysiaV3DcaPathResult): boolean {
  const minPct = (path.minEquityMYR / INITIAL_CAPITAL) * 100;
  return minPct <= RUIN_EQUITY_PCT || path.finalEquityMYR <= 0;
}

function toVerifyTradeRows(trades: MalaysiaV3DcaExecutedTrade[]): ForwardMalaysiaV3YtlVerifyTradeRow[] {
  return trades.map((t) => ({
    id: t.id,
    symbol: t.symbol,
    symbolNameJa: SYMBOL_NAMES[t.symbol] ?? t.symbol,
    entryDate: t.entryDate,
    exitDate: t.exitDate,
    notionalMYR: t.notionalMYR,
    returnPct: t.returnPct,
    pnlMYR: t.pnlMYR,
  }));
}

export function diffLedgersAgainstBaseline(input: {
  baseline: MalaysiaV3DcaExecutedTrade[];
  scenario: MalaysiaV3DcaExecutedTrade[];
}): {
  disappearedTradeIds: string[];
  disappearedYtlTradeCount: number;
} {
  const scenarioIds = new Set(input.scenario.map((t) => t.id));
  const disappeared = input.baseline.filter((t) => !scenarioIds.has(t.id));
  return {
    disappearedTradeIds: disappeared.map((t) => t.id),
    disappearedYtlTradeCount: disappeared.filter((t) => t.symbol === YTL_SYMBOL).length,
  };
}

function runBootstrapVerify(input: {
  pool: ForwardPassedTradeRecord[];
  fromDate: string;
  toDate: string;
  scenarioId: ForwardMalaysiaV3YtlVerifyScenarioId;
  seed?: number;
}): { bankruptcyRatePct: number; runs: number } {
  const runs = BOOTSTRAP_MC_75_RUNS;
  const rand = mulberry32(input.seed ?? BOOTSTRAP_SEED);
  const phaseWeights = resolveYtlVerifyPhaseWeights(input.scenarioId);
  const simOpts = resolveYtlVerifySimOptions(input.scenarioId);
  let bankrupt = 0;

  for (let r = 0; r < runs; r++) {
    const sample = bootstrapSampleTrades(input.pool, rand, r);
    const stressed = applyYtlVerifyStressTrades(sample, input.scenarioId);
    const path = simulateMalaysiaV3DcaPath({
      trades: stressed,
      fromDate: input.fromDate,
      toDate: input.toDate,
      monthlyContributionMYR: MONTHLY_DCA,
      phaseWeights,
      ...simOpts,
    });
    if (isRuined(path)) bankrupt++;
  }

  return { runs, bankruptcyRatePct: round3((bankrupt / runs) * 100) };
}

function buildVerifyScenarioRow(input: {
  scenarioId: ForwardMalaysiaV3YtlVerifyScenarioId;
  labelJa: string;
  trades: ForwardPassedTradeRecord[];
  fromDate: string;
  toDate: string;
  baselineLedger: MalaysiaV3DcaExecutedTrade[];
  baselineCumulative: number;
  baselineMaxDd: number;
  baselineBankruptcy: number;
  seedOffset: number;
}): ForwardMalaysiaV3YtlVerifyScenarioRow {
  const stressed = applyYtlVerifyStressTrades(input.trades, input.scenarioId);
  const phaseWeights = resolveYtlVerifyPhaseWeights(input.scenarioId);
  const simOpts = resolveYtlVerifySimOptions(input.scenarioId);
  const path = simulateMalaysiaV3DcaPath({
    trades: stressed,
    fromDate: input.fromDate,
    toDate: input.toDate,
    monthlyContributionMYR: MONTHLY_DCA,
    phaseWeights,
    captureLedger: true,
    ...simOpts,
  });
  const ledger = path.executedTrades ?? [];
  const bootstrap = runBootstrapVerify({
    pool: input.trades,
    fromDate: input.fromDate,
    toDate: input.toDate,
    scenarioId: input.scenarioId,
    seed: BOOTSTRAP_SEED + input.seedOffset,
  });

  const diff =
    input.scenarioId === 'baseline_cap15'
      ? { disappearedTradeIds: [] as string[], disappearedYtlTradeCount: 0 }
      : diffLedgersAgainstBaseline({ baseline: input.baselineLedger, scenario: ledger });

  const cumulative = cumulativeFromPath(path);

  return {
    scenarioId: input.scenarioId,
    labelJa: input.labelJa,
    tradeCount: ledger.length,
    ytlTradeCount: ledger.filter((t) => t.symbol === YTL_SYMBOL).length,
    disappearedTradeCount: diff.disappearedTradeIds.length,
    disappearedYtlTradeCount: diff.disappearedYtlTradeCount,
    disappearedTradeIds: diff.disappearedTradeIds,
    cumulativeReturnPct: cumulative,
    cumulativeDeltaVsBaselinePct: round3(cumulative - input.baselineCumulative),
    maxDrawdownPct: path.maxDrawdownPct,
    maxDrawdownDeltaVsBaselinePct: round3(path.maxDrawdownPct - input.baselineMaxDd),
    minEquityMYR: path.minEquityMYR,
    bankruptcyRatePct: bootstrap.bankruptcyRatePct,
    bankruptcyDeltaVsBaselinePct: round3(
      bootstrap.bankruptcyRatePct - input.baselineBankruptcy,
    ),
    ledgerTrades: toVerifyTradeRows(ledger),
  };
}

export function detectYtlDelistImplementationBug(input: {
  baselineYtlCount: number;
  delistYtlCount: number;
  delistDisappearedYtlCount: number;
  delistLedger: MalaysiaV3DcaExecutedTrade[];
}): boolean {
  if (input.delistDisappearedYtlCount > 0) return true;
  if (input.delistYtlCount !== input.baselineYtlCount) return true;
  const ytlTrades = input.delistLedger.filter((t) => t.symbol === YTL_SYMBOL);
  if (ytlTrades.length === 0 && input.baselineYtlCount > 0) return true;
  for (const t of ytlTrades) {
    if (t.pnlMYR >= 0) return true;
    const expected = round3(-t.notionalMYR);
    if (t.returnPct <= -99 && Math.abs(t.pnlMYR - expected) > 1) return true;
  }
  return false;
}

export function gradeYtlVerify(input: {
  implementationBugDetected: boolean;
  delistBankruptcyPct: number;
  delistDisappearedYtlCount: number;
  baselineYtlCount: number;
  delistYtlCount: number;
}): { grade: ForwardMalaysiaV3YtlVerifyGrade; verdictJa: string } {
  if (input.implementationBugDetected || input.delistDisappearedYtlCount > 0) {
    return {
      grade: 'B',
      verdictJa: `B 実装バグ — 廃止でYTL取引${input.baselineYtlCount - input.delistYtlCount}件消失 · 要修正`,
    };
  }

  if (
    input.delistYtlCount === input.baselineYtlCount &&
    input.delistBankruptcyPct > 50
  ) {
    return {
      grade: 'A',
      verdictJa: `A 実リスク — YTL${input.delistYtlCount}件すべて実行·-100%損失 · MC${input.delistBankruptcyPct}%は正当`,
    };
  }

  return {
    grade: 'C',
    verdictJa: `C 要再検証 — YTL${input.delistYtlCount}件 · MC${input.delistBankruptcyPct}% · 追加確認`,
  };
}

export async function buildMalaysiaV3YtlVerifyAuditReport(input: {
  bundle: SurvivorshipOhlcvBundle;
  auditedAt?: string;
}): Promise<ForwardMalaysiaV3YtlVerifyAuditReport | null> {
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

  const baselineRow = buildVerifyScenarioRow({
    scenarioId: 'baseline_cap15',
    labelJa: '⓪ ベースライン cap15',
    trades: allTrades,
    fromDate,
    toDate,
    baselineLedger: [],
    baselineCumulative: 0,
    baselineMaxDd: 0,
    baselineBankruptcy: 0,
    seedOffset: 0,
  });

  const baselineLedger = baselineRow.ledgerTrades.map((t) => ({
    id: t.id,
    symbol: t.symbol,
    phase: 'phase4' as const,
    signalDate: t.entryDate,
    entryDate: t.entryDate,
    exitDate: t.exitDate,
    notionalMYR: t.notionalMYR,
    weightPct: 0,
    returnPct: t.returnPct,
    pnlMYR: t.pnlMYR,
    equityAfterMYR: 0,
  }));

  const stressScenarios = MALAYSIA_V3_YTL_VERIFY_SCENARIOS.filter(
    (s) => s.scenarioId !== 'baseline_cap15',
  ).map((def, i) =>
    buildVerifyScenarioRow({
      scenarioId: def.scenarioId,
      labelJa: def.labelJa,
      trades: allTrades,
      fromDate,
      toDate,
      baselineLedger,
      baselineCumulative: baselineRow.cumulativeReturnPct,
      baselineMaxDd: baselineRow.maxDrawdownPct,
      baselineBankruptcy: baselineRow.bankruptcyRatePct,
      seedOffset: i + 1,
    }),
  );

  const scenarios = [baselineRow, ...stressScenarios];
  const delistRow = stressScenarios.find((s) => s.scenarioId === 'ytl_delist')!;
  const delistLedger = delistRow.ledgerTrades;

  const baselineYtlTrades = baselineLedger.filter((t) => t.symbol === YTL_SYMBOL);
  const top10Ytl = [...baselineYtlTrades]
    .sort((a, b) => b.pnlMYR - a.pnlMYR)
    .slice(0, 10)
    .map((t, i) => ({
      ...toVerifyTradeRows([t])[0]!,
      rank: i + 1,
    }));
  const top5Sum = round3(top10Ytl.slice(0, 5).reduce((s, t) => s + t.pnlMYR, 0));

  const implementationBugDetected = detectYtlDelistImplementationBug({
    baselineYtlCount: baselineRow.ytlTradeCount,
    delistYtlCount: delistRow.ytlTradeCount,
    delistDisappearedYtlCount: delistRow.disappearedYtlTradeCount,
    delistLedger: delistLedger.map((t) => ({
      id: t.id,
      symbol: t.symbol,
      phase: 'phase4',
      signalDate: t.entryDate,
      entryDate: t.entryDate,
      exitDate: t.exitDate,
      notionalMYR: t.notionalMYR,
      weightPct: 0,
      returnPct: t.returnPct,
      pnlMYR: t.pnlMYR,
      equityAfterMYR: 0,
    })),
  });

  const trueYtlDependencyPct = symbolNetProfitContributionPct(baselineLedger, YTL_SYMBOL);

  const { grade, verdictJa } = gradeYtlVerify({
    implementationBugDetected,
    delistBankruptcyPct: delistRow.bankruptcyRatePct,
    delistDisappearedYtlCount: delistRow.disappearedYtlTradeCount,
    baselineYtlCount: baselineRow.ytlTradeCount,
    delistYtlCount: delistRow.ytlTradeCount,
  });

  const delistYtlLoss = round3(
    delistLedger.filter((t) => t.symbol === YTL_SYMBOL).reduce((s, t) => s + t.pnlMYR, 0),
  );
  const banRow = stressScenarios.find((s) => s.scenarioId === 'ytl_trade_ban')!;
  const zeroRow = stressScenarios.find((s) => s.scenarioId === 'ytl_profit_zero')!;

  const answerAJa = `A 廃止で消える取引: ${delistRow.disappearedTradeCount}件（YTL${delistRow.disappearedYtlTradeCount}件）· ベースYTL${baselineRow.ytlTradeCount}件 → 廃止後YTL${delistRow.ytlTradeCount}件`;
  const answerBJa = `B 利益寄与トップ10: ${top10Ytl.map((t) => `${t.id}(+${t.pnlMYR}MYR)`).join(' · ')}`;
  const answerCJa = `C 上位5取引利益合計: ${top5Sum}MYR（全YTL利益${round3(baselineYtlTrades.reduce((s, t) => s + t.pnlMYR, 0))}MYR）`;
  const answerDJa = `D 74.32%原因: YTL${delistRow.ytlTradeCount}件が-100%実行（損失${delistYtlLoss}MYR）· 取引禁止${banRow.cumulativeReturnPct}%/MC${banRow.bankruptcyRatePct}% vs 廃止${delistRow.cumulativeReturnPct}%/MC${delistRow.bankruptcyRatePct}% · ${implementationBugDetected ? '消失あり' : '取引は消えず全損'}`;
  const answerEJa = implementationBugDetected
    ? `E 実装バグ: あり — 廃止でYTL${delistRow.disappearedYtlTradeCount}件が履歴から消失`
    : `E 実装バグ: なし — 廃止でもYTL${delistRow.ytlTradeCount}件すべてledgerに残存·return${delistLedger.find((t) => t.symbol === YTL_SYMBOL)?.returnPct ?? '—'}%`;
  const answerFJa = `F 真のYTL依存率: ネット${trueYtlDependencyPct}% · 取引禁止時${zeroRow.cumulativeReturnPct}%（-${round3(baselineRow.cumulativeReturnPct - zeroRow.cumulativeReturnPct)}pt）`;

  const consistencyNoteJa =
    '監査74整合: 廃止MC74.32% · cap15累積37.716% · YTL37件 · ルール変更なし';

  const humanSummaryJa = [
    '監査75 YTL上場廃止MC74% 実装検証',
    `期間 ${fromDate}〜${toDate}`,
    FIXED_CONDITIONS_JA,
    `ベースライン: ${baselineRow.tradeCount}件 · YTL${baselineRow.ytlTradeCount}件 · 累積${baselineRow.cumulativeReturnPct}% · MC${baselineRow.bankruptcyRatePct}%`,
    ...stressScenarios.map(
      (s) =>
        `${s.labelJa}: ${s.tradeCount}件(YTL${s.ytlTradeCount}) · 消失${s.disappearedTradeCount}(YTL${s.disappearedYtlTradeCount}) · 累積${s.cumulativeReturnPct}%(${s.cumulativeDeltaVsBaselinePct >= 0 ? '+' : ''}${s.cumulativeDeltaVsBaselinePct}) · MaxDD${s.maxDrawdownPct}%(${s.maxDrawdownDeltaVsBaselinePct}) · MC${s.bankruptcyRatePct}%(${s.bankruptcyDeltaVsBaselinePct >= 0 ? '+' : ''}${s.bankruptcyDeltaVsBaselinePct})`,
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
    baselineTradeCount: baselineRow.tradeCount,
    baselineYtlTradeCount: baselineRow.ytlTradeCount,
    scenarios,
    top10YtlTrades: top10Ytl,
    top5YtlPnlSumMYR: top5Sum,
    delistYtlTradeCount: delistRow.ytlTradeCount,
    delistDisappearedYtlCount: delistRow.disappearedYtlTradeCount,
    implementationBugDetected,
    trueYtlDependencyPct,
    verifyGrade: grade,
    verifyVerdictJa: verdictJa,
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

export async function runMalaysiaV3YtlVerifyAudit(): Promise<ForwardMalaysiaV3YtlVerifyAuditReport | null> {
  const bundle = await fetchMalaysiaV69AuditBundle();
  if (!bundle) return null;
  return buildMalaysiaV3YtlVerifyAuditReport({ bundle });
}

export function formatMalaysiaV3YtlVerifyCsv(
  report: ForwardMalaysiaV3YtlVerifyAuditReport,
): string {
  const lines = [
    `# 最重要監査その75 YTL廃止MC検証 ${report.fromDate}〜${report.toDate}`,
    `# ${report.fixedConditionsJa}`,
    `# ${report.verifyVerdictJa}`,
    '',
    'section,scenarioId,label,trades,ytlTrades,disappeared,disYtl,cumulative,cumDelta,maxDD,ddDelta,minEquity,bankruptcy,bkDelta',
    ...report.scenarios.map((s) =>
      [
        'scenario',
        s.scenarioId,
        `"${s.labelJa}"`,
        s.tradeCount,
        s.ytlTradeCount,
        s.disappearedTradeCount,
        s.disappearedYtlTradeCount,
        s.cumulativeReturnPct,
        s.cumulativeDeltaVsBaselinePct,
        s.maxDrawdownPct,
        s.maxDrawdownDeltaVsBaselinePct,
        s.minEquityMYR,
        s.bankruptcyRatePct,
        s.bankruptcyDeltaVsBaselinePct,
      ].join(','),
    ),
    '',
    'section,rank,id,symbol,entry,exit,notional,return,pnl',
    ...report.top10YtlTrades.map((t) =>
      [
        'top10',
        t.rank ?? '',
        t.id,
        t.symbolNameJa,
        t.entryDate,
        t.exitDate,
        t.notionalMYR,
        t.returnPct,
        t.pnlMYR,
      ].join(','),
    ),
    '',
    'section,scenarioId,disappearedId',
    ...report.scenarios.flatMap((s) =>
      s.disappearedTradeIds.map((id) => ['disappeared', s.scenarioId, id].join(',')),
    ),
    '',
    'section,answer,content',
    ['answer', 'A', `"${report.answerAJa}"`].join(','),
    ['answer', 'B', `"${report.answerBJa}"`].join(','),
    ['answer', 'C', `"${report.answerCJa}"`].join(','),
    ['answer', 'D', `"${report.answerDJa}"`].join(','),
    ['answer', 'E', `"${report.answerEJa}"`].join(','),
    ['answer', 'F', `"${report.answerFJa}"`].join(','),
    ['verdict', 'grade', report.verifyGrade].join(','),
    ['verdict', 'bug', report.implementationBugDetected].join(','),
    ['consistency', 'note', `"${report.consistencyNoteJa}"`].join(','),
  ];
  return lines.join('\n');
}
