/**
 * Bursa Malaysia 開示データ取得オーケストレーター（Phase 1）
 * 公式 Bursa API の代わりに KLSE Screener（Bursa 開示ミラー）HTML をパース。
 */
import type { BursaDisclosureBundle } from '../../types/bursaDisclosure';
import { readBursaCache, writeBursaCache } from './bursaDisclosureCache';
import { fetchKlseStockPageHtml, normalizeBursaStockCode } from './bursaKlseHtmlClient';
import { parseBursaCompanyProfileFromHtml, parseProfileExtras } from './bursaCompanyProfileService';
import { parseBursaQuarterlyFromHtml } from './bursaQuarterlyService';
import { parseBursaDividendFromHtml } from './bursaDividendService';
import { normalizeDisclosureBundle } from './bursaPayloadNormalize';

export async function fetchBursaDisclosureBundle(symbol: string): Promise<BursaDisclosureBundle> {
  const stockCode = normalizeBursaStockCode(symbol);

  const [cachedProfile, cachedQuarterly, cachedDividend] = await Promise.all([
    readBursaCache<ReturnType<typeof parseBursaCompanyProfileFromHtml>>('profile', stockCode),
    readBursaCache<ReturnType<typeof parseBursaQuarterlyFromHtml>>('quarterly', stockCode),
    readBursaCache<ReturnType<typeof parseBursaDividendFromHtml>>('dividend', stockCode),
  ]);

  let html: string | null = null;
  const needHtml = !cachedProfile || !cachedQuarterly || !cachedDividend;
  if (needHtml) {
    const fetched = await fetchKlseStockPageHtml(stockCode);
    html = fetched?.html ?? null;
  }

  let profile = cachedProfile?.payload ?? null;
  if (!profile) {
    profile = html
      ? parseBursaCompanyProfileFromHtml(html, stockCode, false)
      : parseBursaCompanyProfileFromHtml('', stockCode, false);
    if (profile.status !== 'failed') {
      await writeBursaCache('profile', stockCode, profile);
    }
  }

  let quarterly = cachedQuarterly?.payload ?? null;
  if (!quarterly) {
    quarterly = html
      ? parseBursaQuarterlyFromHtml(html, stockCode, false)
      : parseBursaQuarterlyFromHtml('', stockCode, false);
    if (quarterly.status !== 'failed') {
      await writeBursaCache('quarterly', stockCode, quarterly);
    }
  }

  let dividend = cachedDividend?.payload ?? null;
  if (!dividend) {
    dividend = html
      ? parseBursaDividendFromHtml(html, stockCode, false)
      : parseBursaDividendFromHtml('', stockCode, false);
    if (dividend.status !== 'failed') {
      await writeBursaCache('dividend', stockCode, dividend);
    }
  }

  if (cachedProfile && profile) profile = { ...profile, status: 'cached' };
  if (cachedQuarterly && quarterly) quarterly = { ...quarterly, status: 'cached' };
  if (cachedDividend && dividend) dividend = { ...dividend, status: 'cached' };

  const extras = html ? parseProfileExtras(html) : { companyOverview: null };

  const fetchedFields = [
    ...(profile.fetchedFields ?? []).map((f) => `bursa.profile.${f}`),
    ...(quarterly.fetchedFields ?? []).map((f) => `bursa.quarterly.${f}`),
    ...(dividend.fetchedFields ?? []).map((f) => `bursa.dividend.${f}`),
  ];
  const missingFields = [
    ...(profile.missingFields ?? []).map((f) => `bursa.profile.${f}`),
    ...(quarterly.missingFields ?? []).map((f) => `bursa.quarterly.${f}`),
    ...(dividend.missingFields ?? []).map((f) => `bursa.dividend.${f}`),
  ];

  const dataSource = profile.source === 'klse_screener' ? 'klse_screener' : 'none';

  return normalizeDisclosureBundle({
    stockCode,
    profile,
    quarterly,
    dividend,
    dataSource,
    fetchedFields,
    missingFields,
    apiNotes: [
      'Bursa Malaysia 公式 API: Cloudflare 保護のため Phase 1 では未使用',
      'KLSE Screener HTML: APIキー不要・非公式スクレイピング（429/構造変更リスク）',
      extras.companyOverview ? 'companyOverview: og:description より取得' : '',
    ].filter(Boolean),
  });
}

export { parseBursaCompanyProfileFromHtml } from './bursaCompanyProfileService';
export { parseBursaQuarterlyFromHtml } from './bursaQuarterlyService';
export { parseBursaDividendFromHtml } from './bursaDividendService';
