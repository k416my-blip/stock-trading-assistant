import type { AiGovernanceDecisionBundle } from '../types/aiGovernanceDecision';
import type { AiStrategyContextPayload } from '../types/aiStrategy';
import type { StrategyExecutionBundle } from '../types/strategyExecution';

/** Apply governance downgrades to strategy bundle for display */
export function applyGovernanceToStrategy(
  strategy: StrategyExecutionBundle | null,
  governance: AiGovernanceDecisionBundle | null,
): StrategyExecutionBundle | null {
  if (!strategy || !governance || governance.downgradedRecommendations.length === 0) {
    return strategy;
  }
  const downBySymbol = new Map(
    governance.downgradedRecommendations.map((d) => [d.symbol.toUpperCase(), d.toAction]),
  );
  return {
    ...strategy,
    todayRecommendations: strategy.todayRecommendations.map((r) => {
      const to = downBySymbol.get(r.symbol.toUpperCase());
      if (!to) return r;
      return {
        ...r,
        action: to,
        intent: to === 'watch' ? 'watch' : r.intent,
        whyProposedJa: `${r.whyProposedJa} [Governance: ${governance.vetoLayerLabelJa ?? 'downgrade'}]`,
      };
    }),
  };
}

export function attachAiGovernanceToContext(
  payload: AiStrategyContextPayload,
  bundle: AiGovernanceDecisionBundle | null,
): AiStrategyContextPayload {
  if (!bundle) return payload;
  return {
    ...payload,
    aiGovernanceDecision: bundle,
  };
}
