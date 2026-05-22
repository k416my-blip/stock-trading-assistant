import type { AiGovernanceDecisionBundle } from '../types/aiGovernanceDecision';
import type { AiStrategyContextPayload } from '../types/aiStrategy';
import type { SemanticConsistencyDecisionCoherenceBundle } from '../types/semanticConsistencyDecisionCoherence';
import type { StrategyExecutionBundle } from '../types/strategyExecution';

export function attachSemanticConsistencyToContext(
  payload: AiStrategyContextPayload,
  bundle: SemanticConsistencyDecisionCoherenceBundle | null,
): AiStrategyContextPayload {
  if (!bundle) return payload;
  return {
    ...payload,
    semanticConsistencyDecisionCoherence: bundle,
  };
}

/** Sync narratives onto governance without changing trade logic beyond existing downgrades */
export function applySemanticCoherenceToGovernance(
  governance: AiGovernanceDecisionBundle | null,
  semantic: SemanticConsistencyDecisionCoherenceBundle | null,
): AiGovernanceDecisionBundle | null {
  if (!governance || !semantic) return governance;
  if (semantic.semanticFreeze) {
    return {
      ...governance,
      unifiedAiSummaryJa: semantic.emergencyNarrativeFallbackJa ?? governance.unifiedAiSummaryJa,
    };
  }
  let summary = semantic.governanceNarrativeSyncJa;
  if (semantic.vetoNarrativeJa) summary = `${summary} ${semantic.vetoNarrativeJa}`;
  if (semantic.downgradeNarrativeJa) summary = `${summary} [Downgrade] ${semantic.downgradeNarrativeJa}`;
  if (governance.humanOverrideActive) {
    summary = `${summary} [Override] ${governance.humanOverrideNoteJa ?? '人間優先'}`;
  }
  return {
    ...governance,
    unifiedAiSummaryJa: summary.slice(0, 800),
  };
}

/** Append downgrade narrator lines to strategy explanations only */
export function applySemanticCoherenceToStrategy(
  strategy: StrategyExecutionBundle | null,
  semantic: SemanticConsistencyDecisionCoherenceBundle | null,
): StrategyExecutionBundle | null {
  if (!strategy || !semantic) return strategy;
  if (semantic.semanticFreeze) return strategy;

  const downNote = semantic.downgradeNarrativeJa;
  return {
    ...strategy,
    todayRecommendations: strategy.todayRecommendations.map((r) => {
      const needsNote =
        downNote &&
        (r.action === 'watch' || r.action === 'hold') &&
        r.whyProposedJa.includes('buy');
      if (!needsNote && !semantic.confidenceWordingJa) return r;
      const extra = needsNote
        ? ` [Semantic: buy→${r.action} — ${downNote.slice(0, 120)}]`
        : '';
      const tone =
        r.confidencePct < 55
          ? ` ${semantic.confidenceWordingJa}`
          : '';
      return {
        ...r,
        whyProposedJa: `${r.whyProposedJa}${extra}${tone}`.slice(0, 900),
        analystExplanationJa: semantic.unsupportedClaimsJa.length
          ? `${r.analystExplanationJa}（未証拠断定を回避）`
          : r.analystExplanationJa,
      };
    }),
  };
}
