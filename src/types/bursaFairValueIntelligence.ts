/** Phase21 — Fair Value Intelligence ドメイン型 */

export type FairValueIntelligenceSource =
  | 'yahoo_finance'
  | 'phase17_dividend'
  | 'financial_report'
  | 'bursa_disclosure'
  | 'computed'
  | 'none';

export type FairValueRecommendation =
  | 'Strong Buy'
  | 'Buy'
  | 'Hold'
  | 'Reduce'
  | 'Avoid';

export type FairValueModelKey = 'dcf' | 'ddm' | 'per';

export type FairValueConfidence = 'High' | 'Medium' | 'Low';

/** Phase21.5 — DCF 未取得理由コード */
export type DcfUnavailableReasonCode =
  | 'computed_ok'
  | 'fcf_missing'
  | 'fcf_non_positive'
  | 'fcf_growth_missing'
  | 'shares_missing'
  | 'discount_condition_failed'
  | 'sanity_range_rejected';

/** Phase21.5 — DDM 未取得理由コード */
export type DdmUnavailableReasonCode =
  | 'computed_ok'
  | 'not_dividend_stock'
  | 'dividend_fetch_failed'
  | 'growth_rate_missing'
  | 'growth_rate_spread_insufficient'
  | 'calculation_failed'
  | 'sanity_range_rejected';

export type FairValueMetricKey =
  | 'currentPrice'
  | 'freeCashflow'
  | 'fcfGrowth'
  | 'sharesOutstanding'
  | 'dividendYield'
  | 'dividendGrowth'
  | 'trailingEps'
  | 'dcfFairPrice'
  | 'ddmFairPrice'
  | 'perFairPrice';

export type FairValueModelResult = {
  model: FairValueModelKey;
  fairPrice: number | null;
  source: FairValueIntelligenceSource;
  inputsUsedJa: string[];
  unavailableReasonJa: string | null;
  /** Phase21.5 */
  unavailableReasonCode?: DcfUnavailableReasonCode | DdmUnavailableReasonCode;
  dataSourceJa?: string;
};

export type FairValueIntelligenceDisplayFields = {
  currentPrice: string;
  fairValueMid: string;
  fairValueLow: string;
  fairValueHigh: string;
  upsidePct: string;
  downsidePct: string;
  marginOfSafetyPct: string;
  dcfFairPrice: string;
  ddmFairPrice: string;
  perFairPrice: string;
  fairValueScore: string;
  recommendation: string;
  dcfSource: string;
  ddmSource: string;
  perSource: string;
  priceSource: string;
  fieldAcquisitionRate: string;
  primarySource: string;
  /** Phase21.5 */
  dcfUnavailableReason: string;
  ddmUnavailableReason: string;
  modelsUsed: string;
  primaryModel: string;
  confidence: string;
};

export type BursaFairValueIntelligenceAnalysis = {
  availability: 'available' | 'unavailable';
  availabilityLabelJa: string;
  currentPrice: number | null;
  currentPriceSource: FairValueIntelligenceSource;
  fairValueMid: number | null;
  fairValueLow: number | null;
  fairValueHigh: number | null;
  upsidePct: number | null;
  downsidePct: number | null;
  marginOfSafetyPct: number | null;
  dcf: FairValueModelResult;
  ddm: FairValueModelResult | null;
  per: FairValueModelResult;
  fairValueScore: number;
  recommendation: FairValueRecommendation;
  /** Phase21.5 */
  modelsUsed: FairValueModelKey[];
  primaryFairValueModel: FairValueModelKey | null;
  confidence: FairValueConfidence;
  dcfUnavailableReasonCode: DcfUnavailableReasonCode;
  ddmUnavailableReasonCode: DdmUnavailableReasonCode | null;
  fieldAcquisitionRate: number;
  acquiredFieldCount: number;
  totalFieldCount: number;
  fieldSources: Partial<Record<FairValueMetricKey, FairValueIntelligenceSource>>;
  source: FairValueIntelligenceSource;
  materialScoreAdjustment: number;
  unavailableReason: string | null;
  displayJa: FairValueIntelligenceDisplayFields;
  evaluationJa: string;
  hasExtractableData: boolean;
  fetchedAt: string | null;
};

export const FAIR_VALUE_INTELLIGENCE_UNAVAILABLE_JA = 'Fair Value Intelligence — データ未取得';
export const FAIR_VALUE_FIELD_MISSING_JA = '未取得';

export const FAIR_VALUE_METRIC_KEYS: FairValueMetricKey[] = [
  'currentPrice',
  'freeCashflow',
  'fcfGrowth',
  'sharesOutstanding',
  'dividendYield',
  'dividendGrowth',
  'trailingEps',
  'dcfFairPrice',
  'ddmFairPrice',
  'perFairPrice',
];
