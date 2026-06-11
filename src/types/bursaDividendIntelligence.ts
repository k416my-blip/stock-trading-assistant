/** Phase17 — Dividend Intelligence ドメイン型 */

export type DividendIntelligenceSource =
  | 'yahoo_finance'
  | 'fmp'
  | 'alpha_vantage'
  | 'klse_dividend'
  | 'bursa_disclosure'
  | 'financial_report'
  | 'none';

export type DividendIntelligenceFieldKey =
  | 'dividendYield'
  | 'payoutRatio'
  | 'fiveYearCagr'
  | 'exDividendDate'
  | 'paymentDate'
  | 'dividendFrequency'
  | 'specialDividend';

export type DividendIntelligenceDisplayFields = {
  dividendYield: string;
  payoutRatio: string;
  dividendGrowthRate: string;
  consecutiveDividendYears: string;
  fiveYearCagr: string;
  exDividendDate: string;
  paymentDate: string;
  dividendFrequency: string;
  specialDividend: string;
  sustainabilityScore: string;
};

export type BursaDividendIntelligenceAnalysis = {
  availability: 'available' | 'unavailable';
  availabilityLabelJa: string;
  dividendYield: number | null;
  payoutRatio: number | null;
  dividendGrowthRate: number | null;
  consecutiveDividendYears: number | null;
  fiveYearCagr: number | null;
  exDividendDate: string | null;
  paymentDate: string | null;
  dividendFrequency: string | null;
  specialDividend: boolean | null;
  dividendSustainabilityScore: number;
  source: DividendIntelligenceSource;
  /** Phase17.5 — 7項目の実データ取得率 0〜1 */
  fieldAcquisitionRate: number;
  fieldSources: Partial<Record<DividendIntelligenceFieldKey, DividendIntelligenceSource>>;
  materialWeightMax: number;
  unavailableReason: string | null;
  displayJa: DividendIntelligenceDisplayFields;
  /** AI分析 — Dividend Intelligence 1行評価 */
  evaluationJa: string;
  hasExtractableData: boolean;
  fetchedAt: string | null;
};

export const DIVIDEND_INTELLIGENCE_UNAVAILABLE_JA = 'データ未取得';
export const DIVIDEND_FIELD_MISSING_JA = '未取得';
