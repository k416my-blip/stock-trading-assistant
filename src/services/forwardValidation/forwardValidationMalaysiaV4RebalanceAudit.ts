/**
 * 最重要監査その82 — 実保有 vs Malaysia v4推奨配分リバランス監査 · 監査80固定 · ルール変更なし
 */
import type { PortfolioPosition } from '../../types';
import type {
  ForwardMalaysiaV4RebalanceAuditReport,
  ForwardMalaysiaV4RebalanceDeltaRow,
  ForwardMalaysiaV4RebalanceHoldingRow,
  ForwardMalaysiaV4RebalancePlan,
  ForwardMalaysiaV4RebalancePlanId,
  ForwardMalaysiaV4RebalancePrediction,
  ForwardMalaysiaV4RebalanceTradeRow,
} from '../../types/forwardValidation';
import { isMalaysiaMarket } from '../../utils/normalizeBursaSymbol';
import { safePrice, safeShares } from '../../utils/safeNumeric';
import {
  collectExecutedTradesForUniverse,
  MALAYSIA_V1_AUDIT_START,
} from './forwardValidationMalaysiaV1Audit';
import { symbolNetProfitContributionPct } from './forwardValidationMalaysiaV3Cap15Audit';
import {
  simulateMalaysiaV3DcaPath,
  type MalaysiaV3DcaExecutedTrade,
  type MalaysiaV3DcaPathResult,
} from './forwardValidationMalaysiaV3DcaAudit';
import { V4_PHASE2_SYMBOLS } from './forwardValidationMalaysiaV4AttributionAudit';
import {
  buildV4PhaseWeights,
  fetchMalaysiaV76AuditBundle,
  resolveV4TradeSymbols,
} from './forwardValidationMalaysiaV4CandidateAudit';
import {
  computeHhi,
  MALAYSIA_V4_TARGET_WEIGHTS,
} from './forwardValidationMalaysiaV4OpsMonitorAudit';
import { delistSymbol } from './forwardValidationMalaysiaV3CrashAudit';
import { bootstrapSampleTrades } from './forwardValidationBootstrapMcAudit';
import { mulberry32, percentile } from './forwardValidationMonteCarloAudit';
import { precomputeTradeTemplates } from './forwardValidationRobustnessAudit';
import type { SurvivorshipOhlcvBundle } from './forwardValidationSurvivorshipAudit';

const IJM_SYMBOL = '3336';
const YTL_SYMBOL = '6742';
const YTL_CAP_PCT = 15;
const MONTHLY_DCA = 1500;
const TOLERANCE_PCT = 0.5;
const MC_RUNS = 2_000;
const MC_SEED = 82_101;

const SYMBOL_NAMES: Record<string, string> = {
  '5347': 'TENAGA',
  '1023': 'CIMB',
  '5398': 'GAMUDA',
  '6742': 'YTL',
  '3336': 'IJM',
};

const V4_SYMBOL_SET = new Set<string>(V4_PHASE2_SYMBOLS);

const BASELINE = {
  cumulativePct: 38.36,
  ytlDependencyPct: 32.815,
  delistMcPct: 4.79,
  hhi: 0.284,
};

const FIXED_CONDITIONS_JA =
  'MY v4リバランス · 実保有vs推奨 · TENAGA23.3/CIMB23.3/GAMUDA15/YTL15/IJM23.3 · 監査80固定';

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

function coreBursaSymbol(symbol: string): string {
  return symbol
    .trim()
    .toUpperCase()
    .replace(/\.KL$/i, '')
    .replace(/:KL$/i, '')
    .replace(/^KLSE:/i, '');
}

export function extractMalaysiaHoldings(
  holdings: PortfolioPosition[],
): ForwardMalaysiaV4RebalanceHoldingRow[] {
  const my = holdings.filter((p) => isMalaysiaMarket(p.market) && safeShares(p.shares, 0) > 0);
  const total = my.reduce((s, p) => {
    const price = safePrice(p.currentPrice, p.averageBuyPrice, 0);
    return s + price * safeShares(p.shares, 0);
  }, 0);

  return my.map((p) => {
    const core = coreBursaSymbol(p.symbol);
    const shares = safeShares(p.shares, 0);
    const avg = safePrice(p.averageBuyPrice, 0, 0);
    const cur = safePrice(p.currentPrice, p.averageBuyPrice, 0);
    const mv = round3(cur * shares);
    return {
      symbol: core,
      symbolNameJa: SYMBOL_NAMES[core] ?? p.companyName ?? core,
      shares,
      averageBuyPriceMYR: avg,
      currentPriceMYR: cur,
      marketValueMYR: mv,
      weightPct: total > 0 ? round3((mv / total) * 100) : 0,
      isV4Symbol: V4_SYMBOL_SET.has(core),
    };
  });
}

