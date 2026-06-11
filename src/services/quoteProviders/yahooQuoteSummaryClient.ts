/**
 * Yahoo Finance quoteSummary — crumb 認証付き取得
 */
import { fetchHttpWithRetry } from './providerFetchUtil';

const TIMEOUT_MS = 12_000;
const YAHOO_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

type YahooCrumbSession = {
  cookie: string;
  crumb: string;
  fetchedAt: number;
};

let cachedSession: YahooCrumbSession | null = null;
const SESSION_TTL_MS = 30 * 60 * 1000;

type YahooRaw = { raw?: number | null };

export function parseYahooRawNumber(v: YahooRaw | number | null | undefined): number | null {
  if (v == null) return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const raw = (v as YahooRaw).raw;
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
}

async function bootstrapYahooCrumbSession(): Promise<YahooCrumbSession | null> {
  if (cachedSession && Date.now() - cachedSession.fetchedAt < SESSION_TTL_MS) {
    return cachedSession;
  }

  try {
    const fc = await fetch('https://fc.yahoo.com', {
      headers: { 'User-Agent': YAHOO_UA },
      redirect: 'manual',
    });
    const setCookies = fc.headers.getSetCookie?.() ?? [];
    const cookie = setCookies.map((c) => c.split(';')[0]).join('; ');
    if (!cookie) return null;

    const crumbRes = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
      headers: { 'User-Agent': YAHOO_UA, Cookie: cookie },
    });
    const crumb = (await crumbRes.text()).trim();
    if (!crumbRes.ok || !crumb || crumb.startsWith('{')) return null;

    cachedSession = { cookie, crumb, fetchedAt: Date.now() };
    return cachedSession;
  } catch {
    return null;
  }
}

export async function fetchYahooQuoteSummaryModules(
  yahooSymbol: string,
  modules: string[],
): Promise<{ ok: boolean; json: unknown | null; error?: string }> {
  const session = await bootstrapYahooCrumbSession();
  if (!session) return { ok: false, json: null, error: 'crumb bootstrap failed' };

  const moduleList = modules.join(',');
  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(yahooSymbol)}?modules=${moduleList}&crumb=${encodeURIComponent(session.crumb)}`;

  try {
    const res = await fetchHttpWithRetry(url, {
      timeoutMs: TIMEOUT_MS,
      logLabel: 'yahoo_quote_summary',
      symbol: yahooSymbol,
      headers: {
        'User-Agent': YAHOO_UA,
        Cookie: session.cookie,
        Accept: 'application/json',
      },
    });
    if (!res.response.ok) {
      cachedSession = null;
      return { ok: false, json: null, error: `HTTP ${res.response.status}` };
    }
    return { ok: true, json: JSON.parse(res.bodyText) as unknown };
  } catch (e) {
    cachedSession = null;
    return { ok: false, json: null, error: e instanceof Error ? e.message : 'fetch failed' };
  }
}

export function mapYahooRecommendationKey(key: string | null | undefined): import('../../types/bursaAnalystConsensus').AnalystRatingLabel | null {
  const k = key?.trim().toLowerCase().replace(/\s+/g, '_');
  if (!k) return null;
  if (k === 'strong_buy') return 'Strong Buy';
  if (k === 'buy') return 'Buy';
  if (k === 'hold') return 'Hold';
  if (k === 'sell') return 'Sell';
  if (k === 'strong_sell') return 'Strong Sell';
  return null;
}
