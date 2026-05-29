import { loadApiKey } from './apiKeys';
import { normalizeStoredApiKey } from './apiKeyValidation';
import { AI_API_TIMEOUT_MS } from '../constants/aiStrategy';

const STOCK_SYMBOLS = ['AAPL', 'NVDA', 'TSLA', 'MSFT'] as const;
const FETCH_TIMEOUT_MS = 12_000;

export type StockQuoteOperationalResult = {
  symbol: string;
  provider: string;
  price: number | null;
  fetchedAt: string;
  elapsedMs: number;
  ok: boolean;
  error: string | null;
};

export type NewsOperationalResult = {
  ok: boolean;
  elapsedMs: number;
  count: number;
  headlines: Array<{ title: string; source: string; publishedAt: string | null }>;
  error: string | null;
};

export type AiOperationalResult = {
  ok: boolean;
  elapsedMs: number;
  analysisPreview: string | null;
  error: string | null;
};

export type XOperationalResult = {
  ok: boolean;
  elapsedMs: number;
  tweetCount: number;
  sample: Array<{ id: string; text: string }>;
  error: string | null;
};

export type OperationalApiTestReport = {
  generatedAt: string;
  stockQuotes: StockQuoteOperationalResult[];
  news: NewsOperationalResult;
  openAi: AiOperationalResult;
  xApi: XOperationalResult;
  displayRows: OperationalTestDisplayRow[];
};

export type OperationalTestDisplayRow = {
  apiName: string;
  ok: boolean;
  elapsedMs: number;
  detail: string | null;
};

export function buildOperationalTestDisplayRows(report: Omit<OperationalApiTestReport, 'displayRows'>): OperationalTestDisplayRow[] {
  const rows: OperationalTestDisplayRow[] = report.stockQuotes.map((q) => ({
    apiName: `${q.provider} · ${q.symbol}`,
    ok: q.ok,
    elapsedMs: q.elapsedMs,
    detail: q.ok && q.price != null ? `$${q.price.toFixed(2)}` : q.error,
  }));

  rows.push({
    apiName: 'NewsAPI · business',
    ok: report.news.ok,
    elapsedMs: report.news.elapsedMs,
    detail: report.news.ok ? `${report.news.count}件取得` : report.news.error,
  });
  rows.push({
    apiName: 'OpenAI · 分析',
    ok: report.openAi.ok,
    elapsedMs: report.openAi.elapsedMs,
    detail: report.openAi.ok ? report.openAi.analysisPreview : report.openAi.error,
  });
  rows.push({
    apiName: 'X API · recent search',
    ok: report.xApi.ok,
    elapsedMs: report.xApi.elapsedMs,
    detail: report.xApi.ok ? `${report.xApi.tweetCount}件取得` : report.xApi.error,
  });

  return rows;
}

async function timedFetch(url: string, init: RequestInit = {}): Promise<{
  ok: boolean;
  status: number;
  elapsedMs: number;
  bodyText: string;
  json: unknown;
}> {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const bodyText = await res.text();
    let json: unknown = null;
    try {
      json = JSON.parse(bodyText);
    } catch {
      /* raw */
    }
    return { ok: res.ok, status: res.status, elapsedMs: Date.now() - started, bodyText, json };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      elapsedMs: Date.now() - started,
      bodyText: e instanceof Error ? e.message : String(e),
      json: null,
    };
  } finally {
    clearTimeout(timer);
  }
}

function parseFinnhub(json: unknown): number | null {
  const price = Number((json as { c?: number })?.c);
  return Number.isFinite(price) && price > 0 ? price : null;
}

function parseAlphaVantage(json: unknown): number | null {
  const q = (json as { 'Global Quote'?: Record<string, string> })?.['Global Quote'];
  const price = Number(q?.['05. price']);
  return Number.isFinite(price) ? price : null;
}

function parsePolygon(json: unknown): number | null {
  const c = (json as { results?: Array<{ c?: number }> })?.results?.[0]?.c;
  const price = Number(c);
  return Number.isFinite(price) ? price : null;
}

