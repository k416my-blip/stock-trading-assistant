/** Phase22.1 — Valuation Gap Intelligence ドメイン型 */

export type ValuationGapClassification =
  | 'Strong Analyst Premium'
  | 'Analyst Premium'
  | 'Consensus'
  | 'Model Premium'
  | 'Unavailable';

export type ValuationGapIntelligenceDisplayFields = {
  fairValue: string;
  analystTarget: string;
  gapPct: string;
  gapClassification: string;
  valuationGapScore: string;
};

export type BursaValuationGapIntelligenceAnalysis = {
  availability: 'available' | 'unavailable';
  availabilityLabelJa: string;
  fairValueMid: number | null;
  analystTarget: number | null;
  gapPct: number | null;
  gapClassification: ValuationGapClassification;
  valuationGapScore: number;
  displayJa: ValuationGapIntelligenceDisplayFields;
  /** AI統合 1行評価 */
  evaluationJa: string;
  hasExtractableData: boolean;
  fetchedAt: string | null;
};

export const VALUATION_GAP_INTELLIGENCE_UNAVAILABLE_JA =
  'Valuation Gap Intelligence — データ未取得';
export const VALUATION_GAP_FIELD_MISSING_JA = '未取得';
