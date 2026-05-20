import type { Market } from './index';
import type { MarketRegimeId } from './marketRegime';
import type { EnsembleAllocatorId } from './metaAllocation';
import type { QuantDataSource } from './quantValidation';
import type { MetaAllocationReport } from './metaAllocation';

export type SystemHealthStatus = 'green' | 'yellow' | 'red';

export type GovernanceReasonCode =
  | 'META_ROBUST_OK'
  | 'META_ROBUST_LOW'
  | 'DISAGREEMENT_HIGH'
  | 'FAILSAFE_TRIGGERED'
  | 'REGIME_UNCERTAIN'
  | 'LIQUIDITY_RISK'
  | 'TURNOVER_LIMIT'
  | 'HYSTERESIS_HOLD'
  | 'HYSTERESIS_SWITCH'
  | 'DO_NOT_TRADE'
  | 'ALLOCATOR_SUPPRESSED'
  | 'CONFIDENCE_LOW';

export interface WeightContributionFactor {
  factorId:
    | 'black_litterman'
    | 'risk_parity'
    | 'cvar'
    | 'min_variance'
    | 'stability_penalty'
    | 'liquidity_cap'
    | 'regime_adjustment'
    | 'turnover_constraint'
    | 'fail_safe_adjustment';
  labelJa: string;
  contributionPct: number;
}

export interface SymbolWeightExplanation {
  symbol: string;
  finalWeightPct: number;
  summaryJa: string;
  factors: WeightContributionFactor[];
}

export interface AllocationExplanation {
  headlineJa: string;
  whyJa: string;
  perSymbol: SymbolWeightExplanation[];
}

export interface ProbabilisticRegimeMixture {
  riskOnPct: number;
  riskOffPct: number;
  highVolPct: number;
  inflationPct: number;
  crisisPct: number;
  transitionPct: number;
  noteJa: string;
}

export interface AllocatorHysteresisResult {
  rawRecommended: EnsembleAllocatorId;
  governedActive: EnsembleAllocatorId;
  previousActive: EnsembleAllocatorId | null;
  switched: boolean;
  switchAllowed: boolean;
  holdingDaysRemaining: number;
  challengerStreak: number;
  smoothedScores: { allocatorId: EnsembleAllocatorId; score: number }[];
  noteJa: string;
}

export interface ModelGovernanceDashboard {
  activeModel: EnsembleAllocatorId;
  activeModelLabelJa: string;
  previousModel: EnsembleAllocatorId | null;
  switchReasonJa: string;
  disagreementScore: number;
  entropyScore: number;
  confidenceScore: number;
  failSafeActive: boolean;
  metaRobustnessScore: number;
}

export interface DoNotTradeWarning {
  active: boolean;
  severity: 'high' | 'critical';
  reasons: string[];
  reasonCodes: GovernanceReasonCode[];
}

export interface GovernanceAuditEntry {
  id: string;
  timestamp: string;
  dataSource: QuantDataSource;
  symbols: string[];
  regimeId: MarketRegimeId;
  inputsSummary: {
    tradingDays: number;
    regimeConfidence: number;
    volatilityProxyPct: number;
    portfolioValueMYR: number;
  };
  modelWeights: { allocatorId: EnsembleAllocatorId; weightPct: number }[];
  finalWeights: { symbol: string; weightPct: number }[];
  blockedTrades: string[];
  warnings: string[];
  reasonCodes: GovernanceReasonCode[];
  healthStatus: SystemHealthStatus;
  activeAllocator: EnsembleAllocatorId;
}

export interface PortfolioGovernanceReport {
  generatedAt: string;
  meta: MetaAllocationReport;
  explanation: AllocationExplanation;
  regimeMixture: ProbabilisticRegimeMixture;
  hysteresis: AllocatorHysteresisResult;
  dashboard: ModelGovernanceDashboard;
  doNotTrade: DoNotTradeWarning;
  healthStatus: SystemHealthStatus;
  healthNoteJa: string;
  auditEntry: GovernanceAuditEntry;
  verdictJa: string;
}

export interface GovernanceRunParams {
  apiKey: string;
  portfolio: import('./index').PortfolioPosition[];
  totalPortfolioValueMYR: number;
  regime: import('./marketRegime').MarketRegimeResult;
  constructionReport?: import('./portfolioConstruction').PortfolioConstructionReport;
  markets?: Market[];
  maxSymbols?: number;
}
