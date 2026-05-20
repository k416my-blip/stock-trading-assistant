import type { Currency, Market, PortfolioPosition } from './index';
import type { PerformancePoint } from './index';
import type { MarketRegimeId } from './marketRegime';

export type ShadowOrderStatus =
  | 'pending'
  | 'partially_filled'
  | 'filled'
  | 'canceled'
  | 'expired'
  | 'rejected';

export type SystemHealthStatus = 'green' | 'yellow' | 'red';

export interface ShadowExecutionConfig {
  slippageBpsBase: number;
  slippageVolMultiplier: number;
  partialFillMinPct: number;
  maxFillDelayMs: number;
  stalePriceMaxAgeMs: number;
  maxOrderPctOfDailyVolume: number;
  overnightGapEnabled: boolean;
}

export interface ShadowPosition extends PortfolioPosition {
  costBasisMYR: number;
}

export interface CashLedgerEntry {
  id: string;
  timestamp: string;
  type: 'deposit' | 'withdraw' | 'buy' | 'sell' | 'fee' | 'slippage' | 'gap_adjustment';
  amountMYR: number;
  balanceAfterMYR: number;
  noteJa: string;
}

export interface ShadowFill {
  id: string;
  orderId: string;
  symbol: string;
  market: Market;
  currency: Currency;
  side: 'buy' | 'sell';
  shares: number;
  fillPrice: number;
  slippageBps: number;
  spreadBps: number;
  expectedPrice: number;
  filledAt: string;
  noteJa: string;
}

export interface BrokerConfirmation {
  id: string;
  orderId: string;
  messageJa: string;
  timestamp: string;
}

export interface ShadowOrder {
  id: string;
  symbol: string;
  market: Market;
  currency: Currency;
  side: 'buy' | 'sell';
  shares: number;
  limitPrice?: number;
  status: ShadowOrderStatus;
  filledShares: number;
  avgFillPrice: number;
  expectedPrice: number;
  createdAt: string;
  updatedAt: string;
  executeAfterMs: number;
  rejectReasonJa?: string;
  confirmations: BrokerConfirmation[];
}

export interface ShadowPortfolioState {
  initialCapitalMYR: number;
  cashBalanceMYR: number;
  positions: ShadowPosition[];
  orders: ShadowOrder[];
  fills: ShadowFill[];
  ledger: CashLedgerEntry[];
  equityCurve: PerformancePoint[];
  config: ShadowExecutionConfig;
  capitalPreservationActive: boolean;
  capitalPreservationSince?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShadowPortfolioSnapshot {
  portfolioValueMYR: number;
  cashBalanceMYR: number;
  holdingsValueMYR: number;
  unrealizedPnLMYR: number;
  realizedPnLMYR: number;
  totalReturnPct: number;
  drawdownPct: number;
}

export interface ExecutionRealismResult {
  slippageBps: number;
  spreadBps: number;
  fillPrice: number;
  fillPct: number;
  delayMs: number;
  gapAdjustmentPct: number;
  stalePriceRejected: boolean;
  liquidityCapped: boolean;
  noteJa: string;
}

export interface MarketMicrostructureSnapshot {
  openingAuctionVolProxy: number;
  intradayLiquidityDecay: number;
  closingImbalanceProxy: number;
  volatilityClusterScore: number;
  abnormalSpreadDetected: boolean;
  volumeShockDetected: boolean;
  noteJa: string;
}

export interface BehavioralSurvivabilityMetrics {
  drawdownPainIndex: number;
  recoveryFatigueScore: number;
  panicLiquidationProbability: number;
  volatilityDiscomfortScore: number;
  allocationShockScore: number;
  userAbandonmentRisk: number;
  noteJa: string;
}

export interface PortfolioPathAnalysis {
  rollingDrawdownDays: number;
  maxUnderwaterDays: number;
  avgRecoveryDays: number;
  worstPathReturnPct: number;
  pathDependencyScore: number;
  underwaterPoints: { date: string; drawdownPct: number }[];
  noteJa: string;
}

export interface ShadowModelDivergence {
  expectedSlippageBps: number;
  realizedSlippageBps: number;
  slippageDriftBps: number;
  expectedFillPrice: number;
  avgRealizedFillPrice: number;
  modelDriftScore: number;
  regimeMisclassificationPct: number;
  noteJa: string;
}

export interface MarketReliabilityReport {
  staleOhlcvCount: number;
  apiLatencyMs: number;
  missingDataSymbols: string[];
  abnormalQuoteJumps: number;
  cacheConsistent: boolean;
  reliabilityScore: number;
  noteJa: string;
}

export interface ExecutionHealthDashboard {
  executionQualityScore: number;
  liquidityRiskScore: number;
  fillReliabilityPct: number;
  marketStressState: SystemHealthStatus;
  shadowPortfolioHealth: SystemHealthStatus;
  noteJa: string;
}

export interface CapitalPreservationStatus {
  active: boolean;
  triggeredAt?: string;
  reasons: string[];
  reasonCodes: string[];
  noteJa: string;
}

export interface ShadowTradingReport {
  generatedAt: string;
  snapshot: ShadowPortfolioSnapshot;
  microstructure: MarketMicrostructureSnapshot;
  behavioral: BehavioralSurvivabilityMetrics;
  pathAnalysis: PortfolioPathAnalysis;
  divergence: ShadowModelDivergence;
  reliability: MarketReliabilityReport;
  executionHealth: ExecutionHealthDashboard;
  capitalPreservation: CapitalPreservationStatus;
  openOrders: ShadowOrder[];
  recentOrders: ShadowOrder[];
  recentFills: ShadowFill[];
  verdictJa: string;
}

export interface SubmitShadowOrderInput {
  symbol: string;
  market: Market;
  currency: Currency;
  side: 'buy' | 'sell';
  shares: number;
  expectedPrice: number;
  priceUpdatedAt?: string;
  volatilityProxyPct?: number;
  dailyVolume?: number;
}
