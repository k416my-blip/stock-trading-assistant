/**
 * AIコンシェルジュ向け X API コンテキスト — ユーザー質問時のみ呼び出し
 */
import type { Market } from '../types';
import type { AnalysisApiKeys } from './analysisApiKeys';
import { findStock } from '../data/sampleStocks';
import { analyzeXSentimentOnUserRequest } from './xSentimentAnalysis';
import { extractSymbolsForXLookup, userMessageRequestsXInsight } from './xApiIntent';
import { getXApiUsageDashboard } from './xApiUsageStorage';

export type XConciergeContextResult = {
  xSocialBriefJa: string | null;
  xApiUsageSummaryJa: string;
};

export async function buildXConciergeContextForMessage(
  userMessage: string,
  holdings: Array<{ symbol: string; market: Market }>,
  apiKeys: AnalysisApiKeys,
): Promise<XConciergeContextResult> {
  const dash = await getXApiUsageDashboard();
  const usageSummary = dash.forecastJa;

  if (!userMessageRequestsXInsight(userMessage)) {
    return { xSocialBriefJa: null, xApiUsageSummaryJa: usageSummary };
  }

  const targets = extractSymbolsForXLookup(userMessage, holdings);
  if (targets.length === 0) {
    return {
      xSocialBriefJa: 'X/SNSの話題を参照する銘柄が特定できませんでした。銘柄コードを含めて質問してください。',
      xApiUsageSummaryJa: usageSummary,
    };
  }

  const lines: string[] = [];
  for (const t of targets) {
    const stock =
      findStock(t.symbol) ??
      ({
        symbol: t.symbol,
        name: t.symbol,
        market: t.market,
        currency: 'MYR' as const,
        price: 0,
        dividendYield: 0,
        per: 0,
        marketCap: 0,
        volume: 0,
        category: 'growth' as const,
        beginnerFriendly: false,
      });
    const sns = await analyzeXSentimentOnUserRequest(stock, apiKeys);
    const xs = sns.xSentiment;
    const sentimentLine = xs
      ? `bull${xs.sentimentPct.bullish}% bear${xs.sentimentPct.bearish}% panic${xs.sentimentPct.panic}% hype${xs.sentimentPct.hype}% · 投稿${xs.postCount}`
      : `話題性${sns.buzzScore}`;
    lines.push(`${stock.symbol}（${stock.name}）: ${sns.summary} · ${sentimentLine}`);
  }

  const dashAfter = await getXApiUsageDashboard();
  return {
    xSocialBriefJa: lines.join('\n'),
    xApiUsageSummaryJa: dashAfter.forecastJa,
  };
}
