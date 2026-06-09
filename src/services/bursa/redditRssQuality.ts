/**
 * Reddit RSS 品質フィルタ — 銘柄関連 + 投資材料の2段階抽出
 */
import type { RedditConfidenceJa } from '../../types/bursaDisclosure';

const FETCH_TIMEOUT_MS = 10_000;
const PER_QUERY_LIMIT = 25;
const OUTPUT_LIMIT = 6;

export type RedditRssQualityInput = {
  stockCode: string;
  companyName: string | null;
};

export type RedditRssEntry = {
  title: string;
  subreddit: string | null;
  link: string | null;
};

export type ScoredRedditTitle = {
  title: string;
  score: number;
  subreddit: string | null;
};

export type RedditRssQualityResult = {
  items: ScoredRedditTitle[];
  fetchedCount: number;
  validCount: number;
  excludedCount: number;
  irrelevantRate: number;
  confidenceJa: RedditConfidenceJa;
  investmentConfidenceJa: RedditConfidenceJa;
  qualityWarningJa: string | null;
  searchQueries: string[];
  searchUrls: string[];
  primaryFetchUrl: string;
};

const MAYBANK_QUERIES = [
  'Maybank',
  'MAYBANK',
  'MALAYAN BANKING',
  '1155.KL',
  '1155 Bursa',
  'Maybank subreddit:BursaMalaysia',
  'Maybank subreddit:malaysia',
  '1155 KLSE',
  'Maybank dividend',
  'Maybank earnings',
  'Maybank shares',
  '1155 dividend',
] as const;

export const INVESTMENT_POSITIVE_KEYWORDS = [
  'stock',
  'shares',
  'earnings',
  'quarter',
  'results',
  'dividend',
  'valuation',
  'analyst',
  'target price',
  'buy call',
  'sell call',
  'market cap',
  'profit',
  'revenue',
  'bursa',
  'klse',
] as const;

export const BANKING_NEGATIVE_KEYWORDS = [
  'credit card',
  'debit card',
  'savings account',
  'loan',
  'mortgage',
  'atm',
  'branch',
  'customer service',
  'bank account',
  'bank transfer',
  'fd',
  'fixed deposit',
] as const;

const PREFERRED_SUBREDDIT_PATTERNS = [
  /^bursa/i,
  /^klse/i,
  /malaysia.*invest/i,
  /malaysia.*stock/i,
  /^myinvest/i,
  /^stocks$/,
  /^investing$/,
  /^valueinvesting$/,
];

function normalizeStockCode(stockCode: string): string {
  return stockCode.replace(/\.KL$/i, '').trim();
}

export function isMaybankStock(stockCode: string, companyName: string | null): boolean {
  const code = normalizeStockCode(stockCode);
  if (code === '1155') return true;
  const name = (companyName ?? '').toLowerCase();
  return /\bmaybank\b/.test(name) || /\bmalayan banking\b/.test(name);
}

export function buildRedditSearchQueries(input: RedditRssQualityInput): string[] {
  if (isMaybankStock(input.stockCode, input.companyName)) {
    return [...MAYBANK_QUERIES];
  }

  const code = normalizeStockCode(input.stockCode);
  const queries = new Set<string>([
    code,
    `${code}.KL`,
    `${code} Bursa`,
    `${code} KLSE`,
    `${code} subreddit:BursaMalaysia`,
  ]);
  const name = (input.companyName ?? '').trim();
  if (name) {
    queries.add(name);
    const short = name.replace(/\s+BERHAD$/i, '').trim();
    if (short) {
      queries.add(short);
      queries.add(`${short} subreddit:BursaMalaysia`);
      queries.add(`${short} dividend`);
      queries.add(`${short} earnings`);
      queries.add(`${short} shares`);
    }
    const firstWord = short.split(/\s+/)[0];
    if (firstWord && firstWord.length > 2) {
      queries.add(firstWord);
      queries.add(firstWord.toUpperCase());
    }
  }
  return [...queries];
}

export function buildRedditSearchRssUrlForQuery(query: string): string {
  return `https://www.reddit.com/search.rss?q=${encodeURIComponent(query)}&sort=new`;
}

export function buildRedditSearchRssUrls(input: RedditRssQualityInput): string[] {
  return buildRedditSearchQueries(input).map(buildRedditSearchRssUrlForQuery);
}

