import type { Currency, Market } from '../types';
import type { MarketRegimeResult } from '../types/marketRegime';
import type { PortfolioGovernanceReport } from '../types/governance';
import type { ShadowPortfolioState, ShadowTradingReport } from '../types/shadowTrading';
import { evaluateMarketRegime } from './marketRegimeEngine';
import { getNormalizedQuote } from './normalizedMarketData';
import { runPortfolioGovernance, runDemoPortfolioGovernance } from './portfolioGovernanceOrchestratorService';
import { loadShadowPortfolio, resetShadowPortfolio, saveShadowPortfolio } from './shadowPortfolioStorage';
import { runAdaptiveExecutionAnalysis } from './adaptiveExecutionOrchestratorService';
import { runShadowTick } from './shadowTradingEngine';
import type { AdaptiveExecutionReport } from '../types/adaptiveExecution';

export async function refreshShadowTradingDashboard(params: {
  apiKey: string;
  regime?: MarketRegimeResult;
  runGovernance?: boolean;
  portfolio?: import('../types').PortfolioPosition[];
  totalPortfolioValueMYR?: number;
  apiLatencyMs?: number;
}): Promise<{
  state: ShadowPortfolioState;
  report: ShadowTradingReport;
  governance: PortfolioGovernanceReport | null;
  adaptive: AdaptiveExecutionReport | null;
}> {
  let state = await loadShadowPortfolio();
  const regime = params.regime ?? evaluateMarketRegime();
  let governance: PortfolioGovernanceReport | null = null;

  if (params.runGovernance && params.portfolio && params.totalPortfolioValueMYR) {
    try {
      governance = await runPortfolioGovernance({
        apiKey: params.apiKey,
        portfolio: params.portfolio,
        totalPortfolioValueMYR: params.totalPortfolioValueMYR,
        regime,
      });
    } catch {
      try {
        governance = await runDemoPortfolioGovernance({ apiKey: params.apiKey, regime });
      } catch {
        governance = null;
      }
    }
  }

  const priceBySymbol = new Map<string, { price: number; updatedAt: string }>();
  const symbols = new Set<string>();
  for (const p of state.positions) {
    symbols.add(`${p.market}:${p.symbol}`);
  }

  const t0 = Date.now();
  for (const key of symbols) {
    const [market, symbol] = key.split(':') as [Market, string];
    const pos = state.positions.find((p) => p.symbol === symbol && p.market === market);
    const currency: Currency = pos?.currency ?? (market === 'us' ? 'USD' : market === 'hk' ? 'HKD' : 'MYR');
    const normalized = await getNormalizedQuote(market, symbol, {
      currency,
      portfolio: params.portfolio,
    });
    if (normalized?.price) {
      priceBySymbol.set(key, { price: normalized.price, updatedAt: normalized.fetchedAt });
    } else if (pos) {
      priceBySymbol.set(key, {
        price: pos.currentPrice || pos.averageBuyPrice,
        updatedAt: pos.currentPriceUpdatedAt ?? new Date().toISOString(),
      });
    }
  }
  const apiLatencyMs = params.apiLatencyMs ?? Date.now() - t0;

  const { state: next, report } = await runShadowTick({
    state,
    priceBySymbol,
    regime,
    governance,
    apiLatencyMs,
    volatilityProxyPct: regime.indicators.volatilityProxyPct,
  });

  let adaptive: AdaptiveExecutionReport | null = null;
  if (params.portfolio && params.totalPortfolioValueMYR) {
    try {
      const { report: adaptiveReport } = await runAdaptiveExecutionAnalysis({
        regime,
        governance,
        portfolio: params.portfolio,
        totalPortfolioValueMYR: params.totalPortfolioValueMYR,
        shadowState: next,
        signalScore: governance?.meta.confidenceBlend.effectiveConfidence,
        apiLatencyMs,
        persistLearning: true,
      });
      adaptive = adaptiveReport;
    } catch {
      adaptive = null;
    }
  }

  return { state: next, report, governance, adaptive };
}

export async function initializeShadowAccount(): Promise<ShadowPortfolioState> {
  return resetShadowPortfolio();
}

export { loadShadowPortfolio, saveShadowPortfolio, resetShadowPortfolio };
