/** Phase20 — Valuation Intelligence ドメイン型 */

export type ValuationIntelligenceSource =
  | 'yahoo_finance'
  | 'financial_report'
  | 'bursa_disclosure'
  | 'none';

export type ValuationRating =
  | 'Strong Undervalued'
  | 'Undervalued'
  | 'Fair Value'
  | 'Overvalued'
  | 'Strong Overvalued';

export type ValuationMetricKey =
  | 'roe'
  | 'roa'
  | 'netMargin'
  | 'operatingMargin'
  | 'fcfMargin'
  | 'revenueGrowth'
  | 'epsGrowth'
  | 'netProfitGrowth'
  | 'fcfGrowth'
  | 'pe'
  | 'forwardPe'
  | 'pb'
  | 'ps'
  | 'peg'
  | 'evEbitda'
  | 'debtEquity'
  | 'currentRatio'
  | 'interestCoverage'
  | 'cashRatio'
  | 'dividendYield'
  | 'payoutRatio'
  | 'shareBuyback';

export type ValuationIntelligenceDisplayFields = {
  valuationScore: string;
  valuationRating: string;
  pe: string;
  pb: string;
  roe: string;
  revenueGrowth: string;
  epsGrowth: string;
  debtEquity: string;
  fairValueJudgment: string;
  roa: string;
  netMargin: string;
  operatingMargin: string;
  fcfMargin: string;
  forwardPe: string;
  ps: string;
  peg: string;
  evEbitda: string;
  currentRatio: string;
  interestCoverage: string;
  cashRatio: string;
  dividendYield: string;
  payoutRatio: string;
  shareBuyback: string;
  netProfitGrowth: string;
  fcfGrowth: string;
  fieldAcquisitionRate: string;
  primarySource: string;
};

export type BursaValuationIntelligenceAnalysis = {
  availability: 'available' | 'unavailable';
  availabilityLabelJa: string;
  valuationScore: number;
  valuationRating: ValuationRating;
  fairValueJudgmentJa: string;
  /** 22項目の実データ取得率 0〜1 */
  fieldAcquisitionRate: number;
  acquiredFieldCount: number;
  totalFieldCount: number;
  fieldSources: Partial<Record<ValuationMetricKey, ValuationIntelligenceSource>>;
  metrics: Partial<Record<ValuationMetricKey, number | null>>;
  shareBuybackDetected: boolean | null;
  source: ValuationIntelligenceSource;
  materialScoreAdjustment: number;
  unavailableReason: string | null;
  displayJa: ValuationIntelligenceDisplayFields;
  evaluationJa: string;
  hasExtractableData: boolean;
  fetchedAt: string | null;
};

export const VALUATION_INTELLIGENCE_UNAVAILABLE_JA = 'Valuation Intelligence — データ未取得';
export const VALUATION_FIELD_MISSING_JA = '未取得';

export const VALUATION_METRIC_KEYS: ValuationMetricKey[] = [
  'roe',
  'roa',
  'netMargin',
  'operatingMargin',
  'fcfMargin',
  'revenueGrowth',
  'epsGrowth',
  'netProfitGrowth',
  'fcfGrowth',
  'pe',
  'forwardPe',
  'pb',
  'ps',
  'peg',
  'evEbitda',
  'debtEquity',
  'currentRatio',
  'interestCoverage',
  'cashRatio',
  'dividendYield',
  'payoutRatio',
  'shareBuyback',
];
