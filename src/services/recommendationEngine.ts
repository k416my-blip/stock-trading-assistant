import {
  AI_LEARNING_DISCLAIMER,
  RECOMMENDATION_DISCLAIMER,
  RECOMMENDATION_WEIGHTS,
} from '../constants/recommendation';
import { STOCK_CATEGORY_LABEL } from '../constants/stockCatalog';
import { findStock } from '../data/sampleStocks';
import type { InvestmentStyle, Market, RiskLevel, StockFundamentals } from '../types';
import type {
  DataSourceStatus,
  StockRecommendation,
} from '../types/recommendation';
import type { AnalysisApiKeys } from './analysisApiKeys';
import {
  evaluateOutcomesAndAdjustWeights,
  formatAiLearningNote,
  getActiveWeights,
  loadAiLearningState,
  recordRecommendationOutcome,
  type AiLearningState,
  type ScoreWeights,
} from './analysis/aiLearning';
import { analyzeEarnings, analyzeEarningsSync } from './analysis/earningsAnalysis';
import { analyzeFundamentals } from './analysis/fundamentalAnalysis';
import { analyzeHistorical } from './analysis/historicalLearning';
import { analyzeNews, analyzeNewsSync } from './analysis/newsAnalysis';
import { analyzeRisk } from './analysis/riskAnalysis';
import { analyzeSnsSync } from './analysis/snsAnalysis';
import { analyzeTechnicalScore } from './analysis/technicalScore';
import { buildBeginnerNote, buildSelectionReason } from './recommendationReasons';
import { isMegaCap } from './stockCatalog';

export type RecommendationOptions = {
  style?: InvestmentStyle;
  risk?: RiskLevel;
  budgetPerSlotMYR?: number;
  apiKeys?: AnalysisApiKeys;
  aiState?: AiLearningState;
  priceDataAvailable?: boolean;
  recordLearning?: boolean;
};

function weightedTotal(
  scores: {
    technical: number;
    fundamental: number;
    news: number;
    earnings: number;
    sns: number;
    risk: number;
  },
  weights: ScoreWeights = RECOMMENDATION_WEIGHTS,
): number {
  const total =
    scores.technical * weights.technical +
    scores.fundamental * weights.fundamental +
    scores.news * weights.news +
    scores.earnings * weights.earnings +
    scores.sns * weights.sns +
    scores.risk * weights.risk;
  return Math.max(0, Math.min(100, Math.round(total)));
}

function buildDataSourceStatus(
  priceDataAvailable: boolean,
  newsSource: DataSourceStatus['news'],
  earningsSource: DataSourceStatus['earnings'],
  snsSource: DataSourceStatus['sns'],
): DataSourceStatus {
  return {
    price: priceDataAvailable ? 'available' : 'estimated',
    news: newsSource,
    earnings: earningsSource,
    sns: snsSource,
  };
}

function buildWhyAndCautions(
  stock: StockFundamentals,
  rec: Pick<StockRecommendation, 'technical' | 'fundamental' | 'news' | 'earnings' | 'sns' | 'risk' | 'totalScore'>,
  style: InvestmentStyle,
  risk: RiskLevel,
  budgetPerSlotMYR: number,
): { why: string; cautions: string[] } {
  const whyParts: string[] = [];
  if (rec.technical.score >= 65) whyParts.push('テクニカル面が比較的良好');
  if (rec.fundamental.score >= 65) whyParts.push('ファンダメンタル指標がバランス良め');
  if (rec.news.score >= 65) whyParts.push('ニュース評価がポジティブ寄り');
  if (rec.earnings.score >= 65) whyParts.push('決算評価が堅調寄り');
  if (rec.sns.score >= 65) whyParts.push('SNSの雰囲気が前向き寄り');
  if (whyParts.length === 0) {
    whyParts.push(`${STOCK_CATEGORY_LABEL[stock.category]}枠として分散の候補`);
  }
  whyParts.push(buildSelectionReason(stock, style, risk, budgetPerSlotMYR));

  const cautions: string[] = [];
  if (rec.risk.score < 45) cautions.push('値動きや財務面でリスクが高めと推定');
  if (rec.news.score < 40) cautions.push('ニュース評価がネガティブ寄り');
  if (rec.earnings.score < 40) cautions.push('決算評価が弱め');
  if (isMegaCap(stock)) cautions.push('メガキャップは1プラン内1銘柄まで推奨');
  if (rec.sns.score >= 75) cautions.push('SNSの話題性が高く、短期で急変する可能性');
  cautions.push(RECOMMENDATION_DISCLAIMER);

  return { why: whyParts.join('。'), cautions };
}

