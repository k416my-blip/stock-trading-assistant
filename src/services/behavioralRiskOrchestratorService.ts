import type { PracticeStats, TradeRecord } from '../types';
import type { InstitutionalRiskInput } from '../types/institutionalRisk';
import type { BehavioralRiskInput, BehavioralRiskReport } from '../types/behavioralRisk';
import {
  activateLossStreakCooling,
  loadOperatorBehaviorState,
  peekOperatorBehaviorState,
} from './behavioralRiskStorage';
import {
  buildBehavioralRiskReport,
  shouldActivateCooling,
} from './behavioralRiskEngine';

export function runBehavioralRiskAnalysis(params: {
  trades: TradeRecord[];
  riskPerTradePct: number;
  totalCapitalMYR: number;
  portfolioValueMYR: number;
  winCount?: number;
  lossCount?: number;
  suggestedAllocationPct?: number;
  modelWeightPct?: number;
  lastTradeIntent?: BehavioralRiskInput['lastTradeIntent'];
  useCachedState?: boolean;
}): BehavioralRiskReport {
  const operatorState = params.useCachedState !== false ? peekOperatorBehaviorState() : undefined;
  return buildBehavioralRiskReport({
    trades: params.trades,
    riskPerTradePct: params.riskPerTradePct,
    totalCapitalMYR: params.totalCapitalMYR,
    portfolioValueMYR: params.portfolioValueMYR,
    winCount: params.winCount,
    lossCount: params.lossCount,
    operatorState,
    suggestedAllocationPct: params.suggestedAllocationPct,
    modelWeightPct: params.modelWeightPct,
    lastTradeIntent: params.lastTradeIntent,
  });
}

/** 永続状態を読み込み、必要ならクーリングを開始してからレポート生成 */
export async function refreshBehavioralRiskAnalysis(params: {
  trades: TradeRecord[];
  riskPerTradePct: number;
  totalCapitalMYR: number;
  portfolioValueMYR: number;
  practiceStats?: PracticeStats;
  suggestedAllocationPct?: number;
  modelWeightPct?: number;
  lastTradeIntent?: BehavioralRiskInput['lastTradeIntent'];
}): Promise<BehavioralRiskReport> {
  let state = await loadOperatorBehaviorState();
  const coolingUntil = shouldActivateCooling(state);
  if (coolingUntil) {
    await activateLossStreakCooling(coolingUntil);
    state = await loadOperatorBehaviorState();
  }
  return buildBehavioralRiskReport({
    trades: params.trades,
    riskPerTradePct: params.riskPerTradePct,
    totalCapitalMYR: params.totalCapitalMYR,
    portfolioValueMYR: params.portfolioValueMYR,
    winCount: params.practiceStats?.winCount,
    lossCount: params.practiceStats?.lossCount,
    operatorState: state,
    suggestedAllocationPct: params.suggestedAllocationPct,
    modelWeightPct: params.modelWeightPct,
    lastTradeIntent: params.lastTradeIntent,
  });
}

export function enrichInstitutionalRiskWithBehavioral(
  input: InstitutionalRiskInput,
  options?: {
    winCount?: number;
    lossCount?: number;
    lastTradeIntent?: BehavioralRiskInput['lastTradeIntent'];
  },
): InstitutionalRiskInput {
  const behavioralRisk = runBehavioralRiskAnalysis({
    trades: input.trades,
    riskPerTradePct: input.riskPerTradePct,
    totalCapitalMYR: input.totalCapitalMYR,
    portfolioValueMYR: input.totalPortfolioValueMYR,
    winCount: options?.winCount,
    lossCount: options?.lossCount,
    suggestedAllocationPct: input.riskPerTradePct * 3,
    lastTradeIntent: options?.lastTradeIntent,
  });
  return { ...input, behavioralRisk };
}

export function runDemoBehavioralRisk(): BehavioralRiskReport {
  const now = Date.now();
  const trades: TradeRecord[] = [
    {
      id: 'd1',
      symbol: '1155',
      market: 'bursa',
      currency: 'MYR',
      side: 'sell',
      shares: 100,
      price: 9.2,
      brokerageFee: 8,
      executedAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      realizedPnLMYR: -420,
    },
    {
      id: 'd2',
      symbol: '1155',
      market: 'bursa',
      currency: 'MYR',
      side: 'buy',
      shares: 200,
      price: 9.5,
      brokerageFee: 10,
      executedAt: new Date(now - 1 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'd3',
      symbol: '4707',
      market: 'bursa',
      currency: 'MYR',
      side: 'buy',
      shares: 150,
      price: 14.1,
      brokerageFee: 10,
      executedAt: new Date(now - 45 * 60 * 1000).toISOString(),
    },
  ];
  return runBehavioralRiskAnalysis({
    trades,
    riskPerTradePct: 1.5,
    totalCapitalMYR: 100_000,
    portfolioValueMYR: 95_000,
    winCount: 4,
    lossCount: 6,
    suggestedAllocationPct: 4.5,
    modelWeightPct: 3,
    useCachedState: false,
  });
}
