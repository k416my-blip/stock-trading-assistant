/**
 * Bursa Phase 11 — 5ソース材料取得（推定・モック禁止）
 */
import type { StockFundamentals } from '../../types';
import type {
  BursaDisclosureBundle,
  BursaMaterialSourceStatus,
  BursaNewsApiDiagnostics,
  BursaRedditFetchDiagnostics,
} from '../../types/bursaDisclosure';
import { logRedditFetchDiagnostics } from './redditFetchLog';
import {
  applyRedditQualityToTitles,
  fetchRedditRssWithQuality,
} from './redditRssQuality';
import type { AnalysisApiKeys } from '../analysisApiKeys';
import { parseRecentAnnouncementsFromKlseHtml } from './bursaAnnouncementParser';
import { fetchKlseStockPageHtml } from './bursaKlseHtmlClient';
import type { RawMaterialInput } from './bursaMaterialSentiment';

const NEWS_API_TIMEOUT_MS = 10_000;
const REDDIT_TIMEOUT_MS = 10_000;

export type MaterialFetchResult = {
  headlines: RawMaterialInput[];
  sourceStatus: Record<
    'bursa_announcement' | 'news_api' | 'rss' | 'x' | 'reddit',
    BursaMaterialSourceStatus
  >;
  newsApiDiagnostics?: BursaNewsApiDiagnostics;
  redditFetchDiagnostics?: BursaRedditFetchDiagnostics;
};

export function emptyMaterialSourceStatus(): MaterialFetchResult['sourceStatus'] {
  return {
    bursa_announcement: 'unavailable',
    news_api: 'skipped',
    rss: 'unavailable',
    x: 'skipped',
    reddit: 'skipped',
  };
}

function toStockFundamentals(stockCode: string, companyName: string | null): StockFundamentals {
  return {
    symbol: stockCode,
    name: companyName ?? stockCode,
    market: 'bursa',
    currency: 'MYR',
    price: 0,
    dividendYield: 0,
    per: 0,
    marketCap: 0,
    volume: 0,
    category: 'stable',
  };
}

type NewsApiFetchOutcome = {
  items: RawMaterialInput[];
  diagnostics: BursaNewsApiDiagnostics;
};

