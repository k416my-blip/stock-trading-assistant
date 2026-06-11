/**
 * Bursa Phase 11 — 材料分析 UI フォーマット
 */
import type {
  BursaPhase11Analysis,
  BursaStockMaterialAnalysis,
} from '../../types/bursaDisclosure';
import {
  buildSourceScoreBreakdown,
  computeMaterialDataQuality,
  formatPaidApiConnection,
  formatRedditApiConnection,
  PAID_API_SOURCES,
  PAID_API_UI_LABEL,
  type MaterialDataQuality,
  type SourceScoreRow,
} from './bursaMaterialDataQuality';
import { MATERIAL_MISSING_JA } from './bursaMaterialSentiment';
import { EARNINGS_CALL_UNAVAILABLE_JA } from '../../types/bursaEarningsCall';
import { ANALYST_CONSENSUS_UNAVAILABLE_JA } from '../../types/bursaAnalystConsensus';
import { INSIDER_TRADING_UNAVAILABLE_JA } from '../../types/bursaInsiderTrading';
import { INSTITUTIONAL_OWNERSHIP_UNAVAILABLE_JA } from '../../types/bursaInstitutionalOwnership';
import { INSTITUTIONAL_TREND_UNAVAILABLE_JA } from '../../types/bursaInstitutionalTrend';
import { HISTORICAL_OWNERSHIP_UNAVAILABLE_JA } from '../../types/bursaHistoricalOwnership';
import { FIXED_BASKET_UNAVAILABLE_JA } from '../../types/bursaFixedInstitutionalBasket';
import { DIVIDEND_INTELLIGENCE_UNAVAILABLE_JA } from '../../types/bursaDividendIntelligence';
import { MACRO_INTELLIGENCE_UNAVAILABLE_JA } from '../../types/bursaMacroIntelligence';
import { SECTOR_ROTATION_UNAVAILABLE_JA } from '../../types/bursaSectorRotation';
import { VALUATION_INTELLIGENCE_UNAVAILABLE_JA } from '../../types/bursaValuationIntelligence';
import { FAIR_VALUE_INTELLIGENCE_UNAVAILABLE_JA } from '../../types/bursaFairValueIntelligence';
import { ANALYST_TARGET_INTELLIGENCE_UNAVAILABLE_JA } from '../../types/bursaAnalystTargetIntelligence';
import { VALUATION_GAP_INTELLIGENCE_UNAVAILABLE_JA } from '../../types/bursaValuationGapIntelligence';
import { CONVICTION_INTELLIGENCE_UNAVAILABLE_JA } from '../../types/bursaConvictionIntelligence';
import { EARNINGS_REVISION_INTELLIGENCE_UNAVAILABLE_JA } from '../../types/bursaEarningsRevisionIntelligence';
import { NEWS_INTELLIGENCE_UNAVAILABLE_JA } from '../../types/bursaNewsIntelligence';

export const MATERIAL_ANALYSIS_MISSING_JA = MATERIAL_MISSING_JA;

const DEFAULT_SOURCE_LABEL: Record<string, string> = {
  bursa_announcement: 'Bursa Announcement',
  news_api: 'News API',
  rss: 'RSS',
  x: 'X (Twitter)',
  reddit: 'Reddit',
};

const STATUS_LABEL: Record<string, string> = {
  ok: '取得済',
  partial: '一部取得',
  failed: '取得失敗',
  skipped: '未接続',
  unavailable: MATERIAL_MISSING_JA,
};

export type ApiConnectionRow = {
  apiJa: string;
  connectionJa: '接続済み' | 'Reddit RSS接続' | '未接続';
};

