import type { PortfolioPosition } from '../types';
import type { MarketRegimeResult } from '../types/marketRegime';
import type { PortfolioGovernanceReport } from '../types/governance';
import type { PositionSizingResult } from '../types';
import type { AdaptiveExecutionReport } from '../types/adaptiveExecution';
import type { ShadowPortfolioState } from '../types/shadowTrading';
import {
  buildAdaptiveExecutionReport,
  recordRegimeTransition,
} from './adaptiveExecutionEngine';
import {
  loadAdaptiveLearningState,
  saveAdaptiveLearningState,
} from './adaptiveExecutionStorage';
import { runMarketIntelligenceAnalysis } from './marketIntelligenceOrchestratorService';
import { loadShadowPortfolio } from './shadowPortfolioStorage';

export async function runAdaptiveExecutionAnalysis(params: {
  regime: MarketRegimeResult;
  governance?: PortfolioGovernanceReport | null;
  portfolio: PortfolioPosition[];
  totalPortfolioValueMYR: number;
  portfolioDrawdownPct?: number;
  baseSizing?: PositionSizingResult | null;
  shadowState?: ShadowPortfolioState | null;
  symbol?: string;
  market?: import('../types').Market;
  currency?: import('../types').Currency;
  intendedShares?: number;
  priceMYR?: number;
  dailyVolume?: number;
  signalScore?: number;
  apiLatencyMs?: number;
  persistLearning?: boolean;
}): Promise<{ report: AdaptiveExecutionReport; learningSaved: boolean }> {
  let learning = await loadAdaptiveLearningState();
  const shadowState = params.shadowState ?? (await loadShadowPortfolio());

  if (learning.lastRegimeId && learning.lastRegimeId !== params.regime.regimeId) {
    learning = recordRegimeTransition(learning, learning.lastRegimeId, params.regime.regimeId);
  }
  learning = { ...learning, lastRegimeId: params.regime.regimeId };

  const marketIntelligence = await runMarketIntelligenceAnalysis({
    regime: params.regime,
    persistSnapshot: true,
  }).catch(() => null);

  const { report, learningState } = buildAdaptiveExecutionReport({
    regime: params.regime,
    governance: params.governance ?? null,
    marketIntelligence,
    shadowState,
    learningState: learning,
    portfolio: params.portfolio,
    totalPortfolioValueMYR: params.totalPortfolioValueMYR,
    portfolioDrawdownPct: params.portfolioDrawdownPct,
    baseSizing: params.baseSizing ?? null,
    symbol: params.symbol,
    market: params.market,
    currency: params.currency,
    intendedShares: params.intendedShares,
    priceMYR: params.priceMYR,
    dailyVolume: params.dailyVolume,
    volatilityProxyPct: params.regime.indicators.volatilityProxyPct,
    signalScore: params.signalScore,
    apiLatencyMs: params.apiLatencyMs,
  });

  let learningSaved = false;
  if (params.persistLearning !== false) {
    await saveAdaptiveLearningState(learningState);
    learningSaved = true;
  }

  return { report, learningSaved };
}

export async function runDemoAdaptiveExecution(params: {
  regime: MarketRegimeResult;
}): Promise<AdaptiveExecutionReport> {
  const { report } = await runAdaptiveExecutionAnalysis({
    regime: params.regime,
    governance: null,
    portfolio: [],
    totalPortfolioValueMYR: 100_000,
    portfolioDrawdownPct: 0,
    signalScore: 62,
    persistLearning: false,
  });
  return report;
}