function parseFmp(json: unknown): number | null {
  const row = Array.isArray(json) ? json[0] : json;
  const price = Number(
    (row as { price?: number; regularMarketPrice?: number; close?: number })?.price ??
      (row as { regularMarketPrice?: number })?.regularMarketPrice ??
      (row as { close?: number })?.close,
  );
  return Number.isFinite(price) && price > 0 ? price : null;
}

async function fetchProviderQuote(
  provider: string,
  symbol: string,
  url: string,
  parse: (json: unknown) => number | null,
): Promise<StockQuoteOperationalResult> {
  const fetchedAt = new Date().toISOString();
  const res = await timedFetch(url, { headers: { Accept: 'application/json' } });
  const price = res.json ? parse(res.json) : null;
  return {
    symbol,
    provider,
    price,
    fetchedAt,
    elapsedMs: res.elapsedMs,
    ok: res.ok && price != null,
    error: res.ok && price == null ? 'parse_failed' : !res.ok ? `http_${res.status}` : null,
  };
}

async function runStockQuotes(): Promise<StockQuoteOperationalResult[]> {
  const [
    twelveKey,
    finnhubKey,
    alphaKey,
    polygonKey,
    fmpKey,
  ] = await Promise.all([
    loadApiKey('twelve_data'),
    loadApiKey('finnhub'),
    loadApiKey('alpha_vantage'),
    loadApiKey('polygon'),
    loadApiKey('fmp'),
  ]);

  const results: StockQuoteOperationalResult[] = [];

  for (const symbol of STOCK_SYMBOLS) {
    if (twelveKey.trim()) {
      const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(normalizeStoredApiKey(twelveKey))}`;
      const fetchedAt = new Date().toISOString();
      const res = await timedFetch(url, { headers: { Accept: 'application/json' } });
      const price = Number((res.json as { price?: string | number })?.price);
      const parsed = Number.isFinite(price) ? price : null;
      results.push({
        symbol,
        provider: 'Twelve Data',
        price: parsed,
        fetchedAt,
        elapsedMs: res.elapsedMs,
        ok: res.ok && parsed != null,
        error: res.ok && parsed == null ? 'parse_failed' : !res.ok ? `http_${res.status}` : null,
      });
    } else {
      results.push(missingKeyRow('Twelve Data', symbol));
    }

    if (finnhubKey.trim()) {
      results.push(
        await fetchProviderQuote(
          'Finnhub',
          symbol,
          `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(normalizeStoredApiKey(finnhubKey))}`,
          parseFinnhub,
        ),
      );
    } else {
      results.push(missingKeyRow('Finnhub', symbol));
    }

    if (alphaKey.trim()) {
      results.push(
        await fetchProviderQuote(
          'Alpha Vantage',
          symbol,
          `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(normalizeStoredApiKey(alphaKey))}`,
          parseAlphaVantage,
        ),
      );
      await new Promise((r) => setTimeout(r, 300));
    } else {
      results.push(missingKeyRow('Alpha Vantage', symbol));
    }

    if (polygonKey.trim()) {
      results.push(
        await fetchProviderQuote(
          'Polygon',
          symbol,
          `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(symbol)}/prev?adjusted=true&apiKey=${encodeURIComponent(normalizeStoredApiKey(polygonKey))}`,
          parsePolygon,
        ),
      );
    } else {
      results.push(missingKeyRow('Polygon', symbol));
    }

    if (fmpKey.trim()) {
      results.push(
        await fetchProviderQuote(
          'FMP',
          symbol,
          `https://financialmodelingprep.com/stable/quote?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(normalizeStoredApiKey(fmpKey))}`,
          parseFmp,
        ),
      );
    } else {
      results.push(missingKeyRow('FMP', symbol));
    }
  }

  return results;
}

function missingKeyRow(provider: string, symbol: string): StockQuoteOperationalResult {
  return {
    symbol,
    provider,
    price: null,
    fetchedAt: new Date().toISOString(),
    elapsedMs: 0,
    ok: false,
    error: 'api_key_not_configured',
  };
}