export function aggregateV4Weights(
  holdingRows: ForwardMalaysiaV4RebalanceHoldingRow[],
): { weights: Record<string, number>; v4TotalMYR: number; totalMYR: number } {
  const totalMYR = round3(holdingRows.reduce((s, r) => s + r.marketValueMYR, 0));
  const v4Rows = holdingRows.filter((r) => r.isV4Symbol);
  const v4TotalMYR = round3(v4Rows.reduce((s, r) => s + r.marketValueMYR, 0));
  const weights: Record<string, number> = {};
  for (const sym of V4_PHASE2_SYMBOLS) {
    const mv = v4Rows.filter((r) => r.symbol === sym).reduce((s, r) => s + r.marketValueMYR, 0);
    weights[sym] = v4TotalMYR > 0 ? round3((mv / v4TotalMYR) * 100) : 0;
  }
  return { weights, v4TotalMYR, totalMYR };
}

export function buildDeltaRows(input: {
  currentWeights: Record<string, number>;
  v4TotalMYR: number;
}): ForwardMalaysiaV4RebalanceDeltaRow[] {
  return V4_PHASE2_SYMBOLS.map((sym) => {
    const current = input.currentWeights[sym] ?? 0;
    const recommended = MALAYSIA_V4_TARGET_WEIGHTS[sym] ?? 0;
    const delta = round3(current - recommended);
    const currentValue = round3((input.v4TotalMYR * current) / 100);
    const targetValue = round3((input.v4TotalMYR * recommended) / 100);
    const deltaValue = round3(targetValue - currentValue);
    let action: ForwardMalaysiaV4RebalanceDeltaRow['action'] = 'hold';
    if (delta > TOLERANCE_PCT) action = 'sell';
    else if (delta < -TOLERANCE_PCT) action = 'buy';
    return {
      symbol: sym,
      symbolNameJa: SYMBOL_NAMES[sym] ?? sym,
      currentWeightPct: current,
      recommendedWeightPct: recommended,
      deltaWeightPct: delta,
      currentValueMYR: currentValue,
      targetValueMYR: targetValue,
      deltaValueMYR: deltaValue,
      action,
    };
  });
}

function weightsAfterTrades(
  current: Record<string, number>,
  trades: ForwardMalaysiaV4RebalanceTradeRow[],
  v4TotalMYR: number,
): Record<string, number> {
  const valueBySym: Record<string, number> = {};
  for (const sym of V4_PHASE2_SYMBOLS) {
    valueBySym[sym] = round3((v4TotalMYR * (current[sym] ?? 0)) / 100);
  }
  for (const t of trades) {
    const sign = t.action === 'buy' ? 1 : -1;
    valueBySym[t.symbol] = round3((valueBySym[t.symbol] ?? 0) + sign * t.amountMYR);
  }
  const total = Object.values(valueBySym).reduce((s, v) => s + Math.max(0, v), 0);
  const out: Record<string, number> = {};
  for (const sym of V4_PHASE2_SYMBOLS) {
    out[sym] = total > 0 ? round3((Math.max(0, valueBySym[sym] ?? 0) / total) * 100) : 0;
  }
  return out;
}

export function buildMinTradesPlan(deltas: ForwardMalaysiaV4RebalanceDeltaRow[]): ForwardMalaysiaV4RebalancePlan {
  const sells = deltas.filter((d) => d.action === 'sell').sort((a, b) => b.deltaValueMYR - a.deltaValueMYR);
  const buys = deltas.filter((d) => d.action === 'buy').sort((a, b) => a.deltaValueMYR - b.deltaValueMYR);
  const trades: ForwardMalaysiaV4RebalanceTradeRow[] = [];
  if (sells[0]) {
    trades.push({
      symbol: sells[0].symbol,
      symbolNameJa: sells[0].symbolNameJa,
      action: 'sell',
      amountMYR: round3(Math.abs(sells[0].deltaValueMYR)),
      deltaWeightPct: sells[0].deltaWeightPct,
    });
  }
  if (buys[0]) {
    trades.push({
      symbol: buys[0].symbol,
      symbolNameJa: buys[0].symbolNameJa,
      action: 'buy',
      amountMYR: round3(Math.abs(buys[0].deltaValueMYR)),
      deltaWeightPct: buys[0].deltaWeightPct,
    });
  }
  return {
    planId: 'min_trades',
    labelJa: '最小売買回数案',
    trades,
    tradeCount: trades.length,
    summaryJa:
      trades.length === 0
        ? 'リバランス不要'
        : trades.map((t) => `${t.action === 'sell' ? '売' : '買'}${t.symbolNameJa}${t.amountMYR}MYR`).join(' · '),
  };
}

