/** AI分析結果 — 必須表示セクション */
export type OverallTradeJudgmentJa =
  | '強い買い'
  | '買い'
  | '中立'
  | '売り'
  | '強い売り';

export type AiRecommendedActionJa =
  | '追加購入'
  | '保有継続'
  | '一部利確'
  | '全利確'
  | '監視のみ';

export type ConciergeSourceSummaries = {
  bursa: string;
  news: string;
  x: string;
  reddit: string;
};

export type ConciergeSourceScores = {
  bursa: number;
  news: number;
  x: number;
  reddit: number;
};

export type ConciergeEnhancedAnalysisReport = {
  stockNameJa: string;
  currentPriceJa: string;
  sharesJa: string;
  marketValueJa: string;
  unrealizedPnlJa: string;
  overallJudgmentJa: OverallTradeJudgmentJa;
  confidencePct: number;
  judgmentReasonsJa: string[];
  sourceSummariesJa: ConciergeSourceSummaries;
  positiveMaterialsJa: string[];
  negativeMaterialsJa: string[];
  risksJa: string[];
  nextCheckpointsJa: string[];
  recommendedActionJa: AiRecommendedActionJa;
  sourceScoresJa: ConciergeSourceScores;
  overallScore: number;
};
