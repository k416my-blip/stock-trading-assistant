import { TOKEN_BUDGET_OPENAI_24H, TOKEN_BUDGET_X_CALLS_24H } from '../../constants/productionStability';
import { buildApiCostDashboard } from '../apiCostTracker';

export function getTokenBudgetSummaryJa(): string {
  const dash = buildApiCostDashboard();
  const openAi = dash.openAiEstimatedTokens;
  const x = dash.xApiCalls;
  return `OpenAI ${openAi.toLocaleString()}/${TOKEN_BUDGET_OPENAI_24H} tokens · X ${x}/${TOKEN_BUDGET_X_CALLS_24H} 回`;
}

export function canSpendOpenAiTokens(estimate: number): boolean {
  const dash = buildApiCostDashboard();
  return dash.openAiEstimatedTokens + estimate <= TOKEN_BUDGET_OPENAI_24H;
}

export function canSpendXApiCall(count = 1): boolean {
  const dash = buildApiCostDashboard();
  return dash.xApiCalls + count <= TOKEN_BUDGET_X_CALLS_24H;
}

export function getOpenAiTokensUsed24h(): number {
  return buildApiCostDashboard().openAiEstimatedTokens;
}

export function getXCallsUsed24h(): number {
  return buildApiCostDashboard().xApiCalls;
}
