import type { ScoreWeights } from '../services/analysis/aiLearning';
import type { AdaptiveLearningState } from './adaptiveExecution';
import type { MarketRegimeId, MarketRegimeResult } from './marketRegime';
import type { AiLearningState } from '../services/analysis/aiLearning';

export type ModelControlMode = 'normal' | 'freeze' | 'quarantine' | 'safe';
export type ModelStabilitySeverity = 'info' | 'watch' | 'high' | 'critical';

export interface ModelStabilityAlert {
  id: string;
  severity: ModelStabilitySeverity;
  titleJa: string;
  detailJa: string;
}

export interface ParameterDriftCheck {
  driftScore: number;
  l1DistanceFromBaseline: number;
  maxComponentDriftPct: number;
  noteJa: string;
}

export interface LearningRateGovernor {
  baseRate: number;
  governedRate: number;
  reductionPct: number;
  noteJa: string;
}

export interface AdaptiveFreezeMode {
  active: boolean;
  reasonJa: string;
  until?: string;
}

export interface OverfittingDiagnostics {
  score: number;
  inSampleWinRatePct: number;
  recentOutSampleWinRatePct: number;
  gapPct: number;
  noteJa: string;
}

export interface RegimeMemoryDecay {
  currentRegimeId: MarketRegimeId;
  memoryStrengthPct: number;
  daysSinceRegimeChange: number;
  decayFactor: number;
  noteJa: string;
}

export interface StabilityScore {
  score: number;
  components: { labelJa: string; value: number }[];
  noteJa: string;
}

export interface EnsembleConsistency {
  score: number;
  weightDispersion: number;
  reinforcementSpread: number;
  noteJa: string;
}

export interface FeedbackLoopDetection {
  detected: boolean;
  autocorrScore: number;
  consecutiveSameSignUpdates: number;
  noteJa: string;
}

export interface SelfConfirmationBias {
  score: number;
  highConfidenceLossCount: number;
  noteJa: string;
}

export interface RollbackSnapshot {
  id: string;
  capturedAt: string;
  weights: ScoreWeights;
  stabilityScore: number;
  labelJa: string;
}

export interface SafeModeReversion {
  active: boolean;
  revertedToBaseline: boolean;
  noteJa: string;
}

export interface ShadowLiveDivergence {
  shadowReturnEwmaPct: number;
  liveReturnEwmaPct: number;
  divergencePct: number;
  alert: boolean;
  noteJa: string;
}

export interface LearningQuarantine {
  active: boolean;
  reasonJa: string;
  mutationsBlocked: boolean;
}

export interface MutationRateCap {
  mutationsLast24h: number;
  capPer24h: number;
  capped: boolean;
  maxDeltaPerUpdate: number;
  noteJa: string;
}

export interface MemoryBalance {
  longMemoryAlpha: number;
  shortMemoryAlpha: number;
  blendRatioLong: number;
  outcomeVolatility: number;
  noteJa: string;
}

export interface ModelStabilityControlState {
  version: 1;
  updatedAt: string;
  controlMode: ModelControlMode;
  freezeUntil?: string;
  quarantineUntil?: string;
  snapshots: RollbackSnapshot[];
  weightHistory: { capturedAt: string; weights: ScoreWeights }[];
  mutationsLast24h: number;
  lastMutationAt?: string;
  lastRegimeId?: MarketRegimeId;
  regimeEnteredAt?: string;
  governedLearningRate: number;
}

export interface ModelStabilityInput {
  aiLearning: AiLearningState;
  adaptiveLearning?: AdaptiveLearningState | null;
  baselineWeights: ScoreWeights;
  regime: MarketRegimeResult;
  controlState?: ModelStabilityControlState;
  liveReturnEwmaPct?: number;
  shadowReturnEwmaPct?: number;
}

export interface ModelStabilityReport {
  generatedAt: string;
  parameterDrift: ParameterDriftCheck;
  learningRateGovernor: LearningRateGovernor;
  adaptiveFreeze: AdaptiveFreezeMode;
  overfitting: OverfittingDiagnostics;
  regimeMemoryDecay: RegimeMemoryDecay;
  stabilityScore: StabilityScore;
  ensembleConsistency: EnsembleConsistency;
  feedbackLoop: FeedbackLoopDetection;
  selfConfirmationBias: SelfConfirmationBias;
  rollbackSnapshots: RollbackSnapshot[];
  safeMode: SafeModeReversion;
  shadowLiveDivergence: ShadowLiveDivergence;
  learningQuarantine: LearningQuarantine;
  mutationRateCap: MutationRateCap;
  memoryBalance: MemoryBalance;
  controlMode: ModelControlMode;
  alerts: ModelStabilityAlert[];
  learningAllowed: boolean;
  healthStatus: 'green' | 'yellow' | 'red';
  verdictJa: string;
}
