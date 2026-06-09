import type { Currency, Market, PortfolioPosition } from './index';

export type AiGradeRank = 'S' | 'A' | 'B' | 'C' | 'D';

export type AiDimensionScores = {
  growth: number;
  profitability: number;
  stability: number;
  value: number;
  dividendAppeal: number;
};

export type AiDimensionAvailability = Record<keyof AiDimensionScores, boolean>;

export type AiStockReportOverview = {
  companyName: string;
  symbol: string;
  market: Market;
  marketLabelJa: string;
  sectorJa: string;
  businessDescriptionJa: string;
};

export type AiStockReportFinancials = {
  revenueJa: string;
  operatingIncomeJa: string;
  netIncomeJa: string;
  epsJa: string;
  marketCapJa: string;
};

export type AiStockReportMarketData = {
  currentPriceJa: string;
  volumeJa: string;
  marketStatusJa: string;
};

export type AiStockReportDividend = {
  yieldLabelJa: string;
  trendJa: string;
  safetyJa: string;
};

export type AiStockReportHealth = {
  equityRatioJa: string;
  debtRatioJa: string;
  cashFlowJa: string;
};

export type AiStockReportCompetitiveness = {
  entryBarrierJa: string;
  brandPowerJa: string;
  marketShareJa: string;
};

export type AiStockReportNews = {
  headlines: { title: string; sentiment: 'positive' | 'negative' | 'neutral' }[];
  positiveCount: number;
  negativeCount: number;
  latestNewsJa: string;
};

export type AiStockReportRisk = {
  items: string[];
};

export type AiStockReportEvaluation = AiDimensionScores & {
  compositeScore: number | null;
  overallRank: AiGradeRank | null;
  commentJa: string;
  availability: AiDimensionAvailability;
};

export type AiStockReportDataSourceStatus = {
  yahooFinance: 'ok' | 'partial' | 'failed';
  twelveData: 'ok' | 'partial' | 'failed' | 'skipped';
  newsApi: 'ok' | 'partial' | 'failed' | 'skipped';
  bursaMalaysia: 'ok' | 'partial' | 'failed' | 'skipped';
};

export type AiStockReportBursaDividendItem = {
  announcedDate: string | null;
  financialYear: string | null;
  dividendType: string | null;
  exDate: string | null;
  paymentDate: string | null;
  amountPerShare: number | null;
  amountPerShareJa: string;
};

export type AiStockReportBursaLatestQuarter = {
  financialYear: string | null;
  quarter: string | null;
  quarterEndDate: string | null;
  announcedDate: string | null;
  quarterEndDateJa: string;
  announcedDateJa: string;
};

export type AiStockReportBursaTrendRow = {
  year: number;
  revenueJa: string;
  netProfitJa: string;
  epsJa: string;
  dividendJa: string;
  roeJa: string;
  dividendPayoutJa: string;
};

export type AiStockReportBursaPhase2 = {
  trendRows: AiStockReportBursaTrendRow[];
  chartLabels: string[];
  chartRevenue: number[];
  chartNetProfit: number[];
  chartEps: number[];
  chartDividend: number[];
  revenueGrowthStarsJa: string;
  profitGrowthStarsJa: string;
  dividendGrowthStarsJa: string;
  financialHealthStarsJa: string;
  investmentTypeJa: string;
  judgmentReasonsJa: string[];
  overallRank: AiGradeRank | null;
  compositeScore: number | null;
};

export type AiStockReportBursaPeerComparisonRow = {
  metricJa: string;
  targetValueJa: string;
  peerSummaryJa: string;
  rankJa: string;
};

export type AiStockReportBursaCompetitiveRow = {
  labelJa: string;
  scoreJa: string;
  reasonJa: string;
};

export type AiStockReportBursaBuffettRow = {
  labelJa: string;
  scoreJa: string;
  reasonJa: string;
};

export type AiStockReportBursaPhase3 = {
  peerNamesJa: string;
  comparisonRows: AiStockReportBursaPeerComparisonRow[];
  industryLabelJa: string;
  industryCompanyCountJa: string;
  marketCapRankJa: string;
  profitRankJa: string;
  dividendRankJa: string;
  roeRankJa: string;
  overallRankJa: string;
  competitiveRows: AiStockReportBursaCompetitiveRow[];
  buffettTotalJa: string;
  buffettRows: AiStockReportBursaBuffettRow[];
  enhancedInvestmentTypeJa: string;
  enhancedJudgmentReasonsJa: string[];
};

