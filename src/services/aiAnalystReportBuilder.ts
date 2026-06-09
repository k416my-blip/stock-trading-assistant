/**
 * 保有銘柄向け AI アナリストレポート生成（実データ四季報ベース）
 */
import { getSamplePriceHistory } from '../data/sampleStocks';
import { CURRENCY_SYMBOL } from '../constants/rakutenTrade';
import type { PortfolioPosition } from '../types';
import type { PortfolioAiEvaluationBundle } from '../types/portfolioAiEvaluation';
import type { AiAnalystReportBundle, AiStockReport, HoldingAnalystReport } from '../types/aiStockReport';
import { SHIKIHO_MISSING_JA } from './aiStockReportDataFetcher';
import { buildAiStockReportAsync, pickTopCandidatesFromSearch } from './aiStockReportService';
import { analyzeTechnicals } from './technicalAnalysis';
import { buildTradeSuggestion } from './tradeSuggestions';

const ACTION_LABEL_JA: Record<string, string> = {
  buy: '買い',
  hold: '保有継続',
  reduce: '減らす',
  watch: '様子見',
  avoid: '回避',
};

function activeHoldings(holdings: PortfolioPosition[]): PortfolioPosition[] {
  return holdings.filter((h) => (h.shares ?? 0) > 0);
}

function pnlPct(h: PortfolioPosition, livePrice: number | null): number | null {
  const price = livePrice ?? h.currentPrice;
  if (h.averageBuyPrice <= 0 || price <= 0) return null;
  return ((price - h.averageBuyPrice) / h.averageBuyPrice) * 100;
}