async function fetchNewsApiHeadlines(input: {
  companyName: string | null;
  stockCode: string;
  apiKey: string;
}): Promise<NewsApiFetchOutcome> {
  const fetchedAt = new Date().toISOString();
  const query = `${input.companyName ?? ''} ${input.stockCode} Malaysia`.trim();
  try {
    const { fetchNewsApiWithFallback } = await import('../newsApiClient');
    const fetched = await fetchNewsApiWithFallback(
      query,
      input.apiKey,
      6,
      NEWS_API_TIMEOUT_MS,
    );
    if (fetched.tempRateLimit) {
      return {
        items: [],
        diagnostics: {
          articleCount: 0,
          fetchedAt,
          errorReason: 'NEWSAPI_TEMP_RATE_LIMIT',
          httpStatus: fetched.status,
        },
      };
    }
    if (!fetched.ok) {
      return {
        items: [],
        diagnostics: {
          articleCount: 0,
          fetchedAt,
          errorReason: fetched.errorReason ?? `HTTP ${fetched.status}`,
          httpStatus: fetched.status,
        },
      };
    }
    const articles = fetched.articles;
    const items = fetched.titles.slice(0, 6).map((title, i) => ({
      source: 'news_api' as const,
      title,
      url: articles[i]?.url ?? null,
      publishedAt: articles[i]?.publishedAt ?? null,
      idSuffix: `news-${i}`,
    }));
    return {
      items,
      diagnostics: {
        articleCount: items.length,
        fetchedAt,
        errorReason: items.length === 0 ? '記事0件' : null,
        httpStatus: fetched.status,
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      items: [],
      diagnostics: {
        articleCount: 0,
        fetchedAt,
        errorReason: msg.includes('abort') ? 'タイムアウト' : msg,
        httpStatus: null,
      },
    };
  }
}

async function fetchRedditHeadlinesViaRss(input: {
  companyName: string | null;
  stockCode: string;
}): Promise<{
  items: RawMaterialInput[];
  fetchUrl: string;
  quality: Awaited<ReturnType<typeof fetchRedditRssWithQuality>>;
}> {
  const quality = await fetchRedditRssWithQuality({
    stockCode: input.stockCode,
    companyName: input.companyName,
  });
  const items = quality.items.map((h, i) => ({
    source: 'reddit' as const,
    title: h.title,
    url: null,
    publishedAt: null,
    idSuffix: `reddit-rss-${i}`,
    sourceLabelJa: 'Reddit RSS' as const,
  }));
  return { items, fetchUrl: quality.primaryFetchUrl, quality };
}

function buildRedditDiagnosticsFromQuality(
  quality: Awaited<ReturnType<typeof fetchRedditRssWithQuality>>,
  input: {
    fetchMethod: BursaRedditFetchDiagnostics['fetchMethod'];
    fetchedAt: string;
    oauthConfigured: boolean;
    errorReason: string | null;
  },
): BursaRedditFetchDiagnostics {
  return {
    fetchMethod: input.fetchMethod,
    fetchUrl: quality.primaryFetchUrl || null,
    articleCount: quality.validCount > 0 ? quality.items.length : 0,
    fetchedCount: quality.fetchedCount,
    validCount: quality.validCount,
    excludedCount: quality.excludedCount,
    irrelevantRate: quality.irrelevantRate,
    confidenceJa: quality.confidenceJa,
    investmentConfidenceJa: quality.investmentConfidenceJa,
    qualityWarningJa: quality.qualityWarningJa,
    titles: quality.items.map((i) => i.title),
    searchQueries: quality.searchQueries,
    fetchedAt: input.fetchedAt,
    errorReason: input.errorReason,
    oauthConfigured: input.oauthConfigured,
  };
}

function applyQualityToOAuthItems(
  oauthItems: RawMaterialInput[],
  input: { companyName: string | null; stockCode: string },
): {
  items: RawMaterialInput[];
  quality: Awaited<ReturnType<typeof applyRedditQualityToTitles>>;
} {
  const quality = applyRedditQualityToTitles(
    oauthItems.map((i) => i.title),
    { stockCode: input.stockCode, companyName: input.companyName },
  );
  const items = quality.items.map((h, i) => ({
    source: 'reddit' as const,
    title: h.title,
    url: oauthItems.find((o) => o.title === h.title)?.url ?? null,
    publishedAt: oauthItems.find((o) => o.title === h.title)?.publishedAt ?? null,
    idSuffix: `reddit-oauth-${i}`,
    sourceLabelJa: 'Reddit' as const,
  }));
  return { items, quality };
}

async function resolveRedditMaterial(input: {
  companyName: string | null;
  stockCode: string;
  redditKey: string;
}): Promise<{
  items: RawMaterialInput[];
  status: BursaMaterialSourceStatus;
  diagnostics: BursaRedditFetchDiagnostics;
}> {
  const fetchedAt = new Date().toISOString();
  const oauthConfigured = Boolean(input.redditKey.trim());

  if (oauthConfigured) {
    const oauthItems = await fetchRedditHeadlines({
      companyName: input.companyName,
      stockCode: input.stockCode,
      bearerToken: input.redditKey,
    });
    if (oauthItems.length > 0) {
      const { items, quality } = applyQualityToOAuthItems(oauthItems, {
        companyName: input.companyName,
        stockCode: input.stockCode,
      });
      const diagnostics = buildRedditDiagnosticsFromQuality(quality, {
        fetchMethod: items.length > 0 ? 'oauth' : 'none',
        fetchedAt,
        oauthConfigured: true,
        errorReason: items.length > 0 ? null : 'OAuth取得後フィルタで0件',
      });
      diagnostics.fetchUrl = `https://oauth.reddit.com/search?q=${encodeURIComponent(`${input.companyName ?? input.stockCode} Bursa Malaysia`)}`;
      if (items.length > 0) {
        return { items, status: 'ok', diagnostics };
      }
    }
  }

  const { items, quality } = await fetchRedditHeadlinesViaRss({
    companyName: input.companyName,
    stockCode: input.stockCode,
  });
  const diagnostics = buildRedditDiagnosticsFromQuality(quality, {
    fetchMethod: items.length > 0 ? 'rss' : quality.fetchedCount > 0 ? 'rss' : 'none',
    fetchedAt,
    oauthConfigured,
    errorReason:
      items.length > 0
        ? null
        : quality.fetchedCount > 0
          ? '投資材料キーワード不一致で全件除外'
          : oauthConfigured
            ? 'OAuth失敗・RSSも0件'
            : 'RSS記事0件',
  });
  const status: BursaMaterialSourceStatus =
    items.length > 0
      ? 'ok'
      : quality.fetchedCount > 0
        ? 'partial'
        : oauthConfigured
          ? 'failed'
          : 'skipped';
  return { items, status, diagnostics };
}

async function fetchRedditHeadlines(input: {
  companyName: string | null;
  stockCode: string;
  bearerToken: string;
}): Promise<RawMaterialInput[]> {
  const q = encodeURIComponent(`${input.companyName ?? input.stockCode} Bursa Malaysia`);
  const url = `https://oauth.reddit.com/search?q=${q}&sort=new&limit=5&restrict_sr=0`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REDDIT_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${input.bearerToken.trim()}`,
        'User-Agent': 'stock-trading-assistant/1.0',
      },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      data?: { children?: Array<{ data?: { title?: string; permalink?: string; created_utc?: number } }> };
    };
    return (json.data?.children ?? [])
      .flatMap((c, i) => {
        const title = c.data?.title?.trim();
        if (!title) return [];
        const permalink = c.data?.permalink;
        return [
          {
            source: 'reddit' as const,
            title,
            url: permalink ? `https://www.reddit.com${permalink}` : null,
            publishedAt:
              c.data?.created_utc != null
                ? new Date(c.data.created_utc * 1000).toISOString()
                : null,
            idSuffix: `reddit-${i}`,
            sourceLabelJa: 'Reddit OAuth',
          },
        ];
      });
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export function buildDisclosureMaterialInputs(bundle: BursaDisclosureBundle): RawMaterialInput[] {
  const out: RawMaterialInput[] = [];
  const divs = bundle.dividend.history ?? [];
  if (divs.length >= 2) {
    const latest = divs[0]?.amountPerShare;
    const prev = divs[1]?.amountPerShare;
    if (latest != null && prev != null) {
      if (latest > prev) {
        out.push({
          source: 'bursa_announcement',
          title: '増配',
          url: null,
          publishedAt: divs[0]?.announcedDate,
          idSuffix: 'div-up',
        });
      } else if (latest < prev) {
        out.push({
          source: 'bursa_announcement',
          title: '減配',
          url: null,
          publishedAt: divs[0]?.announcedDate,
          idSuffix: 'div-down',
        });
      }
    }
  }

  const qHist = bundle.quarterly.quarterlyHistory ?? [];
  if (qHist.length >= 2) {
    const latest = qHist[0]?.netProfit;
    const prev = qHist[1]?.netProfit;
    if (latest != null && prev != null && prev !== 0) {
      const pct = ((latest - prev) / Math.abs(prev)) * 100;
      if (pct >= 5) {
        out.push({
          source: 'bursa_announcement',
          title: '利益成長',
          url: null,
          publishedAt: qHist[0]?.announcedDate,
          idSuffix: 'profit-up',
        });
      } else if (pct <= -10) {
        out.push({
          source: 'bursa_announcement',
          title: '利益急減',
          url: null,
          publishedAt: qHist[0]?.announcedDate,
          idSuffix: 'profit-down',
        });
      }
    }
  }

  const sector = bundle.profile.sector?.toLowerCase() ?? '';
  if (sector.includes('bank')) {
    out.push({
      source: 'bursa_announcement',
      title: '銀行セクター関連',
      url: null,
      publishedAt: bundle.profile.fetchedAt,
      idSuffix: 'sector-bank',
    });
  }
  if (sector.includes('chemical') || sector.includes('petro')) {
    out.push({
      source: 'bursa_announcement',
      title: '化学・エネルギーセクター関連',
      url: null,
      publishedAt: bundle.profile.fetchedAt,
      idSuffix: 'sector-chem',
    });
  }

  return out;
}

