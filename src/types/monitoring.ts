import type { PerformancePoint } from './index';
import type { MarketRegimeId } from './marketRegime';
import type { FactorExposure } from './portfolioConstruction';
import type { GovernanceAuditEntry, ProbabilisticRegimeMixture } from './governance';
import type { MetaAllocationReport } from './metaAllocation';
import type { ShadowFill, ShadowOrder } from './shadowTrading';

export type HealthLevel = 'green' | 'yellow' | 'red';

export interface ChartSeriesPoint {
  label: string;
  value: number;
}

export interface UnderwaterPoint {
  date: string;
  drawdownPct: number;
}

export interface RegimeTimelineSegment {
  regimeId: MarketRegimeId;
  labelJa: string;
  startDate: string;
  weightPct: number;
}

export interface AllocationTransitionFrame {
  label: string;
  weights: { symbol: string; weightPct: number }[];
}

export interface OmsReplayEvent {
  id: string;
  timestamp: string;
  kind: 'order' | 'fill';
  labelJa: string;
  status?: string;
}

export interface RiskContributionRow {
  label: string;
  contributionPct: number;
}

export interface GovernanceTimelineEvent {
  id: string;
  timestamp: string;
  titleJa: string;
  healthStatus: HealthLevel;
  reasonCodes: string[];
}

export interface HealthMetric {
  id: string;
  labelJa: string;
  value: number;
  max: number;
  level: HealthLevel;
}

export interface MetaConfidenceRow {
  label: string;
  posteriorPct: number;
  confidence: number;
}

export interface MonitoringSnapshot {
  generatedAt: string;
  equityCurve: PerformancePoint[];
  underwater: UnderwaterPoint[];
  regimeTimeline: RegimeTimelineSegment[];
  regimeMixture: ProbabilisticRegimeMixture | null;
  allocationFrames: AllocationTransitionFrame[];
  omsEvents: OmsReplayEvent[];
  riskContributions: RiskContributionRow[];
  factorExposures: FactorExposure[];
  governanceEvents: GovernanceTimelineEvent[];
  healthMetrics: HealthMetric[];
  metaConfidence: MetaConfidenceRow[];
  metaReport: MetaAllocationReport | null;
}
