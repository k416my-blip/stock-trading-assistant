/**
 * 実機ライブ API 監査 — SecureStore 保存キーを使用（Node 監査不可の代替）
 */
import {
  DEVICE_LIVE_API_AUDIT_LOG_TAG,
} from '../constants/deviceLiveApiAudit';
import {
  isNewsApiTempRateLimit,
  NEWSAPI_TEMP_RATE_LIMIT,
} from '../constants/newsApiRateLimit';
import { loadAnalysisApiKeys } from './analysisApiKeys';
import { isUsableApiKey, normalizeStoredApiKey } from './apiKeyValidation';
import { runNewsApiEverythingTest } from './newsApiEverythingTest';
import { runXApiSearchRecentTest } from './xApiSearchRecentTest';

const STOCKS = [
  { code: '1155', label: 'Maybank' },
  { code: '1023', label: 'CIMB' },
  { code: '1295', label: 'Public Bank' },
  { code: '5347', label: 'Tenaga' },
  { code: '4707', label: 'Nestle' },
  { code: '6033', label: 'Petronas Gas' },
] as const;

const NEWS_TIMEOUT_MS = 12_000;

export type DeviceStockNewsResult = {
  code: string;
  label: string;
  ok: boolean;
  httpStatus: number;
  articleCount: number;
  errorReason: string | null;
};

export type DeviceLiveApiAuditReport = {
  ranAt: string;
  newsApi: {
    ok: boolean;
    httpStatus: number;
    articleCount: number;
    errorReason: string | null;
  };
  xApi: {
    ok: boolean;
    httpStatus: number;
    tweetCount: number;
    errorReason: string | null;
  };
  stockNews: DeviceStockNewsResult[];
  devicePass: boolean;
};

function log(payload: Record<string, unknown>): void {
  console.log(DEVICE_LIVE_API_AUDIT_LOG_TAG, JSON.stringify(payload));
}

async function fetchStockNewsApi(
  apiKey: string,
  stock: { code: string; label: string },
): Promise<DeviceStockNewsResult> {
  const key = normalizeStoredApiKey(apiKey);
  if (!isUsableApiKey(key)) {
    return {
      code: stock.code,
      label: stock.label,
      ok: false,
      httpStatus: 0,
      articleCount: 0,
      errorReason: 'news_api_key_missing',
    };
  }

  const q = encodeURIComponent(`${stock.label} ${stock.code} Malaysia`.trim());
  const url = `https://newsapi.org/v2/everything?q=${q}&language=en&sortBy=publishedAt&pageSize=8`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NEWS_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'X-Api-Key': key },
    });
    const bodyText = await res.text();
    if (!res.ok) {
      const tempRateLimit = isNewsApiTempRateLimit({ httpStatus: res.status, responseBody: bodyText });
      return {
        code: stock.code,
        label: stock.label,
        ok: tempRateLimit,
        httpStatus: res.status,
        articleCount: 0,
        errorReason: tempRateLimit ? NEWSAPI_TEMP_RATE_LIMIT : `HTTP ${res.status}`,
      };
    }
    let json: { articles?: unknown[]; status?: string; message?: string; code?: string };
    try {
      json = JSON.parse(bodyText) as typeof json;
    } catch {
      return {
        code: stock.code,
        label: stock.label,
        ok: false,
        httpStatus: res.status,
        articleCount: 0,
        errorReason: 'json_parse_failed',
      };
    }
    if (json.status === 'error') {
      const tempRateLimit = isNewsApiTempRateLimit({
        httpStatus: res.status,
        responseBody: bodyText,
        errorCode: json.code,
      });
      return {
        code: stock.code,
        label: stock.label,
        ok: tempRateLimit,
        httpStatus: res.status,
        articleCount: 0,
        errorReason: tempRateLimit ? NEWSAPI_TEMP_RATE_LIMIT : json.message ?? 'news_api_error',
      };
    }
    const count = json.articles?.length ?? 0;
    return {
      code: stock.code,
      label: stock.label,
      ok: count > 0,
      httpStatus: res.status,
      articleCount: count,
      errorReason: count > 0 ? null : 'no_articles',
    };
  } catch (e) {
    return {
      code: stock.code,
      label: stock.label,
      ok: false,
      httpStatus: 0,
      articleCount: 0,
      errorReason: e instanceof Error ? e.message : String(e),
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function runDeviceLiveApiAudit(): Promise<DeviceLiveApiAuditReport> {
  const ranAt = new Date().toISOString();
  log({ phase: 'start', ranAt });

  const keys = await loadAnalysisApiKeys();

  const news = await runNewsApiEverythingTest();
  const newsPayload = {
    phase: 'news_connection',
    ok: news.ok,
    httpStatus: news.httpStatus,
    articleCount: news.articleCount,
    errorReason: news.errorReason,
    tempRateLimit: news.tempRateLimit ?? news.errorReason === NEWSAPI_TEMP_RATE_LIMIT,
  };
  log(newsPayload);

  const x = await runXApiSearchRecentTest();
  const xPayload = {
    phase: 'x_connection',
    ok: x.ok,
    httpStatus: x.httpStatus,
    tweetCount: x.tweetCount,
    errorReason: x.errorReason,
  };
  log(xPayload);

  await new Promise((r) => setTimeout(r, 3000));

  const stockNews: DeviceStockNewsResult[] = [];
  for (const stock of STOCKS) {
    const row = await fetchStockNewsApi(keys.newsApiKey, stock);
    stockNews.push(row);
    log({
      phase: 'stock_news',
      code: row.code,
      label: row.label,
      ok: row.ok,
      httpStatus: row.httpStatus,
      articleCount: row.articleCount,
      errorReason: row.errorReason,
    });
    await new Promise((r) => setTimeout(r, 2000));
  }

  const devicePass =
    news.ok &&
    x.ok &&
    stockNews.length === STOCKS.length &&
    stockNews.every((r) => r.ok);

  const report: DeviceLiveApiAuditReport = {
    ranAt,
    newsApi: {
      ok: news.ok,
      httpStatus: news.httpStatus,
      articleCount: news.articleCount,
      errorReason: news.errorReason,
    },
    xApi: {
      ok: x.ok,
      httpStatus: x.httpStatus,
      tweetCount: x.tweetCount,
      errorReason: x.errorReason,
    },
    stockNews,
    devicePass,
  };

  log({
    phase: 'summary',
    devicePass,
    newsTempRateLimit:
      news.errorReason === NEWSAPI_TEMP_RATE_LIMIT ||
      stockNews.some((r) => r.errorReason === NEWSAPI_TEMP_RATE_LIMIT),
    operationalPass: x.ok && (news.ok || news.errorReason === NEWSAPI_TEMP_RATE_LIMIT),
    newsHttpStatus: report.newsApi.httpStatus,
    newsCount: report.newsApi.articleCount,
    xHttpStatus: report.xApi.httpStatus,
    xCount: report.xApi.tweetCount,
    stocksOk: stockNews.filter((r) => r.ok).length,
    stocksTotal: stockNews.length,
  });

  return report;
}
