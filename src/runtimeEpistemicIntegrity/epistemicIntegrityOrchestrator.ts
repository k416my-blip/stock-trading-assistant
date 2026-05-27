import type {
  EpistemicIntegrityTimelineEntry,
  RuntimeEpistemicIntegrityObserveInput,
} from '../types/runtimeEpistemicIntegrity';
import { scoreRuntimeRealityIntegrity } from './runtimeRealityModelingCoordinator';
import {
  buildRecursiveBeliefGraph,
  scoreRecursiveBeliefReinforcementRisk,
} from './recursiveBeliefReinforcementModel';
import { scoreRuntimeRealityDistortionRisk } from './utilityRealityDistortionDetector';
import { scoreObserverConfirmationLoopRisk } from './observerConfirmationLoopMonitor';
import { scoreRuntimeEpistemologyInflationRisk } from './governanceEpistemologyInflationTracker';
import { scoreRuntimeEquilibriumHallucinationRisk } from './equilibriumHallucinationDetector';
import { scoreRuntimeWorldviewLockRisk } from './orchestrationWorldviewLockAnalyzer';
import {
  buildCrossLayerEpistemicGraph,
  scoreCrossLayerEpistemicConsistency,
} from './crossLayerEpistemicConsistencyHarmonizer';
import {
  detectEpistemicDriftSignals,
  scoreRuntimeEpistemicDriftRisk,
} from './longSessionEpistemicDriftEngine';
import {
  scoreBeliefVariance,
  scoreCoherenceEvolution,
  scoreEpistemicRigidity,
  scoreObserverRecursion,
  scoreRealitySpread,
  scoreWorldviewDiversity,
} from './runtimeEpistemicEvolutionCoordinator';
import { analyzeBeliefVariance } from './beliefVarianceAnalyzer';
import { calculateRealitySpread } from './realitySpreadCalculator';
import { trackObserverRecursion } from './observerRecursionTracker';
import { scoreAuditEpistemicPersistence } from './auditEpistemicPersistenceMonitor';
import { scoreRecursiveCoherenceFixation } from './recursiveCoherenceFixationDetector';
import { scoreRuntimeEpistemicConfidence } from './epistemicConfidenceEngine';
import { registerEpistemicSignals } from './epistemicSignalRegistry';
import { recordEpistemicIntegrityTimeline } from './epistemicIntegrityTimeline';

export type EpistemicIntegrityFlowResult = {
  flow: EpistemicIntegrityTimelineEntry['flow'];
  detailJa: string;
};

export function runRealityModelingFlow(
  input: RuntimeEpistemicIntegrityObserveInput,
): EpistemicIntegrityFlowResult {
  void scoreRuntimeEpistemicConfidence(input);
  return {
    flow: 'reality_modeling_flow',
    detailJa: `reality ${scoreRuntimeRealityIntegrity(input)} · civilization ${input.runtimeCivilizationScore}`,
  };
}

export function runRecursiveBeliefReinforcementFlow(
  input: RuntimeEpistemicIntegrityObserveInput,
): EpistemicIntegrityFlowResult {
  void buildRecursiveBeliefGraph(input);
  void analyzeBeliefVariance(input);
  return {
    flow: 'recursive_belief_reinforcement',
    detailJa: `belief ${scoreRecursiveBeliefReinforcementRisk(input)} · variance ${scoreBeliefVariance(input)}`,
  };
}

export function runUtilityRealityDistortionFlow(
  input: RuntimeEpistemicIntegrityObserveInput,
): EpistemicIntegrityFlowResult {
  void calculateRealitySpread(input);
  return {
    flow: 'utility_reality_distortion',
    detailJa: `distortion ${scoreRuntimeRealityDistortionRisk(input)} · spread ${scoreRealitySpread(input)}`,
  };
}

export function runObserverConfirmationLoopFlow(
  input: RuntimeEpistemicIntegrityObserveInput,
): EpistemicIntegrityFlowResult {
  void trackObserverRecursion(input);
  void scoreAuditEpistemicPersistence(input);
  return {
    flow: 'observer_confirmation_loop',
    detailJa: `confirmation ${scoreObserverConfirmationLoopRisk(input)} · recursion ${scoreObserverRecursion(input)}`,
  };
}

export function runGovernanceEpistemologyInflationFlow(
  input: RuntimeEpistemicIntegrityObserveInput,
): EpistemicIntegrityFlowResult {
  return {
    flow: 'governance_epistemology_inflation',
    detailJa: `epistemology ${scoreRuntimeEpistemologyInflationRisk(input)} · governance ${input.governanceConfidence}`,
  };
}

export function runEquilibriumHallucinationFlow(
  input: RuntimeEpistemicIntegrityObserveInput,
): EpistemicIntegrityFlowResult {
  return {
    flow: 'equilibrium_hallucination_detection',
    detailJa: `hallucination ${scoreRuntimeEquilibriumHallucinationRisk(input)} · calm ${input.runtimeCalmnessIndex}`,
  };
}

export function runOrchestrationWorldviewLockFlow(
  input: RuntimeEpistemicIntegrityObserveInput,
): EpistemicIntegrityFlowResult {
  return {
    flow: 'orchestration_worldview_lock',
    detailJa: `worldview ${scoreRuntimeWorldviewLockRisk(input)} · orchestration ${input.orchestrationEdgeCount}`,
  };
}

export function runCrossLayerEpistemicConsistencyFlow(
  input: RuntimeEpistemicIntegrityObserveInput,
): EpistemicIntegrityFlowResult {
  void buildCrossLayerEpistemicGraph(input);
  void scoreWorldviewDiversity(input);
  return {
    flow: 'cross_layer_epistemic_consistency',
    detailJa: `consistency ${scoreCrossLayerEpistemicConsistency(input)} · diversity ${scoreWorldviewDiversity(input)}`,
  };
}

export function runLongSessionEpistemicDriftFlow(
  input: RuntimeEpistemicIntegrityObserveInput,
): EpistemicIntegrityFlowResult {
  void registerEpistemicSignals(input);
  const signals = detectEpistemicDriftSignals(input);
  return {
    flow: 'long_session_epistemic_drift',
    detailJa:
      signals.length > 0
        ? signals.join(' · ')
        : `session ${input.sessionMinutes}min · drift ${scoreRuntimeEpistemicDriftRisk(input)}`,
  };
}

export function runEpistemicEvolutionFlow(
  input: RuntimeEpistemicIntegrityObserveInput,
): EpistemicIntegrityFlowResult {
  void scoreRecursiveCoherenceFixation(input);
  void scoreEpistemicRigidity(input);
  return {
    flow: 'epistemic_evolution',
    detailJa: `rigidity ${scoreEpistemicRigidity(input)} · coherence ${scoreCoherenceEvolution(input)}`,
  };
}

export function runEpistemicIntegrityFlows(
  input: RuntimeEpistemicIntegrityObserveInput,
): EpistemicIntegrityFlowResult[] {
  const results = [
    runRealityModelingFlow(input),
    runRecursiveBeliefReinforcementFlow(input),
    runUtilityRealityDistortionFlow(input),
    runObserverConfirmationLoopFlow(input),
    runGovernanceEpistemologyInflationFlow(input),
    runEquilibriumHallucinationFlow(input),
    runOrchestrationWorldviewLockFlow(input),
    runCrossLayerEpistemicConsistencyFlow(input),
    runLongSessionEpistemicDriftFlow(input),
    runEpistemicEvolutionFlow(input),
  ];
  for (const r of results) recordEpistemicIntegrityTimeline(r.flow, r.detailJa);
  return results;
}
