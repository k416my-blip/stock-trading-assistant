/**
 * AI四季報 実データ取得（Yahoo Finance → Twelve Data → News API）
 * モック値は使用しない。失敗時は null + 「データ未取得」表示。
 */
import { MARKET_LABEL } from '../constants/rakutenTrade';
import { SESSION_STATUS_LABEL } from '../constants/marketSession';
import { findStock } from '../data/sampleStocks';
import type { Currency, Market, PortfolioPosition } from '../types';
import type { AiStockReportDataSourceStatus } from '../types/aiStockReport';
import { getMarketSession } from './marketSession';
import { getQuoteForMarket, getDailyOHLCV } from './marketDataService';
import { fetchYahooFinanceFundamentals, type YahooFundamentalsResult } from './quoteProviders/yahooFinanceFundamentals';
import { fetchYahooFinanceQuote } from './quoteProviders/yahooFinanceQuote';
import { normalizeYahooSymbol } from '../utils/normalizeYahooSymbol';
import { getYahooChartResult, parseYahooChartBars } from '../utils/yahooChartParser';
import { fetchBursaDisclosureBundle } from './bursa/bursaDisclosureService';
import { buildBursaPhase3Analysis } from './bursa/bursaPhase3Analysis';
import { buildBursaPhase4Analysis } from './bursa/bursaPhase4Analysis';
import { buildBursaPhase5Analysis } from './bursa/bursaPhase5Analysis';
import type { BursaDisclosureBundle, BursaPhase3Analysis, BursaPhase4Analysis, BursaPhase5Analysis } from '../types/bursaDisclosure';

export const SHIKIHO_MISSING_JA = 'データ未取得';

const NEWS_API_TIMEOUT_MS = 10_000;

export type AiStockReportRawData = {
  symbol: string;
  market: Market;
  currency: Currency;
  yahoo: YahooFundamentalsResult;
  currentPrice: number | null;
  volume: number | null;
  marketStatusJa: string | null;
  newsHeadlines: { title: string; sentiment: 'positive' | 'negative' | 'neutral' }[];
  positiveNewsCount: number;
  negativeNewsCount: number;
  fetchedFields: string[];
  missingFields: string[];
  sourceStatus: AiStockReportDataSourceStatus;
  apiLimitNotes: string[];
  bursa: BursaDisclosureBundle | null;
  bursaPhase3: BursaPhase3Analysis | null;
  bursaPhase4: BursaPhase4Analysis | null;
  bursaPhase5: BursaPhase5Analysis | null;
};

export function marketLabelFor(market: Market): string {
  return MARKET_LABEL[market];
}

function resolveCurrency(
  symbol: string,
  market: Market,
  holding?: PortfolioPosition | null,
): Currency {
  if (holding?.currency) return holding.currency;
  const sample = findStock(symbol);
  if (sample?.currency) return sample.currency;
  if (market === 'bursa') return 'MYR';
  if (market === 'hk') return 'HKD';
  return 'USD';
}

function newsSentiment(title: string): 'positive' | 'negative' | 'neutral' {
  const POSITIVE = /\b(surge|rally|beat|growth|profit|upgrade|record|strong|上昇|好調|増益)\b/i;
  const NEGATIVE = /\b(fall|drop|miss|loss|downgrade|weak|lawsuit|cut|下落|減益|訴訟|risk)\b/i;
  if (POSITIVE.test(title)) return 'positive';
  if (NEGATIVE.test(title)) return 'negative';
  return 'neutral';
}