const RISK_SELL_PRIORITY = ['6742', '3336', '5398', '5347', '1023'];
const RISK_BUY_PRIORITY = ['5347', '1023', '5398', '6742', '3336'];

export function buildRiskMinPlan(deltas: ForwardMalaysiaV4RebalanceDeltaRow[]): ForwardMalaysiaV4RebalancePlan {
  const trades: ForwardMalaysiaV4RebalanceTradeRow[] = [];
  for (const sym of RISK_SELL_PRIORITY) {
    const d = deltas.find((r) => r.symbol === sym && r.action === 'sell');
    if (d) {
      trades.push({
        symbol: d.symbol,
        symbolNameJa: d.symbolNameJa,
        action: 'sell',
        amountMYR: round3(Math.abs(d.deltaValueMYR)),
        deltaWeightPct: d.deltaWeightPct,
      });
    }
  }
  for (const sym of RISK_BUY_PRIORITY) {
    const d = deltas.find((r) => r.symbol === sym && r.action === 'buy');
    if (d) {
      trades.push({
        symbol: d.symbol,
        symbolNameJa: d.symbolNameJa,
        action: 'buy',
        amountMYR: round3(Math.abs(d.deltaValueMYR)),
        deltaWeightPct: d.deltaWeightPct,
      });
    }
  }
  return {
    planId: 'risk_min',
    labelJa: 'リスク最小案',
    trades,
    tradeCount: trades.length,
    summaryJa:
      trades.length === 0
        ? 'リスク調整不要'
        : `YTL/IJM超過解消優先 · ${trades.length}件 · ${trades.map((t) => `${t.symbolNameJa}${t.action === 'sell' ? '-' : '+'}${t.amountMYR}`).join(' ')}`,
  };
}

const PROFIT_BUY_ORDER = ['1023', '3336', '6742', '5398', '5347'];

export function buildMaxProfitPlan(
  deltas: ForwardMalaysiaV4RebalanceDeltaRow[],
  profitContrib: Record<string, number>,
): ForwardMalaysiaV4RebalancePlan {
  const buyOrder = [...PROFIT_BUY_ORDER].sort(
    (a, b) => (profitContrib[b] ?? 0) - (profitContrib[a] ?? 0),
  );
  const sells = deltas.filter((d) => d.action === 'sell').sort((a, b) => b.deltaWeightPct - a.deltaWeightPct);
  const trades: ForwardMalaysiaV4RebalanceTradeRow[] = [];
  for (const d of sells) {
    trades.push({
      symbol: d.symbol,
      symbolNameJa: d.symbolNameJa,
      action: 'sell',
      amountMYR: round3(Math.abs(d.deltaValueMYR)),
      deltaWeightPct: d.deltaWeightPct,
    });
  }
  for (const sym of buyOrder) {
    const d = deltas.find((r) => r.symbol === sym && r.action === 'buy');
    if (d) {
      trades.push({
        symbol: d.symbol,
        symbolNameJa: d.symbolNameJa,
        action: 'buy',
        amountMYR: round3(Math.abs(d.deltaValueMYR)),
        deltaWeightPct: d.deltaWeightPct,
      });
    }
  }
  return {
    planId: 'max_profit',
    labelJa: '期待利益最大案',
    trades,
    tradeCount: trades.length,
    summaryJa:
      trades.length === 0
        ? '利益最大化調整不要'
        : `高寄与銘柄(CIMB/IJM)優先購入 · ${trades.length}件`,
  };
}

