import type { BuildMetaDecisionInput } from '../types/metaDecision';
import type { MacroIntelligenceBundle } from '../types/macroIntelligence';
import type { ProactiveSuggestionCandidate } from '../types/proactiveSuggestion';
import type { TacticalMode } from '../types/strategyExecution';

/** Macro overlay — filter + enhance meta input (deterministic) */
export function filterCandidatesByMacro(
  candidates: ProactiveSuggestionCandidate[],
  macro: MacroIntelligenceBundle | null,
): ProactiveSuggestionCandidate[] {
  if (!macro?.integration.forceDefensiveStrategy) return candidates;
  return candidates.filter((c) => {
    if (c.priority === 'critical') return true;
    if (
      macro.worldRegime.id === 'panic' ||
      macro.worldRegime.id === 'liquidity_crisis'
    ) {
      if (c.category === 'buy_candidate' || c.actionCategory === 'opportunity') {
        return c.priority === 'high';
      }
    }
    if (macro.stressScore >= 70 && c.category === 'buy_candidate') return false;
    return true;
  });
}

export function enhanceMetaDecisionInput(
  input: BuildMetaDecisionInput,
  macro: MacroIntelligenceBundle | null,
): BuildMetaDecisionInput {
  if (!macro) return input;
  const mult = macro.integration.metaWeightMultiplier;
  return {
    ...input,
    regimeId: macro.integration.mappedConciergeRegimeId,
    marketRiskScore: clampScore(input.marketRiskScore * mult),
    fearScore: clampScore(
      input.fearScore + (macro.stressScore > 60 ? 8 : 0),
    ),
    emergencyMode:
      input.emergencyMode || macro.integration.forceEmergencyMode,
  };
}

export function resolveStrategyTacticalMode(
  userMode: TacticalMode,
  macro: MacroIntelligenceBundle | null,
): TacticalMode {
  if (!macro) return userMode;
  if (macro.integration.forceDefensiveStrategy) return 'defensive';
  if (
    macro.integration.recommendedTacticalMode === 'aggressive' &&
    userMode === 'aggressive'
  ) {
    return 'aggressive';
  }
  if (macro.integration.recommendedTacticalMode === 'defensive') return 'defensive';
  return userMode;
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}
