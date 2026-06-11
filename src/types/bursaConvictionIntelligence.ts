/** Phase22.2 — Conviction Intelligence ドメイン型 */

export type ConvictionLevel = 'Strong Buy' | 'Buy' | 'Hold' | 'Reduce' | 'Avoid';

export type ConvictionConfidence = 'High' | 'Medium' | 'Low';

export type TrustedValuationSource = 'Fair Value' | 'Analyst Target' | 'Blended' | 'Unavailable';

export type ConvictionIntelligenceDisplayFields = {
  fairValue: string;
  analystTarget: string;
  coverageCount: string;
  analystTrend: string;
  valuationConfidence: string;
  dcfUsed: string;
  ddmUsed: string;
  gapPct: string;
  gapClassification: string;
  trustedSource: string;
  convictionLevel: string;
  convictionConfidence: string;
  convictionScore: string;
  reasonLine1: string;
  reasonLine2: string;
  reasonLine3: string;
};

export type BursaConvictionIntelligenceAnalysis = {
  availability: 'available' | 'unavailable';
  availabilityLabelJa: string;
  fairValueMid: number | null;
  analystTarget: number | null;
  coverageCount: number | null;
  analystTrend: string | null;
  valuationConfidence: string | null;
  dcfUsed: boolean;
  ddmUsed: boolean;
  gapPct: number | null;
  gapClassification: string | null;
  trustedSource: TrustedValuationSource;
  convictionLevel: ConvictionLevel;
  convictionConfidence: ConvictionConfidence;
  convictionScore: number;
  reasonSummaryLines: [string, string, string];
  displayJa: ConvictionIntelligenceDisplayFields;
  evaluationJa: string;
  hasExtractableData: boolean;
  fetchedAt: string | null;
};

export const CONVICTION_INTELLIGENCE_UNAVAILABLE_JA =
  'Conviction Intelligence — データ未取得';
export const CONVICTION_FIELD_MISSING_JA = '未取得';
