/**
 * AI第二評価 — ライブデータ強化（X · 非Twelve RSI · 統合ニュース）
 */
import { AI_SECOND_EVALUATOR_MAX_SYMBOLS } from '../constants/hybridStrategyScore';
import type { ConciergeSymbolEvidence } from '../types/conciergeEvidence';
import type { AiSecondEvaluatorSymbolInput } from '../types/aiSecondEvaluator';
import type { StockFundamentals } from '../types';
import { loadAnalysisApiKeys } from './analysisApiKeys';
import { resolveRsiForAiEvaluator } from './aiSecondEvaluatorRsiResolver';
import { fetchMergedNewsForAiEvaluator } from './aiSecondEvaluatorMergedNews';
import { analyzeXSentimentOnUserRequest, loadCachedXSentimentForStock } from './xSentimentAnalysis';
import { shouldPauseApiRequests, shouldPauseXApi } from './performanceCostRuntime';
import { shouldPauseConciergeAi } from './productionStability/productionStabilityRuntime';

export type EnrichAiSecondEvaluatorOptions = {
  /** 省略時は AI_SECOND_EVALUATOR_MAX_SYMBOLS（全保有上限） */
  maxSymbols?: number;
  degradedMode?: boolean;
  forceRefresh?: boolean;
  quoteMetaBySymbol?: Record<
    string,
    {
      quoteSource?: string | null;
      priceAgeSeconds?: number | null;
      quoteIsStale?: boolean;
    }
  >;
};

function evidenceToStock(sym: ConciergeSymbolEvidence): StockFundamentals {
  return {
    symbol: sym.symbol,
    name: sym.companyName,
    market: sym.market,
    currency: sym.market === 'us' ? 'USD' : sym.market === 'hk' ? 'HKD' : 'MYR',
    price: sym.currentPrice ?? 0,
    dividendYield: 0,
    per: 0,
    marketCap: 0,
    volume: sym.volume ?? 0,
    category: 'growth',
    beginnerFriendly: false,
  };
}

async function resolveXForAiEvaluator(
  stock: StockFundamentals,
  apiKeys: Awaited<ReturnType<typeof loadAnalysisApiKeys>>,
  allowLive: boolean,
  forceRefresh: boolean,
): Promise<{
  xPostCount: number;
  xBullishPct: number;
  xBearishPct: number;
  xSentimentSummaryJa: string;
  xSentimentDisplay: string;
  xPostZeroReason?: string;
  xFetchSource: string;
}> {
  if (!allowLive || shouldPauseXApi()) {
    const cached = await loadCachedXSentimentForStock(stock);
    if (cached && cached.postCount > 0) {
      return {
        xPostCount: cached.postCount,
        xBullishPct: cached.sentimentPct.bullish,
        xBearishPct: cached.sentimentPct.bearish,
        xSentimentSummaryJa: cached.summaryJa,
        xSentimentDisplay: `${cached.summaryJa} (bull=${cached.sentimentPct.bullish}% bear=${cached.sentimentPct.bearish}% posts=${cached.postCount})`,
        xFetchSource: 'x_cache',
      };
    }
    return {
      xPostCount: 0,
      xBullishPct: 0,
      xBearishPct: 0,
      xSentimentSummaryJa: 'Xセンチメント未取得（劣化モード・ライブ取得なし）',
      xSentimentDisplay: 'Xセンチメント未取得（劣化モード・ライブ取得なし）',
      xPostZeroReason: 'degraded_mode — Xライブ取得スキップ',
      xFetchSource: 'skipped',
    };
  }

  const sns = await analyzeXSentimentOnUserRequest(stock, apiKeys, {
    forceRefresh: forceRefresh || true,
  });
  const xs = sns.xSentiment;
  const postCount = xs?.postCount ?? 0;
  const bullish = xs?.sentimentPct.bullish ?? 0;
  const bearish = xs?.sentimentPct.bearish ?? 0;
  const summary = xs?.summaryJa ?? 'Xセンチメント未取得';
  const basis = xs?.analysisBasis ?? 'unknown';
  const display =
    postCount > 0
      ? `${summary} (bull=${bullish}% bear=${bearish}% posts=${postCount})`
      : summary;

  return {
    xPostCount: postCount,
    xBullishPct: bullish,
    xBearishPct: bearish,
    xSentimentSummaryJa: summary,
    xSentimentDisplay: display,
    xPostZeroReason:
      postCount === 0
        ? basis === 'fetched_posts'
          ? 'X API応答0件'
          : `X未取得 — ${basis}`
        : undefined,
    xFetchSource: basis === 'fetched_posts' ? (xs?.fromCache ? 'x_cache' : 'x_live') : basis,
  };
}