export type AiStockReportBursaPhase4 = {
  shareholderSourceJa: string;
  majorShareholderRows: Array<{ nameJa: string; holdingPctJa: string; asOfJa: string }>;
  segmentRows: Array<{ segmentJa: string; revenueJa: string; ratioJa: string }>;
  geographicRows: Array<{ regionJa: string; revenueJa: string; ratioJa: string }>;
  performanceSectionRows: Array<{ labelJa: string; valueJa: string }>;
  dividendSectionRows: Array<{ labelJa: string; valueJa: string }>;
  comments: {
    performanceJa: string;
    strengthsJa: string;
    risksJa: string;
    dividendJa: string;
    summaryJa: string;
  };
  currentForecastJa: string;
  nextForecastJa: string;
};

export type AiStockReportBursaEnhancedPeerRow = {
  metricJa: string;
  targetValueJa: string;
  industryAverageJa: string;
  diffPctJa: string;
};

export type AiStockReportBursaPhase5 = {
  enhancedPeerRows: AiStockReportBursaEnhancedPeerRow[];
  fairValue: {
    currentPriceJa: string;
    fairPriceJa: string;
    discountPctJa: string;
    methodNoteJa: string;
  };
  dividendJudgment: {
    currentDividendJa: string;
    fiveYearAverageJa: string;
    growthRateJa: string;
    cutHistoryJa: string;
    ratingJa: string;
  };
  trendJudgment: {
    revenueJa: string;
    netProfitJa: string;
    epsJa: string;
  };
  overallJudgmentJa: string;
  judgmentReasonsJa: string[];
};

export type AiStockReportBursaSection = {
  companyOverviewJa: string;
  sectorJa: string;
  subSectorJa: string;
  revenueJa: string;
  operatingProfitJa: string;
  netProfitJa: string;
  epsJa: string;
  marketCapJa: string;
  sharesOutstandingJa: string;
  dividendHistory: AiStockReportBursaDividendItem[];
  latestQuarter: AiStockReportBursaLatestQuarter | null;
  dataSourceLabel: string;
  fetchStatus: AiStockReportDataSourceStatus['bursaMalaysia'];
  phase2?: AiStockReportBursaPhase2 | null;
  phase3?: AiStockReportBursaPhase3 | null;
  phase4?: AiStockReportBursaPhase4 | null;
  phase5?: AiStockReportBursaPhase5 | null;
};

export type AiStockReport = {
  generatedAt: string;
  overview: AiStockReportOverview;
  financials: AiStockReportFinancials;
  marketData: AiStockReportMarketData;
  dividend: AiStockReportDividend;
  health: AiStockReportHealth;
  competitiveness: AiStockReportCompetitiveness;
  news: AiStockReportNews;
  risk: AiStockReportRisk;
  evaluation: AiStockReportEvaluation;
  subGrades: {
    dividend: AiGradeRank | null;
    financial: AiGradeRank | null;
    risk: AiGradeRank | null;
    businessStability: AiGradeRank | null;
    competitive: AiGradeRank | null;
  };
  dataSource: 'live';
  fetchedFields: string[];
  missingFields: string[];
  sourceStatus: AiStockReportDataSourceStatus;
  apiLimitNotes: string[];
  currency: Currency;
  bursa?: AiStockReportBursaSection | null;
};

export type AiRankedStock = {
  symbol: string;
  name: string;
  market: Market;
  rank: number;
  compositeScore: number | null;
  overallRank: AiGradeRank | null;
  report: AiStockReport;
};

export type HoldingAnalystReport = {
  symbol: string;
  companyName: string;
  currency: Currency;
  overallRank: AiGradeRank | null;
  currentPrice: number | null;
  averageBuyPrice: number;
  pnlPct: number | null;
  takeProfitRemainingPct: number | null;
  stopLossDistancePct: number | null;
  subGrades: AiStockReport['subGrades'];
  judgmentJa: string;
  reasonBullets: string[];
  shikiho: AiStockReport;
};

export type AiAnalystReportBundle = {
  portfolioScore: number;
  holdingCount: number;
  holdingReports: HoldingAnalystReport[];
  candidateSummaryJa?: string;
  headlineJa: string;
  loading?: boolean;
};
