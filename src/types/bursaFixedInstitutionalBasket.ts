/** Phase16.7 — Fixed Institutional Basket ドメイン型 */

import type { TrendDirection } from './bursaInstitutionalTrend';

export type FixedBasketComparison = {
  window: '3M' | '6M' | '12M';
  legacyTrendPct: number | null;
  fixedBasketTrendPct: number | null;
  pairedInstitutions: string[];
};

export type FixedBasketDisplayFields = {
  pairedCount: string;
  pairedInstitutions: string;
  threeMonthTrend: string;
  sixMonthTrend: string;
  twelveMonthTrend: string;
  trendDirection: string;
  trendConfidence: string;
  comparisonSummary: string;
};

export type BursaFixedInstitutionalBasketAnalysis = {
  availability: 'available' | 'unavailable';
  availabilityLabelJa: string;
  /** Phase16.8 — top30 | legacy8 */
  basketMode: 'top30' | 'legacy8';
  basketMaxSize: number;
  pairedInstitutionCount: number;
  pairedInstitutions: string[];
  /** Phase16.7 固定8機関との比較用 */
  legacy8PairedCount: number;
  legacy8TwelveMonthTrend: number | null;
  threeMonthTrend: number | null;
  sixMonthTrend: number | null;
  twelveMonthTrend: number | null;
  trendDirection: TrendDirection | null;
  trendConfidence: number;
  comparisons: FixedBasketComparison[];
  unavailableReason: string | null;
  displayJa: FixedBasketDisplayFields;
  evaluationJa: string;
  hasExtractableData: boolean;
  fetchedAt: string | null;
};

export const FIXED_BASKET_UNAVAILABLE_JA = 'データ未取得';
