import {
  DEFAULT_MIN_CASH_PCT,
  DEFAULT_TARGET_CASH_PCT_CRISIS,
  DEFAULT_TARGET_CASH_PCT_NORMAL,
  MAX_GROSS_EXPOSURE_PCT,
  MAX_TURNOVER_PCT_30D,
  TURNOVER_BLOCK_BUY_PCT,
} from '../constants/institutionalExecution';
import { FX_TO_MYR } from '../constants/rakutenTrade';
import { findStock } from '../data/sampleStocks';
import type { AppState, BuyingPowerResult, PortfolioPosition, PracticeStats, TradeRecord } from '../types';
import type { MarketRegimeResult } from '../types/marketRegime';
import type {
  CashManagementAdvice,
  ExposureThrottle,
  InstitutionalRiskInput,
  InstitutionalRiskReport,
  RebalanceAction,
  RebalancePlan,
  RiskBudgetAllocation,
  TurnoverControl,
} from '../types/institutionalRisk';
import { toMYR } from './fx';
import {
  buildStagedEntryPlan,
  computeSignalDecay,
  modelTransactionCosts,
} from './institutionalExecutionEngine';
import { evaluateExitRules } from './institutionalExitEngine';
import { detectCorrelationRegime } from './crisisCorrelationEngine';

const MS_30D = 30 * 24 * 60 * 60 * 1000;