function runDelistMcPct(input: {
  pool: ReturnType<typeof collectExecutedTradesForUniverse>;
  fromDate: string;
  toDate: string;
  phaseWeights: ReturnType<typeof buildV4PhaseWeights>;
}): number {
  const rand = mulberry32(MC_SEED);
  let bankrupt = 0;
  for (let r = 0; r < MC_RUNS; r++) {
    let sample = bootstrapSampleTrades(input.pool, rand, r);
    sample = delistSymbol(sample, YTL_SYMBOL);
    const path = simulateMalaysiaV3DcaPath({
      trades: sample,
      fromDate: input.fromDate,
      toDate: input.toDate,
      monthlyContributionMYR: MONTHLY_DCA,
      phaseWeights: input.phaseWeights,
    });
    const minPct = (path.minEquityMYR / 3000) * 100;
    if (minPct <= 50 || path.finalEquityMYR <= 0) bankrupt++;
  }
  return round3((bankrupt / MC_RUNS) * 100);
}

export function predictPostRebalance(input: {
  weightsAfter: Record<string, number>;
  baselineCumulativePct: number;
  baselineYtlDepPct: number;
  baselineMcPct: number;
  delistMcAtTarget?: number;
}): ForwardMalaysiaV4RebalancePrediction {
  const w = V4_PHASE2_SYMBOLS.map((s) => input.weightsAfter[s] ?? 0);
  const hhi = computeHhi(w);
  const ytlW = input.weightsAfter[YTL_SYMBOL] ?? 15;
  const meanAbsDelta =
    V4_PHASE2_SYMBOLS.reduce(
      (s, sym) => s + Math.abs((input.weightsAfter[sym] ?? 0) - (MALAYSIA_V4_TARGET_WEIGHTS[sym] ?? 0)),
      0,
    ) / V4_PHASE2_SYMBOLS.length;
  const alignment = Math.max(0, 1 - meanAbsDelta / 10);
  const ytlScale = ytlW / 15;
  const ytlDependencyPct = round3(input.baselineYtlDepPct * Math.min(1.5, ytlScale));
  const expectedCumulativePct = round3(input.baselineCumulativePct * (0.92 + 0.08 * alignment));
  const mcBase = input.delistMcAtTarget ?? input.baselineMcPct;
  const delistMcPct = round3(mcBase * (1 + Math.max(0, ytlW - 15) * 0.03));
  return {
    ytlDependencyPct,
    hhi,
    expectedCumulativePct,
    delistMcPct,
    weightsAfter: input.weightsAfter,
  };
}

export function buildExecutionPriority(deltas: ForwardMalaysiaV4RebalanceDeltaRow[]): string[] {
  const priority: string[] = [];
  const ytl = deltas.find((d) => d.symbol === YTL_SYMBOL);
  const ijm = deltas.find((d) => d.symbol === IJM_SYMBOL);
  if (ytl && ytl.action === 'sell') priority.push(`1. YTL超過解消（${ytl.deltaWeightPct}%→0%付近）`);
  if (ijm && ijm.action === 'sell') priority.push(`2. IJM超過解消（${ijm.deltaWeightPct}%）`);
  for (const d of deltas.filter((x) => x.action === 'buy')) {
    priority.push(`${priority.length + 1}. ${d.symbolNameJa}買い増し（不足${Math.abs(d.deltaWeightPct)}%）`);
  }
  if (priority.length === 0) priority.push('1. 現状維持 — v4推奨±0.5%以内');
  return priority;
}

