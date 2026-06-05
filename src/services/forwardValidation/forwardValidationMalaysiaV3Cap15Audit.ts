/**
 * 最重要監査その73 — Malaysia v3 GAMUDA15% 実取引履歴検証 · 監査72固定 · ルール変更なし
 */
import type {
  ForwardMalaysiaV3Cap15AuditReport,
  ForwardMalaysiaV3Cap15CompensationRow,
  ForwardMalaysiaV3Cap15Grade,
  ForwardMalaysiaV3Cap15SymbolStatRow,
  ForwardMalaysiaV3Cap15TradeRow,
  ForwardPassedTradeRecord,
} from '../../types/forwardValidation';
import {
  collectExecutedTradesForUniverse,
  MALAYSIA_V1_AUDIT_START,
} from './forwardValidationMalaysiaV1Audit';
import { computeCalendarTrainTestSplit } from './forwardValidationMalaysiaV2DurabilityAudit';
import { fetchMalaysiaV69AuditBundle } from './forwardValidationMalaysiaV21FourthSymbolAudit';
import {
  MALAYSIA_V3_CAP_15_PHASE_WEIGHTS,
  MALAYSIA_V3_GAMUDA_CAP_15_PCT,
} from './forwardValidationMalaysiaV3GamudaCapAudit';
import {
  simulateMalaysiaV3DcaPath,
  V3_SYMBOLS,
  type MalaysiaV3DcaExecutedTrade,
  type MalaysiaV3DcaPathResult,
} from './forwardValidationMalaysiaV3DcaAudit';
import { precomputeTradeTemplates } from './forwardValidationRobustnessAudit';
import { judgeWf7030Overfit } from './forwardValidationWf7030OosAudit';
import type { SurvivorshipOhlcvBundle } from './forwardValidationSurvivorshipAudit';

const MONTHLY_DCA = 1500;
const WF_TRAIN_PCT = 70;
const GAMUDA_SYMBOL = '5398';
const COMPENSATOR_SYMBOLS = ['5347', '1023', '6742'] as const;

const SYMBOL_NAMES: Record<string, string> = {
  '5347': 'TENAGA',
  '5398': 'GAMUDA',
  '1023': 'CIMB',
  '6742': 'YTL POWER',
};

const FIXED_CONDITIONS_JA =
  'MY v3 GAMUDA15%実取引 · P1 TENAGA42.5/CIMB42.5/GAMUDA15 · P2 4銘柄28.3/15 · 月次RM1500 · ルール変更なし';

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

function toTradeRows(trades: MalaysiaV3DcaExecutedTrade[]): ForwardMalaysiaV3Cap15TradeRow[] {
  return trades.map((t) => ({
    id: t.id,
    symbol: t.symbol,
    symbolNameJa: SYMBOL_NAMES[t.symbol] ?? t.symbol,
    phase: t.phase,
    signalDate: t.signalDate,
    entryDate: t.entryDate,
    exitDate: t.exitDate,
    notionalMYR: t.notionalMYR,
    weightPct: t.weightPct,
    returnPct: t.returnPct,
    pnlMYR: t.pnlMYR,
    equityAfterMYR: t.equityAfterMYR,
  }));
}

function profitFactorFromPnls(pnls: number[]): number | null {
  const wins = pnls.filter((p) => p > 0).reduce((s, p) => s + p, 0);
  const losses = pnls.filter((p) => p < 0).reduce((s, p) => s + Math.abs(p), 0);
  return losses > 0 ? round3(wins / losses) : null;
}

