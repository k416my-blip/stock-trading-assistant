import { fetchWithTimeout } from './providerFetchUtil';

export type YahooSearchQuote = {
  symbol: string;
  exchange: string;
  shortname: string;
  longname?: string;
  quoteType?: string;
  score?: number;
};

type YahooSearchResponse = {
  quotes?: Array<{
    symbol?: string;
    exchange?: string;
    shortname?: string;
    longname?: string;
    quoteType?: string;
    score?: number;
    exchDisp?: string;
  }>;
};

export function buildYahooSearchUrl(query: string): string {
  const url = new URL('https://query1.finance.yahoo.com/v1/finance/search');
  url.searchParams.set('q', query.trim());
  url.searchParams.set('quotesCount', '12');
  url.searchParams.set('newsCount', '0');
  return url.toString();
}

function parseSearchQuotes(data: YahooSearchResponse): YahooSearchQuote[] {
  const raw = data.quotes ?? [];
  const out: YahooSearchQuote[] = [];
  for (const q of raw) {
    const symbol = q.symbol?.trim();
    if (!symbol) continue;
    out.push({
      symbol,
      exchange: String(q.exchange ?? '').trim(),
      shortname: String(q.shortname ?? q.longname ?? '').trim(),
      longname: q.longname?.trim(),
      quoteType: q.quoteType,
      score: typeof q.score === 'number' ? q.score : undefined,
    });
  }
  return out;
}

/** Bursa Malaysia（KLS / .KL）候補を優先して1件選択 */
export function pickBursaMalaysiaSearchQuote(
  quotes: YahooSearchQuote[],
  coreSymbol: string,
): YahooSearchQuote | null {
  const core = coreSymbol.trim().toUpperCase().replace(/\.KL$/i, '');
  const bursa = quotes.filter((q) => isBursaMalaysiaQuote(q));
  if (bursa.length === 0) return null;

  const exactKl = bursa.find((q) => q.symbol.toUpperCase() === `${core}.KL`);
  if (exactKl) return exactKl;

  const numericMatch = bursa.find((q) => {
    const symCore = q.symbol.toUpperCase().replace(/\.KL$/i, '');
    return symCore === core;
  });
  if (numericMatch) return numericMatch;

  const sorted = [...bursa].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  return sorted[0] ?? null;
}

export function isBursaMalaysiaQuote(q: YahooSearchQuote): boolean {
  const sym = q.symbol.toUpperCase();
  const ex = q.exchange.toUpperCase();
  if (sym.endsWith('.KL')) return true;
  if (ex === 'KLS' || ex === 'KLSE') return true;
  return false;
}

export async function searchYahooFinance(
  query: string,
  timeoutMs?: number,
): Promise<YahooSearchQuote[]> {
  const url = buildYahooSearchUrl(query);
  console.log('[yahoo-search] REQUEST_URL', { query, url });

  const response = await fetchWithTimeout(url, {
    timeoutMs,
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; StockTradingAssistant/1.0)',
    },
  });

  const bodyText = await response.text();
  console.log('[yahoo-search] RESPONSE', {
    query,
    httpStatus: response.status,
    responseBodyFull: bodyText,
  });

  if (!response.ok) {
    return [];
  }

  let data: YahooSearchResponse;
  try {
    data = JSON.parse(bodyText) as YahooSearchResponse;
  } catch {
    return [];
  }

  const quotes = parseSearchQuotes(data);
  console.log('[yahoo-search] PARSED_QUOTES', {
    query,
    count: quotes.length,
    quotes: quotes.map((q) => ({
      symbol: q.symbol,
      exchange: q.exchange,
      shortname: q.shortname,
      longname: q.longname,
    })),
  });

  return quotes;
}