export async function buildMalaysiaV4RebalanceAuditReport(input: {
  holdings: PortfolioPosition[];
  bundle: SurvivorshipOhlcvBundle;
  holdingsSourceJa?: string;
  auditedAt?: string;
}): Promise<ForwardMalaysiaV4RebalanceAuditReport> {
  const auditedAt = input.auditedAt ?? new Date().toISOString();
  const holdingRows = extractMalaysiaHoldings(input.holdings);
  const { weights, v4TotalMYR, totalMYR } = aggregateV4Weights(holdingRows);
  const nonV4MYR = round3(totalMYR - v4TotalMYR);
  const deltaRows = buildDeltaRows({ currentWeights: weights, v4TotalMYR });
  const sellCandidates = deltaRows.filter((d) => d.action === 'sell').map((d) => d.symbolNameJa);
  const buyCandidates = deltaRows.filter((d) => d.action === 'buy').map((d) => d.symbolNameJa);

  const toDate = input.bundle.latestDate;
  const fromDate = resolveAuditFromDate(toDate);
  const v4Symbols = resolveV4TradeSymbols({ candidateSymbol: IJM_SYMBOL, ytlCapPct: YTL_CAP_PCT });
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
  const phaseWeights = buildV4PhaseWeights({ candidateSymbol: IJM_SYMBOL, ytlCapPct: YTL_CAP_PCT });
  const path = simulateMalaysiaV3DcaPath({
    trades,
    fromDate,
    toDate,
    monthlyContributionMYR: MONTHLY_DCA,
    phaseWeights,
    captureLedger: true,
  });
  const ledger: MalaysiaV3DcaExecutedTrade[] = path.executedTrades ?? [];
  const baselineCum = cumulativeFromPath(path);
  const baselineYtl = symbolNetProfitContributionPct(ledger, YTL_SYMBOL);
  const delistMcAtTarget = runDelistMcPct({ pool: trades, fromDate, toDate, phaseWeights });

  const profitContrib: Record<string, number> = {};
  for (const sym of V4_PHASE2_SYMBOLS) {
    const pnl = ledger.filter((t) => t.symbol === sym).reduce((s, t) => s + t.pnlMYR, 0);
    const total = ledger.reduce((s, t) => s + t.pnlMYR, 0);
    profitContrib[sym] = total !== 0 ? round3((pnl / total) * 100) : 0;
  }

  const minPlan = buildMinTradesPlan(deltaRows);
  const riskPlan = buildRiskMinPlan(deltaRows);
  const maxPlan = buildMaxProfitPlan(deltaRows, profitContrib);

  const predictions: Record<ForwardMalaysiaV4RebalancePlanId, ForwardMalaysiaV4RebalancePrediction> = {
    min_trades: predictPostRebalance({
      weightsAfter: weightsAfterTrades(weights, minPlan.trades, v4TotalMYR),
      baselineCumulativePct: baselineCum,
      baselineYtlDepPct: baselineYtl,
      baselineMcPct: BASELINE.delistMcPct,
      delistMcAtTarget,
    }),
    risk_min: predictPostRebalance({
      weightsAfter: weightsAfterTrades(weights, riskPlan.trades, v4TotalMYR),
      baselineCumulativePct: baselineCum,
      baselineYtlDepPct: baselineYtl,
      baselineMcPct: BASELINE.delistMcPct,
      delistMcAtTarget,
    }),
    max_profit: predictPostRebalance({
      weightsAfter: weightsAfterTrades(weights, maxPlan.trades, v4TotalMYR),
      baselineCumulativePct: baselineCum,
      baselineYtlDepPct: baselineYtl,
      baselineMcPct: BASELINE.delistMcPct,
      delistMcAtTarget,
    }),
  };

  const executionPriorityJa = buildExecutionPriority(deltaRows);
  const holdingsSourceJa =
    input.holdingsSourceJa ??
    (holdingRows.length > 0 ? '実保有ポートフォリオ' : '保有なし — 空ポートフォリオ');

  const answerAJa = `A 現在配分: ${deltaRows.map((d) => `${d.symbolNameJa}${d.currentWeightPct}%`).join(' · ')} · v4評価額${v4TotalMYR}MYR`;
  const answerBJa = `B 推奨配分: ${deltaRows.map((d) => `${d.symbolNameJa}${d.recommendedWeightPct}%`).join(' · ')}`;
  const answerCJa = `C 売却候補: ${sellCandidates.length > 0 ? sellCandidates.join(' · ') : 'なし'}`;
  const answerDJa = `D 購入候補: ${buyCandidates.length > 0 ? buyCandidates.join(' · ') : 'なし'}`;
  const answerEJa = `E リバランス案: 最小[${minPlan.summaryJa}] · リスク最小[${riskPlan.summaryJa}] · 利益最大[${maxPlan.summaryJa}]`;
  const answerFJa = `F 実行優先順位: ${executionPriorityJa.join(' → ')}`;

  const humanSummaryJa = [
    '監査82 Malaysia v4 実保有 vs 推奨配分',
    FIXED_CONDITIONS_JA,
    `保有元: ${holdingsSourceJa} · 総額${totalMYR}MYR · v4${v4TotalMYR}MYR · 非v4${nonV4MYR}MYR`,
    answerAJa,
    answerBJa,
    answerCJa,
    answerDJa,
    answerEJa,
    `リバランス後予測(リスク最小): YTL依存${predictions.risk_min.ytlDependencyPct}% · HHI${predictions.risk_min.hhi} · 累積期待${predictions.risk_min.expectedCumulativePct}% · 廃止MC${predictions.risk_min.delistMcPct}%`,
    answerFJa,
    '監査80/79整合 · ルール変更なし',
  ].join('\n');

  return {
    auditedAt,
    holdingsSourceJa,
    totalPortfolioValueMYR: totalMYR,
    v4HoldingsValueMYR: v4TotalMYR,
    nonV4HoldingsValueMYR: nonV4MYR,
    holdingRows,
    deltaRows,
    sellCandidates,
    buyCandidates,
    rebalancePlans: [minPlan, riskPlan, maxPlan],
    predictions,
    executionPriorityJa,
    answerAJa,
    answerBJa,
    answerCJa,
    answerDJa,
    answerEJa,
    answerFJa,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    consistencyNoteJa: '監査80/79整合 · ルール変更なし',
    humanSummaryJa,
  };
}