export function aggregateCap15SymbolStats(input: {
  cap15Trades: MalaysiaV3DcaExecutedTrade[];
  baselineTrades: MalaysiaV3DcaExecutedTrade[];
  symbols: readonly string[];
}): ForwardMalaysiaV3Cap15SymbolStatRow[] {
  const totalNetPnl = input.cap15Trades.reduce((s, t) => s + t.pnlMYR, 0);
  const baselineBySym = new Map<string, number>();
  for (const t of input.baselineTrades) {
    baselineBySym.set(t.symbol, (baselineBySym.get(t.symbol) ?? 0) + t.pnlMYR);
  }

  return input.symbols.map((sym) => {
    const rows = input.cap15Trades.filter((t) => t.symbol === sym);
    const pnls = rows.map((t) => t.pnlMYR);
    const wins = rows.filter((t) => t.pnlMYR > 0).length;
    const totalPnl = round3(pnls.reduce((s, p) => s + p, 0));
    const avgNotional =
      rows.length > 0 ? round3(rows.reduce((s, t) => s + t.notionalMYR, 0) / rows.length) : 0;
    const avgReturn =
      rows.length > 0 ? round3(rows.reduce((s, t) => s + t.returnPct, 0) / rows.length) : 0;
    const baselinePnl = baselineBySym.get(sym) ?? 0;
    return {
      symbol: sym,
      symbolNameJa: SYMBOL_NAMES[sym] ?? sym,
      tradeCount: rows.length,
      winCount: wins,
      winRatePct: rows.length > 0 ? round3((wins / rows.length) * 100) : 0,
      profitFactor: profitFactorFromPnls(pnls),
      totalPnlMYR: totalPnl,
      profitContributionPct:
        totalNetPnl !== 0 ? round3((totalPnl / totalNetPnl) * 100) : 0,
      avgNotionalMYR: avgNotional,
      avgReturnPct: avgReturn,
      compensationVsBaselineMYR: round3(totalPnl - baselinePnl),
    };
  });
}

export function buildCap15CompensationRows(input: {
  cap15Stats: ForwardMalaysiaV3Cap15SymbolStatRow[];
}): ForwardMalaysiaV3Cap15CompensationRow[] {
  return input.cap15Stats.map((s) => ({
    symbol: s.symbol,
    symbolNameJa: s.symbolNameJa,
    baselinePnlMYR: round3(s.totalPnlMYR - s.compensationVsBaselineMYR),
    cap15PnlMYR: s.totalPnlMYR,
    deltaPnlMYR: s.compensationVsBaselineMYR,
    roleJa: COMPENSATOR_SYMBOLS.includes(s.symbol as (typeof COMPENSATOR_SYMBOLS)[number])
      ? s.compensationVsBaselineMYR >= 0
        ? '利益補完'
        : '利益減'
      : s.symbol === GAMUDA_SYMBOL
        ? 'ウェイト縮小'
        : '—',
  }));
}

export function gamudaDependencyFromLedger(
  trades: MalaysiaV3DcaExecutedTrade[],
): number {
  return symbolPositiveProfitDependencyPct(trades, GAMUDA_SYMBOL);
}

export function symbolPositiveProfitDependencyPct(
  trades: MalaysiaV3DcaExecutedTrade[],
  symbol: string,
): number {
  const positive = trades.filter((t) => t.pnlMYR > 0);
  const totalPos = positive.reduce((s, t) => s + t.pnlMYR, 0);
  if (totalPos <= 0) return 0;
  const symPos = positive
    .filter((t) => t.symbol === symbol)
    .reduce((s, t) => s + t.pnlMYR, 0);
  return round3((symPos / totalPos) * 100);
}

export function symbolNetProfitContributionPct(
  trades: MalaysiaV3DcaExecutedTrade[],
  symbol: string,
): number {
  const totalNet = trades.reduce((s, t) => s + t.pnlMYR, 0);
  if (totalNet === 0) return 0;
  const symNet = trades.filter((t) => t.symbol === symbol).reduce((s, t) => s + t.pnlMYR, 0);
  return round3((symNet / totalNet) * 100);
}

