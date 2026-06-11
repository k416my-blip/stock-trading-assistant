/**
 * Phase16 — Institutional Ownership 解析
 */
import type {
  BursaInstitutionalOwnershipAnalysis,
  InstitutionalHolderRecord,
  InstitutionalOwnershipDisplayFields,
  InstitutionalOwnershipSource,
  NetInstitutionalFlow,
} from '../../types/bursaInstitutionalOwnership';
import {
  INSTITUTIONAL_FIELD_MISSING_JA,
  INSTITUTIONAL_OWNERSHIP_UNAVAILABLE_JA,
} from '../../types/bursaInstitutionalOwnership';
import {
  buildInstitutionalHolderRecords,
  filterSnapshotsWithinDays,
  parseInstitutionalOwnershipFromHtml,
  type ParsedInstitutionalSnapshot,
} from './bursaInstitutionalOwnershipParser';
import {
  fetchKlseShareholdingsHtml,
  fetchKlseStockPageHtml,
} from './bursaKlseHtmlClient';

const SOURCE_LABEL: Record<InstitutionalOwnershipSource, string> = {
  klse_shareholding_changes: 'KLSE Shareholding Changes',
  klse_major_shareholders: 'KLSE Major Shareholders',
  klse_announcement: 'KLSE Announcement',
  yahoo_finance: 'Yahoo Finance',
  none: '—',
};

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function fmtPct(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return INSTITUTIONAL_FIELD_MISSING_JA;
  return `${n.toFixed(2)}%`;
}

function fmtShares(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return INSTITUTIONAL_FIELD_MISSING_JA;
  return `${n.toLocaleString('en-MY')} 株`;
}

function fmtChangeRate(holder: InstitutionalHolderRecord): string {
  if (holder.increaseRatePct != null && holder.increaseRatePct > 0) {
    return `+${holder.increaseRatePct.toFixed(1)}%`;
  }
  if (holder.decreaseRatePct != null && holder.decreaseRatePct > 0) {
    return `-${holder.decreaseRatePct.toFixed(1)}%`;
  }
  if (holder.pctDiff != null && Math.abs(holder.pctDiff) >= 0.001) {
    const sign = holder.pctDiff > 0 ? '+' : '';
    return `${sign}${holder.pctDiff.toFixed(2)}pt`;
  }
  if (holder.shareDiff != null && holder.shareDiff !== 0) {
    const sign = holder.shareDiff > 0 ? '+' : '';
    return `${sign}${holder.shareDiff.toLocaleString('en-MY')} 株`;
  }
  return '変化なし';
}

function computeNetFlow(input: {
  tx90: ParsedInstitutionalSnapshot[];
  holders: InstitutionalHolderRecord[];
}): NetInstitutionalFlow {
  let buyShares = 0;
  let sellShares = 0;
  for (const tx of input.tx90) {
    if (tx.type === 'buy' && tx.transactionShares != null) buyShares += tx.transactionShares;
    if (tx.type === 'sell' && tx.transactionShares != null) sellShares += tx.transactionShares;
  }

  const netShares = buyShares - sellShares;
  const total = buyShares + sellShares;

  if (total > 0) {
    const buyRatio = buyShares / total;
    if (netShares > 0 && buyRatio >= 0.7) return 'Strong Buying';
    if (netShares > 0) return 'Buying';
    if (netShares < 0 && buyRatio <= 0.3) return 'Strong Selling';
    if (netShares < 0) return 'Selling';
    return 'Neutral';
  }

  const netPctDiff = input.holders.reduce((sum, h) => sum + (h.pctDiff ?? 0), 0);
  if (netPctDiff >= 0.5) return 'Buying';
  if (netPctDiff <= -0.5) return 'Selling';
  return 'Neutral';
}

function computeConfidence(input: {
  holders: InstitutionalHolderRecord[];
  tx90: ParsedInstitutionalSnapshot[];
  sources: Set<string>;
}): number {
  let score = 10;
  if (input.holders.length > 0) score += 20;
  if (input.holders.some((h) => h.holdingPct != null)) score += 25;
  if (input.holders.some((h) => h.shareDiff != null || h.pctDiff != null)) score += 15;
  if (input.tx90.length > 0) score += 15;
  if (input.sources.has('klse_shareholdings_page') || input.sources.has('klse_major_shareholders')) {
    score += 10;
  }
  if (input.holders.length >= 3) score += 5;
  return clamp(score);
}

function pickPrimarySource(sources: Set<string>): InstitutionalOwnershipSource {
  if (sources.has('klse_shareholdings_page')) return 'klse_major_shareholders';
  if (sources.has('klse_major_shareholders')) return 'klse_major_shareholders';
  if (sources.has('klse_shareholding_changes')) return 'klse_shareholding_changes';
  if (sources.has('yahoo_finance')) return 'yahoo_finance';
  return 'none';
}

function buildDisplayFields(input: {
  holders: InstitutionalHolderRecord[];
  netFlow: NetInstitutionalFlow;
  confidence: number;
}): InstitutionalOwnershipDisplayFields {
  const top3 = input.holders.slice(0, 3);
  const topHolders =
    top3.length > 0
      ? top3.map((h) => `${h.name} ${fmtPct(h.holdingPct)}`).join(' / ')
      : INSTITUTIONAL_FIELD_MISSING_JA;

  const recentChange =
    top3.length > 0
      ? top3.map((h) => `${h.name}: ${fmtChangeRate(h)}`).join(' · ')
      : INSTITUTIONAL_FIELD_MISSING_JA;

  return {
    holderCount: String(input.holders.length),
    topHolders,
    recentChange,
    netFlow: input.netFlow,
    confidence: String(input.confidence),
    holders: input.holders.map((h) => ({
      name: h.name,
      holdingPct: fmtPct(h.holdingPct),
      changeRate: fmtChangeRate(h),
      latestReportDate: h.latestReportDate ?? INSTITUTIONAL_FIELD_MISSING_JA,
    })),
  };
}