export function buildDemoHoldingsFromWeights(
  weights: Record<string, number>,
  totalMYR = 100_000,
): PortfolioPosition[] {
  const now = new Date().toISOString();
  return V4_PHASE2_SYMBOLS.filter((sym) => (weights[sym] ?? 0) > 0).map((sym, i) => {
    const mv = round3((totalMYR * (weights[sym] ?? 0)) / 100);
    const price = 10;
    const shares = Math.max(1, Math.round(mv / price));
    return {
      id: `demo-${sym}-${i}`,
      symbol: sym,
      market: 'bursa' as const,
      currency: 'MYR' as const,
      shares,
      averageBuyPrice: price,
      currentPrice: price,
      openedAt: now,
      companyName: SYMBOL_NAMES[sym],
    };
  });
}

export async function runMalaysiaV4RebalanceAudit(
  holdings?: PortfolioPosition[],
): Promise<ForwardMalaysiaV4RebalanceAuditReport | null> {
  const bundle = await fetchMalaysiaV76AuditBundle();
  if (!bundle) return null;
  return buildMalaysiaV4RebalanceAuditReport({
    bundle,
    holdings: holdings ?? [],
    holdingsSourceJa: holdings?.length ? '実保有ポートフォリオ' : 'CLI空保有（要アプリ連携）',
  });
}

export function formatMalaysiaV4RebalanceCsv(report: ForwardMalaysiaV4RebalanceAuditReport): string {
  const lines = [
    `# 最重要監査その82 v4リバランス ${report.auditedAt}`,
    `# ${report.fixedConditionsJa}`,
    `# ${report.holdingsSourceJa}`,
    '',
    'section,symbol,name,shares,avgPrice,price,valueMYR,weightPct,isV4',
    ...report.holdingRows.map((h) =>
      [
        'holding',
        h.symbol,
        h.symbolNameJa,
        h.shares,
        h.averageBuyPriceMYR,
        h.currentPriceMYR,
        h.marketValueMYR,
        h.weightPct,
        h.isV4Symbol,
      ].join(','),
    ),
    '',
    'section,symbol,currentPct,recommendedPct,deltaPct,currentMYR,targetMYR,deltaMYR,action',
    ...report.deltaRows.map((d) =>
      [
        'delta',
        d.symbolNameJa,
        d.currentWeightPct,
        d.recommendedWeightPct,
        d.deltaWeightPct,
        d.currentValueMYR,
        d.targetValueMYR,
        d.deltaValueMYR,
        d.action,
      ].join(','),
    ),
    '',
    'section,plan,symbol,action,amountMYR,deltaPct',
    ...report.rebalancePlans.flatMap((p) =>
      p.trades.map((t) =>
        ['trade', p.planId, t.symbolNameJa, t.action, t.amountMYR, t.deltaWeightPct].join(','),
      ),
    ),
    '',
    'section,plan,ytlDep,hhi,expectedCum,delistMc',
    ...(['min_trades', 'risk_min', 'max_profit'] as const).map((id) => {
      const pred = report.predictions[id];
      return ['predict', id, pred.ytlDependencyPct, pred.hhi, pred.expectedCumulativePct, pred.delistMcPct].join(
        ',',
      );
    }),
    '',
    'section,answer,content',
    ['answer', 'A', `"${report.answerAJa}"`].join(','),
    ['answer', 'B', `"${report.answerBJa}"`].join(','),
    ['answer', 'C', `"${report.answerCJa}"`].join(','),
    ['answer', 'D', `"${report.answerDJa}"`].join(','),
    ['answer', 'E', `"${report.answerEJa}"`].join(','),
    ['answer', 'F', `"${report.answerFJa}"`].join(','),
  ];
  return lines.join('\n');
}
