/**
 * Phase15 — Insider Trading 解析（Director Dealings / Shareholding Changes）
 */
import type {
  BursaInsiderTradingAnalysis,
  InsiderNetActivityLabel,
  InsiderTradingDisplayFields,
  InsiderTradingSource,
  InsiderTransactionType,
} from '../../types/bursaInsiderTrading';
import {
  INSIDER_FIELD_MISSING_JA,
  INSIDER_TRADING_UNAVAILABLE_JA,
} from '../../types/bursaInsiderTrading';
import {
  filterTransactionsWithinDays,
  mergeInsiderTransactions,
  parseInsiderAnnouncementsFromStockHtml,
  parseShareholdingChangesFromStockHtml,
  parseShareholdingsPageForStock,
  sortTransactionsByDateDesc,
  type ParsedInsiderTransaction,
} from './bursaInsiderTradingParser';
import {
  fetchKlseShareholdingsHtml,
  fetchKlseStockPageHtml,
} from './bursaKlseHtmlClient';

const SOURCE_LABEL: Record<InsiderTradingSource, string> = {
  klse_shareholding_changes: 'KLSE Shareholding Changes',
  klse_announcement: 'KLSE Announcement',
  klse_shareholdings_page: 'KLSE Shareholdings',
  yahoo_finance: 'Yahoo Finance',
  none: '—',
};

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function fmtShares(shares: number | null): string {
  if (shares == null || !Number.isFinite(shares)) return INSIDER_FIELD_MISSING_JA;
  return `${shares.toLocaleString('en-MY')} 株`;
}

function computeNetActivity(buy: number, sell: number): InsiderNetActivityLabel {
  if (buy === 0 && sell === 0) return 'データ不足';
  if (buy > sell + 1) return '買い優勢';
  if (sell > buy + 1) return '売り優勢';
  return '中立';
}

function computeConfidence(input: {
  tx90: ParsedInsiderTransaction[];
  hasShares: boolean;
  sources: Set<string>;
}): number {
  let score = 15;
  if (input.tx90.length > 0) score += 25;
  if (input.hasShares) score += 20;
  if (input.tx90.some((t) => t.role === 'Director')) score += 15;
  if (input.sources.has('klse_shareholding_changes')) score += 15;
  if (input.tx90.length >= 3) score += 10;
  return clamp(score);
}

function pickPrimarySource(sources: Set<string>): InsiderTradingSource {
  if (sources.has('klse_shareholding_changes')) return 'klse_shareholding_changes';
  if (sources.has('klse_shareholdings_page')) return 'klse_shareholdings_page';
  if (sources.has('klse_announcement')) return 'klse_announcement';
  return 'none';
}

function buildDisplayFields(input: {
  latest: ParsedInsiderTransaction | null;
  buyCount: number;
  sellCount: number;
  net: InsiderNetActivityLabel;
  confidence: number;
}): InsiderTradingDisplayFields {
  return {
    latestTransactionDate: input.latest?.transactionDate ?? input.latest?.announcedDate ?? INSIDER_FIELD_MISSING_JA,
    transactionType:
      input.latest?.type === 'buy' ? '買い' : input.latest?.type === 'sell' ? '売り' : INSIDER_FIELD_MISSING_JA,
    insiderName: input.latest?.name ?? INSIDER_FIELD_MISSING_JA,
    insiderRole: input.latest?.role ?? INSIDER_FIELD_MISSING_JA,
    transactionValue: fmtShares(input.latest?.shares ?? null),
    buyCount90d: String(input.buyCount),
    sellCount90d: String(input.sellCount),
    netActivity: input.net,
    confidence: String(input.confidence),
  };
}

function buildEvaluationJa(input: {
  latest: ParsedInsiderTransaction | null;
  buyCount: number;
  sellCount: number;
  net: InsiderNetActivityLabel;
  source: InsiderTradingSource;
}): string {
  const parts = ['Insider Trading'];
  if (input.latest?.name) parts.push(input.latest.name.slice(0, 40));
  if (input.latest?.type) parts.push(input.latest.type === 'buy' ? '買い' : '売り');
  parts.push(`90日 買${input.buyCount}/売${input.sellCount}`);
  parts.push(input.net);
  parts.push(`[${SOURCE_LABEL[input.source]}]`);
  return parts.join(' · ');
}

function emptyAnalysis(reason: string | null = null): BursaInsiderTradingAnalysis {
  const missing = INSIDER_FIELD_MISSING_JA;
  return {
    availability: 'unavailable',
    availabilityLabelJa: INSIDER_TRADING_UNAVAILABLE_JA,
    insiderBuyCount: 0,
    insiderSellCount: 0,
    netInsiderActivity: 'データ不足',
    latestTransactionDate: null,
    latestTransactionType: null,
    transactionValue: null,
    insiderName: null,
    insiderRole: null,
    confidenceScore: 0,
    source: 'none',
    unavailableReason: reason ?? INSIDER_TRADING_UNAVAILABLE_JA,
    displayJa: {
      latestTransactionDate: missing,
      transactionType: missing,
      insiderName: missing,
      insiderRole: missing,
      transactionValue: missing,
      buyCount90d: '0',
      sellCount90d: '0',
      netActivity: 'データ不足',
      confidence: '0',
    },
    evaluationJa: INSIDER_TRADING_UNAVAILABLE_JA,
    hasExtractableData: false,
    fetchedAt: null,
  };
}