export function buildMaintenanceReasonJa(input: {
  cap15Stats: ForwardMalaysiaV3Cap15SymbolStatRow[];
  baselineStats: ForwardMalaysiaV3Cap15SymbolStatRow[];
  cumulativeReturnPct: number;
  baselineCumulativeReturnPct: number;
}): string {
  const gamuda = input.cap15Stats.find((s) => s.symbol === GAMUDA_SYMBOL)!;
  const gamudaBase = input.baselineStats.find((s) => s.symbol === GAMUDA_SYMBOL)!;
  const ytl = input.cap15Stats.find((s) => s.symbol === '6742');
  const cimb = input.cap15Stats.find((s) => s.symbol === '1023');
  const compensators = input.cap15Stats.filter((s) =>
    COMPENSATOR_SYMBOLS.includes(s.symbol as (typeof COMPENSATOR_SYMBOLS)[number]),
  );
  const extraPnl = round3(compensators.reduce((s, r) => s + r.compensationVsBaselineMYR, 0));
  const gamudaDelta = round3(gamuda.totalPnlMYR - gamudaBase.totalPnlMYR);
  const cumDelta = round3(input.cumulativeReturnPct - input.baselineCumulativeReturnPct);
  const coreShare = round3((ytl?.profitContributionPct ?? 0) + (cimb?.profitContributionPct ?? 0));
  return [
    `GAMUDA15%で累積${input.cumulativeReturnPct}%（均等${input.baselineCumulativeReturnPct}% · ${cumDelta >= 0 ? '+' : ''}${cumDelta}pt）`,
    `GAMUDA利益${gamuda.totalPnlMYR}MYR（均等比${gamudaDelta}MYR · 寄与${gamuda.profitContributionPct}%）`,
    `YTL+CIMBが利益の${coreShare}%を占めGAMUDA非依存`,
    `GAMUDA縮小の絶対PnL差${gamudaDelta}MYR · 他銘柄再配分${extraPnl >= 0 ? '+' : ''}${extraPnl}MYR · リスク削減とのトレードオフ`,
  ].join(' · ');
}

export function gradeMalaysiaV3Cap15(input: {
  cumulativeReturnPct: number;
  ledgerReconciled: boolean;
  gamudaDependencyPct: number;
  testTradeCount: number;
  testWinRatePct: number;
  overfitVerdictJa: string;
}): { grade: ForwardMalaysiaV3Cap15Grade; verdictJa: string } {
  const overfitOk =
    !input.overfitVerdictJa.includes('過学習疑い') &&
    !input.overfitVerdictJa.includes('判定不能');

  if (
    input.ledgerReconciled &&
    input.cumulativeReturnPct >= 35 &&
    input.gamudaDependencyPct < 50 &&
    input.testTradeCount >= 5 &&
    input.testWinRatePct >= 40 &&
    overfitOk
  ) {
    return {
      grade: 'A',
      verdictJa: `A 即採用 — 実取引累積${input.cumulativeReturnPct}% · GAMUDA依存${input.gamudaDependencyPct}% · 帳簿一致`,
    };
  }

  if (
    input.ledgerReconciled &&
    input.cumulativeReturnPct >= 30 &&
    input.gamudaDependencyPct < 50 &&
    input.testTradeCount >= 3
  ) {
    return {
      grade: 'B',
      verdictJa: `B 採用可能 — 実取引累積${input.cumulativeReturnPct}% · GAMUDA依存${input.gamudaDependencyPct}% · ${input.overfitVerdictJa}`,
    };
  }

  if (input.ledgerReconciled && input.cumulativeReturnPct > 0) {
    return {
      grade: 'C',
      verdictJa: `C 要改善 — 累積${input.cumulativeReturnPct}% · テスト取引${input.testTradeCount}件 · ${input.overfitVerdictJa}`,
    };
  }

  return {
    grade: 'D',
    verdictJa: 'D 不採用 — 実取引ベースで再現不可または帳簿不一致',
  };
}

export function pickProfitTop3(
  stats: ForwardMalaysiaV3Cap15SymbolStatRow[],
): ForwardMalaysiaV3Cap15SymbolStatRow[] {
  return [...stats].sort((a, b) => b.totalPnlMYR - a.totalPnlMYR).slice(0, 3);
}

