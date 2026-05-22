import type { Market } from './index';
import type { PortfolioRiskExposureBundle } from './portfolioRiskExposure';
import type { StrategyExecutionBundle, StrategySymbolRecommendation } from './strategyExecution';
import type { ExecutionDashboardBundle } from './paperBroker';
import type { MacroIntelligenceBundle } from './macroIntelligence';
import type { TacticalMode } from './strategyExecution';

export type PortfolioMode = 'dividend' | 'growth' | 'defensive' | 'balanced';

export type SizingTier = 'conservative' | 'standard' | 'aggressive';

export type ConvictionLevel = 'high' | 'medium' | 'low';

export type LotRule = {
  market: Market;
  labelJa: string;
  lotSize: number;
  minLot: number;
  fractionalAllowed: boolean;
};

export type BuyingPowerBreakdown = {
  availableCashMYR: number;
  reservedCashMYR: number;
  unsettledCashMYR: number;
  emergencyReserveMYR: number;
  fxBufferMYR: number;
  feeBufferMYR: number;
  usableCashMYR: number;
  minCashReservePct: number;
  noteJa: string;
};

export type TierShareCount = {
  tier: SizingTier;
  shares: number;
  notionalMYR: number;
  valid: boolean;
  lotNoteJa: string;
};

export type SuggestedOrder = {
  symbol: string;
  market: Market;
  displayLabelJa: string;
  action: 'buy';
  confidencePct: number;
  conviction: ConvictionLevel;
  tiers: TierShareCount[];
  recommendedTier: SizingTier;
  recommendedShares: number;
  estimatedTotalMYR: number;
  cashAfterMYR: number;
  reasonJa: string;
  paperDraftNoteJa: string;
};

export type PaperOrderDraft = {
  symbol: string;
  market: Market;
  quantity: number;
  referencePrice: number;
  estimatedNotionalMYR: number;
  watchOnly: true;
  simulationNoteJa: string;
};

export type CapitalAllocationBundle = {
  generatedAt: string;
  safetyBannerJa: string;
  humanConfirmationJa: string;
  realTradingEnabled: false;
  portfolioMode: PortfolioMode;
  beginnerMode: boolean;
  safeModeActive: boolean;
  emergencyGuardActive: boolean;
  emergencyGuardNoteJa: string | null;
  buyingPower: BuyingPowerBreakdown;
  capitalEfficiencyScore: number;
  capitalEfficiencyLabelJa: string;
  overAllocationBlocked: boolean;
  overAllocationNoteJa: string | null;
  maxPositionCapPct: number;
  dynamicBudgetSplitJa: string;
  aiRecommendationLineJa: string;
  aiSizingSummaryJa: string;
  suggestedOrders: SuggestedOrder[];
  totalProposedMYR: number;
  remainingCashMYR: number;
  proposedCashRatioPct: number;
  paperOrderDrafts: PaperOrderDraft[];
  executionCapitalSummary: {
    availableBuyingPowerMYR: number;
    reservedCashMYR: number;
    usableCashMYR: number;
    proposedAllocationMYR: number;
    remainingCashMYR: number;
  };
  explainRuleBasisJa: string;
};

export type BuildCapitalAllocationInput = {
  regimeId: string | null;
  tacticalMode: TacticalMode;
  portfolioMode?: PortfolioMode;
  beginnerMode?: boolean;
  availableCashMYR: number;
  totalEquityMYR: number;
  priceBySymbol: Record<string, number>;
  strategyBundle: StrategyExecutionBundle | null;
  executionBundle: ExecutionDashboardBundle | null;
  portfolioRiskBundle: PortfolioRiskExposureBundle | null;
  macroBundle: MacroIntelligenceBundle | null;
  drawdownPct?: number;
};

export type CapitalAllocationPersisted = {
  version: 1;
  portfolioMode: PortfolioMode;
  beginnerMode: boolean;
  preferredSizingTier: SizingTier;
};
