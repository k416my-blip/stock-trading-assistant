import type { Market, StockFundamentals } from './index';
import type { XSentimentSnapshot } from './xSentiment';

export type NewsSentimentLabel = 'ポジティブ' | '中立' | 'ネガティブ';
export type DataSourceState = 'available' | 'unavailable' | 'estimated';

export interface FactorScore {
  score: number;
  label: string;
  unavailable?: boolean;
}

export interface DataSourceStatus {
  price: DataSourceState;
  news: DataSourceState;
  earnings: DataSourceState;
  sns: DataSourceState;
}

export interface NewsHeadline {
  title: string;
  sentiment: NewsSentimentLabel;
}

export interface NewsAnalysisResult {
  score: number;
  sentiment: NewsSentimentLabel;
  headlines: NewsHeadline[];
  summary: string;
  explanation: string;
  source: DataSourceState;
}

export interface EarningsAnalysisResult {
  score: number;
  revenueGrowthPct: number | null;
  profitGrowthPct: number | null;
  eps: number | null;
  guidance: string | null;
  summary: string;
  explanation: string;
  source: DataSourceState;
}

export interface SnsAnalysisResult {
  score: number;
  buzzScore: number;
  positiveRatePct: number;
  negativeRatePct: number;
  summary: string;
  warning: string;
  explanation: string;
  source: DataSourceState;
  /** X投稿ベースのセンチメント詳細（取得データ優先） */
  xSentiment?: XSentimentSnapshot;
}

export interface HistoricalLearningResult {
  score: number;
  returnPct90d: number | null;
  declinePct90d: number | null;
  volatilityPct: number | null;
  maxDrawdownPct: number | null;
  winRatePct: number | null;
  summary: string;
  explanation: string;
  disclaimer: string;
  source: DataSourceState;
}

export interface FundamentalAnalysisResult {
  score: number;
  per: number | null;
  pbr: number | null;
  dividendYield: number | null;
  roe: number | null;
  revenueGrowthPct: number | null;
  profitGrowthPct: number | null;
  debtRatioPct: number | null;
  marketCap: number | null;
  termNotes: Record<string, string>;
  summary: string;
  explanation: string;
  source: DataSourceState;
}

export interface StockRecommendation {
  symbol: string;
  market: Market;
  totalScore: number;
  technical: FactorScore;
  fundamental: FactorScore;
  news: FactorScore;
  earnings: FactorScore;
  sns: FactorScore;
  risk: FactorScore;
  whyThisStock: string;
  cautions: string[];
  beginnerComment: string;
  dataSource: DataSourceStatus;
  newsDetail: NewsAnalysisResult;
  earningsDetail: EarningsAnalysisResult;
  snsDetail: SnsAnalysisResult;
  historicalDetail: HistoricalLearningResult;
  fundamentalDetail: FundamentalAnalysisResult;
  aiNote: string;
  disclaimer: string;
}

export interface RecommendationContext {
  stock: StockFundamentals;
  style?: import('./index').InvestmentStyle;
  risk?: import('./index').RiskLevel;
  budgetPerSlotMYR?: number;
  priceBarsAvailable?: boolean;
}

export interface RankedStockWithRecommendation extends StockFundamentals {
  score: number;
  rank: number;
  recommendation: StockRecommendation;
}
