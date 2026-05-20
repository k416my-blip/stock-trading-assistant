import type { AdaptiveExecutionHints } from '../types/adaptiveExecution';
import type { MarketRegimeResult } from '../types/marketRegime';
import type { PortfolioGovernanceReport } from '../types/governance';
import type {
  ShadowPortfolioState,
  ShadowTradingReport,
  SubmitShadowOrderInput,
} from '../types/shadowTrading';
import {
  analyzeBehavioralSurvivability,
  analyzeMarketMicrostructure,
  analyzePortfolioPath,
  analyzeShadowModelDivergence,
  appendEquityPoint,
  buildExecutionHealth,
  checkMarketReliability,
  computeShadowSnapshot,
  evaluateCapitalPreservation,
} from './shadowAnalyticsService';
import {
  cancelShadowOrder,
  processPendingShadowOrders,
  submitShadowOrder,
} from './shadowOmsService';
import { saveShadowPortfolio } from './shadowPortfolioStorage';

export type ShadowTickParams = {
  state: ShadowPortfolioState;
  priceBySymbol: Map<string, { price: number; updatedAt: string }>;
  regime: MarketRegimeResult;
  governance?: PortfolioGovernanceReport | null;
  apiLatencyMs?: number;
  volatilityProxyPct?: number;
};

/** シャドー・ティック — 価格更新・注文処理・分析 */
export async function runShadowTick(params: ShadowTickParams): Promise<{
  state: ShadowPortfolioState;
  report: ShadowTradingReport;
}> {
  let state = { ...params.state };

  for (const p of state.positions) {
    const key = `${p.market}:${p.symbol}`;
    const q = params.priceBySymbol.get(key);
    if (q) {
      p.currentPrice = q.price;
      p.currentPriceUpdatedAt = q.updatedAt;
      p.priceSource = 'api';
    }
  }

  const priceMap = new Map<string, number>();
  for (const [k, v] of params.priceBySymbol) {
    priceMap.set(k, v.price);
  }
  state = processPendingShadowOrders(state, priceMap);
  state.equityCurve = appendEquityPoint(state);

  const snapshot = computeShadowSnapshot(state);
  const pathAnalysis = analyzePortfolioPath(state);
  const microstructure = analyzeMarketMicrostructure({
    volatilityProxyPct: params.volatilityProxyPct ?? params.regime.indicators.volatilityProxyPct,
    volumeShock: params.regime.indicators.volatilityProxyPct > 28,
    spreadBps: 12,
  });

  const regimeMix = params.governance?.regimeMixture;
  const disagreement = params.governance?.meta.disagreement.score ?? 30;
  const behavioral = analyzeBehavioralSurvivability({
    snapshot,
    pathAnalysis,
    allocationShockPct: params.governance?.meta.allocationEntropy.normalizedEntropy
      ? params.governance.meta.allocationEntropy.normalizedEntropy * 30
      : 0,
  });

  const divergence = analyzeShadowModelDivergence({
    fills: state.fills,
    regime: params.regime,
    predictedRegime: params.governance?.meta.regimeSelection.primaryAllocator,
  });

  const reliability = checkMarketReliability({
    symbols: state.positions.map((p) => p.symbol),
    apiLatencyMs: params.apiLatencyMs,
    lastOhlcvHoursAgo: 12,
    quoteJumps: 0,
    cacheOk: true,
  });

  const executionHealth = buildExecutionHealth({
    fills: state.fills,
    reliability,
    microstructure,
    snapshot,
  });

  const capitalPreservation = evaluateCapitalPreservation({
    snapshot,
    regimeTransitionPct: regimeMix?.transitionPct ?? 20,
    executionQualityScore: executionHealth.executionQualityScore,
    disagreementScore: disagreement,
    liquidityRiskScore: executionHealth.liquidityRiskScore,
  });

  state.capitalPreservationActive = capitalPreservation.active;
  if (capitalPreservation.active && !state.capitalPreservationSince) {
    state.capitalPreservationSince = capitalPreservation.triggeredAt;
  }
  if (!capitalPreservation.active) {
    state.capitalPreservationSince = undefined;
  }

  await saveShadowPortfolio(state);

  const openOrders = state.orders.filter(
    (o) => o.status === 'pending' || o.status === 'partially_filled',
  );
  const recentOrders = state.orders.slice(-15).reverse();
  const recentFills = state.fills.slice(-10);

  const doNotTrade =
    capitalPreservation.active ||
    params.governance?.doNotTrade.active ||
    reliability.reliabilityScore < 50;

  const verdictJa = doNotTrade
    ? '取引抑制 — シャドー検証でリスク超過（実注文は送信しません）'
    : executionHealth.executionQualityScore >= 55
      ? `シャドー運用中 — 執行品質 ${executionHealth.executionQualityScore}/100`
      : '要監視 — 執行・データ品質を確認';

  const report: ShadowTradingReport = {
    generatedAt: new Date().toISOString(),
    snapshot,
    microstructure,
    behavioral,
    pathAnalysis,
    divergence,
    reliability,
    executionHealth,
    capitalPreservation,
    openOrders,
    recentOrders,
    recentFills,
    verdictJa,
  };

  return { state, report };
}

export async function submitAndTickShadowOrder(params: {
  state: ShadowPortfolioState;
  order: SubmitShadowOrderInput;
  tick: Omit<ShadowTickParams, 'state'>;
  adaptiveHints?: AdaptiveExecutionHints;
}): Promise<{ state: ShadowPortfolioState; report: ShadowTradingReport; orderRejected: boolean }> {
  const cpBlock = params.state.capitalPreservationActive && params.order.side === 'buy';
  const { state: afterSubmit, rejected } = submitShadowOrder(params.state, params.order, {
    capitalPreservationBlock: cpBlock,
    adaptiveHints: params.adaptiveHints,
  });
  const { state, report } = await runShadowTick({ ...params.tick, state: afterSubmit });
  return { state, report, orderRejected: rejected };
}

export { cancelShadowOrder, submitShadowOrder, processPendingShadowOrders };
