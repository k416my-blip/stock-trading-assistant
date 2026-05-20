import type { Currency, Market, PortfolioPosition } from './index';
import type { MarketRegimeId, MarketRegimeResult } from './marketRegime';
import type { PortfolioGovernanceReport } from './governance';
import type { PositionSizingResult } from './index';
import type { CrossAssetPortfolioGuidance } from './crossAssetFlow';
import type { MarketIntelligenceReport } from './marketIntelligence';
import type { ShadowFill, ShadowPortfolioState } from './shadowTrading';

export type ExecutionTimingGrade = 'immediate' | 'patient' | 'defer';

export interface AdaptiveLearningState {
  version: 1;
  updatedAt: string;
  lastRegimeId?: MarketRegimeId;
  ewmaSlippageBps: number;
  ewmaFillRate: number;
  ewmaImplementationShortfallBps: number;
  ewmaSignalHitRate: number;
  fillSampleCount: number;
  shadowReturnEwmaPct: number;
  regimeTransitionMatrix: Partial<Record<MarketRegimeId, Partial<Record<MarketRegimeId, number>>>>;
  reinforcementWeights: {
    timing: number;
    sliceAggression: number;
    volTarget: number;
  };
}

export interface PositionSizingIntelligence {
  baseAllocationPct: number;
  regimeMultiplier: number;
  volTargetScale: number;
  signalQualityMultiplier: number;
  macroOverlayMultiplier: number;
  riskBudgetCapPct: number;
  suggestedAllocationPct: number;
  suggestedShares: number;
  kellyFractionCapped: number;
  noteJa: string;
}

export interface DynamicRiskBudget {
  totalRiskBudgetMYR: number;
  deployedRiskMYR: number;
  availableRiskMYR: number;
  perSymbolBudgetMYR: Record<string, number>;
  utilizationPct: number;
  noteJa: string;
}

export interface VolatilityTargeting {
  targetVolPct: number;
  realizedVolPct: number;
  scalingFactor: number;
  grossExposureCapPct: number;
  noteJa: string;
}

export interface MacroOverlayAdjustment {
  guidance: CrossAssetPortfolioGuidance | null;
  exposureMultiplier: number;
  betaTarget: number;
  liquidityRegimeJa: string;
  noteJa: string;
}

export interface RegimePrediction {
  currentRegimeId: MarketRegimeId;
  predictedNextRegimeId: MarketRegimeId;
  transitionProbabilityPct: number;
  horizonDays: number;
  regimeScores: { regimeId: MarketRegimeId; probabilityPct: number }[];
  noteJa: string;
}

export interface OnlineLearningAdaptation {
  priorSlippageBps: number;
  updatedSlippageBps: number;
  priorFillRate: number;
  updatedFillRate: number;
  learningRate: number;
  samplesUsed: number;
  adaptationNoteJa: string;
}

export interface ExecutionTimingPlan {
  grade: ExecutionTimingGrade;
  timingScore: number;
  optimalDelayMs: number;
  spreadWindowJa: string;
  rationaleJa: string;
}

export interface LiquiditySlicePlan {
  totalShares: number;
  sliceCount: number;
  sharesPerSlice: number[];
  participationPctOfAdv: number;
  intervalMs: number;
  noteJa: string;
}

export interface LatencySlippagePlan {
  expectedSlippageBps: number;
  expectedDelayMs: number;
  spreadBps: number;
  minimizeAggression: boolean;
  noteJa: string;
}

export interface ReinforcementFeedback {
  rewardScore: number;
  timingWeightDelta: number;
  sliceWeightDelta: number;
  volTargetWeightDelta: number;
  noteJa: string;
}

export interface AlphaDecayMetrics {
  halfLifeDays: number;
  decayPct: number;
  currentEdgeBps: number;
  stale: boolean;
  noteJa: string;
}

export interface SignalQualityScore {
  score: number;
  components: {
    id: string;
    labelJa: string;
    weight: number;
    value: number;
  }[];
  tradeAllowed: boolean;
  noteJa: string;
}

export interface AdaptiveOrderPlan {
  symbol: string;
  market: Market;
  currency: Currency;
  side: 'buy' | 'sell';
  totalShares: number;
  sizing: PositionSizingIntelligence;
  timing: ExecutionTimingPlan;
  slices: LiquiditySlicePlan;
  latency: LatencySlippagePlan;
  signalQuality: SignalQualityScore;
}

export interface AdaptiveExecutionReport {
  generatedAt: string;
  positionSizing: PositionSizingIntelligence;
  riskBudget: DynamicRiskBudget;
  volTargeting: VolatilityTargeting;
  macroOverlay: MacroOverlayAdjustment;
  regimePrediction: RegimePrediction;
  onlineLearning: OnlineLearningAdaptation;
  timing: ExecutionTimingPlan;
  defaultSlicePlan: LiquiditySlicePlan;
  latencyPlan: LatencySlippagePlan;
  reinforcement: ReinforcementFeedback;
  alphaDecay: AlphaDecayMetrics;
  signalQuality: SignalQualityScore;
  orderPlans: AdaptiveOrderPlan[];
  healthStatus: 'green' | 'yellow' | 'red';
  verdictJa: string;
}

export interface AdaptiveExecutionInput {
  regime: MarketRegimeResult;
  governance?: PortfolioGovernanceReport | null;
  shadowState?: ShadowPortfolioState | null;
  learningState: AdaptiveLearningState;
  portfolio: PortfolioPosition[];
  totalPortfolioValueMYR: number;
  portfolioDrawdownPct?: number;
  baseSizing?: PositionSizingResult | null;
  symbol?: string;
  market?: Market;
  currency?: Currency;
  intendedShares?: number;
  priceMYR?: number;
  dailyVolume?: number;
  volatilityProxyPct?: number;
  signalScore?: number;
  apiLatencyMs?: number;
  marketIntelligence?: MarketIntelligenceReport | null;
}

export interface AdaptiveExecutionHints {
  sliceCount: number;
  sliceIndex: number;
  timingScore: number;
  liquidityScore: number;
  targetParticipationPct: number;
  optimalDelayMs: number;
}
