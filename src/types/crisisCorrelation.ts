import type { SectorTheme } from './marketRegime';

export type CorrelationRegimeId = 'normal_market' | 'high_volatility' | 'crisis';

export interface StressAdjustedCorrelationPair {
  symbolA: string;
  symbolB: string;
  fullCorrelation: number;
  downsideCorrelation: number;
  stressAdjustedCorrelation: number;
  crossSector: boolean;
}

export interface BetaCluster {
  id: string;
  symbols: string[];
  avgBeta: number;
  combinedWeightPct: number;
  hiddenRiskScore: number;
  severity: 'ok' | 'watch' | 'high' | 'critical';
}

export interface CrisisCorrelationReport {
  regimeId: CorrelationRegimeId;
  regimeLabelJa: string;
  crossSectorBoostApplied: number;
  downsideWeightPct: number;
  stressAdjustedPairs: StressAdjustedCorrelationPair[];
  betaClusters: BetaCluster[];
  effectiveCorrelationThreshold: number;
  clusterPenaltyScore: number;
  summaryJa: string;
}
