import { API_COST_ESTIMATES } from '../constants/performanceCost';
import type { ApiCostCategory, ApiCostDashboard, ApiCostEntry } from '../types/performanceCost';

const MAX_ENTRIES = 500;
const entries: ApiCostEntry[] = [];

function prune(): void {
  if (entries.length <= MAX_ENTRIES) return;
  entries.splice(0, entries.length - MAX_ENTRIES);
}

export function recordApiCost(
  category: ApiCostCategory,
  units: number,
  labelJa: string,
): void {
  entries.push({
    category,
    at: new Date().toISOString(),
    units: Math.max(0, units),
    labelJa,
  });
  prune();
}

export function recordOpenAiTokenEstimate(tokenCount: number): void {
  recordApiCost('openai', tokenCount, 'OpenAI chat');
}

export function recordXApiCall(count = 1): void {
  recordApiCost('x', count, 'X sentiment');
}

export function recordNewsApiCall(count = 1): void {
  recordApiCost('news', count, 'News API');
}

export function recordMarketDataCall(count = 1): void {
  recordApiCost('market_data', count, 'Market data');
}

export function buildApiCostDashboard(): ApiCostDashboard {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const recent = entries.filter((e) => Date.parse(e.at) >= cutoff);
  let openAiTokens = 0;
  let xCalls = 0;
  let newsCalls = 0;
  let mdCalls = 0;
  for (const e of recent) {
    if (e.category === 'openai') openAiTokens += e.units;
    else if (e.category === 'x') xCalls += e.units;
    else if (e.category === 'news') newsCalls += e.units;
    else if (e.category === 'market_data') mdCalls += e.units;
  }
  const openAiUsd =
    (openAiTokens / 1000) * API_COST_ESTIMATES.openAiPer1kTokensUsd;
  const newsUsd = newsCalls * API_COST_ESTIMATES.newsPerRequestUsd;
  const summaryJa = [
    `OpenAI 推定 ${openAiTokens.toLocaleString()} tokens (~$${openAiUsd.toFixed(3)})`,
    `X ${xCalls} 回`,
    `News ${newsCalls} 回`,
    `Market ${mdCalls} 回`,
    `News 推定 ~$${newsUsd.toFixed(3)}`,
  ].join(' · ');

  return {
    generatedAt: new Date().toISOString(),
    openAiEstimatedTokens: openAiTokens,
    openAiEstimatedCostUsd: Math.round(openAiUsd * 1000) / 1000,
    xApiCalls: xCalls,
    newsApiCalls: newsCalls,
    marketDataCalls: mdCalls,
    last24hTotalUnits: openAiTokens + xCalls + newsCalls + mdCalls,
    summaryJa,
  };
}

export function resetApiCostTrackerForTest(): void {
  entries.length = 0;
}