function assembleRecommendation(
  stock: StockFundamentals,
  opts: RecommendationOptions,
  newsDetail: ReturnType<typeof analyzeNewsSync>,
  earningsDetail: ReturnType<typeof analyzeEarningsSync>,
  snsDetail: ReturnType<typeof analyzeSnsSync>,
  weights: ScoreWeights,
  aiNote: string,
): StockRecommendation {
  const style = opts.style ?? 'balanced';
  const risk = opts.risk ?? 'standard';
  const budget = opts.budgetPerSlotMYR ?? 500;

  const technical = analyzeTechnicalScore(stock);
  const fundamentalDetail = analyzeFundamentals(stock);
  const fundamental = { score: fundamentalDetail.score, label: 'ファンダメンタル分析' };
  const news = {
    score: newsDetail.source === 'unavailable' ? 50 : newsDetail.score,
    label: 'ニュース評価',
    unavailable: newsDetail.source === 'unavailable',
  };
  const earnings = {
    score: earningsDetail.source === 'unavailable' ? 50 : earningsDetail.score,
    label: '決算評価',
    unavailable: earningsDetail.source === 'unavailable',
  };
  const sns = {
    score: snsDetail.source === 'unavailable' ? 50 : snsDetail.score,
    label: 'SNS評価',
    unavailable: snsDetail.source === 'unavailable',
  };
  const riskFactor = analyzeRisk(stock, risk, style);
  const historicalDetail = analyzeHistorical(stock.symbol);

  const factorScores = {
    technical: technical.score,
    fundamental: fundamental.score,
    news: news.score,
    earnings: earnings.score,
    sns: sns.score,
    risk: riskFactor.score,
  };

  const totalScore = weightedTotal(factorScores, weights);
  const { why, cautions } = buildWhyAndCautions(
    stock,
    { ...factorScores, totalScore, technical, fundamental, news, earnings, sns, risk: riskFactor },
    style,
    risk,
    budget,
  );

  const dataSource = buildDataSourceStatus(
    opts.priceDataAvailable !== false,
    newsDetail.source,
    earningsDetail.source,
    snsDetail.source,
  );

  return {
    symbol: stock.symbol,
    market: stock.market,
    totalScore,
    technical,
    fundamental,
    news,
    earnings,
    sns,
    risk: riskFactor,
    whyThisStock: why,
    cautions,
    beginnerComment: buildBeginnerNote(stock, style),
    dataSource,
    newsDetail,
    earningsDetail,
    snsDetail,
    historicalDetail,
    fundamentalDetail,
    aiNote,
    disclaimer: `${RECOMMENDATION_DISCLAIMER} ${AI_LEARNING_DISCLAIMER}`,
  };
}

/** 同期ビルド（スクリーナー・配分プラン） */
export function buildStockRecommendation(
  stock: StockFundamentals,
  opts: RecommendationOptions = {},
): StockRecommendation {
  const aiState = opts.aiState;
  const weights = aiState ? getActiveWeights(aiState) : RECOMMENDATION_WEIGHTS;
  const aiNote = aiState ? formatAiLearningNote(aiState) : formatAiLearningNote({
    weights: RECOMMENDATION_WEIGHTS,
    outcomes: [],
    lastUpdatedAt: '',
  });

  const rec = assembleRecommendation(
    stock,
    opts,
    analyzeNewsSync(stock),
    analyzeEarningsSync(stock),
    analyzeSnsSync(stock),
    weights,
    aiNote,
  );

  if (opts.recordLearning) {
    void recordRecommendationOutcome({
      symbol: stock.symbol,
      market: stock.market,
      recommendedAt: new Date().toISOString(),
      totalScore: rec.totalScore,
      priceAtRecommendation: stock.price,
      factorScores: {
        technical: rec.technical.score,
        fundamental: rec.fundamental.score,
        news: rec.news.score,
        earnings: rec.earnings.score,
        sns: rec.sns.score,
        risk: rec.risk.score,
      },
    });
  }

  return rec;
}

/** 非同期（APIキー利用・詳細画面） */
export async function buildStockRecommendationAsync(
  stock: StockFundamentals,
  opts: RecommendationOptions = {},
): Promise<StockRecommendation> {
  const apiKeys = opts.apiKeys ?? {
    newsApiKey: '',
    snsApiKey: '',
    earningsApiKey: '',
    redditApiKey: '',
    xApiKey: '',
  };
  let aiState = opts.aiState ?? (await loadAiLearningState());
  aiState = await evaluateOutcomesAndAdjustWeights((symbol, _market) => findStock(symbol)?.price);
  const weights = getActiveWeights(aiState);
  const aiNote = formatAiLearningNote(aiState);

  const [newsDetail, earningsDetail] = await Promise.all([
    analyzeNews(stock, apiKeys),
    analyzeEarnings(stock, apiKeys),
  ]);
  const snsDetail = analyzeSnsSync(stock);

  const rec = assembleRecommendation(stock, opts, newsDetail, earningsDetail, snsDetail, weights, aiNote);

  if (opts.recordLearning !== false) {
    void recordRecommendationOutcome({
      symbol: stock.symbol,
      market: stock.market,
      recommendedAt: new Date().toISOString(),
      totalScore: rec.totalScore,
      priceAtRecommendation: stock.price,
      factorScores: {
        technical: rec.technical.score,
        fundamental: rec.fundamental.score,
        news: rec.news.score,
        earnings: rec.earnings.score,
        sns: rec.sns.score,
        risk: rec.risk.score,
      },
    });
  }

  return rec;
}

export { loadAiLearningState, evaluateOutcomesAndAdjustWeights };