export async function fetchAllMaterialSources(input: {
  stockCode: string;
  companyName: string | null;
  stockHtml: string | null;
  bundle: BursaDisclosureBundle | null;
  apiKeys: AnalysisApiKeys;
  fetchLiveExternal: boolean;
}): Promise<MaterialFetchResult> {
  const status = emptyMaterialSourceStatus();
  const headlines: RawMaterialInput[] = [];

  let html = input.stockHtml;
  if (!html && input.fetchLiveExternal) {
    const fetched = await fetchKlseStockPageHtml(input.stockCode);
    html = fetched?.html ?? null;
  }

  if (html) {
    const anns = parseRecentAnnouncementsFromKlseHtml(html, input.stockCode);
    for (const a of anns) {
      headlines.push({
        source: 'bursa_announcement',
        title: a.title,
        url: a.url,
        publishedAt: a.publishedAt,
        idSuffix: `ann-${a.id}`,
      });
    }
    status.bursa_announcement = anns.length > 0 ? 'ok' : 'partial';
  } else {
    status.bursa_announcement = 'unavailable';
  }

  if (input.bundle) {
    headlines.push(...buildDisclosureMaterialInputs(input.bundle));
    if (status.bursa_announcement === 'unavailable') {
      status.bursa_announcement = 'partial';
    }
  }

  if (!input.fetchLiveExternal) {
    return { headlines, sourceStatus: status };
  }

  const stock = toStockFundamentals(input.stockCode, input.companyName);
  let newsApiDiagnostics: BursaNewsApiDiagnostics | undefined;
  const newsKey = input.apiKeys.newsApiKey?.trim();
  if (newsKey) {
    const newsResult = await fetchNewsApiHeadlines({
      companyName: input.companyName,
      stockCode: input.stockCode,
      apiKey: newsKey,
    });
    headlines.push(...newsResult.items);
    newsApiDiagnostics = newsResult.diagnostics;
    status.news_api = newsResult.items.length > 0 ? 'ok' : 'partial';
  } else {
    status.news_api = 'skipped';
  }

  const { fetchYahooFinanceRss, fetchGoogleNewsRss } = await import('../freeNewsFallback');
  const { fetchBursaAnnouncementsRss } = await import('../conciergeRssNewsProbe');
  const [yahooRss, googleRss, bursaRss] = await Promise.all([
    fetchYahooFinanceRss(stock),
    fetchGoogleNewsRss(stock),
    fetchBursaAnnouncementsRss(stock),
  ]);
  const rssItems = [...yahooRss, ...googleRss, ...bursaRss].slice(0, 12);
  for (const h of rssItems) {
    headlines.push({
      source: 'rss',
      title: h.title,
      url: null,
      publishedAt: null,
      idSuffix: `rss-${h.source}-${h.title.slice(0, 12)}`,
      sourceLabelJa: h.source,
    });
  }
  status.rss = rssItems.length > 0 ? 'ok' : 'failed';

  const xKey = input.apiKeys.xApiKey?.trim();
  if (xKey) {
    try {
      const { fetchXPostsForStock } = await import('../xApiService');
      const xRes = await fetchXPostsForStock(stock, xKey, true);
      const snap = xRes.snapshot;
      if (snap) {
        for (const [i, word] of snap.trendWords.slice(0, 5).entries()) {
          if (!word.trim()) continue;
          headlines.push({
            source: 'x',
            title: word.trim(),
            url: null,
            publishedAt: snap.fetchedAt,
            idSuffix: `x-word-${i}`,
            sourceLabelJa: 'X',
          });
        }
        if (snap.summaryJa?.trim() && snap.analysisBasis === 'fetched_posts') {
          headlines.push({
            source: 'x',
            title: snap.summaryJa.trim(),
            url: null,
            publishedAt: snap.fetchedAt,
            idSuffix: 'x-summary',
            sourceLabelJa: 'X',
          });
        }
      }
      status.x = snap && snap.postCount > 0 ? 'ok' : 'partial';
    } catch {
      status.x = 'failed';
    }
  } else {
    status.x = 'skipped';
  }

  let redditFetchDiagnostics: BursaRedditFetchDiagnostics | undefined;
  const redditKey = input.apiKeys.redditApiKey?.trim() ?? '';
  const redditResult = await resolveRedditMaterial({
    companyName: input.companyName,
    stockCode: input.stockCode,
    redditKey,
  });
  headlines.push(...redditResult.items);
  status.reddit = redditResult.status === 'skipped' && redditResult.items.length > 0 ? 'ok' : redditResult.status;
  redditFetchDiagnostics = redditResult.diagnostics;
  logRedditFetchDiagnostics(input.stockCode, redditResult.diagnostics);

  return { headlines, sourceStatus: status, newsApiDiagnostics, redditFetchDiagnostics };
}
