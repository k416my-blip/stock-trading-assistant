/**
 * Bursa Phase 11 — リアルタイム材料分析オーケストレータ
 */
import type { PortfolioPosition } from '../../types';
import type {
  BursaDisclosureBundle,
  BursaMaterialItem,
  BursaPhase11Analysis,
  BursaPhase9Analysis,
  BursaStockMaterialAnalysis,
} from '../../types/bursaDisclosure';
import type { AnalysisApiKeys } from '../analysisApiKeys';
import { fetchBursaDisclosureBundle } from './bursaDisclosureService';
import { fetchAllMaterialSources } from './bursaMaterialSources';
import {
  aggregateMaterialScore,
  buildBuyReasonsToday,
  buildMaterialSummaryLines,
  buildSellReasonsToday,
  scoreMaterialItem,
} from './bursaMaterialSentiment';
import { buildBursaPhase9FromBundles } from './bursaPhase9Analysis';
import { getSectorPeerCodes } from './bursaSectorPeers';
import { getBursaUniverseStockCodes } from './bursaStockUniverse';

const VERIFY_CODES = ['1155', '1066', '5819', '5183'];

function normalizeCode(symbol: string): string {
  return symbol.replace(/\.KL$/i, '').trim();
}

function sectorLabelJa(sector: string | null): string {
  const s = sector?.toLowerCase() ?? '';
  if (s.includes('bank')) return '銀行';
  if (s.includes('chemical') || s.includes('petro')) return '化学';
  if (s.includes('util')) return '公益';
  if (s.includes('plant')) return 'プランテーション';
  if (s.includes('telecom')) return '通信';
  return '同セクター';
}

function buildSectorRankMaterial(input: {
  stockCode: string;
  sector: string | null;
  phase9: BursaPhase9Analysis | null;
}): BursaMaterialItem | null {
  if (!input.phase9) return null;
  const peers = getSectorPeerCodes(input.sector, input.stockCode).filter(
    (c) => c !== normalizeCode(input.stockCode),
  );
  if (peers.length < 2) return null;

  let up = 0;
  let down = 0;
  for (const code of peers) {
    const row = input.phase9.rankChanges.find((r) => normalizeCode(r.stockCode) === code);
    if (!row?.delta) continue;
    if (row.delta >= 3) up += 1;
    if (row.delta <= -3) down += 1;
  }

  const label = sectorLabelJa(input.sector);
  if (up >= 2 && up > down) {
    return scoreMaterialItem({
      source: 'bursa_announcement',
      title: `${label}セクター強い`,
      url: null,
      publishedAt: input.phase9.snapshotCapturedAt,
      idSuffix: 'sector-up',
    });
  }
  if (down >= 2 && down > up) {
    return scoreMaterialItem({
      source: 'bursa_announcement',
      title: `${label}セクター弱い`,
      url: null,
      publishedAt: input.phase9.snapshotCapturedAt,
      idSuffix: 'sector-down',
    });
  }
  return null;
}

async function analyzeOneStock(input: {
  bundle: BursaDisclosureBundle;
  stockHtml: string | null;
  apiKeys: AnalysisApiKeys;
  fetchLiveExternal: boolean;
  phase9: BursaPhase9Analysis | null;
}): Promise<BursaStockMaterialAnalysis> {
  const code = input.bundle.stockCode;
  const companyName = input.bundle.profile.companyName;
  const fetchedFields: string[] = [];
  const missingFields: string[] = [];

  const fetched = await fetchAllMaterialSources({
    stockCode: code,
    companyName,
    stockHtml: input.stockHtml,
    bundle: input.bundle,
    apiKeys: input.apiKeys,
    fetchLiveExternal: input.fetchLiveExternal,
  });

  const items: BursaMaterialItem[] = fetched.headlines.map((h) => scoreMaterialItem(h));
  const sectorItem = buildSectorRankMaterial({
    stockCode: code,
    sector: input.bundle.profile.sector,
    phase9: input.phase9,
  });
  if (sectorItem) items.push(sectorItem);

  const positiveMaterials = items.filter((i) => i.sentiment === '好材料' && i.score > 0);
  const negativeMaterials = items.filter((i) => i.sentiment === '悪材料' && i.score < 0);
  const neutralMaterials = items.filter((i) => i.sentiment === '中立');

  const { total, breakdown } = aggregateMaterialScore(items);

  const stock: BursaStockMaterialAnalysis = {
    stockCode: code,
    companyName,
    materialScore: total,
    scoreBreakdown: breakdown,
    positiveMaterials,
    negativeMaterials,
    neutralMaterials,
    summaryLines: ['', '', ''] as [string, string, string],
    buyReasonsToday: buildBuyReasonsToday(positiveMaterials),
    sellReasonsToday: buildSellReasonsToday(negativeMaterials),
    sourceStatus: fetched.sourceStatus,
    newsApiDiagnostics: fetched.newsApiDiagnostics,
    redditFetchDiagnostics: fetched.redditFetchDiagnostics,
    fetchedFields,
    missingFields,
  };
  stock.summaryLines = buildMaterialSummaryLines(stock);

  for (const [src, st] of Object.entries(fetched.sourceStatus)) {
    if (st === 'ok' || st === 'partial') fetchedFields.push(`phase11.${src}`);
    else missingFields.push(`phase11.${src}`);
  }
  if (items.length > 0) fetchedFields.push('phase11.materials');
  else missingFields.push('phase11.materials');

  return stock;
}

