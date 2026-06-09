/**
 * 無料ニュースフォールバック — X API 失敗・402 時の代替
 * Yahoo Finance RSS · Google News RSS · Finnhub · Marketaux
 */
import type { StockFundamentals } from '../types';
import type { NewsSentimentLabel } from '../types/recommendation';
import type { AnalysisApiKeys } from './analysisApiKeys';
import { isUsableApiKey } from './apiKeyValidation';
import { buildRedditSearchRssUrls, fetchRedditRssWithQuality } from './bursa/redditRssQuality';

const FETCH_TIMEOUT_MS = 10_000;
const POSITIVE = /\b(surge|rally|beat|growth|profit|upgrade|record|strong|上昇|好調|増益)\b/i;
const NEGATIVE = /\b(fall|drop|miss|loss|downgrade|weak|lawsuit|cut|下落|減益|訴訟)\b/i;

export type FreeNewsHeadline = {
  title: string;
  source: string;
  sentiment: NewsSentimentLabel;
};

export type FreeNewsFallbackResult = {
  headlines: FreeNewsHeadline[];
  primarySource: string;
  summaryJa: string;
};

function sentimentFromTitle(title: string): NewsSentimentLabel {
  if (POSITIVE.test(title)) return 'ポジティブ';
  if (NEGATIVE.test(title)) return 'ネガティブ';
  return '中立';
}

function parseRssTitles(xml: string, limit: number): string[] {
  const titles: string[] = [];
  const re = /<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null && titles.length < limit) {
    const t = m[1]
      .replace(/<[^>]+>/g, '')
      .trim();
    const lower = t.toLowerCase();
    if (
      t.length > 4 &&
      !lower.includes('yahoo finance') &&
      !lower.startsWith('google news')
    ) {
      titles.push(t);
    }
  }
  return titles;
}

