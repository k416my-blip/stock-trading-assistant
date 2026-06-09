/**
 * コンシェルジュ — NewsAPI 失敗時の RSS / Bursa 代替ニュース
 */
import type { StockFundamentals } from '../types';
import type { ConciergeNewsHeadlineEvidence } from '../types/conciergeEvidence';
import type { NewsSentimentLabel } from '../types/recommendation';
import {
  fetchGoogleNewsRss,
  fetchYahooFinanceRss,
  type FreeNewsHeadline,
} from './freeNewsFallback';
import { redactFetchUrl } from './conciergeOperationalFetchLog';

const FETCH_TIMEOUT_MS = 10_000;

export type RssNewsSourceId = 'yahoo_finance' | 'google_news' | 'bursa_announcements';

export type RssSourceProbe = {
  source: RssNewsSourceId;
  url: string;
  ok: boolean;
  count: number;
  error: string | null;
};

function sentimentFromTitle(title: string): NewsSentimentLabel {
  const POSITIVE = /\b(surge|rally|beat|growth|profit|upgrade|record|strong|上昇|好調|増益)\b/i;
  const NEGATIVE = /\b(fall|drop|miss|loss|downgrade|weak|lawsuit|cut|下落|減益|訴訟)\b/i;
  if (POSITIVE.test(title)) return 'ポジティブ';
  if (NEGATIVE.test(title)) return 'ネガティブ';
  return '中立';
}

function parseRssTitles(xml: string, limit: number): string[] {
  const titles: string[] = [];
  const re = /<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null && titles.length < limit) {
    const t = m[1].replace(/<[^>]+>/g, '').trim();
    const lower = t.toLowerCase();
    if (t.length > 4 && !lower.includes('yahoo finance') && !lower.startsWith('google news')) {
      titles.push(t);
    }
  }
  return titles;
}

async function fetchRssUrl(url: string): Promise<{ ok: boolean; xml: string | null; status: number | string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return { ok: false, xml: null, status: res.status };
    return { ok: true, xml: await res.text(), status: res.status };
  } catch (e) {
    const isAbort = e instanceof Error && e.name === 'AbortError';
    return { ok: false, xml: null, status: isAbort ? 'timeout' : 'fetch_error' };
  } finally {
    clearTimeout(timer);
  }
}

function yahooSymbol(stock: StockFundamentals): string {
  if (stock.market === 'us') return stock.symbol.replace(/\.US$/i, '');
  if (stock.market === 'hk') return `${stock.symbol.replace(/\.HK$/i, '')}.HK`;
  return `${stock.symbol.replace(/\.KL$/i, '')}.KL`;
}

export function buildBursaAnnouncementsRssUrl(stock: StockFundamentals): string {
  const core = stock.symbol.replace(/\.(KL|HK|US)$/i, '').trim();
  const q = encodeURIComponent(
    `"${stock.name}" OR ${core} Bursa Malaysia company announcement site:bursamalaysia.com`,
  );
  return `https://news.google.com/rss/search?q=${q}&hl=en-MY&gl=MY&ceid=MY:en`;
}

export async function fetchBursaAnnouncementsRss(stock: StockFundamentals): Promise<FreeNewsHeadline[]> {
  const url = buildBursaAnnouncementsRssUrl(stock);
  const res = await fetchRssUrl(url);
  if (!res.ok || !res.xml) return [];
  return parseRssTitles(res.xml, 6).map((title) => ({
    title,
    source: 'Bursa announcements (Google RSS)',
    sentiment: sentimentFromTitle(title),
  }));
}

function logRssProbe(probe: RssSourceProbe): void {
  console.warn('[RSS_NEWS_FETCH]', JSON.stringify(probe));
}

export async function fetchConciergeRssNews(stock: StockFundamentals): Promise<{
  headlines: ConciergeNewsHeadlineEvidence[];
  sources: RssSourceProbe[];
  primarySource: string;
  summaryJa: string;
}> {
  const yahooUrl = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(yahooSymbol(stock))}&region=US&lang=en-US`;
  const googleUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(`${stock.name} ${stock.symbol} stock`)}&hl=en-US&gl=US&ceid=US:en`;
  const bursaUrl = buildBursaAnnouncementsRssUrl(stock);

  const [yahooItems, googleItems, bursaItems] = await Promise.all([
    fetchYahooFinanceRss(stock),
    fetchGoogleNewsRss(stock),
    stock.market === 'bursa' ? fetchBursaAnnouncementsRss(stock) : Promise.resolve([]),
  ]);

  const probes: RssSourceProbe[] = [
    {
      source: 'yahoo_finance',
      url: redactFetchUrl(yahooUrl),
      ok: yahooItems.length > 0,
      count: yahooItems.length,
      error: yahooItems.length > 0 ? null : '0 headlines',
    },
    {
      source: 'google_news',
      url: redactFetchUrl(googleUrl),
      ok: googleItems.length > 0,
      count: googleItems.length,
      error: googleItems.length > 0 ? null : '0 headlines',
    },
    {
      source: 'bursa_announcements',
      url: redactFetchUrl(bursaUrl),
      ok: bursaItems.length > 0,
      count: bursaItems.length,
      error:
        stock.market !== 'bursa'
          ? 'skipped: non-bursa market'
          : bursaItems.length > 0
            ? null
            : '0 headlines',
    },
  ];
  for (const p of probes) logRssProbe(p);

  const seen = new Set<string>();
  const merged: FreeNewsHeadline[] = [];
  const add = (items: FreeNewsHeadline[]) => {
    for (const item of items) {
      const key = item.title.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
      if (merged.length >= 8) return;
    }
  };
  add(yahooItems);
  add(googleItems);
  add(bursaItems);

  const fetchedAtIso = new Date().toISOString();
  const headlines = merged.map((h) => ({
    title: h.title,
    sentiment: h.sentiment,
    fetchedAtIso,
    ageSeconds: 0,
  }));

  const primarySource =
    merged[0]?.source ??
    (yahooItems.length > 0
      ? 'Yahoo Finance RSS'
      : googleItems.length > 0
        ? 'Google News RSS'
        : 'RSS未取得');

  const summaryJa =
    merged.length > 0
      ? `RSS代替 ${merged.length}件（Yahoo ${yahooItems.length} / Google ${googleItems.length} / Bursa ${bursaItems.length}）`
      : 'RSS代替ニュース未取得';

  return { headlines, sources: probes, primarySource, summaryJa };
}