async function fetchYahooInsiderFallback(_stockCode: string): Promise<ParsedInsiderTransaction[]> {
  return [];
}

export async function buildInsiderTradingAnalysis(input: {
  stockCode: string;
  stockHtml: string | null;
  fetchLiveExternal: boolean;
}): Promise<BursaInsiderTradingAnalysis> {
  if (!input.fetchLiveExternal) {
    return emptyAnalysis('fetchLiveExternal=false');
  }

  let html = input.stockHtml;
  if (!html?.trim()) {
    const page = await fetchKlseStockPageHtml(input.stockCode);
    html = page?.html ?? null;
  }
  if (!html?.trim()) {
    return emptyAnalysis('KLSE stock HTML 未取得');
  }

  const parts: ParsedInsiderTransaction[] = [
    ...parseShareholdingChangesFromStockHtml(html),
    ...parseInsiderAnnouncementsFromStockHtml(html),
  ];

  const shareholdingsPage = await fetchKlseShareholdingsHtml(input.stockCode);
  if (shareholdingsPage?.html) {
    parts.push(...parseShareholdingsPageForStock(shareholdingsPage.html, input.stockCode));
  }

  if (parts.length === 0) {
    const yahoo = await fetchYahooInsiderFallback(input.stockCode);
    parts.push(...yahoo);
  }

  const merged = mergeInsiderTransactions(parts);
  const tx90 = filterTransactionsWithinDays(merged, 90);
  const counted = tx90.filter((t) => t.shares != null || t.source !== 'klse_announcement');
  const buyCount = counted.filter((t) => t.type === 'buy').length;
  const sellCount = counted.filter((t) => t.type === 'sell').length;

  const withShares = tx90.filter((t) => t.shares != null);
  const latest = sortTransactionsByDateDesc(withShares.length > 0 ? withShares : tx90)[0] ?? null;

  if (!latest && tx90.length === 0) {
    return emptyAnalysis('直近90日の Insider/Shareholding 取引なし');
  }

  const sources = new Set(tx90.map((t) => t.source));
  const hasShares = withShares.length > 0;
  const confidenceScore = computeConfidence({ tx90, hasShares, sources });
  const net = computeNetActivity(buyCount, sellCount);
  const source = pickPrimarySource(sources);

  const latestType: InsiderTransactionType | null = latest?.type ?? null;

  return {
    availability: 'available',
    availabilityLabelJa: '取得済',
    insiderBuyCount: buyCount,
    insiderSellCount: sellCount,
    netInsiderActivity: net,
    latestTransactionDate: latest?.transactionDate ?? latest?.announcedDate ?? null,
    latestTransactionType: latestType,
    transactionValue: latest?.shares != null ? fmtShares(latest.shares) : null,
    insiderName: latest?.name ?? null,
    insiderRole: latest?.role ?? null,
    confidenceScore,
    source,
    unavailableReason: null,
    displayJa: buildDisplayFields({ latest, buyCount, sellCount, net, confidence: confidenceScore }),
    evaluationJa: buildEvaluationJa({ latest, buyCount, sellCount, net, source }),
    hasExtractableData: true,
    fetchedAt: new Date().toISOString(),
  };
}

export function insiderTradingToMaterialInputs(
  analysis: BursaInsiderTradingAnalysis | null | undefined,
): import('./bursaMaterialSentiment').RawMaterialInput[] {
  if (!analysis || analysis.availability !== 'available' || !analysis.hasExtractableData) {
    return [];
  }

  const title = analysis.evaluationJa.slice(0, 180);
  return [
    {
      source: 'bursa_announcement',
      title,
      url: null,
      publishedAt: analysis.latestTransactionDate,
      idSuffix: 'insider-trading',
      sourceLabelJa: 'Insider Trading (Phase15)',
    },
  ];
}

/** 材料スコア用 — Insider売却だけで強い売り材料にしない */
export function insiderMaterialScoreAdjustment(analysis: BursaInsiderTradingAnalysis | null): number {
  if (!analysis || analysis.availability !== 'available') return 0;
  if (analysis.netInsiderActivity === '買い優勢') return Math.min(12, 4 + analysis.insiderBuyCount * 2);
  if (analysis.netInsiderActivity === '売り優勢') return -Math.min(8, 3 + analysis.insiderSellCount * 2);
  return 0;
}
