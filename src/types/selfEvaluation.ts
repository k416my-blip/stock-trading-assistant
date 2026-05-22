import type { ConciergeMarketRegimeId } from './globalMarketAnalysis';
import type { TrackedAiRecommendation } from './portfolioRealityValidation';
import type { RealityValidationBundle } from './portfolioRealityValidation';
import type { StrategyExecutionBundle } from './strategyExecution';

export type BiasKind =
  | 'bullish'
  | 'panic'
  | 'revenge'
  | 'overtrading';

export type WeaknessKind = 'panic' | 'sideways' | 'low_liquidity' | 'earnings';

export type ReputationDomainId = 'macro' | 'sentiment' | 'earnings' | 'technical';

export type NarrativeThemeId = 'ai' | 'rates' | 'energy' | 'china' | 'recession';

export type MarketPersonalityId = 'fear' | 'greed' | 'euphoric' | 'exhausted';

export type AccuracyTrackerSummary = {
  evaluatedCount: number;
  overallWinRatePct: number | null;
  recentWinRatePct: number | null;
  avgConfidencePct: number | null;
  avgReturnPct: number | null;
  regimeWinRates: Array<{ regimeId: string; winRatePct: number | null; count: number }>;
};

export type ConfidenceCalibrationSummary = {
  penaltyPct: number;
  highConfidenceMissStreak: number;
  overconfidentCount: number;
  calibrationNoteJa: string;
};

export type BiasDetectionItem = {
  kind: BiasKind;
  severity: 'low' | 'medium' | 'high';
  labelJa: string;
  detailJa: string;
};

export type HallucinationSummary = {
  riskScore: number;
  thinReasonCount: number;
  missingEvidenceCount: number;
  noteJa: string;
};

export type WeaknessItem = {
  kind: WeaknessKind;
  labelJa: string;
  winRatePct: number | null;
  sampleCount: number;
  detailJa: string;
};

export type RegimeWeightAdjustment = {
  regimeId: ConciergeMarketRegimeId | 'unknown';
  weightMultiplier: number;
  noteJa: string;
};

export type StrategyFitnessItem = {
  strategyLabelJa: string;
  fitnessScore: number;
  effectiveInRegime: boolean;
  noteJa: string;
};

export type ContradictionRecord = {
  id: string;
  at: string;
  symbol: string | null;
  priorActionJa: string;
  currentActionJa: string;
  detailJa: string;
};

export type NarrativeDriftItem = {
  themeId: NarrativeThemeId;
  labelJa: string;
  active: boolean;
  driftNoteJa: string;
};

export type LearningJournalEntry = {
  id: string;
  at: string;
  headlineJa: string;
  reflectionJa: string;
  lessonJa: string;
};

export type ReputationDomainScore = {
  domain: ReputationDomainId;
  labelJa: string;
  accuracyPct: number | null;
  sampleCount: number;
};

export type ConfidenceHeatmapCell = {
  bucketLabelJa: string;
  predictedAvgPct: number;
  actualWinRatePct: number | null;
  sampleCount: number;
};

export type MistakeReplayItem = {
  id: string;
  at: string;
  symbol: string;
  action: string;
  confidencePct: number;
  returnPct: number | null;
  whyWrongJa: string;
};

export type AlternativeScenario = {
  labelJa: string;
  narrativeJa: string;
  probabilityHintJa: string;
};

export type SelfEvaluationBundle = {
  generatedAt: string;
  safetyBannerJa: string;
  localOnlyNoteJa: string;
  accuracy: AccuracyTrackerSummary;
  calibration: ConfidenceCalibrationSummary;
  biases: BiasDetectionItem[];
  recommendationQualityScore: number;
  hallucination: HallucinationSummary;
  weaknesses: WeaknessItem[];
  regimeAdaptation: RegimeWeightAdjustment[];
  strategyFitness: StrategyFitnessItem[];
  dynamicAlertThresholdPct: number;
  adaptiveConfidencePct: number;
  humilityMode: boolean;
  humilityMessageJa: string | null;
  contradictions: ContradictionRecord[];
  narrativeDrift: NarrativeDriftItem[];
  notificationBudgetNoteJa: string;
  fatigueSuppressionActive: boolean;
  learningJournal: LearningJournalEntry[];
  marketPersonality: { id: MarketPersonalityId; labelJa: string; summaryJa: string };
  trustScore: number;
  postAnalysisReflectionJa: string | null;
  whatChangedJa: string;
  alternativeScenarios: AlternativeScenario[];
  riskNarrativeJa: string;
  uncertaintyNoteJa: string;
  reputationByDomain: ReputationDomainScore[];
  confidenceHeatmap: ConfidenceHeatmapCell[];
  mistakeReplay: MistakeReplayItem[];
  adaptiveStrategyViewJa: string;
  explainThinkingJa: string;
  adaptiveAdjustmentsJa: string[];
};

export type BuildSelfEvaluationInput = {
  regimeId: ConciergeMarketRegimeId | 'unknown';
  marketRiskScore: number;
  fearScore: number;
  momentumScore: number;
  volatilityPctEstimate: number;
  globalFactorsJa: string[];
  macroBulletsJa: string[];
  realityBundle: RealityValidationBundle | null;
  strategyBundle: StrategyExecutionBundle | null;
  executionTrustScore: number | null;
  recommendations: TrackedAiRecommendation[];
};
