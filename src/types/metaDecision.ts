import type { ConciergeMarketRegimeId } from './globalMarketAnalysis';
import type { ProactiveSuggestionCandidate, ProactiveSuggestionPriority } from './proactiveSuggestion';

export type MetaScoreDimensions = {
  importance: number;
  urgency: number;
  confidence: number;
  portfolioImpact: number;
};

export type MetaTimeframeKind = 'intraday' | 'daily' | 'weekly';

export type MetaDecisionKind = 'risk' | 'opportunity' | 'neutral';

export type MetaScoredEvent = {
  id: string;
  candidate: ProactiveSuggestionCandidate;
  dimensions: MetaScoreDimensions;
  compositeScore: number;
  kind: MetaDecisionKind;
  timeframe: MetaTimeframeKind;
  whyImportantJa: string;
  riskRewardJa: string | null;
  decayFactor: number;
  regimeAdjustedScore: number;
  duplicateGroupId: string | null;
  suppressed: boolean;
  suppressReasonJa: string | null;
};

export type MetaContradiction = {
  symbol: string;
  labelJa: string;
  detailJa: string;
};

export type MetaCuratedPriority = {
  rank: number;
  titleJa: string;
  whyImportantJa: string;
  symbol: string | null;
  kind: MetaDecisionKind;
  compositeScore: number;
};

export type MetaExecutiveSummary = {
  marketJa: string;
  maxRiskJa: string;
  maxOpportunityJa: string;
  topSymbolJa: string;
  generatedAt: string;
};

export type MetaDecisionQueueItem = {
  rank: number;
  event: MetaScoredEvent;
};

export type MetaDecisionBundle = {
  generatedAt: string;
  regimeId: ConciergeMarketRegimeId | 'unknown';
  emergencyOverride: boolean;
  attentionBudgetJa: string;
  executiveSummary: MetaExecutiveSummary;
  topPriorities: MetaCuratedPriority[];
  decisionQueue: MetaDecisionQueueItem[];
  opportunities: MetaCuratedPriority[];
  contradictions: MetaContradiction[];
  approvedCandidates: ProactiveSuggestionCandidate[];
  mergedCount: number;
  suppressedCount: number;
};

export type BuildMetaDecisionInput = {
  candidates: ProactiveSuggestionCandidate[];
  regimeId: ConciergeMarketRegimeId | null;
  marketRiskScore: number;
  fearScore: number;
  emergencyMode: boolean;
  symbolWeightPct: Record<string, number>;
  userStyleId: string;
  evidenceBySymbol: Record<
    string,
    {
      intradayChangePct: number | null;
      bearishPct: number | null;
      bullishPct: number | null;
    }
  >;
  nowMs?: number;
};