async function runNewsTest(): Promise<NewsOperationalResult> {
  const key = normalizeStoredApiKey(await loadApiKey('newsapi'));
  if (!key) {
    return { ok: false, elapsedMs: 0, count: 0, headlines: [], error: 'api_key_not_configured' };
  }
  const url = `https://newsapi.org/v2/top-headlines?category=business&country=us&pageSize=5&apiKey=${encodeURIComponent(key)}`;
  const res = await timedFetch(url);
  const articles = (res.json as { articles?: Array<{ title?: string; source?: { name?: string }; publishedAt?: string }> })?.articles ?? [];
  return {
    ok: res.ok && articles.length > 0,
    elapsedMs: res.elapsedMs,
    count: articles.length,
    headlines: articles.slice(0, 5).map((a) => ({
      title: a.title ?? '(no title)',
      source: a.source?.name ?? '?',
      publishedAt: a.publishedAt ?? null,
    })),
    error: res.ok && articles.length === 0 ? 'no_articles' : !res.ok ? `http_${res.status}` : null,
  };
}

async function runOpenAiTest(): Promise<AiOperationalResult> {
  const key = normalizeStoredApiKey(await loadApiKey('openai'));
  if (!key) {
    return { ok: false, elapsedMs: 0, analysisPreview: null, error: 'api_key_not_configured' };
  }
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_API_TIMEOUT_MS);
  try {
    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        input: 'AAPLの株価動向を1文で簡潔に分析してください。',
        max_output_tokens: 80,
      }),
      signal: controller.signal,
    });
    const bodyText = await res.text();
    let json: Record<string, unknown> | null = null;
    try {
      json = JSON.parse(bodyText) as Record<string, unknown>;
    } catch {
      /* */
    }
    const text =
      (typeof json?.output_text === 'string' ? json.output_text : null) ??
      (Array.isArray(json?.output)
        ? (json.output as Array<{ content?: Array<{ text?: string }> }>)
            .flatMap((o) => o.content ?? [])
            .find((c) => c.text)?.text
        : null);
    return {
      ok: res.ok && Boolean(text),
      elapsedMs: Date.now() - started,
      analysisPreview: text ? String(text).slice(0, 200) : null,
      error: !res.ok ? `http_${res.status}` : !text ? 'parse_failed' : null,
    };
  } catch (e) {
    return {
      ok: false,
      elapsedMs: Date.now() - started,
      analysisPreview: null,
      error: e instanceof Error ? e.message : String(e),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function runXTest(): Promise<XOperationalResult> {
  const key = normalizeStoredApiKey(await loadApiKey('x'));
  if (!key) {
    return { ok: false, elapsedMs: 0, tweetCount: 0, sample: [], error: 'api_key_not_configured' };
  }
  const bearer = key.replace(/^Bearer\s+/i, '').trim();
  const url = 'https://api.twitter.com/2/tweets/search/recent?query=bitcoin&max_results=10';
  const res = await timedFetch(url, { headers: { Authorization: `Bearer ${bearer}` } });
  const tweets = (res.json as { data?: Array<{ id?: string; text?: string }> })?.data ?? [];
  return {
    ok: res.ok && tweets.length > 0,
    elapsedMs: res.elapsedMs,
    tweetCount: tweets.length,
    sample: tweets.slice(0, 3).map((t) => ({
      id: t.id ?? '',
      text: t.text?.slice(0, 100) ?? '',
    })),
    error: res.ok && tweets.length === 0 ? 'no_tweets' : !res.ok ? `http_${res.status}` : null,
  };
}

export async function runOperationalApiTest(): Promise<OperationalApiTestReport> {
  const stockQuotes = await runStockQuotes();
  const [news, openAi, xApi] = await Promise.all([runNewsTest(), runOpenAiTest(), runXTest()]);
  const base = {
    generatedAt: new Date().toISOString(),
    stockQuotes,
    news,
    openAi,
    xApi,
  };
  const report: OperationalApiTestReport = {
    ...base,
    displayRows: buildOperationalTestDisplayRows(base),
  };
  console.log('[operational-api-test]', JSON.stringify(report, null, 2));
  return report;
}
