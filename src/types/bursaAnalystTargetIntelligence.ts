/** Phase22 — Analyst Target Intelligence ドメイン型 */

export type AnalystTargetIntelligenceSource =
  | 'yahoo_finance'
  | 'analyst_consensus'
  | 'none';

export type TargetRevisionTrend = 'Upgrade' | 'Downgrade' | 'Stable';

export type FairValueVsAnalystJudgment =
  | 'Analyst Bullish'
  | 'Fair Value Bullish'
  | 'Aligned'
  | 'Unavailable';

export type RecommendationDistribution = {
  strongBuy: number;
  buy: number;
  hold: number;
  reduce: number;
  sell: number;
};

export type AnalystTargetIntelligenceDisplayFields = {
  targetMedian: string;
  targetMean: string;
  bullTarget: string;
  bearTarget: string;
  coverageCount: string;
  currentPrice: string;
  upsidePct: string;
  downsidePct: string;
  targetTrend: string;
  recommendationDistribution: string;
  analystScore: string;
  fairValueMid: string;
  fairValueVsAnalystDiffPct: string;
  fairValueVsAnalystJudgment: string;
  fieldAcquisitionRate: string;
  source: string;
};

export type BursaAnalystTargetIntelligenceAnalysis = {
  availability: 'available' | 'unavailable';
  availabilityLabelJa: string;
  source: AnalystTargetIntelligenceSource;
  targetMedian: number | null;
  targetMean: number | null;
  bullCaseTarget: number | null;
  bearCaseTarget: number | null;
  coverageCount: number | null;
  currentPrice: number | null;
  upsidePct: number | null;
  downsidePct: number | null;
  targetRevisionTrend: TargetRevisionTrend | null;
  recommendationDistribution: RecommendationDistribution | null;
  analystScore: number;
  fairValueMid: number | null;
  fairValueVsAnalystDiffPct: number | null;
  fairValueVsAnalystJudgment: FairValueVsAnalystJudgment;
  displayJa: AnalystTargetIntelligenceDisplayFields;
  /** AI統合 1行評価 */
  evaluationJa: string;
  /** 主要指標（Target Median または Mean）取得成功 */
  hasExtractableData: boolean;
  /** 取得フィールド数 / 10 */
  fieldsAcquired: number;
  fieldsTotal: number;
  fetchedAt: string | null;
};

export const ANALYST_TARGET_INTELLIGENCE_UNAVAILABLE_JA =
  'Analyst Target Intelligence — データ未取得';
export const ANALYST_TARGET_FIELD_MISSING_JA = '未取得';
