/** Phase16.5 — Institutional Trend ドメイン型 */

export type TrendDirection =
  | 'Strong Accumulation'
  | 'Accumulation'
  | 'Neutral'
  | 'Distribution'
  | 'Strong Distribution';

export type InstitutionalTrendSource =
  | 'klse_shareholdings_page'
  | 'klse_shareholding_changes'
  | 'klse_major_shareholders'
  | 'none';

export type InstitutionalTrendDisplayFields = {
  previousHoldingPercent: string;
  currentHoldingPercent: string;
  changePercent: string;
  threeMonthTrend: string;
  sixMonthTrend: string;
  twelveMonthTrend: string;
  trendDirection: string;
  trendConfidence: string;
};

export type BursaInstitutionalTrendAnalysis = {
  availability: 'available' | 'unavailable';
  availabilityLabelJa: string;
  previousHoldingPercent: number | null;
  currentHoldingPercent: number | null;
  changePercent: number | null;
  threeMonthTrend: number | null;
  sixMonthTrend: number | null;
  twelveMonthTrend: number | null;
  trendDirection: TrendDirection | null;
  trendConfidence: number;
  source: InstitutionalTrendSource;
  unavailableReason: string | null;
  displayJa: InstitutionalTrendDisplayFields;
  /** AI分析 項目12 用 1行評価 */
  evaluationJa: string;
  hasExtractableData: boolean;
  fetchedAt: string | null;
};

export const INSTITUTIONAL_TREND_UNAVAILABLE_JA = 'データ未取得';
export const INSTITUTIONAL_TREND_FIELD_MISSING_JA = '未取得';