export async function buildMalaysiaV3Cap15AuditReport(input: {
  bundle: SurvivorshipOhlcvBundle;
  auditedAt?: string;
}): Promise<ForwardMalaysiaV3Cap15AuditReport | null> {
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

  const cap15Path = simulateMalaysiaV3DcaPath({
    trades: allTrades,
    fromDate,
    toDate,
    monthlyContributionMYR: MONTHLY_DCA,
    phaseWeights,
    captureLedger: true,
  });

  const baselinePath = simulateMalaysiaV3DcaPath({
    trades: allTrades,
    fromDate,
    toDate,
    monthlyContributionMYR: MONTHLY_DCA,
    captureLedger: true,
  });

  const cap15Ledger = cap15Path.executedTrades ?? [];
  const baselineLedger = baselinePath.executedTrades ?? [];

  const symbolStats = aggregateCap15SymbolStats({
    cap15Trades: cap15Ledger,
    baselineTrades: baselineLedger,
    symbols: V3_SYMBOLS,
  });

  const baselineStats = aggregateCap15SymbolStats({
    cap15Trades: baselineLedger,
    baselineTrades: baselineLedger,
    symbols: V3_SYMBOLS,
  });

  const compensation = buildCap15CompensationRows({ cap15Stats: symbolStats });
  const tradeHistory = toTradeRows(cap15Ledger);

  const ledgerPnl = round3(cap15Ledger.reduce((s, t) => s + t.pnlMYR, 0));
  const ledgerReconciled =
    Math.abs(cap15Path.finalEquityMYR - round3(cap15Path.totalContributedMYR + ledgerPnl)) < 1;

  const cumulativeReturnPct = cumulativeFromPath(cap15Path);
  const baselineCumulativeReturnPct = cumulativeFromPath(baselinePath);
  const gamudaDependencyPct = gamudaDependencyFromLedger(cap15Ledger);
  const baselineGamudaDependencyPct = gamudaDependencyFromLedger(baselineLedger);

  const split = computeCalendarTrainTestSplit(fromDate, toDate, WF_TRAIN_PCT);
  const trainLedger = cap15Ledger.filter((t) => t.exitDate <= split.testTo);
  const testLedger = cap15Ledger.filter((t) => t.exitDate >= split.testFrom);
  const trainWins = trainLedger.filter((t) => t.pnlMYR > 0).length;
  const testWins = testLedger.filter((t) => t.pnlMYR > 0).length;
  const trainAvgPnl =
    trainLedger.length > 0
      ? round3(trainLedger.reduce((s, t) => s + t.pnlMYR, 0) / trainLedger.length)
      : 0;
  const testAvgPnl =
    testLedger.length > 0
      ? round3(testLedger.reduce((s, t) => s + t.pnlMYR, 0) / testLedger.length)
      : 0;

  const trainCumulativeProxy =
    trainLedger.length > 0 ? round3(trainLedger.reduce((s, t) => s + t.returnPct, 0)) : 0;
  const testCumulativeProxy =
    testLedger.length > 0 ? round3(testLedger.reduce((s, t) => s + t.returnPct, 0)) : 0;
  const cumulativeDegradationPct = round3(
    trainCumulativeProxy > 0
      ? ((testCumulativeProxy - trainCumulativeProxy) / Math.abs(trainCumulativeProxy)) * 100
      : 0,
  );

  const overfitVerdictJa = judgeWf7030Overfit({
    train: { cumulativeReturnPct: trainCumulativeProxy, tradeCount: trainLedger.length } as never,
    test: { cumulativeReturnPct: testCumulativeProxy, tradeCount: testLedger.length } as never,
    cumulativeDegradationPct,
  });

  const maintenanceReasonJa = buildMaintenanceReasonJa({
    cap15Stats: symbolStats,
    baselineStats,
    cumulativeReturnPct,
    baselineCumulativeReturnPct,
  });

  const { grade, verdictJa } = gradeMalaysiaV3Cap15({
    cumulativeReturnPct,
    ledgerReconciled,
    gamudaDependencyPct,
    testTradeCount: testLedger.length,
    testWinRatePct:
      testLedger.length > 0 ? round3((testWins / testLedger.length) * 100) : 0,
    overfitVerdictJa,
  });

  const top3 = pickProfitTop3(symbolStats);
  const compensatorDelta = round3(
    compensation
      .filter((c) => COMPENSATOR_SYMBOLS.includes(c.symbol as (typeof COMPENSATOR_SYMBOLS)[number]))
      .reduce((s, c) => s + c.deltaPnlMYR, 0),
  );

  const phaseWeightsLabelJa = `P1 TENAGA${phaseWeights.phase3['5347']}% CIMB${phaseWeights.phase3['1023']}% GAMUDA${phaseWeights.phase3[GAMUDA_SYMBOL]}% · P2 TENAGA${phaseWeights.phase4['5347']}% CIMB${phaseWeights.phase4['1023']}% YTL${phaseWeights.phase4['6742']}% GAMUDA${phaseWeights.phase4[GAMUDA_SYMBOL]}%`;

  const answerAJa = `A 利益源トップ3: ${top3.map((s) => `${s.symbolNameJa}(+${s.totalPnlMYR}MYR · ${s.profitContributionPct}% · ${s.tradeCount}件 · 勝率${s.winRatePct}%)`).join(' · ')}`;
  const answerBJa = `B GAMUDA依存: 実取引利益寄与${gamudaDependencyPct}%（均等${baselineGamudaDependencyPct}%） · ${gamudaDependencyPct < 50 ? '50%未満達成' : '50%未満未達'}`;
  const answerCJa = `C 過剰最適化: ${overfitVerdictJa} · テスト${testLedger.length}件 · テスト勝率${testLedger.length > 0 ? round3((testWins / testLedger.length) * 100) : 0}% · テスト平均PnL${testAvgPnl}MYR`;
  const answerDJa = `D 実取引再現: 累積${cumulativeReturnPct}% · 取引${cap15Ledger.length}件 · 帳簿${ledgerReconciled ? '一致' : '不一致'} · 監査72比${Math.abs(cumulativeReturnPct - 37.716) < 1 ? '一致' : '乖離'}`;
  const answerEJa = `E 最終採用案: GAMUDA上限${MALAYSIA_V3_GAMUDA_CAP_15_PCT}% · ${phaseWeightsLabelJa} · 累積${cumulativeReturnPct}% · GAMUDA廃止MC0%（監査72）`;
  const answerFJa = `F 実運用開始: ${grade === 'A' || grade === 'B' ? '可' : '条件付'} · ${verdictJa.split(' — ')[0]}`;

  const consistencyNoteJa =
    '監査72整合: cap15累積37.716% · GAMUDA廃止MC0% · 月次RM1500 · ルール変更なし';

  const humanSummaryJa = [
    '監査73 Malaysia v3 GAMUDA15% 実取引履歴',
    `期間 ${fromDate}〜${toDate}`,
    FIXED_CONDITIONS_JA,
    phaseWeightsLabelJa,
    `実取引: ${cap15Ledger.length}件 · 累積${cumulativeReturnPct}% · 最終RM${cap15Path.finalEquityMYR} · 投入RM${cap15Path.totalContributedMYR}`,
    ...symbolStats.map(
      (s) =>
        `${s.symbolNameJa}: ${s.tradeCount}件 · 勝率${s.winRatePct}% · PF${s.profitFactor ?? '—'} · 利益${s.totalPnlMYR}MYR · 寄与${s.profitContributionPct}% · 均等比${s.compensationVsBaselineMYR >= 0 ? '+' : ''}${s.compensationVsBaselineMYR}MYR`,
    ),
    `補完合計 TENAGA/CIMB/YTL: +${compensatorDelta}MYR`,
    maintenanceReasonJa,
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
    tradeHistory,
    symbolStats,
    compensation,
    cumulativeReturnPct,
    totalPnlMYR: ledgerPnl,
    totalContributedMYR: cap15Path.totalContributedMYR,
    finalEquityMYR: cap15Path.finalEquityMYR,
    tradeCount: cap15Ledger.length,
    gamudaDependencyPct,
    baselineCumulativeReturnPct,
    baselineGamudaDependencyPct,
    maintenanceReasonJa,
    wfOos: {
      trainTradeCount: trainLedger.length,
      testTradeCount: testLedger.length,
      trainWinRatePct:
        trainLedger.length > 0 ? round3((trainWins / trainLedger.length) * 100) : 0,
      testWinRatePct:
        testLedger.length > 0 ? round3((testWins / testLedger.length) * 100) : 0,
      trainAvgPnlMYR: trainAvgPnl,
      testAvgPnlMYR: testAvgPnl,
      overfitVerdictJa,
    },
    ledgerReconciled,
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

export async function runMalaysiaV3Cap15Audit(): Promise<ForwardMalaysiaV3Cap15AuditReport | null> {
  const bundle = await fetchMalaysiaV69AuditBundle();
  if (!bundle) return null;
  return buildMalaysiaV3Cap15AuditReport({ bundle });
}

export function formatMalaysiaV3Cap15Csv(report: ForwardMalaysiaV3Cap15AuditReport): string {
  const lines = [
    `# 最重要監査その73 Malaysia v3 GAMUDA15% 実取引 ${report.fromDate}〜${report.toDate}`,
    `# ${report.fixedConditionsJa}`,
    `# ${report.adoptionVerdictJa}`,
    '',
    'section,metric,value',
    ['summary', 'cumulative', report.cumulativeReturnPct].join(','),
    ['summary', 'baselineCumulative', report.baselineCumulativeReturnPct].join(','),
    ['summary', 'tradeCount', report.tradeCount].join(','),
    ['summary', 'totalPnl', report.totalPnlMYR].join(','),
    ['summary', 'finalEquity', report.finalEquityMYR].join(','),
    ['summary', 'gamudaDep', report.gamudaDependencyPct].join(','),
    ['summary', 'ledgerReconciled', report.ledgerReconciled].join(','),
    '',
    'section,symbol,name,trades,wins,winRate,PF,totalPnl,contributionPct,avgNotional,avgReturn,vsBaseline',
    ...report.symbolStats.map((s) =>
      [
        'symbol',
        s.symbol,
        s.symbolNameJa,
        s.tradeCount,
        s.winCount,
        s.winRatePct,
        s.profitFactor ?? '',
        s.totalPnlMYR,
        s.profitContributionPct,
        s.avgNotionalMYR,
        s.avgReturnPct,
        s.compensationVsBaselineMYR,
      ].join(','),
    ),
    '',
    'section,symbol,baselinePnl,cap15Pnl,delta,role',
    ...report.compensation.map((c) =>
      ['compensation', c.symbol, c.baselinePnlMYR, c.cap15PnlMYR, c.deltaPnlMYR, `"${c.roleJa}"`].join(
        ',',
      ),
    ),
    '',
    'section,id,symbol,name,phase,signal,entry,exit,notional,weight,return,pnl,equityAfter',
    ...report.tradeHistory.map((t) =>
      [
        'trade',
        t.id,
        t.symbol,
        t.symbolNameJa,
        t.phase,
        t.signalDate,
        t.entryDate,
        t.exitDate,
        t.notionalMYR,
        t.weightPct,
        t.returnPct,
        t.pnlMYR,
        t.equityAfterMYR,
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
    ['verdict', 'maintenance', `"${report.maintenanceReasonJa}"`].join(','),
    ['consistency', 'note', `"${report.consistencyNoteJa}"`].join(','),
  ];
  return lines.join('\n');
}
