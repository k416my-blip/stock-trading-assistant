import type { BursaCompanyProfile } from '../../types/bursaDisclosure';
import {
  extractMetric,
  parseFormattedNumber,
  stripHtml,
} from './bursaKlseParser';

function parseCompanyNameFromOgTitle(html: string): string | null {
  const og = html.match(/property="og:title"\s+content="([^"]+)"/i);
  if (!og?.[1]) return null;
  const raw = og[1].trim();
  const colonIdx = raw.indexOf(':');
  const parenIdx = raw.lastIndexOf('(');
  if (colonIdx >= 0 && parenIdx > colonIdx) {
    return raw.slice(colonIdx + 1, parenIdx).trim() || null;
  }
  return raw || null;
}

function decodeBasicHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&ndash;/g, '–');
}

function parseCompanyOverview(html: string): string | null {
  const desc = html.match(/property="og:description"\s+content="([^"]+)"/i);
  const raw = desc?.[1]?.trim();
  return raw ? decodeBasicHtmlEntities(raw) : null;
}

function parseSector(html: string): string | null {
  const m = html.match(/(?:Main Market|ACE Market)\s*:\s*([^<]+)/i);
  return m?.[1]?.trim() ?? null;
}

export function parseBursaCompanyProfileFromHtml(
  html: string,
  stockCode: string,
  fromCache = false,
): BursaCompanyProfile {
  const fetchedFields: string[] = [];
  const missingFields: string[] = [];

  const companyName = parseCompanyNameFromOgTitle(html);
  if (companyName) fetchedFields.push('companyName');
  else missingFields.push('companyName');

  const companyOverview = parseCompanyOverview(html);
  if (companyOverview) fetchedFields.push('companyOverview');
  else missingFields.push('companyOverview');

  const sector = parseSector(html);
  if (sector) fetchedFields.push('sector');
  else missingFields.push('sector');

  // KLSE Screener はサブセクター列を公開していない
  missingFields.push('subSector');

  const marketCapRaw = extractMetric(html, 'Market Cap');
  const marketCap = parseFormattedNumber(marketCapRaw);
  if (marketCap != null) fetchedFields.push('marketCap');
  else missingFields.push('marketCap');

  const sharesRaw = extractMetric(html, 'Shares \\(mil\\)');
  const sharesMil = parseFormattedNumber(sharesRaw?.replace(/,/g, ''));
  const sharesOutstanding = sharesMil != null ? sharesMil * 1_000_000 : null;
  if (sharesOutstanding != null) fetchedFields.push('sharesOutstanding');
  else missingFields.push('sharesOutstanding');

  const peRaw = extractMetric(html, 'P/E');
  const pe = parseFormattedNumber(peRaw);
  if (pe != null) fetchedFields.push('pe');
  else missingFields.push('pe');

  const epsRaw = extractMetric(html, 'EPS');
  const eps = parseFormattedNumber(epsRaw);
  if (eps != null) fetchedFields.push('eps');
  else missingFields.push('eps');

  const dyRaw = html.match(
    /<td[^>]*>\s*DY\s*<\/td>\s*<td[^>]*>\s*([^<]+)\s*</i,
  )?.[1];
  const dividendYieldPct = parseFormattedNumber(dyRaw?.replace(/%/g, ''));
  if (dividendYieldPct != null) fetchedFields.push('dividendYieldPct');
  else missingFields.push('dividendYieldPct');

  const hasAny = fetchedFields.length > 0;
  const status = fromCache
    ? 'cached'
    : hasAny && missingFields.length === 0
      ? 'ok'
      : hasAny
        ? 'partial'
        : 'failed';

  return {
    stockCode,
    companyName,
    companyOverview,
    sector,
    subSector: null,
    marketCap,
    marketCapCurrency: 'MYR',
    sharesOutstanding,
    pe,
    eps,
    dividendYieldPct,
    fetchedFields,
    missingFields,
    status,
    source: hasAny ? 'klse_screener' : 'none',
    fetchedAt: new Date().toISOString(),
  };
}

export type ParsedProfileExtras = {
  companyOverview: string | null;
};

export function parseProfileExtras(html: string): ParsedProfileExtras {
  return { companyOverview: parseCompanyOverview(html) };
}
