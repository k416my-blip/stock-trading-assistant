/** Phase16 — Institutional Ownership ドメイン型 */

export type NetInstitutionalFlow =
  | 'Strong Buying'
  | 'Buying'
  | 'Neutral'
  | 'Selling'
  | 'Strong Selling';

export type InstitutionalOwnershipSource =
  | 'klse_shareholding_changes'
  | 'klse_major_shareholders'
  | 'klse_announcement'
  | 'yahoo_finance'
  | 'none';

export type InstitutionalHolderRecord = {
  name: string;
  holdingShares: number | null;
  holdingPct: number | null;
  shareDiff: number | null;
  pctDiff: number | null;
  increaseRatePct: number | null;
  decreaseRatePct: number | null;
  latestReportDate: string | null;
};

export type InstitutionalOwnershipHolderDisplay = {
  name: string;
  holdingPct: string;
  changeRate: string;
  latestReportDate: string;
};

export type InstitutionalOwnershipDisplayFields = {
  holderCount: string;
  topHolders: string;
  recentChange: string;
  netFlow: string;
  confidence: string;
  holders: InstitutionalOwnershipHolderDisplay[];
};

export type BursaInstitutionalOwnershipAnalysis = {
  availability: 'available' | 'unavailable';
  availabilityLabelJa: string;
  holderCount: number;
  holders: InstitutionalHolderRecord[];
  netInstitutionalFlow: NetInstitutionalFlow;
  institutionalConfidenceScore: number;
  source: InstitutionalOwnershipSource;
  unavailableReason: string | null;
  displayJa: InstitutionalOwnershipDisplayFields;
  /** AI分析 項目11 用 1行評価 */
  evaluationJa: string;
  hasExtractableData: boolean;
  fetchedAt: string | null;
};

export const INSTITUTIONAL_OWNERSHIP_UNAVAILABLE_JA = 'データ未取得';
export const INSTITUTIONAL_FIELD_MISSING_JA = '未取得';
