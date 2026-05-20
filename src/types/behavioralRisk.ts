import type { TradeRecord } from './index';

export type BehavioralSeverity = 'info' | 'watch' | 'high' | 'critical';
export type CoolingStatus = 'inactive' | 'active';

export interface BehavioralAlert {
  id: string;
  severity: BehavioralSeverity;
  titleJa: string;
  detailJa: string;
}

export interface RevengeTradeCheck {
  detected: boolean;
  hoursSinceLoss: number;
  sizeVsAvgPct: number;
  noteJa: string;
}

export interface OvertradingCheck {
  tradesLast24h: number;
  tradesLast7d: number;
  dailyLimit: number;
  alert: boolean;
  noteJa: string;
}

export interface ConfidenceDrift {
  driftScore: number;
  sizingTrend: 'stable' | 'increasing' | 'decreasing';
  postWinSizeBoostPct: number;
  noteJa: string;
}

export interface PositionSizeDiscipline {
  compliant: boolean;
  lastOversizePct: number;
  suggestedMaxPct: number;
  noteJa: string;
}

export interface LossStreakCooling {
  status: CoolingStatus;
  consecutiveLosses: number;
  coolingUntil?: string;
  minutesRemaining: number;
  noteJa: string;
}

export interface FomoSpikeCheck {
  detected: boolean;
  rapidBuysSameSymbol: number;
  windowHours: number;
  noteJa: string;
}

export interface ManualOverrideEntry {
  id: string;
  timestamp: string;
  ruleId: string;
  labelJa: string;
  symbol?: string;
  noteJa?: string;
}

export interface OperatorStressScore {
  score: number;
  components: { labelJa: string; value: number }[];
  noteJa: string;
}

export interface TradeFrequencyAnomaly {
  todayCount: number;
  baselineDaily: number;
  zScore: number;
  anomaly: boolean;
  noteJa: string;
}

export interface RiskToleranceDeviation {
  configuredRiskPct: number;
  realizedRiskPct: number;
  deviationPct: number;
  noteJa: string;
}

export interface RuleBreak {
  ruleId: string;
  labelJa: string;
  count: number;
}

export interface EmotionalVolatilityProxy {
  score: number;
  pnlSwingPct: number;
  intervalStdHours: number;
  noteJa: string;
}

export interface SessionFatigue {
  sessionHours: number;
  tradesThisSession: number;
  fatigueScore: number;
  elevated: boolean;
  noteJa: string;
}

export interface DecisionQualityScore {
  score: number;
  winRateRecentPct: number;
  disciplinePct: number;
  noteJa: string;
}

export interface ModelDivergence {
  divergenceScore: number;
  humanAggressionPct: number;
  modelSuggestedPct: number;
  noteJa: string;
}

export interface BehavioralRiskReport {
  generatedAt: string;
  revengeTrade: RevengeTradeCheck;
  overtrading: OvertradingCheck;
  confidenceDrift: ConfidenceDrift;
  positionDiscipline: PositionSizeDiscipline;
  lossStreakCooling: LossStreakCooling;
  fomoSpike: FomoSpikeCheck;
  manualOverrides: ManualOverrideEntry[];
  operatorStress: OperatorStressScore;
  tradeFrequency: TradeFrequencyAnomaly;
  riskTolerance: RiskToleranceDeviation;
  ruleBreaks: RuleBreak[];
  emotionalVolatility: EmotionalVolatilityProxy;
  sessionFatigue: SessionFatigue;
  decisionQuality: DecisionQualityScore;
  modelDivergence: ModelDivergence;
  alerts: BehavioralAlert[];
  disciplineScore: number;
  tradingAllowed: boolean;
  healthStatus: 'green' | 'yellow' | 'red';
  verdictJa: string;
}

export interface OperatorBehaviorState {
  version: 1;
  updatedAt: string;
  consecutiveLosses: number;
  coolingUntil?: string;
  sessionStartedAt: string;
  manualOverrides: ManualOverrideEntry[];
}

export interface BehavioralRiskInput {
  trades: TradeRecord[];
  riskPerTradePct: number;
  totalCapitalMYR: number;
  portfolioValueMYR: number;
  winCount?: number;
  lossCount?: number;
  operatorState?: OperatorBehaviorState;
  suggestedAllocationPct?: number;
  modelWeightPct?: number;
  lastTradeIntent?: {
    symbol: string;
    side: 'buy' | 'sell';
    shares: number;
    priceMYR: number;
  };
}
