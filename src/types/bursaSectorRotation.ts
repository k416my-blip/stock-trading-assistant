/** Phase19.5 — Sector Rotation Intelligence ドメイン型 */

import type { MacroSentiment } from './bursaMacroIntelligence';

export type RotationIndicatorId =
  | 'fed_rate'
  | 'us10y'
  | 'usd_myr'
  | 'dxy'
  | 'brent_oil'
  | 'gold'
  | 'klci'
  | 'sp500'
  | 'nasdaq';

export type RotationSectorId =
  | 'banking'
  | 'utilities'
  | 'consumer'
  | 'energy'
  | 'technology'
  | 'industrial'
  | 'healthcare'
  | 'reit'
  | 'telecommunication';

export type SectorRotationRow = {
  sectorId: RotationSectorId;
  labelJa: string;
  strength: number;
  rank: number;
  sentiment: MacroSentiment;
  rationaleJa: string;
};

export type SectorRotationScoreDistribution = {
  bullish: number;
  neutral: number;
  bearish: number;
  min: number;
  max: number;
  avg: number;
};

export type SectorRotationDisplayFields = {
  sectorRotationScore: string;
  macroIntelligenceScore: string;
  macroScore: string;
  top3Sectors: string;
  bottom3Sectors: string;
  sectorRank: string;
  rankingSummary: string;
  scoreDistribution: string;
};

export type BursaSectorRotationAnalysis = {
  availability: 'available' | 'unavailable';
  availabilityLabelJa: string;
  rankings: SectorRotationRow[];
  top3Sectors: SectorRotationRow[];
  bottom3Sectors: SectorRotationRow[];
  scoreDistribution: SectorRotationScoreDistribution;
  stockSectorId: RotationSectorId | null;
  stockSectorLabelJa: string;
  sectorRotationScore: number;
  sectorRotationSentiment: MacroSentiment;
  macroScore: number;
  macroIntelligenceScore: number;
  macroIntelligenceSentiment: MacroSentiment;
  materialScoreAdjustment: number;
  displayJa: SectorRotationDisplayFields;
  evaluationJa: string;
  hasExtractableData: boolean;
};

export { SECTOR_ROTATION_UNAVAILABLE_JA } from '../constants/bursaSectorRotation';