export type MaterialStockRow = {
  stockCode: string;
  companyNameJa: string;
  scoreJa: string;
  scoreSign: 'positive' | 'negative' | 'neutral';
  summaryLines: [string, string, string];
  breakdown: Array<{ labelJa: string; scoreJa: string }>;
  sourceScoreBreakdown: SourceScoreRow[];
  dataQuality: MaterialDataQuality;
  positive: Array<{ title: string; scoreJa: string; sourceJa: string }>;
  negative: Array<{ title: string; scoreJa: string; sourceJa: string }>;
  neutral: Array<{ title: string; sourceJa: string }>;
  buyReasons: string[];
  sellReasons: string[];
  apiConnections: ApiConnectionRow[];
  itemCountBySource: Record<string, number>;
  redditFetchDiagnostics: import('../../types/bursaDisclosure').BursaRedditFetchDiagnostics | null;
  sources: Array<{ sourceJa: string; statusJa: string }>;
  earningsCallEvaluationJa: string;
  earningsCallDisplayJa: import('../../types/bursaEarningsCall').EarningsCallDisplayFields | null;
  analystConsensusEvaluationJa: string;
  analystConsensusDisplayJa: import('../../types/bursaAnalystConsensus').AnalystConsensusDisplayFields | null;
  insiderTradingEvaluationJa: string;
  insiderTradingDisplayJa: import('../../types/bursaInsiderTrading').InsiderTradingDisplayFields | null;
  institutionalOwnershipEvaluationJa: string;
  institutionalOwnershipDisplayJa: import('../../types/bursaInstitutionalOwnership').InstitutionalOwnershipDisplayFields | null;
  institutionalTrendEvaluationJa: string;
  institutionalTrendDisplayJa: import('../../types/bursaInstitutionalTrend').InstitutionalTrendDisplayFields | null;
  historicalOwnershipEvaluationJa: string;
  historicalOwnershipDisplayJa: import('../../types/bursaHistoricalOwnership').HistoricalOwnershipDisplayFields | null;
  fixedInstitutionalBasketEvaluationJa: string;
  fixedInstitutionalBasketDisplayJa: import('../../types/bursaFixedInstitutionalBasket').FixedBasketDisplayFields | null;
  dividendIntelligenceEvaluationJa: string;
  dividendIntelligenceDisplayJa: import('../../types/bursaDividendIntelligence').DividendIntelligenceDisplayFields | null;
  newsIntelligenceEvaluationJa: string;
  newsIntelligenceDisplayJa: import('../../types/bursaNewsIntelligence').NewsIntelligenceDisplayFields | null;
  macroIntelligenceEvaluationJa: string;
  macroIntelligenceDisplayJa: import('../../types/bursaMacroIntelligence').MacroIntelligenceDisplayFields | null;
  sectorRotationEvaluationJa: string;
  sectorRotationDisplayJa: import('../../types/bursaSectorRotation').SectorRotationDisplayFields | null;
  valuationIntelligenceEvaluationJa: string;
  valuationIntelligenceDisplayJa: import('../../types/bursaValuationIntelligence').ValuationIntelligenceDisplayFields | null;
  fairValueIntelligenceEvaluationJa: string;
  fairValueIntelligenceDisplayJa: import('../../types/bursaFairValueIntelligence').FairValueIntelligenceDisplayFields | null;
  analystTargetIntelligenceEvaluationJa: string;
  analystTargetIntelligenceDisplayJa: import('../../types/bursaAnalystTargetIntelligence').AnalystTargetIntelligenceDisplayFields | null;
  valuationGapIntelligenceEvaluationJa: string;
  valuationGapIntelligenceDisplayJa: import('../../types/bursaValuationGapIntelligence').ValuationGapIntelligenceDisplayFields | null;
  convictionIntelligenceEvaluationJa: string;
  convictionIntelligenceDisplayJa: import('../../types/bursaConvictionIntelligence').ConvictionIntelligenceDisplayFields | null;
  earningsRevisionIntelligenceEvaluationJa: string;
  earningsRevisionIntelligenceDisplayJa: import('../../types/bursaEarningsRevisionIntelligence').EarningsRevisionIntelligenceDisplayFields | null;
};

export type MaterialAnalysisReport = {
  topMaterial: MaterialStockRow | null;
  stocks: MaterialStockRow[];
  monitoringNotifications: string[];
  dataSourceLabel: string;
  reportDataQuality: MaterialDataQuality | null;
  apiConnections: ApiConnectionRow[];
};

