/** Phase16.6 — Historical Institutional Ownership ドメイン型 */

import type { TrendDirection } from './bursaInstitutionalTrend';

export type HistoricalOwnershipSource =
  | 'klse_shareholdings_history'
  | 'klse_shareholding_changes'
  | 'klse_major_shareholders'
  | 'klse_announcement'
  | 'none';

export type OwnershipHistoryRecord = {
  recordDate: string;
  holderName: string;
  holdingPercent: number | null;
  changePercent: number | null;
};

export type HistoricalOwnershipDisplayFields = {
  recordCount: string;
  threeMonthTrend: string;
  sixMonthTrend: string;
  twelveMonthTrend: string;
  trendDirection: string;
  trendConfidence: string;
  topHistory: string;
};

export type BursaHistoricalOwnershipAnalysis = {
  availability: 'available' | 'unavailable';
  availabilityLabelJa: string;
  ownershipHistory: OwnershipHistoryRecord[];
  threeMonthTrend: number | null;
  sixMonthTrend: number | null;
  twelveMonthTrend: number | null;
  trendDirection: TrendDirection | null;
  trendConfidence: number;
  source: HistoricalOwnershipSource;
  unavailableReason: string | null;
  displayJa: HistoricalOwnershipDisplayFields;
  evaluationJa: string;
  hasExtractableData: boolean;
  fetchedAt: string | null;
};

export const HISTORICAL_OWNERSHIP_UNAVAILABLE_JA = 'データ未取得';
export const HISTORICAL_OWNERSHIP_FIELD_MISSING_JA = '未取得';
