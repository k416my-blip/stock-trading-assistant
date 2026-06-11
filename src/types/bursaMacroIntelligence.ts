/** Phase19 — Macro Intelligence ドメイン型 */

export type MacroSentiment = 'Bullish' | 'Neutral' | 'Bearish';

export type MacroIndicatorId =
  | 'fed_rate'
  | 'my_opr'
  | 'us_cpi'
  | 'my_cpi'
  | 'us10y'
  | 'usd_myr'
  | 'dxy'
  | 'brent_oil'
  | 'gold'
  | 'sp500'
  | 'nasdaq'
  | 'klci';

export type MacroSectorId = 'banking' | 'utilities' | 'consumer' | 'energy' | 'technology';

export type MacroIndicatorRow = {
  id: MacroIndicatorId;
  labelJa: string;
  value: number | null;
  changePct: number | null;
  unitJa: string;
  sentiment: MacroSentiment;
  fromLive: boolean;
  rationaleJa: string;
};

export type MacroSectorImpactRow = {
  sectorId: MacroSectorId;
  labelJa: string;
  impactScore: number;
  sentiment: MacroSentiment;
  rationaleJa: string;
};

export type MacroDashboard = {
  indicators: MacroIndicatorRow[];
  bullishCount: number;
  bearishCount: number;
  neutralCount: number;
  liveCount: number;
  referenceCount: number;
  fieldAcquisitionRate: number;
};

export type MacroIntelligenceDisplayFields = {
  macroScore: string;
  macroSentiment: string;
  bullishCount: string;
  bearishCount: string;
  neutralCount: string;
  liveIndicators: string;
  sectorImpact: string;
  sectorSentiment: string;
  topBullish: string;
  topBearish: string;
  dashboardSummary: string;
  /** Phase19.5 */
  sectorRotationScore?: string;
  macroIntelligenceScore?: string;
  top3Sectors?: string;
  bottom3Sectors?: string;
  sectorRank?: string;
  rotationSummary?: string;
};

export type BursaMacroIntelligenceAnalysis = {
  availability: 'available' | 'unavailable';
  availabilityLabelJa: string;
  dashboard: MacroDashboard;
  macroScore: number;
  macroSentiment: MacroSentiment;
  sectorId: MacroSectorId | null;
  sectorLabelJa: string;
  sectorImpactScore: number;
  sectorImpactSentiment: MacroSentiment;
  sectorImpacts: MacroSectorImpactRow[];
  /** Phase19.5 — 銘柄セクターのローテーション強度 */
  sectorRotationScore?: number;
  /** Phase19.5 — macroScore + sectorRotationScore */
  macroIntelligenceScore?: number;
  materialScoreAdjustment: number;
  fieldAcquisitionRate: number;
  unavailableReason: string | null;
  displayJa: MacroIntelligenceDisplayFields;
  evaluationJa: string;
  hasExtractableData: boolean;
  fetchedAt: string | null;
};

export { MACRO_INTELLIGENCE_UNAVAILABLE_JA } from '../constants/bursaMacroIntelligence';
