/**
 * AIコンシェルジュ向け実データ根拠 — 市場・ニュース・X・保有
 */
import type { AppState, Market, PortfolioPosition, StockFundamentals } from '../types';
import type { AnalysisApiKeys } from './analysisApiKeys';
import type { ConciergeEvidenceBundle, ConciergeSymbolEvidence } from '../types/conciergeEvidence';
import {
  AI_ANALYSIS_MODE_LABELS_JA,
  type AiAnalysisMode,
} from '../constants/aiDataDriven';
import { X_SYMBOL_CACHE_TTL_MS } from '../constants/xApiConservation';
import { findStock, getSamplePriceHistory } from '../data/sampleStocks';
import { formatSymbolDisplay } from '../utils/formatSymbolDisplay';
import { getActivePortfolio } from './portfolioPriceUpdate';
import { analyzeNews } from './analysis/newsAnalysis';
import { fetchFreeNewsFallback } from './freeNewsFallback';
import { getCachedNewsForSymbol, setCachedNewsForSymbol } from './newsCacheStorage';
import {
  analyzeXSentimentOnUserRequest,
  loadCachedXSentimentForStock,
} from './xSentimentAnalysis';
import { extractSymbolsForXLookup, userMessageRequestsXInsight } from './xApiIntent';
import { detectUnusualActivityForSymbol } from './conciergeAnomalyDetector';
import { buildConciergeActionGuide } from './conciergeActionGuideBuilder';
import { attachRiskControlToEvidence } from './conciergeRiskControlBuilder';
import { orchestrateApiRequest } from './apiRequestOrchestrator';
import { recordNewsApiCall } from './apiCostTracker';

const MAX_SYMBOLS = 3;

function normalizeSym(symbol: string): string {
  return symbol.trim().toUpperCase().replace(/\.(KL|HK|US)$/i, '');
}

function dayChangePct(bars: { close: number }[]): { previousClose: number | null; pct: number | null } {
  if (bars.length < 2) return { previousClose: null, pct: null };
  const previousClose = bars[bars.length - 2].close;
  const last = bars[bars.length - 1].close;
  if (previousClose <= 0) return { previousClose, pct: null };
  return { previousClose, pct: ((last - previousClose) / previousClose) * 100 };
}

function volumeFromBars(bars: { volume: number }[]): number | null {
  if (bars.length === 0) return null;
  return bars[bars.length - 1].volume;
}

function volumeSurgeRatio(bars: { volume: number }[]): number | null {
  if (bars.length < 10) return null;
  const volumes = bars.map((b) => b.volume);
  const recent = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
  const prior = volumes.slice(-10, -5).reduce((a, b) => a + b, 0) / 5;
  if (prior <= 0) return null;
  return recent / prior;
}

function toStockFundamentals(
  symbol: string,
  market: Market,
  companyName: string,
  price: number,
  volume: number,
): StockFundamentals {
  return {
    symbol,
    name: companyName,
    market,
    currency: market === 'us' ? 'USD' : market === 'hk' ? 'HKD' : 'MYR',
    price,
    dividendYield: 0,
    per: 0,
    marketCap: 0,
    volume,
    category: 'growth',
    beginnerFriendly: false,
  };
}

function resolveTargets(
  userMessage: string,
  holdings: PortfolioPosition[],
): Array<{ symbol: string; market: Market; position?: PortfolioPosition }> {
  const active = holdings.filter((p) => (p.shares ?? 0) > 0);
  const heldBrief = active.map((p) => ({ symbol: p.symbol, market: p.market }));
  const fromMsg = extractSymbolsForXLookup(userMessage, heldBrief);
  const out = new Map<string, { symbol: string; market: Market; position?: PortfolioPosition }>();

  for (const t of fromMsg) {
    const pos = active.find((p) => normalizeSym(p.symbol) === normalizeSym(t.symbol));
    out.set(normalizeSym(t.symbol), {
      symbol: pos?.symbol ?? t.symbol,
      market: pos?.market ?? t.market,
      position: pos,
    });
  }

  if (out.size === 0) {
    for (const p of active.slice(0, MAX_SYMBOLS)) {
      out.set(normalizeSym(p.symbol), { symbol: p.symbol, market: p.market, position: p });
    }
  }

  return [...out.values()].slice(0, MAX_SYMBOLS);
}