/** AppContext / 画面からリスク入力を組み立て */
export function buildInstitutionalRiskInputFromApp(params: {
  state: AppState;
  isPractice: boolean;
  practiceStats: PracticeStats;
  buyingPower: BuyingPowerResult;
  regime: MarketRegimeResult;
  portfolioDrawdownPct?: number;
  constructionReport?: InstitutionalRiskInput['constructionReport'];
}): InstitutionalRiskInput {
  const { state, isPractice, practiceStats, buyingPower, regime } = params;
  const portfolio = isPractice
    ? state.practice.portfolio.filter((p) => p.shares > 0)
    : state.portfolio.filter((p) => p.shares > 0);
  const trades = isPractice ? state.practice.trades : state.trades;
  const cashBalanceMYR = isPractice ? practiceStats.cashBalanceMYR : buyingPower.buyingPowerMYR;
  const totalPortfolioValueMYR = isPractice
    ? practiceStats.portfolioValueMYR
    : buyingPower.buyingPowerMYR +
      portfolio.reduce((s, p) => {
        const price = p.currentPrice || p.averageBuyPrice;
        return s + toMYR(price * p.shares, p.currency);
      }, 0);
  const totalCapitalMYR = isPractice
    ? practiceStats.virtualCapitalMYR
    : state.settings.totalCapitalMYR;

  return {
    cashBalanceMYR,
    totalPortfolioValueMYR,
    totalCapitalMYR,
    riskPerTradePct: state.settings.riskPerTradePct,
    portfolio,
    trades,
    regime,
    portfolioDrawdownPct: params.portfolioDrawdownPct,
    constructionReport: params.constructionReport,
  };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function computeTurnoverControl(
  trades: TradeRecord[],
  portfolioValueMYR: number,
): TurnoverControl {
  const since = Date.now() - MS_30D;
  let turnoverMYR = 0;
  for (const t of trades) {
    const ts = new Date(t.executedAt).getTime();
    if (ts >= since) {
      turnoverMYR += toMYR(t.shares * t.price, t.currency);
    }
  }
  const turnoverPct30d =
    portfolioValueMYR > 0 ? Math.round((turnoverMYR / portfolioValueMYR) * 1000) / 10 : 0;
  const withinLimit = turnoverPct30d <= MAX_TURNOVER_PCT_30D;
  const blockNewBuys = turnoverPct30d >= TURNOVER_BLOCK_BUY_PCT;

  return {
    turnoverPct30d,
    maxTurnoverPct: MAX_TURNOVER_PCT_30D,
    withinLimit,
    blockNewBuys,
    noteJa: blockNewBuys
      ? `30日ターンオーバー ${turnoverPct30d}% — 新規買いは抑制`
      : `30日ターンオーバー ${turnoverPct30d}% / 上限 ${MAX_TURNOVER_PCT_30D}%`,
  };
}

export function computeCashManagement(input: {
  cashBalanceMYR: number;
  totalPortfolioValueMYR: number;
  crisisMode: boolean;
}): CashManagementAdvice {
  const { cashBalanceMYR, totalPortfolioValueMYR, crisisMode } = input;
  const total = Math.max(totalPortfolioValueMYR, cashBalanceMYR);
  const currentCashPct = total > 0 ? (cashBalanceMYR / total) * 100 : 100;
  const targetCashPct = crisisMode ? DEFAULT_TARGET_CASH_PCT_CRISIS : DEFAULT_TARGET_CASH_PCT_NORMAL;
  const minCashPct = DEFAULT_MIN_CASH_PCT;
  const targetCashMYR = total * (targetCashPct / 100);
  const minCashMYR = total * (minCashPct / 100);
  const deployableMYR = Math.max(0, cashBalanceMYR - minCashMYR);
  const reserveMYR = Math.max(0, targetCashMYR - cashBalanceMYR);

  return {
    cashBalanceMYR,
    currentCashPct: Math.round(currentCashPct * 10) / 10,
    targetCashPct,
    minCashPct,
    deployableMYR: Math.round(deployableMYR),
    reserveMYR: Math.round(reserveMYR),
    noteJa:
      currentCashPct < minCashPct
        ? `現金比率が低い（${currentCashPct.toFixed(1)}%）— 最低${minCashPct}%を確保`
        : `運用可能現金 約RM${Math.round(deployableMYR).toLocaleString('ja-JP')}`,
  };
}

export function computeExposureThrottle(input: {
  totalPortfolioValueMYR: number;
  cashBalanceMYR: number;
  constructionExposureReductionPct: number;
  correlationRegime: ReturnType<typeof detectCorrelationRegime>;
}): ExposureThrottle {
  const invested = Math.max(0, input.totalPortfolioValueMYR - input.cashBalanceMYR);
  const currentExposurePct =
    input.totalPortfolioValueMYR > 0 ? (invested / input.totalPortfolioValueMYR) * 100 : 0;
  let maxExposurePct = MAX_GROSS_EXPOSURE_PCT;
  let throttleReductionPct = input.constructionExposureReductionPct;

  if (input.correlationRegime === 'crisis') {
    maxExposurePct = 75;
    throttleReductionPct = Math.max(throttleReductionPct, 25);
  } else if (input.correlationRegime === 'high_volatility') {
    maxExposurePct = 85;
    throttleReductionPct = Math.max(throttleReductionPct, 12);
  }

  const effectiveMax = maxExposurePct * (1 - throttleReductionPct / 100);
  const headroomMYR =
    input.totalPortfolioValueMYR > 0
      ? Math.max(0, input.totalPortfolioValueMYR * (effectiveMax / 100) - invested)
      : 0;
  const blocked = currentExposurePct >= effectiveMax;

  return {
    currentExposurePct: Math.round(currentExposurePct * 10) / 10,
    maxExposurePct: Math.round(effectiveMax * 10) / 10,
    throttleReductionPct,
    headroomMYR: Math.round(headroomMYR),
    blocked,
    noteJa: blocked
      ? `エクスポージャー上限到達（${currentExposurePct.toFixed(1)}%）`
      : `追加余地 約RM${Math.round(headroomMYR).toLocaleString('ja-JP')}`,
  };
}

export function computeRiskBudgetAllocation(input: {
  portfolio: PortfolioPosition[];
  totalCapitalMYR: number;
  riskPerTradePct: number;
}): RiskBudgetAllocation {
  const totalRiskBudgetMYR = input.totalCapitalMYR * (input.riskPerTradePct / 100) * 5;
  const perPosition = input.portfolio
    .filter((p) => p.shares > 0)
    .map((p) => {
      const price = p.currentPrice || p.averageBuyPrice;
      const stop = price * 0.94;
      const riskPerShare = Math.max(price - stop, price * 0.02);
      const riskMYR = toMYR(riskPerShare * p.shares, p.currency);
      return {
        symbol: p.symbol,
        riskMYR: Math.round(riskMYR),
        riskPctOfBudget: 0,
      };
    });

  const usedRiskMYR = perPosition.reduce((s, l) => s + l.riskMYR, 0);
  const lines = perPosition.map((l) => ({
    ...l,
    riskPctOfBudget:
      totalRiskBudgetMYR > 0 ? Math.round((l.riskMYR / totalRiskBudgetMYR) * 1000) / 10 : 0,
  }));

  return {
    totalRiskBudgetMYR: Math.round(totalRiskBudgetMYR),
    usedRiskMYR: Math.round(usedRiskMYR),
    availableRiskMYR: Math.round(Math.max(0, totalRiskBudgetMYR - usedRiskMYR)),
    perPosition: lines,
    noteJa: `リスク予算 RM${Math.round(totalRiskBudgetMYR)} · 使用 ${Math.round((usedRiskMYR / Math.max(totalRiskBudgetMYR, 1)) * 100)}%`,
  };
}

/** ポートフォリオ・リバランス最適化（ルールベース） */
export function buildRebalancePlan(input: {
  portfolio: PortfolioPosition[];
  totalPortfolioValueMYR: number;
  constructionReport?: InstitutionalRiskInput['constructionReport'];
}): RebalancePlan | undefined {
  const positions = input.portfolio.filter((p) => p.shares > 0);
  if (positions.length === 0) return undefined;

  const n = positions.length;
  const equalTarget = Math.min(100 / n, 15);
  const actions: RebalanceAction[] = [];

  for (const p of positions) {
    const stock = findStock(p.symbol);
    const price = p.currentPrice || p.averageBuyPrice;
    const valueMYR = toMYR(price * p.shares, p.currency);
    const currentWeightPct =
      input.totalPortfolioValueMYR > 0 ? (valueMYR / input.totalPortfolioValueMYR) * 100 : 0;

    let targetWeightPct = equalTarget;
    const analysis = input.constructionReport?.positions.find((a) => a.symbol === p.symbol);
    if (analysis) {
      targetWeightPct = Math.min(analysis.maxLiquidWeightPct, equalTarget * 1.2);
    }

    const delta = targetWeightPct - currentWeightPct;
    let action: RebalanceAction['action'] = 'hold';
    if (delta > 2) action = 'buy';
    else if (delta < -2) action = 'sell';

    const deltaValueMYR = (Math.abs(delta) / 100) * input.totalPortfolioValueMYR;
    const suggestedShares =
      price > 0 ? Math.floor(deltaValueMYR / toMYR(price, p.currency)) : 0;

    actions.push({
      symbol: p.symbol,
      action,
      currentWeightPct: Math.round(currentWeightPct * 10) / 10,
      targetWeightPct: Math.round(targetWeightPct * 10) / 10,
      deltaWeightPct: Math.round(delta * 10) / 10,
      suggestedShares,
      priority: Math.round(Math.abs(delta) * 10),
    });
  }

  const estimatedTurnoverPct = Math.round(
    actions
      .filter((a) => a.action !== 'hold')
      .reduce((s, a) => s + Math.abs(a.deltaWeightPct), 0) * 10,
  ) / 10;

  return {
    actions: actions.sort((a, b) => b.priority - a.priority),
    estimatedTurnoverPct,
    rationaleJa: '均等配分+流動性上限に基づくリバランス（手動執行）',
  };
}

/** 機関投資家型リスク・執行レポート */
export function buildInstitutionalRiskReport(input: InstitutionalRiskInput): InstitutionalRiskReport {
  const crisisMode =
    input.constructionReport?.crisisCorrelation.regimeId === 'crisis' ||
    input.constructionReport?.crossAssetGuidance.defense.active === true;

  const correlationRegime =
    input.constructionReport?.crisisCorrelation.regimeId ??
    detectCorrelationRegime(input.regime.indicators);

  const turnover = computeTurnoverControl(input.trades, input.totalPortfolioValueMYR);
  const cashManagement = computeCashManagement({
    cashBalanceMYR: input.cashBalanceMYR,
    totalPortfolioValueMYR: input.totalPortfolioValueMYR,
    crisisMode,
  });
  const exposureThrottle = computeExposureThrottle({
    totalPortfolioValueMYR: input.totalPortfolioValueMYR,
    cashBalanceMYR: input.cashBalanceMYR,
    constructionExposureReductionPct: input.constructionReport?.totalExposureReductionPct ?? 0,
    correlationRegime,
  });
  const riskBudget = computeRiskBudgetAllocation({
    portfolio: input.portfolio,
    totalCapitalMYR: input.totalCapitalMYR,
    riskPerTradePct: input.riskPerTradePct,
  });

  const rebalancePlan = buildRebalancePlan({
    portfolio: input.portfolio,
    totalPortfolioValueMYR: input.totalPortfolioValueMYR,
    constructionReport: input.constructionReport,
  });

  let entryPlan: InstitutionalRiskReport['entryPlan'];
  let transactionCost: InstitutionalRiskReport['transactionCost'];
  let signalDecay: InstitutionalRiskReport['signalDecay'];
  let exitRecommendations: InstitutionalRiskReport['exitRecommendations'] = [];

  if (input.symbol && input.sizing && input.tradeSuggestion && input.stockPrice && input.market && input.currency) {
    signalDecay = computeSignalDecay(
      input.recommendation,
      input.positionOpenedAt,
      input.recommendation?.totalScore,
    );
    const priceMYR = toMYR(input.stockPrice, input.currency);
    entryPlan = buildStagedEntryPlan(input.sizing, input.tradeSuggestion, signalDecay, priceMYR);
    transactionCost = modelTransactionCosts(
      input.market,
      input.sizing.suggestedShares,
      input.stockPrice,
      input.currency,
      input.recommendation?.historicalDetail?.volatilityPct ?? undefined,
    );
  }

  if (input.symbol && input.technicals) {
    const position = input.portfolio.find((p) => p.symbol === input.symbol && p.shares > 0);
    if (position) {
      exitRecommendations = evaluateExitRules({
        position,
        currentPrice: position.currentPrice || position.averageBuyPrice,
        technicals: input.technicals,
        regime: input.regime,
        recommendation: input.recommendation,
        tradeSuggestion: input.tradeSuggestion ?? undefined,
      });
    }
  }

  return {
    computedAt: new Date().toISOString(),
    entryPlan,
    exitRecommendations,
    turnover,
    transactionCost,
    signalDecay,
    rebalancePlan,
    cashManagement,
    exposureThrottle,
    riskBudget,
  };
}
