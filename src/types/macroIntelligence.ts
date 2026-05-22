import type { ConciergeMarketRegimeId, GlobalMarketAnalysisBundle } from './globalMarketAnalysis';
import type { TacticalMode } from './strategyExecution';

export type MacroWorldRegimeId =
  | 'risk_on'
  | 'risk_off'
  | 'panic'
  | 'liquidity_crisis'
  | 'inflation'
  | 'recession'
  | 'recovery'
  | 'euphoric';

export type MacroEngineScore = {
  score: number;
  labelJa: string;
  detailJa: string;
  ruleBasisJa: string;
};

export type CentralBankNote = {
  id: 'fomc' | 'boj' | 'ecb' | 'pboc';
  labelJa: string;
  stanceJa: string;
  nextFocusJa: string;
};

export type SectorRotationItem = {
  sectorId: string;
  labelJa: string;
  flowJa: string;
  momentumScore: number;
};

export type MacroNarrativeItem = {
  id: string;
  labelJa: string;
  active: boolean;
  strength: number;
  noteJa: string;
};

export type MacroHeatmapRegion = {
  regionId: 'us' | 'china' | 'japan' | 'asean' | 'europe';
  labelJa: string;
  stressScore: number;
  changeHintJa: string;
};

export type CorrelationMatrixCell = {
  assetA: string;
  assetB: string;
  hintJa: string;
  strength: 'strong' | 'moderate' | 'weak';
};

export type RegimeTimelinePoint = {
  at: string;
  regimeId: MacroWorldRegimeId;
  macroScore: number;
};

export type MacroReplayItem = {
  labelJa: string;
  regimeId: MacroWorldRegimeId;
  summaryJa: string;
};

export type MacroIntegrationHints = {
  metaWeightMultiplier: number;
  forceEmergencyMode: boolean;
  forceDefensiveStrategy: boolean;
  recommendedTacticalMode: TacticalMode;
  mappedConciergeRegimeId: ConciergeMarketRegimeId;
  opportunityFilterNoteJa: string | null;
  macroSummaryJa: string;
  explainRegimeJa: string;
};

export type MacroIntelligenceBundle = {
  generatedAt: string;
  safetyBannerJa: string;
  insufficientData: boolean;
  worldRegime: { id: MacroWorldRegimeId; labelJa: string; confidencePct: number; summaryJa: string };
  macroScore: number;
  stressScore: number;
  liquidity: MacroEngineScore;
  centralBanks: CentralBankNote[];
  yieldCurve: MacroEngineScore;
  inflation: MacroEngineScore;
  currencyStress: MacroEngineScore;
  commodityRegime: MacroEngineScore;
  volatility: MacroEngineScore;
  creditStress: MacroEngineScore;
  geopolitical: MacroEngineScore;
  sectorRotation: SectorRotationItem[];
  smartMoney: MacroEngineScore;
  retailMania: MacroEngineScore;
  safeHavenFlow: MacroEngineScore;
  correlations: CorrelationMatrixCell[];
  narratives: MacroNarrativeItem[];
  fragility: MacroEngineScore;
  earningsMacro: MacroEngineScore;
  fearGreedScore: number;
  euphoriaAlert: boolean;
  capitulationAlert: boolean;
  reflexivityNoteJa: string;
  narrativeExhaustionJa: string | null;
  attentionThemesJa: string[];
  crowdPositioningJa: string;
  capitalFlowMapJa: string;
  macroRiskRadarJa: string;
  regionalHeatmap: MacroHeatmapRegion[];
  regimeTimeline: RegimeTimelinePoint[];
  macroReplay: MacroReplayItem[];
  integration: MacroIntegrationHints;
};

export type BuildMacroIntelligenceInput = {
  globalMarket: GlobalMarketAnalysisBundle;
};
