import type { HealthLevel } from '../services/dailyHealthCheckService';
import type { PersonalKillSwitches } from '../services/personalKillSwitches';
import type { DiagnosticSeverity } from '../services/structuredDiagnostics';
import type { PortfolioPriceSyncState } from './marketData';
import type { MarketRegimeResult } from './marketRegime';
import type { AppState } from './index';
import type { AiNormalizedHolding, AiNormalizedRecommendation, AiNormalizedWatchItem } from './aiStrategy';

/** AI internal confidence model (0–100). */
export type AiSystemAwareness = {
  systemConfidence: number;
  dataFreshnessConfidence: number;
  executionConfidence: number;
  recoveryConfidence: number;
  compositeConfidence: number;
  degradationReasonsJa: string[];
};

export type CentralIntelligenceOperations = {
  degradedMode: boolean;
  degradedReasonsJa: string[];
  bootMode: 'normal' | 'safe';
  diagnosticsSummary: string | null;
  diagnosticsSeverity: Record<DiagnosticSeverity, number>;
  healthOverall: HealthLevel | null;
  healthSummaryJa: string | null;
  queueStateJa: string;
  rateLimitActive: boolean;
  executionSafetyJa: string;
  reconciliationJa: string;
  recoveryStateJa: string;
  backupIntegrityJa: string;
  killSwitchSummaryJa: string;
  apiHealthSummaryJa: string;
};

export type CentralIntelligencePortfolioRisk = {
  holdingCount: number;
  staleHoldingsCount: number;
  staleFractionPercent: number;
  watchlistCount: number;
  exposureLabelJa: string;
  maxQuoteAgeMinutes: number | null;
};

export type CentralIntelligenceRecommendationView = {
  ticker: string;
  action: string;
  urgency: string;
  baseConfidence: number;
  adjustedConfidence: number;
  rationale: string;
  confidenceNoteJa: string;
};

/** Aggregated world model — AI “system consciousness”. */
export type CentralIntelligenceWorldModel = {
  generatedAt: string;
  appMode: string;
  marketRegimeLabel: string;
  riskMode: string;
  systemAwareness: AiSystemAwareness;
  operations: CentralIntelligenceOperations;
  portfolioRisk: CentralIntelligencePortfolioRisk;
  holdings: AiNormalizedHolding[];
  watchlist: AiNormalizedWatchItem[];
  recommendations: CentralIntelligenceRecommendationView[];
  journalSummary: {
    totalEntries: number;
    uncertainCount: number;
    inFlightCount: number;
    reconciliationMismatchCount: number;
    recentSymbols: string[];
  };
};

export type BuildCentralIntelligenceInput = {
  state: AppState;
  appMode: string;
  marketRegime?: MarketRegimeResult;
  healthReport?: import('../services/dailyHealthCheckService').HealthCheckReport | null;
  degradedMode: boolean;
  bootMode: 'normal' | 'safe';
  securityWarnings: string[];
  recoveryRecommendations: string[];
  killSwitches: PersonalKillSwitches;
  priceSync: PortfolioPriceSyncState;
  diagnosticsSummary: string | null;
  diagnosticsSeverity: Record<DiagnosticSeverity, number>;
  apiHealthSummaryJa?: string;
  apiHealthDegraded?: boolean;
};
