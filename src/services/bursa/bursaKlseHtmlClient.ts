/**
 * KLSE Screener HTML 取得（Bursa 開示の公開ミラー）
 * 公式 bursamalaysia.com API は Cloudflare によりモバイル直 fetch 不可のため Phase 1 はこちらを使用。
 */
import { fetchHttpWithRetry } from '../quoteProviders/providerFetchUtil';
import { normalizeBursaCoreForYahoo } from '../../utils/normalizeYahooSymbol';

const MIN_INTERVAL_MS = 2000;
let lastFetchAt = 0;

export function normalizeBursaStockCode(symbol: string): string {
  return normalizeBursaCoreForYahoo(symbol);
}

export function klseStockViewUrl(stockCode: string): string {
  return `https://www.klsescreener.com/v2/stocks/view/${encodeURIComponent(stockCode)}`;
}

export function klseShareholdingsUrl(stockCode: string): string {
  return `https://www.klsescreener.com/v2/shareholdings?code=${encodeURIComponent(stockCode)}`;
}

export function klseFinancialReportUrl(stockCode: string, quarterEndDate: string): string {
  return `https://www.klsescreener.com/v2/stock/financial-report/${encodeURIComponent(stockCode)}/${encodeURIComponent(quarterEndDate)}`;
}

export function klseAnnouncementUrl(announcementId: string): string {
  return `https://www.klsescreener.com/v2/announcements/view/${encodeURIComponent(announcementId)}`;
}

async function rateLimitWait(): Promise<void> {
  const elapsed = Date.now() - lastFetchAt;
  if (elapsed < MIN_INTERVAL_MS) {
    await new Promise((r) => setTimeout(r, MIN_INTERVAL_MS - elapsed));
  }
}

export async function fetchKlseStockPageHtml(stockCode: string): Promise<{
  html: string;
  requestUrl: string;
} | null> {
  return fetchKlseHtmlByUrl(klseStockViewUrl(stockCode), stockCode);
}

export async function fetchKlseHtmlByUrl(
  requestUrl: string,
  stockCode: string,
): Promise<{ html: string; requestUrl: string } | null> {
  const code = normalizeBursaStockCode(stockCode);
  await rateLimitWait();
  try {
    const { response, bodyText } = await fetchHttpWithRetry(requestUrl, {
      timeoutMs: 15000,
      logLabel: 'klse_screener',
      symbol: code,
    });
    lastFetchAt = Date.now();
    if (!response.ok || !bodyText.trim()) return null;
    return { html: bodyText, requestUrl };
  } catch {
    lastFetchAt = Date.now();
    return null;
  }
}

export async function fetchKlseShareholdingsHtml(stockCode: string): Promise<{
  html: string;
  requestUrl: string;
} | null> {
  return fetchKlseHtmlByUrl(klseShareholdingsUrl(stockCode), stockCode);
}

export type KlseShareholdingsIndexPage = {
  table_html?: string;
  cards_html?: string;
  count?: number;
};

export function klseShareholdingsIndexUrl(stockCode: string, page: number): string {
  const code = encodeURIComponent(normalizeBursaStockCode(stockCode));
  return `https://www.klsescreener.com/v2/shareholdings/index?page=${page}&name=&date=&code=${code}`;
}

/** KLSE Shareholdings ページネーション（page 2 から追加行） */
export async function fetchKlseShareholdingsIndexPage(
  stockCode: string,
  page: number,
): Promise<KlseShareholdingsIndexPage | null> {
  const code = normalizeBursaStockCode(stockCode);
  await rateLimitWait();
  try {
    const { response, bodyText } = await fetchHttpWithRetry(klseShareholdingsIndexUrl(code, page), {
      timeoutMs: 15000,
      logLabel: 'klse_screener',
      symbol: code,
    });
    lastFetchAt = Date.now();
    if (!response.ok || !bodyText.trim()) return null;
    return JSON.parse(bodyText) as KlseShareholdingsIndexPage;
  } catch {
    lastFetchAt = Date.now();
    return null;
  }
}

/** 初回ページ + index API で最大 maxPages まで結合 */
export async function fetchKlseShareholdingsHistoryHtml(
  stockCode: string,
  maxPages = 12,
): Promise<{ html: string; pagesFetched: number } | null> {
  const first = await fetchKlseShareholdingsHtml(stockCode);
  if (!first?.html) return null;

  let html = first.html;
  let pagesFetched = 1;

  for (let page = 2; page <= maxPages; page++) {
    const chunk = await fetchKlseShareholdingsIndexPage(stockCode, page);
    if (!chunk?.table_html?.trim() || (chunk.count ?? 0) <= 0) break;
    html += chunk.table_html;
    pagesFetched += 1;
  }

  return { html, pagesFetched };
}

export async function fetchKlseFinancialReportHtml(
  stockCode: string,
  quarterEndDate: string,
): Promise<{ html: string; requestUrl: string } | null> {
  return fetchKlseHtmlByUrl(klseFinancialReportUrl(stockCode, quarterEndDate), stockCode);
}
