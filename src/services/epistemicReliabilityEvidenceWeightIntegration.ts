import { UNSUPPORTED_CONFIDENCE_CAP } from '../constants/epistemicReliabilityEvidenceWeight';
import type { AiGovernanceDecisionBundle } from '../types/aiGovernanceDecision';
import type { AiStrategyContextPayload } from '../types/aiStrategy';
import type { EpistemicReliabilityEvidenceWeightBundle } from '../types/epistemicReliabilityEvidenceWeight';
import type { StateIntegrityTemporalConsistencyBundle } from '../types/stateIntegrityTemporalConsistency';
import type { StrategyAction, StrategyExecutionBundle } from '../types/strategyExecution';

/** Emergency / freeze: buy→watch, reduce→hold only — no new trade ideas */
export function applyEmergencyReliabilityFallback(
  strategy: StrategyExecutionBundle | null,
  epistemic: EpistemicReliabilityEvidenceWeightBundle | null,
): StrategyExecutionBundle | null {
  if (!strategy || !epistemic?.emergencyFallbackApplied) return strategy;
  return {
    ...strategy,
    todayRecommendations: strategy.todayRecommendations.map((r) => {
      let action = r.action;
      if (action === 'buy') action = 'watch';
      else if (action === 'reduce') action = 'hold';
      if (action === r.action) return r;
      return {
        ...r,
        action,
        intent: action === 'watch' ? 'watch' : r.intent,
        whyProposedJa: `${r.whyProposedJa} [Epistemic fallback: watch/hold only]`,
        confidencePct: Math.min(r.confidencePct, UNSUPPORTED_CONFIDENCE_CAP),
      };
    }),
  };
}

/** Unsupported claims cap confidence at 35 — explanation only */
export function clampConfidenceForUnsupported(
  strategy: StrategyExecutionBundle | null,
  epistemic: EpistemicReliabilityEvidenceWeightBundle | null,
): StrategyExecutionBundle | null {
  if (!strategy || !epistemic || epistemic.unsupportedClaimsJa.length === 0) return strategy;
  return {
    ...strategy,
    todayRecommendations: strategy.todayRecommendations.map((r) => ({
      ...r,
      confidencePct: Math.min(r.confidencePct, UNSUPPORTED_CONFIDENCE_CAP),
      analystExplanationJa: epistemic.unsupportedClaimsJa.length
        ? `${r.analystExplanationJa}（信頼度上限${UNSUPPORTED_CONFIDENCE_CAP}% — 未証拠表現を抑制）`
        : r.analystExplanationJa,
    })),
  };
}

/** Rollback / temporal repair forces reliability downgrade on narratives */
export function applyReliabilityDowngradeOnRollback(
  governance: AiGovernanceDecisionBundle | null,
  temporal: StateIntegrityTemporalConsistencyBundle | null,
  epistemic: EpistemicReliabilityEvidenceWeightBundle | null,
): AiGovernanceDecisionBundle | null {
  if (!governance || !epistemic) return governance;
  if (!temporal?.rollbackApplied && !epistemic.reliabilityFreeze) return governance;
  return {
    ...governance,
    unifiedAiSummaryJa: `${governance.unifiedAiSummaryJa} [Reliability downgrade: health ${epistemic.reliabilityHealthScore}%]`.slice(
      0,
      800,
    ),
  };
}

export function applyEpistemicReliabilityToGovernance(
  governance: AiGovernanceDecisionBundle | null,
  epistemic: EpistemicReliabilityEvidenceWeightBundle | null,
): AiGovernanceDecisionBundle | null {
  if (!governance || !epistemic) return governance;

  let summary = governance.unifiedAiSummaryJa;
  summary = `${summary} [Reliability: health ${epistemic.reliabilityHealthScore}% · consensus ${epistemic.reliabilityConsensusPct}%]`;
  if (epistemic.emergencyFallbackJa) summary = `${summary} ${epistemic.emergencyFallbackJa}`;
  if (epistemic.reliabilityFreeze) {
    summary = `${summary} [Reliability freeze]`;
  }

  let finalDecision = governance.finalDecision;
  let finalDecisionLabelJa = governance.finalDecisionLabelJa;
  if (epistemic.emergencyFallbackApplied && finalDecision === 'buy') {
    finalDecision = 'watch';
    finalDecisionLabelJa = '監視';
  } else if (epistemic.emergencyFallbackApplied && finalDecision === 'reduce') {
    finalDecision = 'hold';
    finalDecisionLabelJa = '保有';
  }

  return {
    ...governance,
    finalDecision,
    finalDecisionLabelJa,
    unifiedAiSummaryJa: summary.slice(0, 800),
  };
}

export function applyEpistemicReliabilityToStrategy(
  strategy: StrategyExecutionBundle | null,
  epistemic: EpistemicReliabilityEvidenceWeightBundle | null,
): StrategyExecutionBundle | null {
  if (!strategy || !epistemic) return strategy;
  let next = clampConfidenceForUnsupported(strategy, epistemic);
  next = applyEmergencyReliabilityFallback(next, epistemic);
  if (!next) return next;
  if (epistemic.reliabilityHealthScore >= 55) return next;
  return {
    ...next,
    todayRecommendations: next.todayRecommendations.map((r) => ({
      ...r,
      whyProposedJa: `${r.whyProposedJa} [Reliability: ${epistemic.healthLabelJa}]`.slice(0, 900),
    })),
  };
}

export function attachEpistemicReliabilityToContext(
  payload: AiStrategyContextPayload,
  bundle: EpistemicReliabilityEvidenceWeightBundle | null,
): AiStrategyContextPayload {
  if (!bundle) return payload;
  return {
    ...payload,
    epistemicReliabilityEvidenceWeight: bundle,
  };
}

export function enforceWatchHoldAfterReliabilityRepair(
  action: StrategyAction,
  epistemic: EpistemicReliabilityEvidenceWeightBundle | null,
): StrategyAction {
  if (!epistemic?.emergencyFallbackApplied && !epistemic?.reliabilityFreeze) return action;
  if (action === 'buy') return 'watch';
  if (action === 'reduce') return 'hold';
  return action;
}
