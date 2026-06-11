/** Phase14 — Analyst Consensus ドメイン型 */

export type AnalystRatingLabel =
  | 'Strong Buy'
  | 'Buy'
  | 'Hold'
  | 'Sell'
  | 'Strong Sell';

export type ConsensusTrendLabel = 'Upgraded' | 'Maintained' | 'Downgraded';

export type AnalystConsensusSource =
  | 'finnhub'
  | 'alpha_vantage'
  | 'fmp'
  | 'yahoo_finance'
  | 'none';

export type AnalystRatingCounts = {
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
  analystCount: number;
};

export type AnalystForecastPair = {
  currentFy: number | null;
  nextFy: number | null;
};

export type AnalystConsensusDisplayFields = {
  rating: string;
  targetPrice: string;
  upside: string;
  analystCount: string;
  epsForecast: string;
  revenueForecast: string;
  trend: string;
  confidence: string;
};

export type BursaAnalystConsensusAnalysis = {
  availability: 'available' | 'unavailable';
  availabilityLabelJa: string;
  source: AnalystConsensusSource;
  rating: AnalystRatingLabel | null;
  ratingCounts: AnalystRatingCounts | null;
  averageTargetPrice: number | null;
  currentPrice: number | null;
  targetPriceUpsidePct: number | null;
  epsForecast: AnalystForecastPair;
  revenueForecast: AnalystForecastPair;
  consensusTrend: ConsensusTrendLabel | null;
  confidenceScore: number;
  displayJa: AnalystConsensusDisplayFields;
  /** AI分析 項目9 用 1行評価 */
  evaluationJa: string;
  /** Target Price または Rating のいずれか取得成功 */
  hasRatingOrTarget: boolean;
  fetchedAt: string | null;
};

export const ANALYST_CONSENSUS_UNAVAILABLE_JA = 'データ未取得';
export const ANALYST_FIELD_MISSING_JA = '未取得';
