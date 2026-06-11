/** Phase23 — Earnings Revision Intelligence ドメイン型 */

export type EarningsRevisionDirection =
  | 'Strong Upward'
  | 'Upward'
  | 'Stable'
  | 'Downward'
  | 'Strong Downward';

export type EarningsRevisionConfidence = 'High' | 'Medium' | 'Low';

export type EarningsRevisionIntelligenceSource =
  | 'yahoo_finance'
  | 'analyst_consensus'
  | 'bursa_financial_report'
  | 'none';

export type EarningsRevisionIntelligenceDisplayFields = {
  epsEstimateCurrentFy: string;
  epsEstimateNextFy: string;
  epsRevision7d: string;
  epsRevision30d: string;
  epsRevision90d: string;
  revenueEstimateCurrentFy: string;
  revenueEstimateNextFy: string;
  revenueRevision30d: string;
  netProfitEstimateCurrentFy: string;
  netProfitRevision30d: string;
  upgradeCount: string;
  downgradeCount: string;
  revisionDirection: string;
  revisionConfidence: string;
  revisionScore: string;
  source: string;
  unavailableReason: string;
};

export type BursaEarningsRevisionIntelligenceAnalysis = {
  availability: 'available' | 'unavailable';
  availabilityLabelJa: string;
  source: EarningsRevisionIntelligenceSource;
  epsEstimateCurrentFy: number | null;
  epsEstimateNextFy: number | null;
  epsRevision7d: number | null;
  epsRevision30d: number | null;
  epsRevision90d: number | null;
  revenueEstimateCurrentFy: number | null;
  revenueEstimateNextFy: number | null;
  revenueRevision30d: number | null;
  netProfitEstimateCurrentFy: number | null;
  netProfitRevision30d: number | null;
  upgradeCount: number | null;
  downgradeCount: number | null;
  revisionDirection: EarningsRevisionDirection | null;
  revisionConfidence: EarningsRevisionConfidence;
  revisionScore: number;
  unavailableReason: string | null;
  displayJa: EarningsRevisionIntelligenceDisplayFields;
  /** AI統合 1行評価 */
  evaluationJa: string;
  /** Revision系（EPS修正・方向・Upgrade/Downgrade）のいずれか取得 */
  hasRevisionSeriesData: boolean;
  hasExtractableData: boolean;
  fieldAcquisitionCount: number;
  fieldAcquisitionTotal: number;
  fetchedAt: string | null;
};

export const EARNINGS_REVISION_INTELLIGENCE_UNAVAILABLE_JA =
  'Phase23 Earnings Revision Intelligence — データ未取得';
export const EARNINGS_REVISION_FIELD_MISSING_JA = 'データ未取得';
