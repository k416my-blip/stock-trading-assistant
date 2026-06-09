/**
 * AI分析結果 — エビデンス + 材料分析から必須15項目を構築
 */
import type { AiChatStructuredReply } from '../types/aiChat';
import type {
  AiRecommendedActionJa,
  ConciergeEnhancedAnalysisReport,
  OverallTradeJudgmentJa,
} from '../types/conciergeEnhancedAnalysis';
import type { ConciergeEvidenceBundle } from '../types/conciergeEvidence';
import type { MaterialStockRow } from './bursa/bursaMaterialAnalysisService';
import { MATERIAL_MISSING_JA } from './bursa/bursaMaterialSentiment';

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