function buildEvaluationJa(input: {
  holders: InstitutionalHolderRecord[];
  netFlow: NetInstitutionalFlow;
  source: InstitutionalOwnershipSource;
}): string {
  const parts = ['Institutional Ownership'];
  parts.push(`機関${input.holders.length}件`);
  const top3 = input.holders.slice(0, 3).map((h) => `${h.name} ${fmtPct(h.holdingPct)}`);
  if (top3.length > 0) parts.push(top3.join(' / '));
  parts.push(input.netFlow);
  parts.push(`[${SOURCE_LABEL[input.source]}]`);
  return parts.join(' · ');
}

function emptyAnalysis(reason: string | null = null): BursaInstitutionalOwnershipAnalysis {
  return {
    availability: 'unavailable',
    availabilityLabelJa: INSTITUTIONAL_OWNERSHIP_UNAVAILABLE_JA,
    holderCount: 0,
    holders: [],
    netInstitutionalFlow: 'Neutral',
    institutionalConfidenceScore: 0,
    source: 'none',
    unavailableReason: reason ?? INSTITUTIONAL_OWNERSHIP_UNAVAILABLE_JA,
    displayJa: {
      holderCount: '0',
      topHolders: INSTITUTIONAL_FIELD_MISSING_JA,
      recentChange: INSTITUTIONAL_FIELD_MISSING_JA,
      netFlow: 'Neutral',
      confidence: '0',
      holders: [],
    },
    evaluationJa: INSTITUTIONAL_OWNERSHIP_UNAVAILABLE_JA,
    hasExtractableData: false,
    fetchedAt: null,
  };
}

async function fetchYahooInstitutionalFallback(_stockCode: string): Promise<ParsedInstitutionalSnapshot[]> {
  return [];
}

export async function buildInstitutionalOwnershipAnalysis(input: {
  stockCode: string;
  stockHtml: string | null;
  shareholdingsHtml?: string | null;
  fetchLiveExternal: boolean;
}): Promise<BursaInstitutionalOwnershipAnalysis> {
  if (!input.fetchLiveExternal) {
    return emptyAnalysis('fetchLiveExternal=false');
  }

  let stockHtml = input.stockHtml;
  if (!stockHtml?.trim()) {
    const page = await fetchKlseStockPageHtml(input.stockCode);
    stockHtml = page?.html ?? null;
  }

  let shareholdingsHtml = input.shareholdingsHtml ?? null;
  if (!shareholdingsHtml?.trim()) {
    const shareholdingsPage = await fetchKlseShareholdingsHtml(input.stockCode);
    shareholdingsHtml = shareholdingsPage?.html ?? null;
  }

  if (!stockHtml?.trim() && !shareholdingsHtml?.trim()) {
    return emptyAnalysis('KLSE HTML 未取得');
  }

  let snapshots = parseInstitutionalOwnershipFromHtml({
    stockCode: input.stockCode,
    stockHtml,
    shareholdingsHtml,
  });

  if (snapshots.length === 0) {
    const yahoo = await fetchYahooInstitutionalFallback(input.stockCode);
    snapshots = yahoo;
  }

  if (snapshots.length === 0) {
    return emptyAnalysis('機関投資家保有データなし');
  }

  const holders = buildInstitutionalHolderRecords(snapshots);
  if (holders.length === 0) {
    return emptyAnalysis('機関投資家保有データなし');
  }

  const tx90 = filterSnapshotsWithinDays(snapshots, 90);
  const sources = new Set(snapshots.map((s) => s.source));
  const netInstitutionalFlow = computeNetFlow({ tx90, holders });
  const institutionalConfidenceScore = computeConfidence({ holders, tx90, sources });
  const source = pickPrimarySource(sources);

  return {
    availability: 'available',
    availabilityLabelJa: '取得済',
    holderCount: holders.length,
    holders,
    netInstitutionalFlow,
    institutionalConfidenceScore,
    source,
    unavailableReason: null,
    displayJa: buildDisplayFields({ holders, netFlow: netInstitutionalFlow, confidence: institutionalConfidenceScore }),
    evaluationJa: buildEvaluationJa({ holders, netFlow: netInstitutionalFlow, source }),
    hasExtractableData: true,
    fetchedAt: new Date().toISOString(),
  };
}

export function institutionalOwnershipToMaterialInputs(
  analysis: BursaInstitutionalOwnershipAnalysis | null | undefined,
): import('./bursaMaterialSentiment').RawMaterialInput[] {
  if (!analysis || analysis.availability !== 'available' || !analysis.hasExtractableData) {
    return [];
  }
  return [
    {
      source: 'bursa_announcement',
      title: analysis.evaluationJa.slice(0, 180),
      url: null,
      publishedAt: analysis.holders[0]?.latestReportDate ?? null,
      idSuffix: 'institutional-ownership',
      sourceLabelJa: 'Institutional Ownership (Phase16)',
    },
  ];
}

/** 材料スコア用 — 単独では売買判定を決定しない */
export function institutionalMaterialScoreAdjustment(
  analysis: BursaInstitutionalOwnershipAnalysis | null,
): number {
  if (!analysis || analysis.availability !== 'available') return 0;
  switch (analysis.netInstitutionalFlow) {
    case 'Strong Buying':
      return 15;
    case 'Buying':
      return 8;
    case 'Selling':
      return -8;
    case 'Strong Selling':
      return -15;
    default:
      return 0;
  }
}
