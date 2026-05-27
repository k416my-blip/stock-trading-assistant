import type { AgencyIntegrityTimelineEntry, RuntimeAgencyIntegrityObserveInput } from '../types/runtimeAgencyIntegrity';
import { scoreRuntimeAgencyIntegrity } from './runtimeAgencyIntegrityCoordinator';
import {
  buildRecursiveAutonomyGraph,
  scoreRecursiveAutonomyInflationRisk,
} from './recursiveAutonomyInflationModel';
import {
  scoreConstraintStability,
  scoreRuntimeConstraintErosionRisk,
} from './constraintErosionMonitor';
import { scoreObserverAgencyFusionRisk } from './observerAgencyFusionDetector';
import { scoreRuntimeGovernanceAutonomyRisk } from './governanceAutonomyCreepTracker';
import { scoreRecursiveInterventionPersistenceRisk } from './recursiveInterventionPersistenceAnalyzer';
import { scoreRuntimeEquilibriumDependencyRisk } from './equilibriumDependencyLockDetector';
import {
  buildCrossLayerAgencyGraph,
  scoreCrossLayerAgencyConsistency,
} from './crossLayerAgencyConsistencyHarmonizer';
import {
  detectAutonomyDriftSignals,
  scoreRuntimeAutonomyDriftRisk,
} from './longSessionAutonomyDriftEngine';
import {
  scoreAgencyVariance,
  scoreAutonomyRigidity,
  scoreEquilibriumFixation,
  scoreGovernancePersistence,
  scoreObserverRecursionAgency,
} from './runtimeAgencyEvolutionCoordinator';
import { analyzeAgencyVariance } from './agencyVarianceAnalyzer';
import { trackConstraintStability } from './constraintStabilityTracker';
import { scoreAutonomyLockIn } from './autonomyLockInDetector';
import { scoreOrchestrationSelfPreservation } from './orchestrationSelfPreservationMonitor';
import { scoreRuntimeAgencyConfidence } from './agencyConfidenceEngine';
import { registerAgencySignals } from './agencySignalRegistry';
import { recordAgencyIntegrityTimeline } from './agencyIntegrityTimeline';

export type AgencyIntegrityFlowResult = {
  flow: AgencyIntegrityTimelineEntry['flow'];
  detailJa: string;
};

export function runAgencyFlowFlow(input: RuntimeAgencyIntegrityObserveInput): AgencyIntegrityFlowResult {
  void scoreRuntimeAgencyConfidence(input);
  void scoreAutonomyLockIn(input);
  return {
    flow: 'agency_flow',
    detailJa: `agency ${scoreRuntimeAgencyIntegrity(input)} · epistemic ${input.runtimeRealityIntegrityScore}`,
  };
}

export function runRecursiveAutonomyInflationFlow(
  input: RuntimeAgencyIntegrityObserveInput,
): AgencyIntegrityFlowResult {
  void buildRecursiveAutonomyGraph(input);
  void scoreOrchestrationSelfPreservation(input);
  return {
    flow: 'recursive_autonomy_inflation',
    detailJa: `inflation ${scoreRecursiveAutonomyInflationRisk(input)} · orchestration ${input.orchestrationEdgeCount}`,
  };
}

export function runConstraintErosionFlow(
  input: RuntimeAgencyIntegrityObserveInput,
): AgencyIntegrityFlowResult {
  void trackConstraintStability(input);
  return {
    flow: 'constraint_erosion_monitor',
    detailJa: `erosion ${scoreRuntimeConstraintErosionRisk(input)} · stability ${scoreConstraintStability(input)}`,
  };
}

export function runObserverAgencyFusionFlow(
  input: RuntimeAgencyIntegrityObserveInput,
): AgencyIntegrityFlowResult {
  void scoreObserverRecursionAgency(input);
  return {
    flow: 'observer_agency_fusion',
    detailJa: `fusion ${scoreObserverAgencyFusionRisk(input)} · observer ${input.observerDensityScore}`,
  };
}

export function runGovernanceAutonomyCreepFlow(
  input: RuntimeAgencyIntegrityObserveInput,
): AgencyIntegrityFlowResult {
  void scoreGovernancePersistence(input);
  return {
    flow: 'governance_autonomy_creep',
    detailJa: `autonomy ${scoreRuntimeGovernanceAutonomyRisk(input)} · governance ${input.governanceConfidence}`,
  };
}

export function runRecursiveInterventionPersistenceFlow(
  input: RuntimeAgencyIntegrityObserveInput,
): AgencyIntegrityFlowResult {
  return {
    flow: 'recursive_intervention_persistence',
    detailJa: `persistence ${scoreRecursiveInterventionPersistenceRisk(input)} · intervention ${input.interventionDensity}`,
  };
}

export function runEquilibriumDependencyLockFlow(
  input: RuntimeAgencyIntegrityObserveInput,
): AgencyIntegrityFlowResult {
  void scoreEquilibriumFixation(input);
  return {
    flow: 'equilibrium_dependency_lock',
    detailJa: `dependency ${scoreRuntimeEquilibriumDependencyRisk(input)} · calm ${input.runtimeCalmnessIndex}`,
  };
}

export function runCrossLayerAgencyConsistencyFlow(
  input: RuntimeAgencyIntegrityObserveInput,
): AgencyIntegrityFlowResult {
  void buildCrossLayerAgencyGraph(input);
  void analyzeAgencyVariance(input);
  return {
    flow: 'cross_layer_agency_consistency',
    detailJa: `consistency ${scoreCrossLayerAgencyConsistency(input)} · variance ${scoreAgencyVariance(input)}`,
  };
}

export function runLongSessionAutonomyDriftFlow(
  input: RuntimeAgencyIntegrityObserveInput,
): AgencyIntegrityFlowResult {
  void registerAgencySignals(input);
  const signals = detectAutonomyDriftSignals(input);
  return {
    flow: 'long_session_autonomy_drift',
    detailJa:
      signals.length > 0
        ? signals.join(' · ')
        : `session ${input.sessionMinutes}min · drift ${scoreRuntimeAutonomyDriftRisk(input)}`,
  };
}

export function runAgencyEvolutionFlow(input: RuntimeAgencyIntegrityObserveInput): AgencyIntegrityFlowResult {
  void scoreAutonomyRigidity(input);
  return {
    flow: 'agency_evolution',
    detailJa: `rigidity ${scoreAutonomyRigidity(input)} · fixation ${scoreEquilibriumFixation(input)} · persistence ${scoreGovernancePersistence(input)}`,
  };
}

export function runAgencyIntegrityFlows(
  input: RuntimeAgencyIntegrityObserveInput,
): AgencyIntegrityFlowResult[] {
  const results = [
    runAgencyFlowFlow(input),
    runRecursiveAutonomyInflationFlow(input),
    runConstraintErosionFlow(input),
    runObserverAgencyFusionFlow(input),
    runGovernanceAutonomyCreepFlow(input),
    runRecursiveInterventionPersistenceFlow(input),
    runEquilibriumDependencyLockFlow(input),
    runCrossLayerAgencyConsistencyFlow(input),
    runLongSessionAutonomyDriftFlow(input),
    runAgencyEvolutionFlow(input),
  ];
  for (const r of results) recordAgencyIntegrityTimeline(r.flow, r.detailJa);
  return results;
}