function buildMonitoringNotifications(stocks: BursaStockMaterialAnalysis[]): string[] {
  const out: string[] = [];
  for (const s of stocks) {
    if (s.materialScore >= 25) {
      out.push(
        `${s.companyName ?? s.stockCode}: 好材料スコア +${s.materialScore} — ${s.buyReasonsToday[0] ?? '材料確認'}`,
      );
    } else if (s.materialScore <= -25) {
      out.push(
        `${s.companyName ?? s.stockCode}: 悪材料スコア ${s.materialScore} — ${s.sellReasonsToday[0] ?? '材料確認'}`,
      );
    }
  }
  return out;
}

function pickTopMaterial(stocks: BursaStockMaterialAnalysis[]): BursaStockMaterialAnalysis | null {
  if (stocks.length === 0) return null;
  return [...stocks].sort((a, b) => Math.abs(b.materialScore) - Math.abs(a.materialScore))[0] ?? null;
}

async function fetchBundles(holdings: PortfolioPosition[]): Promise<BursaDisclosureBundle[]> {
  const universeCodes = getBursaUniverseStockCodes();
  const holdingCodes = holdings
    .filter((h) => h.market === 'bursa' && (h.shares ?? 0) > 0)
    .map((h) => normalizeCode(h.symbol));
  const targetCodes = [...new Set([...VERIFY_CODES, ...holdingCodes, ...universeCodes])].slice(0, 12);
  return Promise.all(targetCodes.map((c) => fetchBursaDisclosureBundle(c)));
}

export async function buildBursaPhase11Analysis(input?: {
  holdings?: PortfolioPosition[];
  bundles?: BursaDisclosureBundle[];
  stockHtmlByCode?: Record<string, string>;
  apiKeys?: AnalysisApiKeys;
  fetchLiveExternal?: boolean;
  phase9?: BursaPhase9Analysis | null;
}): Promise<BursaPhase11Analysis> {
  const holdings = input?.holdings ?? [];
  let apiKeys = input?.apiKeys;
  if (!apiKeys) {
    const { loadAnalysisApiKeys } = await import('../analysisApiKeys');
    apiKeys = await loadAnalysisApiKeys();
  }
  const fetchLiveExternal = input?.fetchLiveExternal ?? true;
  const bundles =
    input?.bundles ??
    (await fetchBundles(holdings)).filter((b) =>
      VERIFY_CODES.includes(b.stockCode) || holdings.some((h) => normalizeCode(h.symbol) === b.stockCode),
    );

  const targetBundles =
    bundles.length > 0
      ? bundles.filter((b) => VERIFY_CODES.includes(b.stockCode))
      : bundles.slice(0, 4);

  let phase9 = input?.phase9 ?? null;
  if (!phase9 && targetBundles.length > 0) {
    phase9 = await buildBursaPhase9FromBundles({
      bundles: targetBundles,
      holdings,
      persistSnapshot: false,
    });
  }

  const stocks = await Promise.all(
    targetBundles.map((bundle) =>
      analyzeOneStock({
        bundle,
        stockHtml: input?.stockHtmlByCode?.[bundle.stockCode] ?? null,
        apiKeys,
        fetchLiveExternal,
        phase9,
      }),
    ),
  );

  const fetchedFields: string[] = ['phase11.stocks'];
  const missingFields: string[] = [];
  if (stocks.every((s) => s.missingFields.includes('phase11.materials'))) {
    missingFields.push('phase11.materials');
  }

  return {
    stocks,
    topMaterial: pickTopMaterial(stocks),
    monitoringNotifications: buildMonitoringNotifications(stocks),
    fetchedFields,
    missingFields,
  };
}

export async function buildBursaPhase11FromBundles(input: {
  bundles: BursaDisclosureBundle[];
  holdings?: PortfolioPosition[];
  stockHtmlByCode?: Record<string, string>;
  apiKeys?: AnalysisApiKeys;
  fetchLiveExternal?: boolean;
  phase9?: BursaPhase9Analysis | null;
}): Promise<BursaPhase11Analysis> {
  return buildBursaPhase11Analysis({
    bundles: input.bundles,
    holdings: input.holdings ?? [],
    stockHtmlByCode: input.stockHtmlByCode,
    apiKeys: input.apiKeys,
    fetchLiveExternal: input.fetchLiveExternal ?? false,
    phase9: input.phase9,
  });
}
