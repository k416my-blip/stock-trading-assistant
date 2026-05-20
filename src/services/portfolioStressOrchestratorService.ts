import type { MarketRegimeResult } from '../types/marketRegime';
import type { PortfolioPosition } from '../types';
import type { PortfolioStressReport } from '../types/portfolioStress';
import { analyzeCrisisCorrelation } from './crisisCorrelationEngine';
import { analyzePortfolioConstruction } from './portfolioConstructionEngine';
import { buildMarketIndicatorsSnapshot } from './marketIndicators';
import { evaluateCrossAssetLiquidityFlow } from './crossAssetLiquidityFlowEngine';
import { buildPortfolioStressReport } from './portfolioStressEngine';
import { computePortfolioDrawdownPct } from './crossAssetLiquidityFlowEngine';
import type { PerformancePoint } from '../types';
import { SAMPLE_STOCKS } from '../data/sampleStocks';
import { evaluateMarketRegime } from './marketRegimeEngine';

export function runPortfolioStressAnalysis(params: {
  portfolio: PortfolioPosition[];
  totalPortfolioValueMYR: number;
  cashBalanceMYR: number;
  regime: MarketRegimeResult;
  portfolioDrawdownPct?: number;
  performanceHistory?: PerformancePoint[];
}): PortfolioStressReport {
  const drawdown =
    params.portfolioDrawdownPct ??
    (params.performanceHistory?.length
      ? computePortfolioDrawdownPct(
          params.performanceHistory,
          params.totalPortfolioValueMYR + params.cashBalanceMYR,
        )
      : 0);

  const construction = analyzePortfolioConstruction({
    portfolio: params.portfolio,
    totalPortfolioValueMYR: params.totalPortfolioValueMYR,
    regime: params.regime,
    portfolioDrawdownPct: drawdown,
  });

  const macro = buildMarketIndicatorsSnapshot();
  const flow = evaluateCrossAssetLiquidityFlow(macro);
  const crisis = analyzeCrisisCorrelation(construction.positions, macro, flow);

  const equityCurve = params.performanceHistory?.map((p) => ({
    date: p.date,
    portfolioValueMYR: p.portfolioValueMYR,
  }));

  return buildPortfolioStressReport({
    positions: construction.positions,
    totalPortfolioValueMYR: params.totalPortfolioValueMYR,
    cashBalanceMYR: params.cashBalanceMYR,
    portfolioDrawdownPct: drawdown,
    regimeId: params.regime.regimeId,
    factorExposures: construction.factorExposures,
    herfindahlIndex: construction.herfindahlIndex,
    crisisCorrelation: crisis,
    equityCurve,
  });
}

export function runDemoPortfolioStress(): PortfolioStressReport {
  const regime = evaluateMarketRegime();
  const portfolio: PortfolioPosition[] = SAMPLE_STOCKS.slice(0, 5).map((s) => ({
    id: s.symbol,
    symbol: s.symbol,
    market: s.market,
    currency: s.currency,
    shares: 100,
    averageBuyPrice: s.price,
    currentPrice: s.price,
    openedAt: new Date().toISOString(),
  }));
  const total = 150_000;
  return runPortfolioStressAnalysis({
    portfolio,
    totalPortfolioValueMYR: total,
    cashBalanceMYR: 20_000,
    regime,
  });
}