async function loadNewsEvidence(
  stock: StockFundamentals,
  apiKeys: AnalysisApiKeys,
): Promise<{
  headlines: ConciergeSymbolEvidence['latestFinancialNews'];
  newsSummaryJa: string;
  newsSource: string;
  fromCache: boolean;
}> {
  const cached = await getCachedNewsForSymbol(stock.market, stock.symbol);
  if (cached) {
    return {
      headlines: cached.headlines,
      newsSummaryJa: cached.newsSummaryJa,
      newsSource: `${cached.newsSource}（キャッシュ30分）`,
      fromCache: true,
    };
  }

  const dedupeKey = `news:${stock.market}:${stock.symbol.toUpperCase()}`;
  const [news, freeNews] = await orchestrateApiRequest(dedupeKey, () =>
    Promise.all([analyzeNews(stock, apiKeys), fetchFreeNewsFallback(stock, apiKeys)]),
  );
  recordNewsApiCall(1);

  const fetchedAtIso = new Date().toISOString();
  const headlines =
    freeNews.headlines.length > 0
      ? freeNews.headlines.map((h) => ({
          title: h.title,
          sentiment: h.sentiment,
          fetchedAtIso,
          ageSeconds: 0,
        }))
      : news.headlines.map((h) => ({
          title: h.title,
          sentiment: h.sentiment,
          fetchedAtIso,
          ageSeconds: 0,
        }));

  const newsSummaryJa =
    freeNews.headlines.length > 0
      ? freeNews.summaryJa
      : news.summary || `ニュース評価: ${news.sentiment}`;

  const newsSource =
    freeNews.headlines.length > 0 ? freeNews.primarySource : news.source === 'available' ? 'News API' : '推定';

  await setCachedNewsForSymbol({
    symbol: stock.symbol,
    market: stock.market,
    headlines,
    newsSummaryJa,
    newsSource,
  });

  return { headlines, newsSummaryJa, newsSource, fromCache: false };
}

async function loadXEvidence(
  stock: StockFundamentals,
  apiKeys: AnalysisApiKeys,
  fetchLive: boolean,
): Promise<ConciergeSymbolEvidence['xSentiment']> {
  if (fetchLive) {
    const sns = await analyzeXSentimentOnUserRequest(stock, apiKeys);
    const xs = sns.xSentiment;
    if (!xs) return null;
    return {
      postCount: xs.postCount,
      bullishPct: xs.sentimentPct.bullish,
      bearishPct: xs.sentimentPct.bearish,
      panicPct: xs.sentimentPct.panic,
      hypePct: xs.sentimentPct.hype,
      trendWords: xs.trendWords,
      postSurgeRatePct: xs.postSurgeRatePct,
      summaryJa: xs.summaryJa,
      analysisBasis: xs.analysisBasis,
      fromCache: xs.fromCache,
      fetchedAtIso: new Date().toISOString(),
      ageSeconds: 0,
    };
  }

  const cached = await loadCachedXSentimentForStock(stock);
  if (!cached) return null;
  const fetchedAtIso = cached.fetchedAt ?? new Date().toISOString();
  const ageSeconds = Math.max(0, Math.floor((Date.now() - Date.parse(fetchedAtIso)) / 1000));
  return {
    postCount: cached.postCount,
    bullishPct: cached.sentimentPct.bullish,
    bearishPct: cached.sentimentPct.bearish,
    panicPct: cached.sentimentPct.panic,
    hypePct: cached.sentimentPct.hype,
    trendWords: cached.trendWords,
    postSurgeRatePct: cached.postSurgeRatePct,
    summaryJa: cached.summaryJa,
    analysisBasis: cached.analysisBasis,
    fromCache: true,
    fetchedAtIso,
    ageSeconds,
  };
}

async function buildSymbolEvidence(
  target: { symbol: string; market: Market; position?: PortfolioPosition },
  userMessage: string,
  apiKeys: AnalysisApiKeys,
  fetchXLive: boolean,
): Promise<ConciergeSymbolEvidence> {
  const sample = findStock(target.symbol);
  const companyName = sample?.name ?? target.position?.symbol ?? target.symbol;
  const bars = getSamplePriceHistory(normalizeSym(target.symbol));
  const { previousClose, pct: barPct } = dayChangePct(bars);
  const pos = target.position;
  const currentPrice = pos?.currentPrice ?? sample?.price ?? bars.at(-1)?.close ?? null;
  const volRatio = volumeSurgeRatio(bars);
  const volume = volumeFromBars(bars) ?? sample?.volume ?? null;

  let unrealizedPnlPct: number | null = null;
  if (pos && pos.averageBuyPrice > 0 && currentPrice != null) {
    unrealizedPnlPct = ((currentPrice - pos.averageBuyPrice) / pos.averageBuyPrice) * 100;
  }

  const stock = toStockFundamentals(
    target.symbol,
    target.market,
    companyName,
    currentPrice ?? 0,
    volume ?? 0,
  );

  const news = await loadNewsEvidence(stock, apiKeys);
  const xSentiment = await loadXEvidence(stock, apiKeys, fetchXLive);
  const trendingKeywords = [
    ...news.headlines.slice(0, 2).map((h) => h.title.split(/\s+/).slice(0, 4).join(' ')),
    ...(xSentiment?.trendWords ?? []),
  ].filter(Boolean);

  const dataGapsJa: string[] = [];
  if (news.headlines.length === 0) dataGapsJa.push('ニュース見出し未取得');
  if (!xSentiment) dataGapsJa.push('Xセンチメント未取得（キャッシュなし・今回未取得）');
  if (currentPrice == null) dataGapsJa.push('現在株価不明');
  if (previousClose == null) dataGapsJa.push('前日終値不明');

  const intradayChangePct =
    barPct ??
    (previousClose != null && currentPrice != null && previousClose > 0
      ? ((currentPrice - previousClose) / previousClose) * 100
      : null);

  const unusualActivityFlags = detectUnusualActivityForSymbol({
    intradayChangePct,
    volumeSurgeRatio: volRatio,
    xSentiment,
  });

  return {
    symbol: target.symbol,
    companyName,
    market: target.market,
    displayLabelJa: formatSymbolDisplay({
      symbol: target.symbol,
      market: target.market,
      companyName,
    }),
    currentPrice,
    previousClose,
    intradayChangePct,
    volume,
    volumeSurgeRatio: volRatio,
    quoteAgeSeconds: pos?.quoteAgeSeconds ?? null,
    quoteIsStale: pos?.isStale ?? false,
    portfolioHolding: pos
      ? {
          shares: pos.shares,
          averageBuyPrice: pos.averageBuyPrice,
          unrealizedPnlPct,
        }
      : null,
    latestFinancialNews: news.headlines,
    newsSummaryJa: news.newsSummaryJa,
    newsSource: news.newsSource,
    xSentiment,
    trendingKeywords: [...new Set(trendingKeywords)].slice(0, 8),
    unusualActivityFlags,
    dataGapsJa,
  };
}