async function fetchTextWithTimeout(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function yahooSymbol(stock: StockFundamentals): string {
  if (stock.market === 'us') return stock.symbol.replace(/\.US$/i, '');
  if (stock.market === 'hk') return `${stock.symbol.replace(/\.HK$/i, '')}.HK`;
  return `${stock.symbol.replace(/\.KL$/i, '')}.KL`;
}

export async function fetchYahooFinanceRss(stock: StockFundamentals): Promise<FreeNewsHeadline[]> {
  const sym = encodeURIComponent(yahooSymbol(stock));
  const url = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${sym}&region=US&lang=en-US`;
  const xml = await fetchTextWithTimeout(url);
  if (!xml) return [];
  return parseRssTitles(xml, 6).map((title) => ({
    title,
    source: 'Yahoo Finance RSS',
    sentiment: sentimentFromTitle(title),
  }));
}

export async function fetchGoogleNewsRss(stock: StockFundamentals): Promise<FreeNewsHeadline[]> {
  const q = encodeURIComponent(`${stock.name} ${stock.symbol} stock`);
  const url = `https://news.google.com/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en`;
  const xml = await fetchTextWithTimeout(url);
  if (!xml) return [];
  return parseRssTitles(xml, 6).map((title) => ({
    title,
    source: 'Google News RSS',
    sentiment: sentimentFromTitle(title),
  }));
}

/** Reddit OAuth 不要 — 公開 search.rss（品質フィルタ付き） */
export function buildRedditSearchRssUrl(stock: StockFundamentals): string {
  const urls = buildRedditSearchRssUrls({
    stockCode: stock.symbol,
    companyName: stock.name !== stock.symbol ? stock.name : null,
  });
  return urls[0] ?? `https://www.reddit.com/search.rss?q=${encodeURIComponent(stock.name)}&sort=new`;
}

export async function fetchRedditSearchRss(stock: StockFundamentals): Promise<FreeNewsHeadline[]> {
  const result = await fetchRedditRssWithQuality({
    stockCode: stock.symbol,
    companyName: stock.name !== stock.symbol ? stock.name : null,
  });
  return result.items.map((item) => ({
    title: item.title,
    source: 'Reddit RSS',
    sentiment: sentimentFromTitle(item.title),
  }));
}

async function fetchFinnhubNews(
  stock: StockFundamentals,
  token: string,
): Promise<FreeNewsHeadline[]> {
  const sym = yahooSymbol(stock).replace(/\.(KL|HK)$/i, '');
  const to = new Date().toISOString().slice(0, 10);
  const from = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const url = `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(sym)}&from=${from}&to=${to}&token=${encodeURIComponent(token)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return [];
    const json = (await res.json()) as Array<{ headline?: string }>;
    return (json ?? [])
      .slice(0, 6)
      .map((row) => row.headline?.trim())
      .filter((t): t is string => Boolean(t))
      .map((title) => ({
        title,
        source: 'Finnhub',
        sentiment: sentimentFromTitle(title),
      }));
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function fetchMarketauxNews(
  stock: StockFundamentals,
  token: string,
): Promise<FreeNewsHeadline[]> {
  const sym = yahooSymbol(stock);
  const url = `https://api.marketaux.com/v1/news/all?symbols=${encodeURIComponent(sym)}&language=en&filter_entities=true&limit=6&api_token=${encodeURIComponent(token)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: Array<{ title?: string }> };
    return (json.data ?? [])
      .map((row) => row.title?.trim())
      .filter((t): t is string => Boolean(t))
      .map((title) => ({
        title,
        source: 'Marketaux',
        sentiment: sentimentFromTitle(title),
      }));
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

function readMarketauxKey(): string {
  if (typeof process === 'undefined' || !process.env) return '';
  return (
    process.env.EXPO_PUBLIC_MARKETAUX_API_KEY?.trim() ||
    process.env.MARKETAUX_API_KEY?.trim() ||
    ''
  );
}

function buildSummary(headlines: FreeNewsHeadline[], primarySource: string): string {
  if (headlines.length === 0) {
    return '無料ニュースソースから見出しを取得できませんでした（推定値を使用）';
  }
  const pos = headlines.filter((h) => h.sentiment === 'ポジティブ').length;
  const neg = headlines.filter((h) => h.sentiment === 'ネガティブ').length;
  const tone = pos > neg ? 'ポジ寄り' : neg > pos ? 'ネガ寄り' : '中立';
  const top = headlines[0]?.title.slice(0, 80) ?? '';
  return `${primarySource}より${headlines.length}件: ${tone} — ${top}${top.length >= 80 ? '…' : ''}`;
}

/**
 * 無料ソースを順に試行。失敗しても空配列で返す（例外なし）。
 */
export async function fetchFreeNewsFallback(
  stock: StockFundamentals,
  apiKeys: AnalysisApiKeys,
): Promise<FreeNewsFallbackResult> {
  const collected: FreeNewsHeadline[] = [];
  const seen = new Set<string>();

  const add = (items: FreeNewsHeadline[]) => {
    for (const item of items) {
      const key = item.title.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      collected.push(item);
      if (collected.length >= 8) return;
    }
  };

  add(await fetchYahooFinanceRss(stock));
  if (collected.length < 4) add(await fetchGoogleNewsRss(stock));

  const finnhubKey = apiKeys.earningsApiKey.trim();
  if (isUsableApiKey(finnhubKey) && collected.length < 6) {
    add(await fetchFinnhubNews(stock, finnhubKey));
  }

  const marketauxKey = apiKeys.newsApiKey.trim() || readMarketauxKey();
  if (isUsableApiKey(marketauxKey) && collected.length < 8) {
    add(await fetchMarketauxNews(stock, marketauxKey));
  }

  const primarySource = collected[0]?.source ?? '推定';
  return {
    headlines: collected,
    primarySource,
    summaryJa: buildSummary(collected, primarySource),
  };
}

export function freeNewsToSnsMetrics(headlines: FreeNewsHeadline[]): {
  buzzScore: number;
  positiveRatePct: number;
  negativeRatePct: number;
} {
  if (headlines.length === 0) {
    return { buzzScore: 35, positiveRatePct: 50, negativeRatePct: 50 };
  }
  const pos = headlines.filter((h) => h.sentiment === 'ポジティブ').length;
  const neg = headlines.filter((h) => h.sentiment === 'ネガティブ').length;
  const n = headlines.length;
  return {
    buzzScore: Math.min(100, 25 + n * 8),
    positiveRatePct: Math.round((pos / n) * 100),
    negativeRatePct: Math.round((neg / n) * 100),
  };
}