function fmtScore(n: number): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n}`;
}

function scoreSign(n: number): 'positive' | 'negative' | 'neutral' {
  if (n > 10) return 'positive';
  if (n < -10) return 'negative';
  return 'neutral';
}

function materialSourceLabel(item: { source: string; sourceLabelJa?: string }): string {
  return item.sourceLabelJa ?? DEFAULT_SOURCE_LABEL[item.source] ?? item.source;
}

function countItemsBySource(stock: BursaStockMaterialAnalysis): Record<string, number> {
  const items = [
    ...(stock.positiveMaterials ?? []),
    ...(stock.negativeMaterials ?? []),
    ...(stock.neutralMaterials ?? []),
  ];
  const counts: Record<string, number> = {};
  for (const item of items) {
    const label = materialSourceLabel(item);
    counts[label] = (counts[label] ?? 0) + 1;
    if (item.source === 'reddit') {
      counts.Reddit = (counts.Reddit ?? 0) + 1;
    }
  }
  return counts;
}

function buildApiConnections(s: BursaStockMaterialAnalysis): ApiConnectionRow[] {
  const sourceStatus = s.sourceStatus ?? ({} as BursaStockMaterialAnalysis['sourceStatus']);
  return PAID_API_SOURCES.map((src) => {
    if (src === 'reddit') {
      return {
        apiJa: PAID_API_UI_LABEL[src],
        connectionJa: formatRedditApiConnection(
          sourceStatus.reddit,
          s.redditFetchDiagnostics?.fetchMethod,
        ),
      };
    }
    return {
      apiJa: PAID_API_UI_LABEL[src],
      connectionJa: formatPaidApiConnection(sourceStatus[src]),
    };
  });
}

function mapStock(s: BursaStockMaterialAnalysis): MaterialStockRow {
  const dataQuality = computeMaterialDataQuality(s.sourceStatus);
  return {
    stockCode: s.stockCode,
    companyNameJa: s.companyName ?? MATERIAL_MISSING_JA,
    scoreJa: fmtScore(s.materialScore),
    scoreSign: scoreSign(s.materialScore),
    summaryLines: s.summaryLines,
    breakdown: s.scoreBreakdown.map((b) => ({
      labelJa: b.labelJa,
      scoreJa: fmtScore(b.score),
    })),
    sourceScoreBreakdown: buildSourceScoreBreakdown(s),
    dataQuality,
    positive: (s.positiveMaterials ?? []).map((m) => ({
      title: m.title,
      scoreJa: fmtScore(m.score),
      sourceJa: materialSourceLabel(m),
    })),
    negative: (s.negativeMaterials ?? []).map((m) => ({
      title: m.title,
      scoreJa: fmtScore(m.score),
      sourceJa: materialSourceLabel(m),
    })),
    neutral: (s.neutralMaterials ?? []).map((m) => ({
      title: m.title,
      sourceJa: materialSourceLabel(m),
    })),
    buyReasons: s.buyReasonsToday,
    sellReasons: s.sellReasonsToday,
    apiConnections: buildApiConnections(s),
    itemCountBySource: countItemsBySource(s),
    redditFetchDiagnostics: s.redditFetchDiagnostics ?? null,
    sources: Object.entries(s.sourceStatus ?? {}).map(([k, v]) => ({
      sourceJa: DEFAULT_SOURCE_LABEL[k] ?? k,
      statusJa: STATUS_LABEL[v] ?? v,
    })),
    earningsCallEvaluationJa: s.earningsCall?.evaluationJa ?? EARNINGS_CALL_UNAVAILABLE_JA,
    earningsCallDisplayJa: s.earningsCall?.displayJa ?? null,
    analystConsensusEvaluationJa: s.analystConsensus?.evaluationJa ?? ANALYST_CONSENSUS_UNAVAILABLE_JA,
    analystConsensusDisplayJa: s.analystConsensus?.displayJa ?? null,
    insiderTradingEvaluationJa: s.insiderTrading?.evaluationJa ?? INSIDER_TRADING_UNAVAILABLE_JA,
    insiderTradingDisplayJa: s.insiderTrading?.displayJa ?? null,
    institutionalOwnershipEvaluationJa:
      s.institutionalOwnership?.evaluationJa ?? INSTITUTIONAL_OWNERSHIP_UNAVAILABLE_JA,
    institutionalOwnershipDisplayJa: s.institutionalOwnership?.displayJa ?? null,
    institutionalTrendEvaluationJa:
      s.institutionalTrend?.evaluationJa ?? INSTITUTIONAL_TREND_UNAVAILABLE_JA,
    institutionalTrendDisplayJa: s.institutionalTrend?.displayJa ?? null,
    historicalOwnershipEvaluationJa:
      s.historicalOwnership?.evaluationJa ?? HISTORICAL_OWNERSHIP_UNAVAILABLE_JA,
    historicalOwnershipDisplayJa: s.historicalOwnership?.displayJa ?? null,
    fixedInstitutionalBasketEvaluationJa:
      s.fixedInstitutionalBasket?.evaluationJa ?? FIXED_BASKET_UNAVAILABLE_JA,
    fixedInstitutionalBasketDisplayJa: s.fixedInstitutionalBasket?.displayJa ?? null,
    dividendIntelligenceEvaluationJa:
      s.dividendIntelligence?.evaluationJa ?? DIVIDEND_INTELLIGENCE_UNAVAILABLE_JA,
    dividendIntelligenceDisplayJa: s.dividendIntelligence?.displayJa ?? null,
    newsIntelligenceEvaluationJa:
      s.newsIntelligence?.evaluationJa ?? NEWS_INTELLIGENCE_UNAVAILABLE_JA,
    newsIntelligenceDisplayJa: s.newsIntelligence?.displayJa ?? null,
    macroIntelligenceEvaluationJa:
      s.sectorRotation?.evaluationJa ??
      s.macroIntelligence?.evaluationJa ??
      MACRO_INTELLIGENCE_UNAVAILABLE_JA,
    macroIntelligenceDisplayJa: s.macroIntelligence?.displayJa ?? null,
    sectorRotationEvaluationJa:
      s.sectorRotation?.evaluationJa ?? SECTOR_ROTATION_UNAVAILABLE_JA,
    sectorRotationDisplayJa: s.sectorRotation?.displayJa ?? null,
    valuationIntelligenceEvaluationJa:
      s.valuationIntelligence?.evaluationJa ?? VALUATION_INTELLIGENCE_UNAVAILABLE_JA,
    valuationIntelligenceDisplayJa: s.valuationIntelligence?.displayJa ?? null,
    fairValueIntelligenceEvaluationJa:
      s.fairValueIntelligence?.evaluationJa ?? FAIR_VALUE_INTELLIGENCE_UNAVAILABLE_JA,
    fairValueIntelligenceDisplayJa: s.fairValueIntelligence?.displayJa ?? null,
    analystTargetIntelligenceEvaluationJa:
      s.analystTargetIntelligence?.evaluationJa ?? ANALYST_TARGET_INTELLIGENCE_UNAVAILABLE_JA,
    analystTargetIntelligenceDisplayJa: s.analystTargetIntelligence?.displayJa ?? null,
    valuationGapIntelligenceEvaluationJa:
      s.valuationGapIntelligence?.evaluationJa ?? VALUATION_GAP_INTELLIGENCE_UNAVAILABLE_JA,
    valuationGapIntelligenceDisplayJa: s.valuationGapIntelligence?.displayJa ?? null,
    convictionIntelligenceEvaluationJa:
      s.convictionIntelligence?.evaluationJa ?? CONVICTION_INTELLIGENCE_UNAVAILABLE_JA,
    convictionIntelligenceDisplayJa: s.convictionIntelligence?.displayJa ?? null,
    earningsRevisionIntelligenceEvaluationJa:
      s.earningsRevisionIntelligence?.evaluationJa ?? EARNINGS_REVISION_INTELLIGENCE_UNAVAILABLE_JA,
    earningsRevisionIntelligenceDisplayJa: s.earningsRevisionIntelligence?.displayJa ?? null,
  };
}

export function logPhase11NewsApiDiagnostics(phase11: BursaPhase11Analysis): void {
  for (const stock of phase11.stocks) {
    const d = stock.newsApiDiagnostics;
    const newsCount =
      d?.articleCount ??
      [...(stock.positiveMaterials ?? []), ...(stock.negativeMaterials ?? []), ...(stock.neutralMaterials ?? [])].filter(
        (m) => m.source === 'news_api',
      ).length;
    console.log(
      '[Phase11 MaterialAnalysisService] News API',
      JSON.stringify({
        stockCode: stock.stockCode,
        companyName: stock.companyName,
        newsCount,
        fetchedAt: d?.fetchedAt ?? null,
        errorReason: d?.errorReason ?? (stock.sourceStatus.news_api === 'skipped' ? 'APIキー未設定' : null),
        httpStatus: d?.httpStatus ?? null,
        sourceStatus: stock.sourceStatus.news_api,
      }),
    );
  }
}

export function formatMaterialAnalysisReport(phase11: BursaPhase11Analysis): MaterialAnalysisReport {
  logPhase11NewsApiDiagnostics(phase11);
  const stocks = phase11.stocks.map(mapStock);
  const top = phase11.topMaterial ? mapStock(phase11.topMaterial) : null;
  const reportDataQuality = top?.dataQuality ?? stocks[0]?.dataQuality ?? null;
  const apiConnections = top?.apiConnections ?? stocks[0]?.apiConnections ?? [];
  return {
    topMaterial: top,
    stocks,
    monitoringNotifications: phase11.monitoringNotifications,
    dataSourceLabel: 'Bursa · News API · RSS · X · Reddit（実データのみ）',
    reportDataQuality,
    apiConnections,
  };
}

export function materialScoreForStock(
  phase11: BursaPhase11Analysis | null,
  stockCode: string,
): string {
  if (!phase11) return MATERIAL_MISSING_JA;
  const row = phase11.stocks.find((s) => s.stockCode === stockCode);
  return row ? fmtScore(row.materialScore) : MATERIAL_MISSING_JA;
}

export function materialQualityForStockCode(
  report: MaterialAnalysisReport | null,
  stockCode: string | null,
): MaterialDataQuality | null {
  if (!report || !stockCode) return null;
  const row = report.stocks.find((s) => s.stockCode === stockCode);
  return row?.dataQuality ?? null;
}
