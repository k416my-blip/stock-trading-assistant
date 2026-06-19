/**
 * AI分析結果 — エビデンス + 材料分析から必須15項目を構築
 */
import type { AiChatStructuredReply } from '../types/aiChat';
import type {
  AiRecommendedActionJa,
  ConciergeEnhancedAnalysisReport,
  ConciergeSourceEvaluations,
  OverallTradeJudgmentJa,
} from '../types/conciergeEnhancedAnalysis';
import type { ConciergeEvidenceBundle } from '../types/conciergeEvidence';
import type { MaterialStockRow } from './bursa/bursaMaterialAnalysisService';
import { MATERIAL_MISSING_JA } from './bursa/bursaMaterialSentiment';
import {
  EARNINGS_CALL_UNAVAILABLE_JA,
} from '../types/bursaEarningsCall';
import { ANALYST_CONSENSUS_UNAVAILABLE_JA } from '../types/bursaAnalystConsensus';
import { INSIDER_TRADING_UNAVAILABLE_JA } from '../types/bursaInsiderTrading';
import { INSTITUTIONAL_OWNERSHIP_UNAVAILABLE_JA } from '../types/bursaInstitutionalOwnership';
import { INSTITUTIONAL_TREND_UNAVAILABLE_JA } from '../types/bursaInstitutionalTrend';
import { DIVIDEND_INTELLIGENCE_UNAVAILABLE_JA } from '../types/bursaDividendIntelligence';
import { MACRO_INTELLIGENCE_UNAVAILABLE_JA } from '../types/bursaMacroIntelligence';
import { VALUATION_INTELLIGENCE_UNAVAILABLE_JA } from '../types/bursaValuationIntelligence';
import { FAIR_VALUE_INTELLIGENCE_UNAVAILABLE_JA } from '../types/bursaFairValueIntelligence';
import { ANALYST_TARGET_INTELLIGENCE_UNAVAILABLE_JA } from '../types/bursaAnalystTargetIntelligence';
import { VALUATION_GAP_INTELLIGENCE_UNAVAILABLE_JA } from '../types/bursaValuationGapIntelligence';
import { CONVICTION_INTELLIGENCE_UNAVAILABLE_JA } from '../types/bursaConvictionIntelligence';
import { EARNINGS_REVISION_INTELLIGENCE_UNAVAILABLE_JA } from '../types/bursaEarningsRevisionIntelligence';
import { NEWS_INTELLIGENCE_UNAVAILABLE_JA } from '../types/bursaNewsIntelligence';
import { ANALYST_CONSENSUS_INTELLIGENCE_UNAVAILABLE_JA } from '../types/bursaAnalystConsensusIntelligence';
import { EARNINGS_REVISION_CROSS_SIGNAL_UNAVAILABLE_JA } from '../types/bursaEarningsRevisionCrossSignal';

function fmtPrice(n: number | null | undefined, currency: string): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return `${n.toLocaleString('en-MY', { maximumFractionDigits: 2 })} ${currency}`;
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function normalizeStockCode(symbol: string): string {
  return symbol.replace(/\.KL$/i, '').trim();
}

export function materialScoreToOverallScore(materialScore: number): number {
  return clampScore(50 + materialScore / 2);
}

export function resolveOverallJudgment(
  materialScore: number | null,
  stance: 'bullish' | 'neutral' | 'bearish',
): OverallTradeJudgmentJa {
  const score =
    materialScore ??
    (stance === 'bullish' ? 20 : stance === 'bearish' ? -20 : 0);
  if (score >= 40) return '強い買い';
  if (score >= 15) return '買い';
  if (score <= -40) return '強い売り';
  if (score <= -15) return '売り';
  return '中立';
}