function parsePriceFromReport(shikiho: AiStockReport, fallback: number): number | null {
  if (fallback > 0) return fallback;
  const raw = shikiho.marketData.currentPriceJa;
  if (raw === SHIKIHO_MISSING_JA) return null;
  const m = raw.match(/[\d,.]+/);
  if (!m) return null;
  const n = Number(m[0].replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function priceTargets(h: PortfolioPosition, price: number): {
  takeProfitRemainingPct: number | null;
  stopLossDistancePct: number | null;
} {
  if (price <= 0) return { takeProfitRemainingPct: null, stopLossDistancePct: null };
  const technicals = analyzeTechnicals(getSamplePriceHistory(h.symbol));
  const { takeProfit, stopLoss } = buildTradeSuggestion(price, technicals);
  let takeProfitRemainingPct: number | null = null;
  let stopLossDistancePct: number | null = null;
  if (takeProfit > 0) {
    takeProfitRemainingPct =
      price >= takeProfit ? 0 : ((takeProfit - price) / price) * 100;
  }
  if (stopLoss > 0) {
    stopLossDistancePct = ((stopLoss - price) / price) * 100;
  }
  return { takeProfitRemainingPct, stopLossDistancePct };
}

function buildReasonBullets(
  shikiho: AiStockReport,
  portfolio: PortfolioAiEvaluationBundle | null,
  symbol: string,
): string[] {
  const bullets: string[] = [];
  const evalRow = portfolio?.rankedHoldings.find(
    (e) => e.symbol.toUpperCase() === symbol.toUpperCase(),
  );

  if (shikiho.evaluation.availability.stability && shikiho.evaluation.stability >= 72) {
    bullets.push('事業・流動性の安定性が高い');
  }
  if (shikiho.dividend.yieldLabelJa !== SHIKIHO_MISSING_JA) {
    const dy = Number.parseFloat(shikiho.dividend.yieldLabelJa);
    if (Number.isFinite(dy) && dy >= 4) bullets.push('高配当');
  }
  if (shikiho.evaluation.availability.profitability && shikiho.evaluation.profitability >= 65) {
    bullets.push('収益性が良好');
  }
  if (shikiho.subGrades.financial === 'A' || shikiho.subGrades.financial === 'S') {
    bullets.push('財務評価が高い');
  }
  if (shikiho.news.positiveCount > shikiho.news.negativeCount && shikiho.news.positiveCount > 0) {
    bullets.push(`ニュースポジティブ ${shikiho.news.positiveCount}件`);
  }

  if (evalRow?.rationaleJa) {
    const short = evalRow.rationaleJa.slice(0, 40);
    if (short.length > 8) bullets.push(short);
  }

  if (bullets.length === 0) {
    bullets.push(shikiho.evaluation.commentJa.slice(0, 56));
  }

  return bullets.slice(0, 4);
}

async function buildHoldingReportAsync(
  h: PortfolioPosition,
  portfolio: PortfolioAiEvaluationBundle | null,
  apiKeys: { twelveDataApiKey?: string; newsApiKey?: string },
): Promise<HoldingAnalystReport> {
  const shikiho = await buildAiStockReportAsync({
    symbol: h.symbol,
    market: h.market,
    holding: h,
    twelveDataApiKey: apiKeys.twelveDataApiKey,
    newsApiKey: apiKeys.newsApiKey,
  });

  const livePrice = parsePriceFromReport(shikiho, h.currentPrice);
  const evalRow = portfolio?.rankedHoldings.find(
    (e) => e.symbol.toUpperCase() === h.symbol.toUpperCase(),
  );
  const judgmentJa = evalRow
    ? (ACTION_LABEL_JA[evalRow.action] ?? evalRow.action)
    : shikiho.evaluation.compositeScore != null && shikiho.evaluation.compositeScore >= 65
      ? '保有継続'
      : '様子見';

  const priceForTargets = livePrice ?? h.currentPrice;
  const { takeProfitRemainingPct, stopLossDistancePct } = priceTargets(h, priceForTargets);

  return {
    symbol: h.symbol,
    companyName: h.companyName?.trim() || shikiho.overview.companyName,
    currency: h.currency,
    overallRank: shikiho.evaluation.overallRank,
    currentPrice: livePrice,
    averageBuyPrice: h.averageBuyPrice,
    pnlPct: pnlPct(h, livePrice),
    takeProfitRemainingPct,
    stopLossDistancePct,
    subGrades: shikiho.subGrades,
    judgmentJa,
    reasonBullets: buildReasonBullets(shikiho, portfolio, h.symbol),
    shikiho,
  };
}

function buildCandidateSummary(portfolio: PortfolioAiEvaluationBundle | null): string {
  const autoTop = pickTopCandidatesFromSearch(3);
  const best = portfolio?.bestToday?.[0];
  const parts = ['本日の強い候補'];
  if (best) {
    parts.push(`${best.displayLabelJa}（${best.symbol}、スコア ${best.finalScore}）`);
  } else if (autoTop[0]) {
    parts.push(`${autoTop[0].name}（${autoTop[0].symbol}、検索スコア ${autoTop[0].score}）`);
  }
  const secondEval = portfolio?.bestToday?.[1];
  const secondAuto = autoTop[1];
  if (secondEval) {
    parts.push(
      `次点 ${secondEval.displayLabelJa}（${secondEval.symbol}、スコア ${secondEval.finalScore}）`,
    );
  } else if (secondAuto) {
    parts.push(`次点 ${secondAuto.name}（${secondAuto.symbol}、検索スコア ${secondAuto.score}）`);
  }
  return parts.join(' — ');
}

function buildHeadline(
  holdingReports: HoldingAnalystReport[],
  portfolioScore: number,
  holdingCount: number,
  candidateSummary?: string,
): string {
  if (holdingReports.length > 0) {
    const lead = holdingReports[0];
    const pct = lead.pnlPct;
    const sign = pct != null && pct >= 0 ? '+' : '';
    const pnlPart = pct != null ? `${sign}${pct.toFixed(1)}%` : SHIKIHO_MISSING_JA;
    const tp =
      lead.takeProfitRemainingPct != null && lead.takeProfitRemainingPct > 0
        ? ` · 利確目安まで残り${lead.takeProfitRemainingPct.toFixed(1)}%`
        : '';
    return `スコア ${portfolioScore}/100 · 保有 ${holdingCount}銘柄 · ${lead.companyName} ${pnlPart}${tp}`;
  }
  return candidateSummary?.slice(0, 120) ?? `スコア ${portfolioScore}/100 · 保有 0 銘柄`;
}

export function buildEmptyAnalystReport(input: {
  portfolio: PortfolioAiEvaluationBundle | null;
  holdings: PortfolioPosition[];
}): AiAnalystReportBundle {
  const holdings = activeHoldings(input.holdings);
  const portfolioScore = input.portfolio?.portfolioScore ?? 50;
  if (holdings.length > 0) {
    return {
      portfolioScore,
      holdingCount: holdings.length,
      holdingReports: [],
      headlineJa: `スコア ${portfolioScore}/100 · 保有 ${holdings.length}銘柄 · 読み込み中…`,
      loading: true,
    };
  }
  const candidateSummary = buildCandidateSummary(input.portfolio);
  return {
    portfolioScore,
    holdingCount: 0,
    holdingReports: [],
    candidateSummaryJa: candidateSummary,
    headlineJa: buildHeadline([], portfolioScore, 0, candidateSummary),
  };
}

export async function buildAiAnalystReportAsync(input: {
  portfolio: PortfolioAiEvaluationBundle | null;
  holdings: PortfolioPosition[];
  twelveDataApiKey?: string;
  newsApiKey?: string;
}): Promise<AiAnalystReportBundle> {
  const holdings = activeHoldings(input.holdings);
  const portfolioScore = input.portfolio?.portfolioScore ?? 50;
  const apiKeys = {
    twelveDataApiKey: input.twelveDataApiKey,
    newsApiKey: input.newsApiKey,
  };

  if (holdings.length > 0) {
    const sorted = [...holdings]
      .map((h) => ({ h, pct: pnlPct(h, h.currentPrice) }))
      .sort((a, b) => (b.pct ?? -999) - (a.pct ?? -999));
    const holdingReports = await Promise.all(
      sorted.map(({ h }) => buildHoldingReportAsync(h, input.portfolio, apiKeys)),
    );

    return {
      portfolioScore,
      holdingCount: holdings.length,
      holdingReports,
      headlineJa: buildHeadline(holdingReports, portfolioScore, holdings.length),
    };
  }

  const candidateSummary = buildCandidateSummary(input.portfolio);
  return {
    portfolioScore,
    holdingCount: 0,
    holdingReports: [],
    candidateSummaryJa: candidateSummary,
    headlineJa: buildHeadline([], portfolioScore, 0, candidateSummary),
  };
}

export function formatCurrencyPrice(currency: string, price: number): string {
  const sym = CURRENCY_SYMBOL[currency as keyof typeof CURRENCY_SYMBOL] ?? currency;
  return `${sym}${price.toFixed(2)}`;
}