export function extractSubredditFromLink(link: string | null): string | null {
  if (!link) return null;
  const match = link.match(/reddit\.com\/r\/([^/?#]+)/i);
  return match ? match[1].toLowerCase() : null;
}

export function parseRssEntries(xml: string, limit: number): RedditRssEntry[] {
  const entries: RedditRssEntry[] = [];
  const entryRe = /<entry[\s>]([\s\S]*?)<\/entry>/gi;
  let blockMatch: RegExpExecArray | null;
  while ((blockMatch = entryRe.exec(xml)) !== null && entries.length < limit) {
    const block = blockMatch[1];
    const titleMatch = block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
    if (!titleMatch) continue;
    const title = titleMatch[1].replace(/<[^>]+>/g, '').trim();
    const lower = title.toLowerCase();
    if (
      title.length <= 4 ||
      lower.includes('yahoo finance') ||
      lower.startsWith('google news') ||
      /^reddit\.com:/i.test(title)
    ) {
      continue;
    }
    const linkMatch = block.match(/<link[^>]+href="([^"]+)"/i);
    const link = linkMatch?.[1] ?? null;
    entries.push({
      title,
      link,
      subreddit: extractSubredditFromLink(link),
    });
  }
  return entries;
}

function parseRssTitles(xml: string, limit: number): string[] {
  return parseRssEntries(xml, limit).map((entry) => entry.title);
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

function dedupeEntries(entries: RedditRssEntry[]): RedditRssEntry[] {
  const seen = new Set<string>();
  const out: RedditRssEntry[] = [];
  for (const entry of entries) {
    const key = entry.title.toLowerCase().replace(/\s+/g, ' ').trim();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(entry);
  }
  return out;
}

function dedupeTitles(titles: string[]): RedditRssEntry[] {
  return dedupeEntries(titles.map((title) => ({ title, subreddit: null, link: null })));
}

export function titleMatchesRedditKeywords(title: string, input: RedditRssQualityInput): boolean {
  if (isMaybankStock(input.stockCode, input.companyName)) {
    return (
      /\bmaybank\b/i.test(title) ||
      /\bmalayan banking\b/i.test(title) ||
      /\b1155\b/.test(title) ||
      /1155\.kl/i.test(title) ||
      /\b1155\s+bursa\b/i.test(title)
    );
  }

  const code = normalizeStockCode(input.stockCode);
  if (new RegExp(`\\b${code}\\b`, 'i').test(title) || new RegExp(`${code}\\.kl`, 'i').test(title)) {
    return true;
  }
  if (new RegExp(`\\b${code}\\s+bursa\\b`, 'i').test(title)) return true;
  if (/\bbursa\b/i.test(title) && new RegExp(`\\b${code}\\b`, 'i').test(title)) return true;

  const name = (input.companyName ?? '').trim();
  if (!name) return false;
  const short = name.replace(/\s+BERHAD$/i, '').trim();
  if (short.length >= 4 && new RegExp(escapeRegExp(short), 'i').test(title)) return true;
  const firstWord = short.split(/\s+/)[0];
  if (firstWord && firstWord.length > 3 && new RegExp(`\\b${escapeRegExp(firstWord)}\\b`, 'i').test(title)) {
    return true;
  }
  return false;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function hasBankingNegativeKeyword(title: string): boolean {
  const lower = title.toLowerCase();
  return BANKING_NEGATIVE_KEYWORDS.some((keyword) => lower.includes(keyword));
}

export function hasInvestmentPositiveKeyword(title: string): boolean {
  const lower = title.toLowerCase();
  return INVESTMENT_POSITIVE_KEYWORDS.some((keyword) => lower.includes(keyword));
}

export function isPreferredInvestmentSubreddit(subreddit: string | null): boolean {
  if (!subreddit) return false;
  return PREFERRED_SUBREDDIT_PATTERNS.some((pattern) => pattern.test(subreddit));
}

export function passesStage2InvestmentFilter(entry: RedditRssEntry): boolean {
  if (hasBankingNegativeKeyword(entry.title)) return false;
  return hasInvestmentPositiveKeyword(entry.title);
}

export function passesRedditQualityFilters(
  entry: RedditRssEntry,
  input: RedditRssQualityInput,
): boolean {
  return titleMatchesRedditKeywords(entry.title, input) && passesStage2InvestmentFilter(entry);
}

export function scoreRedditTitle(title: string, input: RedditRssQualityInput): number {
  if (isMaybankStock(input.stockCode, input.companyName)) {
    let score = 0;
    if (/\bmaybank\b/i.test(title)) score += 10;
    if (/\bmalayan banking\b/i.test(title)) score += 15;
    if (/\b1155\b/.test(title) || /1155\.kl/i.test(title)) score += 15;
    if (/\bbursa\b/i.test(title)) score += 5;
    return score;
  }

  const code = normalizeStockCode(input.stockCode);
  let score = 0;
  const name = (input.companyName ?? '').trim();
  const short = name.replace(/\s+BERHAD$/i, '').trim();
  if (short.length >= 4 && new RegExp(escapeRegExp(short), 'i').test(title)) score += 15;
  const firstWord = short.split(/\s+/)[0];
  if (firstWord && new RegExp(`\\b${escapeRegExp(firstWord)}\\b`, 'i').test(title)) score += 10;
  if (new RegExp(`\\b${code}\\b`, 'i').test(title) || new RegExp(`${code}\\.kl`, 'i').test(title)) score += 15;
  if (/\bbursa\b/i.test(title)) score += 5;
  return score;
}

export function scoreRedditEntry(entry: RedditRssEntry, input: RedditRssQualityInput): number {
  let score = scoreRedditTitle(entry.title, input);
  for (const keyword of INVESTMENT_POSITIVE_KEYWORDS) {
    if (entry.title.toLowerCase().includes(keyword)) score += 5;
  }
  if (isPreferredInvestmentSubreddit(entry.subreddit)) score += 25;
  return score;
}

export function computeRedditConfidence(
  fetchedCount: number,
  validCount: number,
): {
  confidenceJa: RedditConfidenceJa;
  qualityWarningJa: string | null;
  irrelevantRate: number;
  excludedCount: number;
} {
  const excludedCount = Math.max(0, fetchedCount - validCount);
  const irrelevantRate = fetchedCount > 0 ? excludedCount / fetchedCount : validCount > 0 ? 0 : 1;
  const qualityWarningJa = fetchedCount > 0 && irrelevantRate >= 0.8 ? 'Reddit品質低' : null;

  let confidenceJa: RedditConfidenceJa;
  if (validCount === 0 || irrelevantRate >= 0.8) {
    confidenceJa = '低';
  } else if (validCount >= 3 && irrelevantRate < 0.5) {
    confidenceJa = '高';
  } else {
    confidenceJa = '中';
  }

  return { confidenceJa, qualityWarningJa, irrelevantRate, excludedCount };
}

export function computeInvestmentConfidence(
  validCount: number,
  items: ScoredRedditTitle[],
): RedditConfidenceJa {
  if (validCount === 0) return '低';

  const strongItems = items.filter((item) => item.score >= 30).length;
  const investmentKeywordItems = items.filter((item) => hasInvestmentPositiveKeyword(item.title)).length;

  if (validCount >= 3 && investmentKeywordItems >= 2) return '高';
  if (validCount >= 2 && (strongItems >= 1 || investmentKeywordItems >= 1)) return '高';
  if (validCount >= 1 && (strongItems >= 1 || investmentKeywordItems >= 1)) return '中';
  return '低';
}

export function filterScoreSortRedditEntries(
  entries: RedditRssEntry[],
  input: RedditRssQualityInput,
  limit = OUTPUT_LIMIT,
): {
  items: ScoredRedditTitle[];
  fetchedCount: number;
  validCount: number;
  excludedCount: number;
} {
  const fetchedCount = entries.length;
  const validEntries = entries.filter((entry) => passesRedditQualityFilters(entry, input));
  const items = validEntries
    .map((entry) => ({
      title: entry.title,
      score: scoreRedditEntry(entry, input),
      subreddit: entry.subreddit?.toLowerCase() ?? null,
    }))
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, limit);

  const validCount = validEntries.length;
  const excludedCount = fetchedCount - validCount;
  return { items, fetchedCount, validCount, excludedCount };
}

export function filterScoreSortRedditTitles(
  titles: string[],
  input: RedditRssQualityInput,
  limit = OUTPUT_LIMIT,
): {
  items: ScoredRedditTitle[];
  fetchedCount: number;
  validCount: number;
  excludedCount: number;
} {
  return filterScoreSortRedditEntries(dedupeTitles(titles), input, limit);
}

export function applyRedditQualityToEntries(
  entries: RedditRssEntry[],
  input: RedditRssQualityInput,
  limit = OUTPUT_LIMIT,
): RedditRssQualityResult {
  const deduped = dedupeEntries(entries);
  const { items, fetchedCount, validCount, excludedCount } = filterScoreSortRedditEntries(
    deduped,
    input,
    limit,
  );
  const { confidenceJa, qualityWarningJa, irrelevantRate } = computeRedditConfidence(
    fetchedCount,
    validCount,
  );
  const investmentConfidenceJa = computeInvestmentConfidence(validCount, items);
  const searchQueries = buildRedditSearchQueries(input);
  const searchUrls = buildRedditSearchRssUrls(input);

  return {
    items,
    fetchedCount,
    validCount,
    excludedCount,
    irrelevantRate,
    confidenceJa,
    investmentConfidenceJa,
    qualityWarningJa,
    searchQueries,
    searchUrls,
    primaryFetchUrl: searchUrls[0] ?? '',
  };
}

export function applyRedditQualityToTitles(
  titles: string[],
  input: RedditRssQualityInput,
  limit = OUTPUT_LIMIT,
): RedditRssQualityResult {
  return applyRedditQualityToEntries(dedupeTitles(titles), input, limit);
}

export async function fetchRedditRssWithQuality(
  input: RedditRssQualityInput,
): Promise<RedditRssQualityResult> {
  const searchUrls = buildRedditSearchRssUrls(input);
  const rawEntries: RedditRssEntry[] = [];

  await Promise.all(
    searchUrls.map(async (url) => {
      const xml = await fetchTextWithTimeout(url);
      if (!xml) return;
      rawEntries.push(...parseRssEntries(xml, PER_QUERY_LIMIT));
    }),
  );

  return applyRedditQualityToEntries(rawEntries, input);
}

/** @internal test helper */
export { parseRssTitles };