export function resolveRecommendedAction(input: {
  judgment: OverallTradeJudgmentJa;
  insufficientData: boolean;
  categories: string[];
  unrealizedPnlPct: number | null;
}): AiRecommendedActionJa {
  if (input.insufficientData) return '監視のみ';
  if (input.categories.includes('panic') || input.categories.includes('high-risk')) {
    return input.judgment === '売り' || input.judgment === '強い売り' ? '全利確' : '監視のみ';
  }
  if (input.categories.includes('profit-taking') || (input.unrealizedPnlPct ?? 0) >= 15) {
    return input.judgment === '強い売り' || input.judgment === '売り' ? '全利確' : '一部利確';
  }
  if (input.judgment === '強い買い' || input.judgment === '買い') {
    return input.categories.includes('opportunity') ? '追加購入' : '保有継続';
  }
  if (input.judgment === '売り' || input.judgment === '強い売り') {
    return '一部利確';
  }
  return input.categories.includes('watch') ? '監視のみ' : '保有継続';
}

function scoreFromMaterialRow(materialRow: MaterialStockRow | null | undefined): number | null {
  if (!materialRow) return null;
  const n = Number.parseInt(materialRow.scoreJa.replace(/[^\d-]/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

function sourceScoreFromBreakdown(
  materialRow: MaterialStockRow | null | undefined,
  label: string,
): number {
  const row = materialRow?.sourceScoreBreakdown.find((s) => s.sourceJa === label);
  return row?.score ?? 0;
}

function summarizeBursa(
  materialRow: MaterialStockRow | null | undefined,
  sym: ConciergeEvidenceBundle['symbols'][0],
): string {
  if (materialRow) {
    const pos = materialRow.positive.filter((m) => /bursa|announcement|rss/i.test(m.sourceJa));
    const neg = materialRow.negative.filter((m) => /bursa|announcement|rss/i.test(m.sourceJa));
    if (pos.length === 0 && neg.length === 0) {
      const st = materialRow.sources.find((s) => s.sourceJa.includes('Bursa'));
      return st ? `Bursa Announcement — ${st.statusJa}` : 'Bursa — 材料なし';
    }
    const head = pos[0]?.title ?? neg[0]?.title;
    return head
      ? `Bursa — ${head.slice(0, 72)}${pos.length + neg.length > 1 ? ` 他${pos.length + neg.length - 1}件` : ''}`
      : 'Bursa — 開示・RSSを確認';
  }
  const bursaNews = sym.latestFinancialNews.find((h) => /bursa|announcement|klse/i.test(h.title));
  if (bursaNews) return `Bursa関連 — ${bursaNews.title.slice(0, 72)}`;
  return sym.newsSource.includes('Bursa') ? sym.newsSummaryJa : 'Bursa — 未取得';
}

function summarizeNews(
  materialRow: MaterialStockRow | null | undefined,
  sym: ConciergeEvidenceBundle['symbols'][0],
): string {
  if (materialRow) {
    const items = [...materialRow.positive, ...materialRow.negative].filter((m) =>
      /news/i.test(m.sourceJa),
    );
    if (items[0]) {
      return `News API — ${items[0].title.slice(0, 72)}${items.length > 1 ? ` 他${items.length - 1}件` : ''}`;
    }
    const st = materialRow.sources.find((s) => s.sourceJa.includes('News'));
    return st ? `News API — ${st.statusJa}` : 'News API — 材料なし';
  }
  if (sym.latestFinancialNews.length > 0) {
    return `News — ${sym.latestFinancialNews[0].title.slice(0, 72)}（${sym.newsSource}）`;
  }
  return sym.newsSummaryJa || 'News API — 未取得';
}

function summarizeX(
  materialRow: MaterialStockRow | null | undefined,
  sym: ConciergeEvidenceBundle['symbols'][0],
): string {
  if (materialRow) {
    const items = [...materialRow.positive, ...materialRow.negative].filter((m) =>
      /^x|twitter/i.test(m.sourceJa),
    );
    if (items[0]) {
      return `X API — ${items[0].title.slice(0, 72)}`;
    }
    const st = materialRow.sources.find((s) => s.sourceJa.includes('X'));
    if (st) return `X API — ${st.statusJa}`;
  }
  const xs = sym.xSentiment;
  if (xs && xs.postCount > 0) {
    return `X API — 投稿${xs.postCount}件 · 強気${xs.bullishPct}% / 弱気${xs.bearishPct}% · ${xs.summaryJa.slice(0, 48)}`;
  }
  return 'X API — 未取得';
}

function summarizeReddit(
  materialRow: MaterialStockRow | null | undefined,
  sym: ConciergeEvidenceBundle['symbols'][0],
): string {
  if (materialRow?.redditFetchDiagnostics) {
    const d = materialRow.redditFetchDiagnostics;
    const head = d.titles[0];
    if (head) {
      return `Reddit — 有効${d.validCount}件 / 投資材料信頼度${d.investmentConfidenceJa} · ${head.slice(0, 56)}`;
    }
    return `Reddit RSS — 取得${d.fetchedCount}件 / 有効${d.validCount}件`;
  }
  if (materialRow) {
    const items = [...materialRow.positive, ...materialRow.negative, ...materialRow.neutral].filter(
      (m) => /reddit/i.test(m.sourceJa),
    );
    if (items[0]) return `Reddit — ${items[0].title.slice(0, 72)}`;
  }
  return sym.market === 'bursa' ? 'Reddit — 未取得' : 'Reddit — 対象外';
}

function summarizeEarningsCall(materialRow: MaterialStockRow | null | undefined): string {
  if (!materialRow?.earningsCallEvaluationJa) return EARNINGS_CALL_UNAVAILABLE_JA;
  return materialRow.earningsCallEvaluationJa;
}

function summarizeAnalystConsensus(materialRow: MaterialStockRow | null | undefined): string {
  if (!materialRow?.analystConsensusEvaluationJa) return ANALYST_CONSENSUS_UNAVAILABLE_JA;
  return materialRow.analystConsensusEvaluationJa;
}

function summarizeInsiderTrading(materialRow: MaterialStockRow | null | undefined): string {
  if (!materialRow?.insiderTradingEvaluationJa) return INSIDER_TRADING_UNAVAILABLE_JA;
  return materialRow.insiderTradingEvaluationJa;
}

function summarizeInstitutionalOwnership(materialRow: MaterialStockRow | null | undefined): string {
  if (!materialRow?.institutionalOwnershipEvaluationJa) return INSTITUTIONAL_OWNERSHIP_UNAVAILABLE_JA;
  return materialRow.institutionalOwnershipEvaluationJa;
}

function summarizeInstitutionalTrend(materialRow: MaterialStockRow | null | undefined): string {
  if (!materialRow?.institutionalTrendEvaluationJa) return INSTITUTIONAL_TREND_UNAVAILABLE_JA;
  return materialRow.institutionalTrendEvaluationJa;
}

function summarizeDividendIntelligence(materialRow: MaterialStockRow | null | undefined): string {
  if (!materialRow?.dividendIntelligenceEvaluationJa) return DIVIDEND_INTELLIGENCE_UNAVAILABLE_JA;
  return materialRow.dividendIntelligenceEvaluationJa;
}

function summarizeNewsIntelligence(materialRow: MaterialStockRow | null | undefined): string {
  if (!materialRow?.newsIntelligenceEvaluationJa) return NEWS_INTELLIGENCE_UNAVAILABLE_JA;
  return materialRow.newsIntelligenceEvaluationJa;
}

function summarizeMacroIntelligence(materialRow: MaterialStockRow | null | undefined): string {
  if (!materialRow?.macroIntelligenceEvaluationJa) return MACRO_INTELLIGENCE_UNAVAILABLE_JA;
  return materialRow.macroIntelligenceEvaluationJa;
}

function summarizeValuationIntelligence(materialRow: MaterialStockRow | null | undefined): string {
  if (!materialRow?.valuationIntelligenceEvaluationJa) return VALUATION_INTELLIGENCE_UNAVAILABLE_JA;
  return materialRow.valuationIntelligenceEvaluationJa;
}

function summarizeFairValueIntelligence(materialRow: MaterialStockRow | null | undefined): string {
  if (!materialRow?.fairValueIntelligenceEvaluationJa) return FAIR_VALUE_INTELLIGENCE_UNAVAILABLE_JA;
  return materialRow.fairValueIntelligenceEvaluationJa;
}

function summarizeAnalystTargetIntelligence(materialRow: MaterialStockRow | null | undefined): string {
  if (!materialRow?.analystTargetIntelligenceEvaluationJa) {
    return ANALYST_TARGET_INTELLIGENCE_UNAVAILABLE_JA;
  }
  return materialRow.analystTargetIntelligenceEvaluationJa;
}

function summarizeValuationGapIntelligence(materialRow: MaterialStockRow | null | undefined): string {
  if (!materialRow?.valuationGapIntelligenceEvaluationJa) {
    return VALUATION_GAP_INTELLIGENCE_UNAVAILABLE_JA;
  }
  return materialRow.valuationGapIntelligenceEvaluationJa;
}

function summarizeConvictionIntelligence(materialRow: MaterialStockRow | null | undefined): string {
  if (!materialRow?.convictionIntelligenceEvaluationJa) {
    return CONVICTION_INTELLIGENCE_UNAVAILABLE_JA;
  }
  return materialRow.convictionIntelligenceEvaluationJa;
}

function summarizeEarningsRevisionIntelligence(materialRow: MaterialStockRow | null | undefined): string {
  if (!materialRow?.earningsRevisionIntelligenceEvaluationJa) {
    return EARNINGS_REVISION_INTELLIGENCE_UNAVAILABLE_JA;
  }
  return materialRow.earningsRevisionIntelligenceEvaluationJa;
}

function summarizeAnalystConsensusIntelligence(materialRow: MaterialStockRow | null | undefined): string {
  if (!materialRow?.analystConsensusIntelligenceEvaluationJa) {
    return ANALYST_CONSENSUS_INTELLIGENCE_UNAVAILABLE_JA;
  }
  return materialRow.analystConsensusIntelligenceEvaluationJa;
}

function summarizeEarningsRevisionCrossSignal(materialRow: MaterialStockRow | null | undefined): string {
  if (!materialRow?.earningsRevisionCrossSignalEvaluationJa) {
    return EARNINGS_REVISION_CROSS_SIGNAL_UNAVAILABLE_JA;
  }
  return materialRow.earningsRevisionCrossSignalEvaluationJa;
}

function defaultSourceEvaluations(
  materialRow: MaterialStockRow | null | undefined,
  sym: ConciergeEvidenceBundle['symbols'][0],
): ConciergeSourceEvaluations {
  return {
    earningsCall: summarizeEarningsCall(materialRow),
    analystConsensus: summarizeAnalystConsensus(materialRow),
    insiderTrading: summarizeInsiderTrading(materialRow),
    institutionalOwnership: summarizeInstitutionalOwnership(materialRow),
    institutionalTrend: summarizeInstitutionalTrend(materialRow),
    dividendIntelligence: summarizeDividendIntelligence(materialRow),
    newsIntelligence: summarizeNewsIntelligence(materialRow),
    macroIntelligence: summarizeMacroIntelligence(materialRow),
    valuationIntelligence: summarizeValuationIntelligence(materialRow),
    fairValueIntelligence: summarizeFairValueIntelligence(materialRow),
    analystTargetIntelligence: summarizeAnalystTargetIntelligence(materialRow),
    valuationGapIntelligence: summarizeValuationGapIntelligence(materialRow),
    convictionIntelligence: summarizeConvictionIntelligence(materialRow),
    earningsRevisionIntelligence: summarizeEarningsRevisionIntelligence(materialRow),
    analystConsensusIntelligence: summarizeAnalystConsensusIntelligence(materialRow),
    earningsRevisionCrossSignal: summarizeEarningsRevisionCrossSignal(materialRow),
    news: summarizeNews(materialRow, sym),
    x: summarizeX(materialRow, sym),
    reddit: summarizeReddit(materialRow, sym),
  };
}

function collectMaterials(
  materialRow: MaterialStockRow | null | undefined,
  kind: 'positive' | 'negative',
): string[] {
  if (materialRow) {
    const list = kind === 'positive' ? materialRow.positive : materialRow.negative;
    return list.slice(0, 5).map((m) => `${m.scoreJa} ${m.title}（${m.sourceJa}）`);
  }
  return [];
}

export function buildConciergeEnhancedAnalysis(input: {
  evidence: ConciergeEvidenceBundle | undefined;
  structured?: AiChatStructuredReply;
  fallbackText?: string;
  materialRow?: MaterialStockRow | null;
}): ConciergeEnhancedAnalysisReport | null {
  const sym = input.evidence?.symbols[0];
  const guide = input.evidence?.actionGuide.symbols[0];
  if (!sym || !guide) return null;

  const materialRow =
    input.materialRow ??
    null;

  const currency = sym.market === 'us' ? 'USD' : sym.market === 'hk' ? 'HKD' : 'MYR';
  const holding = sym.portfolioHolding;
  const shares = holding?.shares ?? 0;
  const price = sym.currentPrice;
  const marketValue = price != null && shares > 0 ? shares * price : null;
  const unrealizedAmount =
    price != null && holding && shares > 0
      ? (price - holding.averageBuyPrice) * shares
      : null;

  const materialScore = scoreFromMaterialRow(materialRow);
  const overallJudgmentJa = resolveOverallJudgment(materialScore, guide.marketStance);
  const confidencePct = guide.confidencePct ?? input.evidence?.riskControl.overallConfidencePct ?? 0;
  const recommendedActionJa = resolveRecommendedAction({
    judgment: overallJudgmentJa,
    insufficientData: guide.insufficientData,
    categories: guide.categories,
    unrealizedPnlPct: holding?.unrealizedPnlPct ?? null,
  });

  const judgmentReasonsJa: string[] = [];
  if (input.structured?.reason) judgmentReasonsJa.push(input.structured.reason);
  for (const r of guide.reasonBulletsJa) {
    if (!judgmentReasonsJa.includes(r)) judgmentReasonsJa.push(r);
  }
  if (materialRow?.summaryLines) {
    for (const line of materialRow.summaryLines) {
      if (line && line !== MATERIAL_MISSING_JA && !judgmentReasonsJa.includes(line)) {
        judgmentReasonsJa.push(line);
      }
    }
  }
  if (judgmentReasonsJa.length === 0 && input.fallbackText) {
    judgmentReasonsJa.push(input.fallbackText.split('\n')[0]?.slice(0, 120) ?? '材料を整理しました');
  }

  const positiveMaterialsJa = collectMaterials(materialRow, 'positive');
  if (positiveMaterialsJa.length === 0 && sym.latestFinancialNews.length > 0) {
    for (const h of sym.latestFinancialNews.filter((n) => n.sentiment === 'ポジティブ').slice(0, 3)) {
      positiveMaterialsJa.push(h.title);
    }
  }

  const negativeMaterialsJa = collectMaterials(materialRow, 'negative');
  if (negativeMaterialsJa.length === 0) {
    for (const h of sym.latestFinancialNews.filter((n) => n.sentiment === 'ネガティブ').slice(0, 3)) {
      negativeMaterialsJa.push(h.title);
    }
    if (sym.xSentiment && sym.xSentiment.bearishPct >= 55) {
      negativeMaterialsJa.push(`X弱気比率 ${sym.xSentiment.bearishPct}%`);
    }
  }

  const risksJa = [
    guide.riskSummaryJa,
    ...(materialRow?.sellReasons ?? []),
    ...(input.evidence?.actionGuide.aggregatedRisksJa ?? []),
  ]
    .filter((v): v is string => Boolean(v))
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 4);

  const nextCheckpointsJa = [
    ...guide.attentionPointsJa,
    ...(materialRow?.buyReasons ?? []),
    structuredFollowUp(input.structured),
  ]
    .filter((v): v is string => Boolean(v))
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 4);

  const sourceScoresJa = {
    bursa: sourceScoreFromBreakdown(materialRow, 'Bursa'),
    news: sourceScoreFromBreakdown(materialRow, 'News'),
    x: sourceScoreFromBreakdown(materialRow, 'X'),
    reddit: sourceScoreFromBreakdown(materialRow, 'Reddit'),
  };

  if (!materialRow) {
    const es = guide.evidenceScores;
    sourceScoresJa.news = es.news ?? sourceScoresJa.news;
    sourceScoresJa.x = es.xSentiment ?? sourceScoresJa.x;
    sourceScoresJa.bursa = es.priceAction ?? sourceScoresJa.bursa;
  }

  const overallScore =
    materialScore != null
      ? materialScoreToOverallScore(materialScore)
      : clampScore(
          50 +
            (guide.marketStance === 'bullish' ? 15 : guide.marketStance === 'bearish' ? -15 : 0) +
            (confidencePct - 50) * 0.15,
        );

  const unrealizedPnlJa =
    holding && unrealizedAmount != null
      ? `${fmtPrice(unrealizedAmount, currency)}（${fmtPct(holding.unrealizedPnlPct)}）`
      : holding
        ? fmtPct(holding.unrealizedPnlPct)
        : '—';

  return {
    stockNameJa: sym.displayLabelJa || `${sym.companyName} (${sym.symbol})`,
    currentPriceJa: fmtPrice(price, currency),
    sharesJa: shares > 0 ? `${shares.toLocaleString('en-MY')} 株` : '未保有',
    marketValueJa: marketValue != null ? fmtPrice(marketValue, currency) : '—',
    unrealizedPnlJa,
    overallJudgmentJa,
    confidencePct,
    judgmentReasonsJa: judgmentReasonsJa.slice(0, 6),
    sourceSummariesJa: {
      bursa: summarizeBursa(materialRow, sym),
      news: summarizeNews(materialRow, sym),
      x: summarizeX(materialRow, sym),
      reddit: summarizeReddit(materialRow, sym),
    },
    sourceEvaluationsJa: defaultSourceEvaluations(materialRow, sym),
    earningsCallDetailJa: materialRow?.earningsCallDisplayJa ?? null,
    analystConsensusDetailJa: materialRow?.analystConsensusDisplayJa ?? null,
    insiderTradingDetailJa: materialRow?.insiderTradingDisplayJa ?? null,
    institutionalOwnershipDetailJa: materialRow?.institutionalOwnershipDisplayJa ?? null,
    institutionalTrendDetailJa: materialRow?.institutionalTrendDisplayJa ?? null,
    dividendIntelligenceDetailJa: materialRow?.dividendIntelligenceDisplayJa ?? null,
    newsIntelligenceDetailJa: materialRow?.newsIntelligenceDisplayJa ?? null,
    macroIntelligenceDetailJa: materialRow?.macroIntelligenceDisplayJa ?? null,
    valuationIntelligenceDetailJa: materialRow?.valuationIntelligenceDisplayJa
      ? {
          valuationScore: materialRow.valuationIntelligenceDisplayJa.valuationScore,
          valuationRating: materialRow.valuationIntelligenceDisplayJa.valuationRating,
          pe: materialRow.valuationIntelligenceDisplayJa.pe,
          pb: materialRow.valuationIntelligenceDisplayJa.pb,
          roe: materialRow.valuationIntelligenceDisplayJa.roe,
          revenueGrowth: materialRow.valuationIntelligenceDisplayJa.revenueGrowth,
          epsGrowth: materialRow.valuationIntelligenceDisplayJa.epsGrowth,
          debtEquity: materialRow.valuationIntelligenceDisplayJa.debtEquity,
          fairValueJudgment: materialRow.valuationIntelligenceDisplayJa.fairValueJudgment,
          fieldAcquisitionRate: materialRow.valuationIntelligenceDisplayJa.fieldAcquisitionRate,
        }
      : null,
    fairValueIntelligenceDetailJa: materialRow?.fairValueIntelligenceDisplayJa ?? null,
    analystTargetIntelligenceDetailJa: materialRow?.analystTargetIntelligenceDisplayJa ?? null,
    valuationGapIntelligenceDetailJa: materialRow?.valuationGapIntelligenceDisplayJa ?? null,
    convictionIntelligenceDetailJa: materialRow?.convictionIntelligenceDisplayJa ?? null,
    earningsRevisionIntelligenceDetailJa: materialRow?.earningsRevisionIntelligenceDisplayJa
      ? {
          epsEstimateCurrentFy: materialRow.earningsRevisionIntelligenceDisplayJa.epsEstimateCurrentFy,
          epsEstimateNextFy: materialRow.earningsRevisionIntelligenceDisplayJa.epsEstimateNextFy,
          epsRevision30d: materialRow.earningsRevisionIntelligenceDisplayJa.epsRevision30d,
          epsRevision90d: materialRow.earningsRevisionIntelligenceDisplayJa.epsRevision90d,
          revenueRevision30d: materialRow.earningsRevisionIntelligenceDisplayJa.revenueRevision30d,
          upgradeCount: materialRow.earningsRevisionIntelligenceDisplayJa.upgradeCount,
          downgradeCount: materialRow.earningsRevisionIntelligenceDisplayJa.downgradeCount,
          revisionDirection: materialRow.earningsRevisionIntelligenceDisplayJa.revisionDirection,
          revisionScore: materialRow.earningsRevisionIntelligenceDisplayJa.revisionScore,
          revisionConfidence: materialRow.earningsRevisionIntelligenceDisplayJa.revisionConfidence,
          source: materialRow.earningsRevisionIntelligenceDisplayJa.source,
        }
      : null,
    analystConsensusIntelligenceDetailJa: materialRow?.analystConsensusIntelligenceDisplayJa
      ? {
          source: materialRow.analystConsensusIntelligenceDisplayJa.source,
          consensusRating: materialRow.analystConsensusIntelligenceDisplayJa.consensusRating,
          targetPrice: materialRow.analystConsensusIntelligenceDisplayJa.targetPrice,
          currentPrice: materialRow.analystConsensusIntelligenceDisplayJa.currentPrice,
          impliedUpsidePct: materialRow.analystConsensusIntelligenceDisplayJa.impliedUpsidePct,
          consensusScore: materialRow.analystConsensusIntelligenceDisplayJa.consensusScore,
          confidence: materialRow.analystConsensusIntelligenceDisplayJa.confidence,
          analystCount: materialRow.analystConsensusIntelligenceDisplayJa.analystCount,
          ratingRevisionDirection:
            materialRow.analystConsensusIntelligenceDisplayJa.ratingRevisionDirection,
          targetRevisionDirection:
            materialRow.analystConsensusIntelligenceDisplayJa.targetRevisionDirection,
          warnings: materialRow.analystConsensusIntelligenceDisplayJa.warnings,
        }
      : null,
    earningsRevisionCrossSignalDetailJa: materialRow?.earningsRevisionCrossSignalDisplayJa
      ? {
          crossSignalDirection: materialRow.earningsRevisionCrossSignalDisplayJa.crossSignalDirection,
          crossSignalScore: materialRow.earningsRevisionCrossSignalDisplayJa.crossSignalScore,
          revisionBias: materialRow.earningsRevisionCrossSignalDisplayJa.revisionBias,
          insiderBias: materialRow.earningsRevisionCrossSignalDisplayJa.insiderBias,
          institutionalBias: materialRow.earningsRevisionCrossSignalDisplayJa.institutionalBias,
          alignmentCount: materialRow.earningsRevisionCrossSignalDisplayJa.alignmentCount,
          confidence: materialRow.earningsRevisionCrossSignalDisplayJa.confidence,
          materialImpact: materialRow.earningsRevisionCrossSignalMaterialImpactJa,
        }
      : null,
    positiveMaterialsJa,
    negativeMaterialsJa,
    nextCheckpointsJa,
    risksJa,
    recommendedActionJa,
    sourceScoresJa,
    overallScore,
  };
}

function structuredFollowUp(structured?: AiChatStructuredReply): string | null {
  return structured?.followUp?.trim() || null;
}

export function findMaterialRowForSymbol(
  report: { stocks: MaterialStockRow[] } | null | undefined,
  symbol: string,
): MaterialStockRow | null {
  if (!report) return null;
  const code = normalizeStockCode(symbol);
  return (
    report.stocks.find(
      (s) => normalizeStockCode(s.stockCode) === code || s.stockCode === symbol,
    ) ?? null
  );
}
