import type { PracticeStats } from '../types';
import type { MarketRegimeResult } from '../types/marketRegime';
import type { InstitutionalRiskInput } from '../types/institutionalRisk';
import type { MetaCapitalInput, MetaCapitalReport, StrategyMetrics } from '../types/metaCapital';
import { loadAdaptiveLearningState } from './adaptiveExecutionStorage';
import { loadShadowPortfolio } from './shadowPortfolioStorage';
import { buildMetaCapitalReport } from './metaCapitalEngine';
import {
  loadMetaCapitalState,
  peekMetaCapitalState,
  persistAllocationSnapshot,
} from './metaCapitalStorage';

function sharpeFromEwma(returnEwmaPct: number, volProxy = 8): number {
  return returnEwmaPct / Math.max(volProxy, 1);
}

export function buildDefaultStrategyMetrics(params: {
  practiceStats?: PracticeStats;
  totalCapitalMYR: number;
  cashBalanceMYR: number;
  shadowReturnEwmaPct?: number;
  adaptiveReturnEwmaPct?: number;
  portfolioDrawdownPct?: number;
}): StrategyMetrics[] {
  const totalReturn = params.practiceStats?.totalReturnPct ?? 0;
  const dd = params.portfolioDrawdownPct ?? 0;
  const shadowRet = params.shadowReturnEwmaPct ?? totalReturn * 0.8;
  const adaptiveRet = params.adaptiveReturnEwmaPct ?? totalReturn * 1.1;

  return [
    {
      strategyId: 'core_equity',
      returnEwmaPct: totalReturn,
      drawdownPct: dd,
      sharpeProxy: sharpeFromEwma(totalReturn),
      turnoverPct30d: 12,
    },
    {
      strategyId: 'adaptive_alpha',
      returnEwmaPct: adaptiveRet,
      drawdownPct: dd * 1.1,
      sharpeProxy: sharpeFromEwma(adaptiveRet),
      turnoverPct30d: 22,
    },
    {
      strategyId: 'shadow_research',
      returnEwmaPct: shadowRet,
      drawdownPct: dd * 0.85,
      sharpeProxy: sharpeFromEwma(shadowRet),
      turnoverPct30d: 18,
    },
    {
      strategyId: 'bayesian_blend',
      returnEwmaPct: totalReturn * 0.95,
      drawdownPct: dd * 0.9,
      sharpeProxy: sharpeFromEwma(totalReturn * 0.95),
      turnoverPct30d: 10,
    },
    {
      strategyId: 'defensive_cash',
      returnEwmaPct: 0.5,
      drawdownPct: 0,
      sharpeProxy: 0.3,
      turnoverPct30d: 2,
    },
  ];
}

export async function refreshMetaCapitalAnalysis(params: {
  totalCapitalMYR: number;
  cashBalanceMYR: number;
  regime: MarketRegimeResult;
  practiceStats?: PracticeStats;
  portfolioDrawdownPct?: number;
  metaRobustnessScore?: number;
  disagreementScore?: number;
}): Promise<MetaCapitalReport> {
  const [controlState, adaptive, shadow] = await Promise.all([
    loadMetaCapitalState(),
    loadAdaptiveLearningState(),
    loadShadowPortfolio().catch(() => null),
  ]);

  let shadowReturnEwmaPct = adaptive.shadowReturnEwmaPct;
  const curve = shadow?.equityCurve;
  if (curve && curve.length >= 2) {
    const a = curve[curve.length - 2].portfolioValueMYR;
    const b = curve[curve.length - 1].portfolioValueMYR;
    if (a > 0) shadowReturnEwmaPct = ((b - a) / a) * 100;
  }

  const strategyMetrics = buildDefaultStrategyMetrics({
    practiceStats: params.practiceStats,
    totalCapitalMYR: params.totalCapitalMYR,
    cashBalanceMYR: params.cashBalanceMYR,
    shadowReturnEwmaPct,
    adaptiveReturnEwmaPct: adaptive.shadowReturnEwmaPct,
    portfolioDrawdownPct: params.portfolioDrawdownPct,
  });

  const report = buildMetaCapitalReport({
    totalCapitalMYR: params.totalCapitalMYR,
    cashBalanceMYR: params.cashBalanceMYR,
    regime: params.regime,
    strategyMetrics,
    controlState,
    metaRobustnessScore: params.metaRobustnessScore,
    disagreementScore: params.disagreementScore,
  });

  if (report.allocationAllowed) {
    await persistAllocationSnapshot({
      slices: report.strategyAllocation,
      stabilityScore: report.diversificationScore,
    });
  }

  return report;
}

export function runMetaCapitalAnalysisSync(params: MetaCapitalInput): MetaCapitalReport {
  return buildMetaCapitalReport({
    ...params,
    controlState: params.controlState ?? peekMetaCapitalState(),
  });
}

export function enrichInstitutionalRiskWithMetaCapital(
  input: InstitutionalRiskInput,
  params: {
    totalCapitalMYR: number;
    cashBalanceMYR: number;
    practiceStats?: PracticeStats;
    portfolioDrawdownPct?: number;
    metaRobustnessScore?: number;
    disagreementScore?: number;
  },
): InstitutionalRiskInput {
  const strategyMetrics = buildDefaultStrategyMetrics({
    practiceStats: params.practiceStats,
    totalCapitalMYR: params.totalCapitalMYR,
    cashBalanceMYR: params.cashBalanceMYR,
    portfolioDrawdownPct: params.portfolioDrawdownPct,
  });
  const report = runMetaCapitalAnalysisSync({
    totalCapitalMYR: params.totalCapitalMYR,
    cashBalanceMYR: params.cashBalanceMYR,
    regime: input.regime,
    strategyMetrics,
    metaRobustnessScore: params.metaRobustnessScore,
    disagreementScore: params.disagreementScore,
  });
  return { ...input, metaCapital: report };
}

export async function runDemoMetaCapital(regime: MarketRegimeResult): Promise<MetaCapitalReport> {
  const metrics: StrategyMetrics[] = [
    { strategyId: 'core_equity', returnEwmaPct: 3.2, drawdownPct: 14, sharpeProxy: 0.42, turnoverPct30d: 15 },
    { strategyId: 'adaptive_alpha', returnEwmaPct: -1.5, drawdownPct: 18, sharpeProxy: 0.22, turnoverPct30d: 28 },
    { strategyId: 'shadow_research', returnEwmaPct: 4.1, drawdownPct: 9, sharpeProxy: 0.55, turnoverPct30d: 20 },
    { strategyId: 'bayesian_blend', returnEwmaPct: 2.8, drawdownPct: 11, sharpeProxy: 0.38, turnoverPct30d: 11 },
    { strategyId: 'defensive_cash', returnEwmaPct: 0.3, drawdownPct: 0, sharpeProxy: 0.25, turnoverPct30d: 3 },
  ];
  return buildMetaCapitalReport({
    totalCapitalMYR: 250_000,
    cashBalanceMYR: 45_000,
    regime,
    strategyMetrics: metrics,
    metaRobustnessScore: 48,
    disagreementScore: 62,
    controlState: peekMetaCapitalState(),
  });
}