async function fetchNewsForShikiho(input: {
  symbol: string;
  companyName: string | null;
  newsApiKey?: string;
}): Promise<{
  headlines: AiStockReportRawData['newsHeadlines'];
  positive: number;
  negative: number;
  status: AiStockReportDataSourceStatus['newsApi'];
}> {
  const key = input.newsApiKey?.trim();
  if (!key) {
    return {
      headlines: [],
      positive: 0,
      negative: 0,
      status: 'skipped',
    };
  }

  const q = encodeURIComponent(`${input.companyName ?? ''} ${input.symbol}`.trim());
  const url = `https://newsapi.org/v2/everything?q=${q}&language=en&sortBy=publishedAt&pageSize=6&apiKey=${encodeURIComponent(key)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NEWS_API_TIMEOUT_MS);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (res.status === 429) {
      return { headlines: [], positive: 0, negative: 0, status: 'failed' };
    }
    if (!res.ok) {
      return { headlines: [], positive: 0, negative: 0, status: 'failed' };
    }
    const json = (await res.json()) as { articles?: Array<{ title?: string }> };
    const headlines = (json.articles ?? [])
      .map((a) => a.title?.trim())
      .filter((t): t is string => Boolean(t))
      .slice(0, 6)
      .map((title) => ({ title, sentiment: newsSentiment(title) }));

    if (headlines.length === 0) {
      return { headlines: [], positive: 0, negative: 0, status: 'partial' };
    }

    const positive = headlines.filter((h) => h.sentiment === 'positive').length;
    const negative = headlines.filter((h) => h.sentiment === 'negative').length;
    return { headlines, positive, negative, status: 'ok' };
  } catch {
    return { headlines: [], positive: 0, negative: 0, status: 'failed' };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchTwelveDataFields(input: {
  symbol: string;
  market: Market;
  currency: Currency;
  apiKey?: string;
}): Promise<{
  currentPrice: number | null;
  volume: number | null;
  status: AiStockReportDataSourceStatus['twelveData'];
}> {
  const key = input.apiKey?.trim();
  if (!key) {
    return { currentPrice: null, volume: null, status: 'skipped' };
  }

  try {
    const quote = await getQuoteForMarket(key, input.market, input.symbol, input.currency, {
      timeoutMs: 10_000,
      maxTotalMs: 15_000,
    });
    let volume: number | null = null;
    try {
      const ohlcv = await getDailyOHLCV(key, input.market, input.symbol, 5);
      const last = ohlcv.bars[ohlcv.bars.length - 1];
      if (last?.volume != null && Number.isFinite(last.volume)) {
        volume = last.volume;
      }
    } catch {
      /* volume optional */
    }

    return {
      currentPrice: quote.price > 0 ? quote.price : null,
      volume,
      status: quote.price > 0 ? (volume != null ? 'ok' : 'partial') : 'failed',
    };
  } catch {
    return { currentPrice: null, volume: null, status: 'failed' };
  }
}

async function fetchYahooPriceVolumeFallback(
  symbol: string,
  market: Market,
  currency: Currency,
): Promise<{ currentPrice: number | null; volume: number | null }> {
  try {
    const yahooSymbol = normalizeYahooSymbol(symbol, market);
    const quote = await fetchYahooFinanceQuote(yahooSymbol, currency, 10_000);
    let volume: number | null = null;
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=5d&interval=1d`;
      const res = await fetch(url);
      if (res.ok) {
        const json = (await res.json()) as unknown;
        const result = getYahooChartResult(json);
        const bars = parseYahooChartBars(result);
        const last = bars[bars.length - 1];
        if (last?.volume) volume = last.volume;
      }
    } catch {
      /* optional */
    }
    return {
      currentPrice: quote.price > 0 ? quote.price : null,
      volume,
    };
  } catch {
    return { currentPrice: null, volume: null };
  }
}

function buildApiLimitNotes(input: {
  twelveSkipped: boolean;
  newsSkipped: boolean;
  yahooOk: boolean;
  bursaFetched: boolean;
  market: Market;
}): string[] {
  const notes: string[] = [
    'Yahoo Finance: APIキー不要。quoteSummary は非公式エンドポイント（403/429時はブロックの可能性）',
    'Twelve Data: 無料枠 約8 req/min・800 req/日。本アプリはFIFOキューで制御',
    'News API: 無料 Developer 100 req/日。Business以上は有料',
  ];
  if (input.market === 'bursa') {
    notes.push(
      'Bursa Malaysia Phase 1: KLSE Screener HTML（APIキー不要・非公式）。公式 Bursa API は Cloudflare 保護',
    );
  }
  if (input.twelveSkipped) {
    notes.push('Twelve Data APIキー未設定 — 価格・出来高はYahooフォールバックまたは未取得');
  }
  if (input.newsSkipped) {
    notes.push('News APIキー未設定 — ニュースセクションは未取得');
  }
  if (!input.yahooOk) {
    notes.push('Yahoo Finance取得失敗 — 財務・企業概要の多くが未取得になる可能性');
  }
  if (input.market === 'bursa' && !input.bursaFetched) {
    notes.push('Bursa/KLSE 取得失敗 — Bursaセクションはデータ未取得');
  }
  return notes;
}

function bursaSourceStatus(bundle: BursaDisclosureBundle | null): AiStockReportDataSourceStatus['bursaMalaysia'] {
  if (!bundle) return 'skipped';
  if (bundle.dataSource === 'none') return 'failed';
  const okCount =
    (bundle.profile.status === 'ok' || bundle.profile.status === 'cached' ? 1 : 0) +
    (bundle.quarterly.status === 'ok' || bundle.quarterly.status === 'cached' ? 1 : 0) +
    (bundle.dividend.status === 'ok' || bundle.dividend.status === 'cached' ? 1 : 0);
  if (okCount >= 2) return 'ok';
  if (okCount >= 1) return 'partial';
  return 'failed';
}

