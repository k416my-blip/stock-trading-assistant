import { DEFAULT_MAX_SINGLE_WEIGHT_PCT } from '../constants/portfolioOptimization';
import type { Market, PortfolioPosition } from '../types';
import type { MarketRegimeResult } from '../types/marketRegime';
import type { PortfolioConstructionReport } from '../types/portfolioConstruction';
import type { PortfolioGovernanceReport } from '../types/governance';
import { buildPortfolioGovernanceReport } from './portfolioGovernanceEngine';
import { runMetaEnsembleAllocation, runDemoMetaEnsembleAllocation } from './metaAllocationOrchestratorService';
import { liquidityAdjustedMaxAllocationPct } from './portfolioConstructionEngine';
import { toMYR } from './fx';

export async function runPortfolioGovernance(params: {
  apiKey: string;
  portfolio: PortfolioPosition[];
  totalPortfolioValueMYR: number;
  regime: MarketRegimeResult;
  constructionReport?: PortfolioConstructionReport;
  blockedTrades?: string[];
  maxSymbols?: number;
}): Promise<PortfolioGovernanceReport> {
  const holdings = params.portfolio.filter((p) => p.shares > 0);
  if (holdings.length === 0) {
    throw new Error('保有銘柄がありません。ガバナンス実行には1銘柄以上必要です。');
  }

  const meta = await runMetaEnsembleAllocation({
    apiKey: params.apiKey,
    portfolio: params.portfolio,
    totalPortfolioValueMYR: params.totalPortfolioValueMYR,
    regime: params.regime,
    constructionReport: params.constructionReport,
    maxSymbols: params.maxSymbols,
  });

  const symbols = holdings.map((p) => p.symbol);
  const markets = holdings.map((p) => p.market);
  const total = Math.max(params.totalPortfolioValueMYR, 1);
  const currentWeightsPct = new Map<string, number>();
  const maxW: number[] = [];

  for (const p of holdings) {
    const price = p.currentPrice || p.averageBuyPrice;
    currentWeightsPct.set(p.symbol, (toMYR(price * p.shares, p.currency) / total) * 100);
    maxW.push(
      (params.constructionReport != null
        ? (liquidityAdjustedMaxAllocationPct(p.symbol, params.portfolio, total) ??
          DEFAULT_MAX_SINGLE_WEIGHT_PCT)
        : DEFAULT_MAX_SINGLE_WEIGHT_PCT) / 100,
    );
  }

  return buildPortfolioGovernanceReport({
    meta,
    regime: params.regime,
    symbols,
    markets,
    maxW,
    currentWeightsPct,
    totalPortfolioValueMYR: total,
    constructionReport: params.constructionReport,
    blockedTrades: params.blockedTrades,
  });
}

export async function runDemoPortfolioGovernance(params: {
  apiKey: string;
  regime: MarketRegimeResult;
}): Promise<PortfolioGovernanceReport> {
  const meta = await runDemoMetaEnsembleAllocation({
    apiKey: params.apiKey,
    regime: params.regime,
  });

  const demoSymbols = ['AAPL', 'MSFT', 'NVDA', 'VOO', '7203', '9984'];
  const demoMarkets: Market[] = ['us', 'us', 'us', 'us', 'hk', 'hk'];
  const equal = 100 / demoSymbols.length;

  return buildPortfolioGovernanceReport({
    meta,
    regime: params.regime,
    symbols: demoSymbols,
    markets: demoMarkets,
    maxW: demoSymbols.map(() => DEFAULT_MAX_SINGLE_WEIGHT_PCT / 100),
    currentWeightsPct: new Map(demoSymbols.map((s) => [s, equal])),
    totalPortfolioValueMYR: 100_000,
    blockedTrades: [],
  });
}
