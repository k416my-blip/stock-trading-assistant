import type { Market } from './index';
import type { MacroIntelligenceBundle } from './macroIntelligence';
import type { DataReliabilityBundle } from './dataReliability';
import type { SelfEvaluationBundle } from './selfEvaluation';
import type { RealityValidationBundle } from './portfolioRealityValidation';
import type { ExecutionDashboardBundle } from './paperBroker';
import type { MacroWorldRegimeId } from './macroIntelligence';

export type HiddenExposureThemeId =
  | 'ai'
  | 'semiconductor'
  | 'nasdaq'
  | 'rates'
  | 'china'
  | 'usd'
  | 'energy'
  | 'financials';

export type FactorId =
  | 'growth'
  | 'value'
  | 'momentum'
  | 'quality'
  | 'dividend'
  | 'volatility'
  | 'liquidity';

export type CountryExposureId = 'us' | 'japan' | 'malaysia' | 'china' | 'other';

export type CurrencyExposureId = 'USD' | 'JPY' | 'MYR' | 'HKD' | 'mixed';

export type StressScenarioId =
  | 'vix_spike'
  | 'rate_shock'
  | 'oil_shock'
  | 'ai_bubble_collapse'
  | 'china_slowdown'
  | 'usd_spike'
  | 'panic'
  | 'liquidity_crisis'
  | 'recession';

export type TailScenarioId = 'panic' | 'liquidity_crisis' | 'recession';

export type HeatmapCell = {
  labelJa: string;
  weightPct: number;
  riskIntensity: number;
  severity: 'ok' | 'watch' | 'high' | 'critical';
};

export type CorrelationCell = {
  symbolA: string;
  symbolB: string;
  correlation: number;
  labelJa: string;
};

export type HiddenExposureItem = {
  themeId: HiddenExposureThemeId;
  labelJa: string;
  effectiveWeightPct: number;
  symbols: string[];
  detailJa: string;
};

export type FactorExposureItem = {
  factor: FactorId;
  labelJa: string;
  exposurePct: number;
  tiltJa: string;
};

export type StressTestResult = {
  id: StressScenarioId;
  labelJa: string;
  portfolioImpactPct: number;
  estimatedLossMYR: number;
  ruleBasisJa: string;
};

export type ContagionLink = {
  fromSymbol: string;
  toSymbol: string;
  impactPct: number;
  noteJa: string;
};

export type DependencyNode = {
  symbol: string;
  dependsOn: string[];
  weightPct: number;
};

export type RiskBudgetSlice = {
  bucketJa: string;
  allocatedPct: number;
  usedPct: number;
  headroomPct: number;
};

export type WeakThesisItem = {
  symbol: string;
  reasonJa: string;
  dataQualityScore: number | null;
};

export type DrawdownAttribution = {
  symbol: string;
  contributionPct: number;
  noteJa: string;
};

export type PortfolioReplayPoint = {
  at: string;
  cashRatioPct: number;
  qualityScore: number;
  regimeId: string | null;
};

export type HumanRiskOverride = {
  maxExposurePct: number | null;
  sectorCapPct: number | null;
  leverageCap: number | null;
};

export type IntegrationSnapshot = {
  macroRegime: MacroWorldRegimeId | null;
  macroStressScore: number | null;
  selfTrustScore: number | null;
  dataReliabilityScore: number | null;
  paperDrawdownPct: number | null;
  realityTrustScore: number | null;
};

export type PortfolioRiskExposureBundle = {
  generatedAt: string;
  safetyBannerJa: string;
  portfolioQualityScore: number;
  qualityLabelJa: string;
  riskEscalationActive: boolean;
  riskEscalationBannerJa: string | null;
  defensiveModeActive: boolean;
  dynamicMaxPositionCapPct: number;
  recommendedCashRatioPct: number;
  cashReserveNoteJa: string;
  volatilityTargetingNoteJa: string;
  convictionWeightingNoteJa: string;
  betaExposure: number;
  betaWarningJa: string | null;
  sectorConcentrationPct: number;
  sectorGuardJa: string;
  correlationMatrix: CorrelationCell[];
  correlationClusters: Array<{ clusterId: string; symbols: string[] }>;
  hiddenExposures: HiddenExposureItem[];
  factorExposures: FactorExposureItem[];
  countryExposures: Array<{ country: CountryExposureId; labelJa: string; weightPct: number }>;
  currencyExposures: Array<{ currency: CurrencyExposureId; labelJa: string; weightPct: number }>;
  liquidityExposureJa: string;
  tailRisk: Array<{ id: TailScenarioId; labelJa: string; lossMYR: number; lossPct: number }>;
  stressTests: StressTestResult[];
  heatmap: HeatmapCell[];
  contagionMap: ContagionLink[];
  dependencyGraph: DependencyNode[];
  riskBudget: RiskBudgetSlice[];
  weakTheses: WeakThesisItem[];
  drawdownAttribution: DrawdownAttribution[];
  opportunityCostNoteJa: string;
  driftNoteJa: string;
  regimeAllocationJa: string;
  aiPortfolioSummaryJa: string;
  humanOverride: HumanRiskOverride;
  integration: IntegrationSnapshot;
  portfolioReplay: PortfolioReplayPoint[];
  explainRuleBasisJa: string;
};

export type BuildPortfolioRiskExposureInput = {
  holdings: import('./index').PortfolioPosition[];
  totalValueMYR: number;
  cashMYR?: number;
  priceBySymbol: Record<string, number>;
  evidenceThinSymbols?: string[];
  symbolDataQuality?: Record<string, number>;
  macroBundle: MacroIntelligenceBundle | null;
  selfEvalBundle: SelfEvaluationBundle | null;
  dataReliabilityBundle: DataReliabilityBundle | null;
  realityBundle: RealityValidationBundle | null;
  executionBundle: ExecutionDashboardBundle | null;
  portfolioIntelConcentration?: number;
  marketRegimeLabel?: string;
  strategyTacticalMode?: string;
};