export type BuildConciergeEvidenceInput = {
  state: AppState;
  userMessage: string;
  apiKeys: AnalysisApiKeys;
  analysisMode: AiAnalysisMode;
};

export async function buildConciergeEvidenceBundle(
  input: BuildConciergeEvidenceInput,
): Promise<ConciergeEvidenceBundle> {
  const holdings = getActivePortfolio(input.state);
  const targets = resolveTargets(input.userMessage, holdings);
  const fetchXLive = userMessageRequestsXInsight(input.userMessage);
  const cacheNotesJa = [
    `X: キャッシュ${Math.round(X_SYMBOL_CACHE_TTL_MS / 60000)}分${fetchXLive ? '・質問時に未取得分を取得' : '・キャッシュのみ'}`,
    'ニュース: キャッシュ30分',
    '株価: 保有のライブ更新（1〜5分間隔）',
  ];

  const symbols: ConciergeSymbolEvidence[] = [];
  for (let i = 0; i < targets.length; i++) {
    const fetchX = fetchXLive && i === 0;
    symbols.push(
      await buildSymbolEvidence(targets[i], input.userMessage, input.apiKeys, fetchX),
    );
  }

  const flagCount = symbols.reduce((n, s) => n + s.unusualActivityFlags.length, 0);
  const globalSummaryJa =
    symbols.length === 0
      ? '対象銘柄を特定できませんでした。銘柄コードを含めて質問してください。'
      : `${symbols.length}銘柄の実データを添付（分析モード: ${AI_ANALYSIS_MODE_LABELS_JA[input.analysisMode]}）` +
        (flagCount > 0 ? ` · 異常フラグ ${flagCount}件` : '');

  const partial = {
    generatedAt: new Date().toISOString(),
    analysisMode: input.analysisMode,
    symbols,
    globalSummaryJa,
    cacheNotesJa,
  };
  return attachRiskControlToEvidence({
    ...partial,
    actionGuide: buildConciergeActionGuide(partial),
  });
}

/** 自発通知用 — 保有銘柄をキャッシュのみでスキャン（X APIは呼ばない） */
export async function buildConciergeEvidenceForProactive(
  state: AppState,
  apiKeys: AnalysisApiKeys,
  analysisMode: AiAnalysisMode,
): Promise<ConciergeEvidenceBundle> {
  const holdings = getActivePortfolio(state).filter((p) => (p.shares ?? 0) > 0);
  const targets = holdings.map((p) => ({
    symbol: p.symbol,
    market: p.market,
    position: p,
  }));
  const symbols: ConciergeSymbolEvidence[] = [];
  for (const t of targets) {
    symbols.push(await buildSymbolEvidence(t, '', apiKeys, false));
  }
  const flagCount = symbols.reduce((n, s) => n + s.unusualActivityFlags.length, 0);
  const partial = {
    generatedAt: new Date().toISOString(),
    analysisMode,
    symbols,
    globalSummaryJa:
      flagCount > 0
        ? `保有${symbols.length}銘柄で異常フラグ ${flagCount}件`
        : `保有${symbols.length}銘柄 — 大きな異常なし`,
    cacheNotesJa: ['自発スキャン: Xライブ取得なし・ニュース/Xはキャッシュのみ'],
  };
  return attachRiskControlToEvidence({
    ...partial,
    actionGuide: buildConciergeActionGuide(partial),
  });
}
