/** Phase24 — Analyst Consensus Intelligence ドメイン型 */

export type AnalystConsensusRatingLabel =
  | 'Strong Buy'
  | 'Buy'
  | 'Hold'
  | 'Sell'
  | 'Strong Sell';

export type AnalystRevisionDirectionLabel = 'Upgraded' | 'Stable' | 'Downgraded';

export type AnalystConsensusIntelligenceConfidence = 'High' | 'Medium' | 'Low';

export type AnalystConsensusIntelligenceSource =
  | 'yahoo_finance'
  | 'finnhub'
  | 'alpha_vantage'
  | 'fmp'
  | 'phase14_consensus'
  | 'mock_fixture'
  | 'none';

export type AnalystConsensusIntelligenceWarning =
  | 'stale_data'
  | 'missing_target_price'
  | 'missing_current_price'
  | 'low_analyst_count'
  | 'high_dispersion'
  | 'provider_error'
  | 'no_consensus_data';

export type AnalystConsensusIntelligenceDisplayFields = {
  analystCount: string;
  buyCount: string;
  holdCount: string;
  sellCount: string;
  consensusRating: string;
  targetPrice: string;
  currentPrice: string;
  impliedUpsidePct: string;
  targetRevisionDirection: string;
  targetRevisionPct: string;
  ratingRevisionDirection: string;
  consensusDispersion: string;
  confidence: string;
  consensusScore: string;
  warnings: string;
  source: string;
  updatedAt: string;
};

export type BursaAnalystConsensusIntelligenceAnalysis = {
  availability: 'available' | 'unavailable';
  availabilityLabelJa: string;
  analystCount: number | null;
  buyCount: number | null;
  holdCount: number | null;
  sellCount: number | null;
  consensusRating: AnalystConsensusRatingLabel | null;
  targetPrice: number | null;
  currentPrice: number | null;
  impliedUpsidePct: number | null;
  targetRevisionDirection: AnalystRevisionDirectionLabel | null;
  targetRevisionPct: number | null;
  ratingRevisionDirection: AnalystRevisionDirectionLabel | null;
  consensusDispersion: number | null;
  confidence: AnalystConsensusIntelligenceConfidence;
  consensusScore: number;
  warnings: AnalystConsensusIntelligenceWarning[];
  source: AnalystConsensusIntelligenceSource;
  updatedAt: string | null;
  displayJa: AnalystConsensusIntelligenceDisplayFields;
  /** AI統合 1行評価 */
  evaluationJa: string;
  hasExtractableData: boolean;
  fieldAcquisitionCount: number;
  fieldAcquisitionTotal: number;
  fetchedAt: string | null;
};

export const ANALYST_CONSENSUS_INTELLIGENCE_UNAVAILABLE_JA =
  'Phase24 Analyst Consensus Intelligence — データ未取得';
export const ANALYST_CONSENSUS_INTELLIGENCE_FIELD_MISSING_JA = 'データ未取得';