export async function buildEnrichedAiSecondEvaluatorInputs(
  evidenceSymbols: ConciergeSymbolEvidence[],
  options: EnrichAiSecondEvaluatorOptions = {},
): Promise<AiSecondEvaluatorSymbolInput[]> {
  const apiKeys = await loadAnalysisApiKeys();
  const allowApi =
    !options.degradedMode && !shouldPauseApiRequests() && !shouldPauseConciergeAi();
  const allowLiveX = allowApi;
  const allowFreshNews = allowApi;
  const forceRefresh = options.forceRefresh ?? false;

  const cap = options.maxSymbols ?? AI_SECOND_EVALUATOR_MAX_SYMBOLS;
  const targets = evidenceSymbols.slice(0, cap);
  const results: AiSecondEvaluatorSymbolInput[] = [];

  for (const sym of targets) {
    const stock = evidenceToStock(sym);
    const [rsiPack, newsPack, xPack] = await Promise.all([
      resolveRsiForAiEvaluator(sym, allowApi),
      allowFreshNews
        ? fetchMergedNewsForAiEvaluator(stock, apiKeys)
        : Promise.resolve({
            headlines: sym.latestFinancialNews.map((n) => ({
              title: n.title,
              source: sym.newsSource,
              sentiment: n.sentiment as 'ポジティブ' | '中立' | 'ネガティブ',
            })),
            newsSummaryJa: sym.newsSummaryJa,
            newsSource: `${sym.newsSource}（evidenceキャッシュ）`,
            sourcesUsed: [sym.newsSource],
            newsApiCount: 0,
            newsApiTitles: [],
          }),
      resolveXForAiEvaluator(stock, apiKeys, allowLiveX, forceRefresh),
    ]);

    const newsCount = newsPack.headlines.length;
    const quoteMeta = options.quoteMetaBySymbol?.[sym.symbol.toUpperCase()];
    results.push({
      symbol: sym.symbol,
      market: sym.market,
      displayLabelJa: sym.displayLabelJa,
      currentPrice: sym.currentPrice,
      portfolioHolding: sym.portfolioHolding,
      rsi14: rsiPack.rsi14,
      rsiSource: rsiPack.rsiSource,
      priceHistoryBars: rsiPack.priceHistoryBars,
      volume: rsiPack.volume,
      volumeSurgeRatio: rsiPack.volumeSurgeRatio,
      volumeSource: rsiPack.volumeSource,
      quoteSource: quoteMeta?.quoteSource ?? null,
      priceAgeSeconds: quoteMeta?.priceAgeSeconds ?? sym.quoteAgeSeconds,
      quoteIsStale: quoteMeta?.quoteIsStale ?? sym.quoteIsStale,
      newsSummaryJa: newsPack.newsSummaryJa,
      newsHeadlines: newsPack.headlines.slice(0, 6).map((h) => h.title),
      newsCount,
      newsSource: newsPack.newsSource,
      newsApiCount: newsPack.newsApiCount,
      newsApiTitles: newsPack.newsApiTitles,
      newsZeroReason:
        newsCount === 0 ? `統合ニュース0件（${newsPack.newsSource}）` : undefined,
      xSentimentSummaryJa: xPack.xSentimentSummaryJa,
      xBullishPct: xPack.xBullishPct,
      xBearishPct: xPack.xBearishPct,
      xPostCount: xPack.xPostCount,
      xSentimentDisplay: xPack.xSentimentDisplay,
      xPostZeroReason: xPack.xPostZeroReason,
      xFetchSource: xPack.xFetchSource,
    });
  }

  return results;
}
