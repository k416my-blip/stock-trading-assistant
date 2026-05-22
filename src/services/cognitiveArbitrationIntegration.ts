import type { AiGovernanceDecisionBundle } from '../types/aiGovernanceDecision';
import type { AiStrategyContextPayload } from '../types/aiStrategy';
import type { CognitiveArbitrationConsensusBundle } from '../types/cognitiveArbitrationConsensus';
import type { SystemicStabilityRecursiveGovernanceBundle } from '../types/systemicStabilityRecursiveGovernance';
import type { StrategyExecutionBundle } from '../types/strategyExecution';
import type { DynamicLayerOrchestrationMobileRuntimeOptimizationBundle } from '../types/dynamicLayerOrchestrationMobileRuntimeOptimization';
import { applyConsensusOrchestrationOverrides } from './dynamicLayerOrchestrationMobileRuntimeOptimizationRuntime';
import {
  appendConsensusTimelinePoint,
  saveCognitiveArbitrationState,
} from './cognitiveArbitrationConsensusStorage';

function clampConfidence(pct: number, cap: number): number {
  return Math.min(pct, cap);
}

function consensusAllowsAdaptation(
  consensus: CognitiveArbitrationConsensusBundle,
  systemic: SystemicStabilityRecursiveGovernanceBundle | null,
): boolean {
  if (systemic?.systemicEmergencySafeMode) return false;
  if (consensus.governanceOverrideActive) return false;
  if (consensus.explanationOnlyMode) return false;
  if (consensus.watchHoldOnly && consensus.consensusState === 'HARD_CONFLICT') return false;
  return true;
}

export async function persistConsensusCycle(
  consensus: CognitiveArbitrationConsensusBundle,
): Promise<void> {
  await appendConsensusTimelinePoint({
    at: consensus.generatedAt,
    state: consensus.consensusState,
    contradictionRiskPct: consensus.contradictionRiskPct,
    finalConsensusPct: consensus.finalConsensusPct,
  });
  await saveCognitiveArbitrationState({
    version: 1,
    lastConsensusState: consensus.consensusState,
    lastOrchestrationBudgetMax: consensus.orchestrationBudgetMax,
    lastContradictionRiskPct: consensus.contradictionRiskPct,
    consensusTimeline: consensus.consensusTimeline,
    debounceUntil: null,
  });
  applyConsensusOrchestrationOverrides({
    budgetMax: consensus.orchestrationBudgetMax,
    hardConflict: consensus.consensusState === 'HARD_CONFLICT',
    panicConsensus:
      consensus.consensusState === 'PANIC_CONSENSUS' || consensus.governancePriorityOnly,
    governancePriority: consensus.governanceOverrideActive,
  });
}

export function applyCognitiveConsensusToStrategy(
  strategy: StrategyExecutionBundle | null,
  consensus: CognitiveArbitrationConsensusBundle | null,
  systemic: SystemicStabilityRecursiveGovernanceBundle | null,
): StrategyExecutionBundle | null {
  if (!strategy || !consensus) return strategy;
  if (!consensusAllowsAdaptation(consensus, systemic)) {
    return {
      ...strategy,
      todayRecommendations: strategy.todayRecommendations.map((r) => {
        let action = r.action;
        if (action === 'buy') action = 'watch';
        if (action === 'reduce') action = 'hold';
        return {
          ...r,
          action,
          confidencePct: clampConfidence(r.confidencePct, consensus.finalConsensusPct),
          whyProposedJa: `${r.whyProposedJa} [Consensus blocked: ${consensus.consensusState}]`,
        };
      }),
    };
  }

  const cap = Math.min(consensus.finalConsensusPct, 70);
  const downgrade =
    consensus.watchHoldOnly ||
    consensus.consensusState === 'HARD_CONFLICT' ||
    consensus.consensusState === 'PANIC_CONSENSUS';

  return {
    ...strategy,
    todayRecommendations: strategy.todayRecommendations.map((r) => {
      let action = r.action;
      if (consensus.explanationOnlyMode) {
        if (action === 'buy') action = 'watch';
        if (action === 'reduce') action = 'hold';
      } else if (downgrade) {
        if (action === 'buy') action = 'watch';
        if (action === 'reduce') action = 'hold';
      } else if (consensus.contradictionRiskPct > 60 && action === 'buy') {
        action = 'watch';
      }
      return {
        ...r,
        action,
        confidencePct: clampConfidence(r.confidencePct, cap),
        whyProposedJa: `${r.whyProposedJa} [Consensus ${consensus.consensusState}]`,
      };
    }),
  };
}

export function applyCognitiveConsensusToGovernance(
  governance: AiGovernanceDecisionBundle | null,
  consensus: CognitiveArbitrationConsensusBundle | null,
  systemic: SystemicStabilityRecursiveGovernanceBundle | null,
): AiGovernanceDecisionBundle | null {
  if (!governance || !consensus) return governance;

  let summary = governance.unifiedAiSummaryJa;
  summary = `${summary} [Consensus: ${consensus.consensusStateLabelJa} · ${consensus.finalConsensusPct}% · contradiction ${consensus.contradictionRiskPct}%]`;
  summary = `${summary} ${consensus.uncertaintyDisclaimerJa}`.slice(0, 800);

  if (systemic?.systemicEmergencySafeMode) {
    summary = `${summary} [Consensus defers to systemic safe mode]`;
  }

  let finalDecision = governance.finalDecision;
  let finalDecisionLabelJa = governance.finalDecisionLabelJa;
  if (
    consensusAllowsAdaptation(consensus, systemic) &&
    (consensus.watchHoldOnly ||
      consensus.explanationOnlyMode ||
      consensus.contradictionRiskPct > 70)
  ) {
    if (finalDecision === 'buy') {
      finalDecision = 'watch';
      finalDecisionLabelJa = '監視';
    } else if (finalDecision === 'reduce') {
      finalDecision = 'hold';
      finalDecisionLabelJa = '保有';
    }
  }

  return {
    ...governance,
    finalDecision,
    finalDecisionLabelJa,
    unifiedAiSummaryJa: summary.slice(0, 800),
  };
}

export function attachCognitiveArbitrationToContext(
  payload: AiStrategyContextPayload,
  bundle: CognitiveArbitrationConsensusBundle | null,
): AiStrategyContextPayload {
  if (!bundle) return payload;
  return { ...payload, cognitiveArbitrationConsensus: bundle };
}

export function enrichConsensusBundleWithOrchestration(
  consensus: CognitiveArbitrationConsensusBundle,
  orchestration: DynamicLayerOrchestrationMobileRuntimeOptimizationBundle | null,
): CognitiveArbitrationConsensusBundle {
  if (!orchestration) return consensus;
  return {
    ...consensus,
    orchestrationBudgetMax: Math.min(
      consensus.orchestrationBudgetMax,
      orchestration.computeBudgetMax,
    ),
    orchestrationImpactJa: `${consensus.orchestrationImpactJa} · used ${orchestration.computeBudgetUsed}/${orchestration.computeBudgetMax}`,
    suppressedLayersJa: [
      consensus.suppressedLayersJa,
      ...orchestration.sleepingLayers.slice(0, 4),
    ]
      .filter((s) => s && s !== '—')
      .join(', '),
  };
}