export async function fetchAiStockReportData(input: {
  symbol: string;
  market: Market;
  holding?: PortfolioPosition | null;
  twelveDataApiKey?: string;
  newsApiKey?: string;
}): Promise<AiStockReportRawData> {
  const currency = resolveCurrency(input.symbol, input.market, input.holding);
  const session = getMarketSession(input.market);
  const marketStatusJa = SESSION_STATUS_LABEL[session.status];

  const yahoo = await fetchYahooFinanceFundamentals(input.symbol, input.market);

  const [twelve, news, bursa] = await Promise.all([
    fetchTwelveDataFields({
      symbol: input.symbol,
      market: input.market,
      currency,
      apiKey: input.twelveDataApiKey,
    }),
    fetchNewsForShikiho({
      symbol: input.symbol,
      companyName: input.holding?.companyName ?? yahoo.companyName,
      newsApiKey: input.newsApiKey,
    }),
    input.market === 'bursa' ? fetchBursaDisclosureBundle(input.symbol) : Promise.resolve(null),
  ]);

  let currentPrice = twelve.currentPrice;
  let volume = twelve.volume;
  let twelveStatus = twelve.status;

  if (currentPrice == null) {
    const yahooPv = await fetchYahooPriceVolumeFallback(input.symbol, input.market, currency);
    if (currentPrice == null && yahooPv.currentPrice != null) {
      currentPrice = yahooPv.currentPrice;
      twelveStatus = twelveStatus === 'skipped' ? 'partial' : 'partial';
    }
    if (volume == null && yahooPv.volume != null) {
      volume = yahooPv.volume;
    }
  }

  const yahooStatus: AiStockReportDataSourceStatus['yahooFinance'] =
    yahoo.ok && yahoo.fetched.length >= 4
      ? 'ok'
      : yahoo.ok
        ? 'partial'
        : 'failed';

  const fetchedFields: string[] = [];
  const missingFields: string[] = [];

  for (const f of yahoo.fetched) {
    fetchedFields.push(`yahoo.${f}`);
  }
  for (const f of yahoo.missing) {
    missingFields.push(`yahoo.${f}`);
  }
  if (currentPrice != null) fetchedFields.push('twelve.currentPrice');
  else missingFields.push('twelve.currentPrice');
  if (volume != null) fetchedFields.push('twelve.volume');
  else missingFields.push('twelve.volume');
  fetchedFields.push('market.status');
  if (news.headlines.length > 0) {
    fetchedFields.push('news.headlines', 'news.sentimentCounts');
  } else if (news.status !== 'skipped') {
    missingFields.push('news.headlines');
  }

  if (bursa) {
    fetchedFields.push(...bursa.fetchedFields);
    missingFields.push(...bursa.missingFields);
  } else if (input.market === 'bursa') {
    missingFields.push('bursa.all');
  }

  const bursaStatus = input.market === 'bursa' ? bursaSourceStatus(bursa) : 'skipped';

  let bursaPhase3: BursaPhase3Analysis | null = null;
  if (bursa && input.market === 'bursa' && bursa.dataSource !== 'none') {
    try {
      bursaPhase3 = await buildBursaPhase3Analysis(bursa);
      fetchedFields.push(...bursaPhase3.fetchedFields);
      missingFields.push(...bursaPhase3.missingFields);
    } catch {
      missingFields.push('phase3.all');
    }
  }

  let bursaPhase4: BursaPhase4Analysis | null = null;
  if (bursa && input.market === 'bursa' && bursa.dataSource !== 'none') {
    try {
      bursaPhase4 = await buildBursaPhase4Analysis({
        bundle: bursa,
        phase3: bursaPhase3,
        negativeNewsCount: news.negative,
      });
      fetchedFields.push(...bursaPhase4.fetchedFields);
      missingFields.push(...bursaPhase4.missingFields);
    } catch {
      missingFields.push('phase4.all');
    }
  }

  let bursaPhase5: BursaPhase5Analysis | null = null;
  if (bursa && input.market === 'bursa' && bursa.dataSource !== 'none') {
    try {
      bursaPhase5 = buildBursaPhase5Analysis({
        bundle: bursa,
        phase3: bursaPhase3,
        currentPrice,
      });
      fetchedFields.push(...bursaPhase5.fetchedFields);
      missingFields.push(...bursaPhase5.missingFields);
    } catch {
      missingFields.push('phase5.all');
    }
  }

  return {
    symbol: input.symbol,
    market: input.market,
    currency,
    yahoo,
    currentPrice,
    volume,
    marketStatusJa,
    newsHeadlines: news.headlines,
    positiveNewsCount: news.positive,
    negativeNewsCount: news.negative,
    fetchedFields,
    missingFields,
    bursa,
    bursaPhase3,
    bursaPhase4,
    bursaPhase5,
    sourceStatus: {
      yahooFinance: yahooStatus,
      twelveData: twelveStatus,
      newsApi: news.status,
      bursaMalaysia: bursaStatus,
    },
    apiLimitNotes: buildApiLimitNotes({
      twelveSkipped: twelve.status === 'skipped',
      newsSkipped: news.status === 'skipped',
      yahooOk: yahoo.ok,
      bursaFetched: bursa != null && bursa.dataSource !== 'none',
      market: input.market,
    }),
  };
}
