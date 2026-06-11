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

/** Phase13〜17 データソース評価（未取得時は固定ラベル） */
export type ConciergeSourceEvaluations = {
  earningsCall: string;
  analystConsensus: string;
  insiderTrading: string;
  institutionalOwnership: string;
  institutionalTrend: string;
  dividendIntelligence: string;
  newsIntelligence: string;
  macroIntelligence: string;
  valuationIntelligence: string;
  fairValueIntelligence: string;
  analystTargetIntelligence: string;
  valuationGapIntelligence: string;
  convictionIntelligence: string;
  earningsRevisionIntelligence: string;
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
  /** Phase13〜17 — 項目8〜14 */
  sourceEvaluationsJa: ConciergeSourceEvaluations;
  /** Phase13 — 経営陣トーン / ガイダンス / Q&A警戒点 */
  earningsCallDetailJa: {
    managementTone: string;
    guidance: string;
    qaWatchpoints: string;
  } | null;
  /** Phase14 — Analyst Consensus 詳細 */
  analystConsensusDetailJa: {
    rating: string;
    targetPrice: string;
    upside: string;
    analystCount: string;
    epsForecast: string;
    revenueForecast: string;
    trend: string;
    confidence: string;
  } | null;
  /** Phase15 — Insider Trading 詳細 */
  insiderTradingDetailJa: {
    latestTransactionDate: string;
    transactionType: string;
    insiderName: string;
    insiderRole: string;
    transactionValue: string;
    buyCount90d: string;
    sellCount90d: string;
    netActivity: string;
    confidence: string;
  } | null;
  /** Phase16 — Institutional Ownership 詳細 */
  institutionalOwnershipDetailJa: {
    holderCount: string;
    topHolders: string;
    recentChange: string;
    netFlow: string;
    confidence: string;
    holders: Array<{
      name: string;
      holdingPct: string;
      changeRate: string;
      latestReportDate: string;
    }>;
  } | null;
  /** Phase16.5 — Institutional Trend 詳細 */
  institutionalTrendDetailJa: {
    previousHoldingPercent: string;
    currentHoldingPercent: string;
    changePercent: string;
    threeMonthTrend: string;
    sixMonthTrend: string;
    twelveMonthTrend: string;
    trendDirection: string;
    trendConfidence: string;
  } | null;
  /** Phase17 — Dividend Intelligence 詳細 */
  dividendIntelligenceDetailJa: {
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
  } | null;
  /** Phase18 — News Intelligence 詳細 */
  newsIntelligenceDetailJa: {
    articleCount: string;
    last24hCount: string;
    bullishCount: string;
    bearishCount: string;
    neutralCount: string;
    aggregateImpact: string;
    topHeadline: string;
    topEventType: string;
    topImpactScore: string;
    sourceCoverage: string;
    impactEngine: string;
  } | null;
  /** Phase19 — Macro Intelligence 詳細 */
  macroIntelligenceDetailJa: {
    macroScore: string;
    macroSentiment: string;
    bullishCount: string;
    bearishCount: string;
    neutralCount: string;
    liveIndicators: string;
    sectorImpact: string;
    sectorSentiment: string;
    topBullish: string;
    topBearish: string;
    dashboardSummary: string;
    sectorRotationScore?: string;
    macroIntelligenceScore?: string;
    top3Sectors?: string;
    bottom3Sectors?: string;
    sectorRank?: string;
    rotationSummary?: string;
  } | null;
  /** Phase20 — Valuation Intelligence 詳細 */
  valuationIntelligenceDetailJa: {
    valuationScore: string;
    valuationRating: string;
    pe: string;
    pb: string;
    roe: string;
    revenueGrowth: string;
    epsGrowth: string;
    debtEquity: string;
    fairValueJudgment: string;
    fieldAcquisitionRate: string;
  } | null;
  /** Phase21 — Fair Value Intelligence 詳細 */
  fairValueIntelligenceDetailJa: {
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
    dcfUnavailableReason: string;
    ddmUnavailableReason: string;
    modelsUsed: string;
    primaryModel: string;
    confidence: string;
  } | null;
  /** Phase22 — Analyst Target Intelligence 詳細 */
  analystTargetIntelligenceDetailJa: {
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
  } | null;
  /** Phase22.1 — Valuation Gap Intelligence 詳細 */
  valuationGapIntelligenceDetailJa: {
    fairValue: string;
    analystTarget: string;
    gapPct: string;
    gapClassification: string;
    valuationGapScore: string;
  } | null;
  /** Phase22.2 — Conviction Intelligence 詳細 */
  convictionIntelligenceDetailJa: {
    fairValue: string;
    analystTarget: string;
    coverageCount: string;
    analystTrend: string;
    valuationConfidence: string;
    dcfUsed: string;
    ddmUsed: string;
    gapPct: string;
    trustedSource: string;
    convictionLevel: string;
    convictionConfidence: string;
    convictionScore: string;
    reasonLine1: string;
    reasonLine2: string;
    reasonLine3: string;
  } | null;
  /** Phase23 — Earnings Revision Intelligence 詳細 */
  earningsRevisionIntelligenceDetailJa: {
    epsEstimateCurrentFy: string;
    epsEstimateNextFy: string;
    epsRevision30d: string;
    epsRevision90d: string;
    revenueRevision30d: string;
    upgradeCount: string;
    downgradeCount: string;
    revisionDirection: string;
    revisionScore: string;
    revisionConfidence: string;
    source: string;
  } | null;
  positiveMaterialsJa: string[];
  negativeMaterialsJa: string[];
  risksJa: string[];
  nextCheckpointsJa: string[];
  recommendedActionJa: AiRecommendedActionJa;
  sourceScoresJa: ConciergeSourceScores;
  overallScore: number;
};
