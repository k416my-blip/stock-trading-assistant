import type { PortfolioPosition } from '../types';
import type { PortfolioAiEvaluationBundle, PortfolioAiSymbolEvaluation } from '../types/portfolioAiEvaluation';
import type { StrategyExecutionBundle } from '../types/strategyExecution';
import { formatDataSourcesLine } from './portfolioAiEvaluationDisplay';

export type PortfolioScoreBreakdown = {
  profitability: number;
  rsi: number;
  news: number;
  concentrationRisk: number;
  total: number;
};

export type LiteTradeCandidate = {
  symbol: string;
  labelJa: string;
  score: number;
  reasons: string[];
  dataSource: string;
};

function clampInt(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function pnlPct(h: PortfolioPosition): number | null {
  if (!Number.isFinite(h.averageBuyPrice) || h.averageBuyPrice <= 0) return null;
  if (!Number.isFinite(h.currentPrice) || h.currentPrice <= 0) return null;
  return ((h.currentPrice - h.averageBuyPrice) / h.averageBuyPrice) * 100;
}

function normalizeDataSource(item: PortfolioAiSymbolEvaluation, bundle: StrategyExecutionBundle): string {
  const parts = new Set<string>();
  const raw = formatDataSourcesLine(item.dataSources);
  if (raw !== '未取得') {
    for (const p of raw.split('·').map((v) => v.trim()).filter(Boolean)) {
      if (/twelve/i.test(p)) parts.add('TwelveData');
      else if (/newsapi/i.test(p) || /^news$/i.test(p)) parts.add('NewsAPI');
      else if (/yahoo|bursa/i.test(p)) parts.add('Yahoo');
      else parts.add(p);
    }
  }
  const hybrid = bundle.hybridSecondEvaluator?.source;
  if (hybrid === 'openai' || hybrid === 'cache') {
    parts.add('OpenAI');
  }
  if (parts.size === 0) return '未取得';
  return Array.from(parts).join(' / ');
}

function splitReasons(text: string): string[] {
  const clean = (text || '').trim();
  if (!clean || clean === '未取得') return ['理由データ未取得'];
  return clean
    .split(/[。;\n]| · /)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2)
    .slice(0, 3);
}

export function buildPortfolioScoreBreakdown(input: {
  portfolio: PortfolioAiEvaluationBundle;
  holdings: PortfolioPosition[];
}): PortfolioScoreBreakdown {
  const { portfolio, holdings } = input;
  const pnl = holdings.map(pnlPct).filter((v): v is number => v != null);
  const avgPnl = pnl.length > 0 ? pnl.reduce((s, v) => s + v, 0) / pnl.length : 0;
  const profitability = clampInt(avgPnl * 1.5, -20, 20);

  const rsis = portfolio.rankedHoldings
    .map((h) => h.rsi14)
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  const avgRsi = rsis.length > 0 ? rsis.reduce((s, v) => s + v, 0) / rsis.length : 50;
  const rsi = clampInt((50 - avgRsi) * 0.6, -12, 12);

  const newsSignals = portfolio.rankedHoldings.slice(0, 5).map((h) => h.rationaleJa.toLowerCase());
  const positiveNews = newsSignals.filter((v) => /好調|改善|追い風|上方|良好|strong|positive/.test(v)).length;
  const negativeNews = newsSignals.filter((v) => /悪化|下方|警戒|弱い|懸念|negative|risk/.test(v)).length;
  const news = clampInt((positiveNews - negativeNews) * 3, -10, 10);

  const weightSum = portfolio.rankedHoldings.reduce((s, h) => s + Math.max(0, h.weightPct), 0);
  const topWeight = weightSum > 0
    ? Math.max(...portfolio.rankedHoldings.map((h) => (h.weightPct / weightSum) * 100))
    : 0;
  let concentrationRisk = 0;
  if (topWeight >= 45) concentrationRisk = -18;
  else if (topWeight >= 35) concentrationRisk = -12;
  else if (topWeight >= 25) concentrationRisk = -6;

  const rawTotal = 50 + profitability + rsi + news + concentrationRisk;
  const adjust = portfolio.portfolioScore - rawTotal;
  concentrationRisk += adjust;

  return {
    profitability,
    rsi,
    news,
    concentrationRisk,
    total: portfolio.portfolioScore,
  };
}

function toCandidate(item: PortfolioAiSymbolEvaluation, bundle: StrategyExecutionBundle): LiteTradeCandidate {
  return {
    symbol: item.symbol,
    labelJa: item.displayLabelJa,
    score: item.finalScore,
    reasons: splitReasons(item.rationaleJa),
    dataSource: normalizeDataSource(item, bundle),
  };
}

export function buildLiteTradeCandidates(input: {
  portfolio: PortfolioAiEvaluationBundle;
  bundle: StrategyExecutionBundle;
}): { buyCandidates: LiteTradeCandidate[]; sellCandidates: LiteTradeCandidate[]; topReason: string } {
  const { portfolio, bundle } = input;
  const buyCandidates = portfolio.rankedHoldings
    .filter((h) => h.action === 'buy' || h.displayTone === 'buy')
    .slice(0, 3)
    .map((h) => toCandidate(h, bundle));
  const sellCandidates = [...portfolio.rankedHoldings]
    .reverse()
    .filter((h) => h.action === 'reduce' || h.displayTone === 'sell' || h.finalScore <= 45)
    .slice(0, 3)
    .map((h) => toCandidate(h, bundle));

  const top = buyCandidates[0] ?? sellCandidates[0];
  const topReason = top?.reasons[0] ?? '根拠未取得';
  return { buyCandidates, sellCandidates, topReason };
}

export function isActionCenterMockData(bundle: StrategyExecutionBundle, portfolio: PortfolioAiEvaluationBundle): boolean {
  const raw = bundle.hybridSecondEvaluator?.source;
  return raw === 'mock_fallback' || portfolio.batchSource === 'rule_only' || portfolio.batchSource === 'mock_fallback';
}

export function buildPortfolioScoreWhyText(input: {
  portfolio: PortfolioAiEvaluationBundle;
  holdings: PortfolioPosition[];
  bundle: StrategyExecutionBundle;
}): string {
  const breakdown = buildPortfolioScoreBreakdown({
    portfolio: input.portfolio,
    holdings: input.holdings,
  });
  const candidates = buildLiteTradeCandidates({
    portfolio: input.portfolio,
    bundle: input.bundle,
  });
  const buy = candidates.buyCandidates[0];
  const sell = candidates.sellCandidates[0];
  return [
    `現在の Portfolio Score は ${breakdown.total} 点です。`,
    `内訳は 利益率 ${breakdown.profitability >= 0 ? '+' : ''}${breakdown.profitability} / RSI ${breakdown.rsi >= 0 ? '+' : ''}${breakdown.rsi} / ニュース ${breakdown.news >= 0 ? '+' : ''}${breakdown.news} / 集中リスク ${breakdown.concentrationRisk} です。`,
    buy ? `買い候補の先頭は ${buy.symbol}（${buy.labelJa}）Score ${buy.score}。理由: ${buy.reasons.join(' / ')}。` : '買い候補は現在見つかっていません。',
    sell ? `売り候補の先頭は ${sell.symbol}（${sell.labelJa}）Score ${sell.score}。理由: ${sell.reasons.join(' / ')}。` : '売り候補は現在見つかっていません。',
  ].join('\n');
}
