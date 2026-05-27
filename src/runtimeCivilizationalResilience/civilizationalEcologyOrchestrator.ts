import type {
  CivilizationalEcologyTimelineEntry,
  RuntimeCivilizationalResilienceObserveInput,
} from '../types/runtimeCivilizationalResilience';
import { scoreRuntimeCivilization } from './runtimeCivilizationCoordinator';
import {
  buildRecursiveGovernanceGraph,
  scoreRecursiveGovernanceEcologyRisk,
} from './recursiveGovernanceEcologyModel';
import { scoreRuntimeUtilityMonocultureRisk } from './utilityMonocultureDetector';
import { scoreObserverEcosystemInflationRisk } from './observerEcosystemInflationMonitor';
import { scoreRuntimeStabilityIdeologyRisk } from './stabilityIdeologyAnalyzer';
import { scoreRuntimeOrchestrationCivilizationRisk } from './orchestrationCivilizationTracker';
import { scoreGovernanceBiodiversity } from './governanceBiodiversityAnalyzer';
import {
  buildCrossLayerEcologyGraph,
  scoreCrossLayerEcologyIntegrity,
} from './crossLayerEcologicalBalancer';
import {
  detectCivilizationDriftSignals,
  scoreRuntimeCivilizationDriftRisk,
} from './longSessionCivilizationDriftEngine';
import {
  scoreCivilizationSpread,
  scoreEcosystemPersistence,
  scoreGovernanceVariance,
  scoreStrategicEcologyIntegrity,
  scoreUtilityDiversity,
} from './runtimeEcologicalEvolutionCoordinator';
import { scoreAuditCivilizationPersistence } from './auditCivilizationPersistenceMonitor';
import { scoreEquilibriumIdeology } from './equilibriumIdeologyDetector';
import { scoreMetaGovernanceLock } from './metaGovernanceLockDetector';
import { scoreCivilizationSpreadIndex } from './civilizationSpreadCalculator';
import { scoreEcosystemPersistenceIndex } from './ecosystemPersistenceTracker';
import { scoreGovernancePathVariance } from './governanceVarianceAnalyzer';
import { scoreUtilityDiversityIndex } from './utilityDiversityScorer';
import { scoreStrategicEcologyIntegrityIndex } from './strategicEcologyIntegrityMonitor';
import { scoreRuntimeEcologicalConfidence } from './ecologicalConfidenceEngine';
import { registerCivilizationSignals } from './civilizationSignalRegistry';
import { recordCivilizationalEcologyTimeline } from './civilizationalEcologyTimeline';

export type CivilizationalEcologyFlowResult = {
  flow: CivilizationalEcologyTimelineEntry['flow'];
  detailJa: string;
};

export function runCivilizationFlowFlow(
  input: RuntimeCivilizationalResilienceObserveInput,
): CivilizationalEcologyFlowResult {
  void scoreCivilizationSpreadIndex(input);
  void scoreRuntimeEcologicalConfidence(input);
  return {
    flow: 'civilization_flow',
    detailJa: `civilization ${scoreRuntimeCivilization(input)} · unified ${input.runtimeUnifiedUtilityScore}`,
  };
}

export function runRecursiveGovernanceEcologyFlow(
  input: RuntimeCivilizationalResilienceObserveInput,
): CivilizationalEcologyFlowResult {
  void buildRecursiveGovernanceGraph(input);
  void scoreGovernancePathVariance(input);
  return {
    flow: 'recursive_governance_ecology',
    detailJa: `recursion ${scoreRecursiveGovernanceEcologyRisk(input)} · meta ${input.metaRecursionRisk}`,
  };
}

export function runUtilityMonocultureFlow(
  input: RuntimeCivilizationalResilienceObserveInput,
): CivilizationalEcologyFlowResult {
  void scoreUtilityDiversityIndex(input);
  return {
    flow: 'utility_monoculture_detection',
    detailJa: `monoculture ${scoreRuntimeUtilityMonocultureRisk(input)} · diversity ${scoreUtilityDiversity(input)}`,
  };
}

export function runObserverEcosystemInflationFlow(
  input: RuntimeCivilizationalResilienceObserveInput,
): CivilizationalEcologyFlowResult {
  void scoreAuditCivilizationPersistence(input);
  return {
    flow: 'observer_ecosystem_inflation',
    detailJa: `inflation ${scoreObserverEcosystemInflationRisk(input)} · observer ${input.observerDensityScore}`,
  };
}

export function runStabilityIdeologyFlow(
  input: RuntimeCivilizationalResilienceObserveInput,
): CivilizationalEcologyFlowResult {
  void scoreEquilibriumIdeology(input);
  return {
    flow: 'stability_ideology_fixation',
    detailJa: `ideology ${scoreRuntimeStabilityIdeologyRisk(input)} · calm ${input.runtimeCalmnessIndex}`,
  };
}

export function runOrchestrationCivilizationFlow(
  input: RuntimeCivilizationalResilienceObserveInput,
): CivilizationalEcologyFlowResult {
  return {
    flow: 'orchestration_civilization_persistence',
    detailJa: `orchestration ${scoreRuntimeOrchestrationCivilizationRisk(input)} · edges ${input.orchestrationEdgeCount}`,
  };
}

export function runGovernanceBiodiversityFlow(
  input: RuntimeCivilizationalResilienceObserveInput,
): CivilizationalEcologyFlowResult {
  return {
    flow: 'governance_biodiversity_analysis',
    detailJa: `biodiversity ${scoreGovernanceBiodiversity(input)} · governance ${input.governanceConfidence}`,
  };
}

export function runCrossLayerEcologicalBalanceFlow(
  input: RuntimeCivilizationalResilienceObserveInput,
): CivilizationalEcologyFlowResult {
  void buildCrossLayerEcologyGraph(input);
  void scoreEcosystemPersistenceIndex(input);
  return {
    flow: 'cross_layer_ecological_balance',
    detailJa: `integrity ${scoreCrossLayerEcologyIntegrity(input)} · ecology ${scoreStrategicEcologyIntegrityIndex(input)}`,
  };
}

export function runLongSessionCivilizationDriftFlow(
  input: RuntimeCivilizationalResilienceObserveInput,
): CivilizationalEcologyFlowResult {
  void registerCivilizationSignals(input);
  const signals = detectCivilizationDriftSignals(input);
  return {
    flow: 'long_session_civilization_drift',
    detailJa:
      signals.length > 0
        ? signals.join(' · ')
        : `session ${input.sessionMinutes}min · drift ${scoreRuntimeCivilizationDriftRisk(input)}`,
  };
}

export function runEcologicalEquilibriumEvolutionFlow(
  input: RuntimeCivilizationalResilienceObserveInput,
): CivilizationalEcologyFlowResult {
  void scoreMetaGovernanceLock(input);
  void scoreGovernanceVariance(input);
  void scoreCivilizationSpread(input);
  return {
    flow: 'ecological_equilibrium_evolution',
    detailJa: `persistence ${scoreEcosystemPersistence(input)} · strategic ${scoreStrategicEcologyIntegrity(input)} · spread ${scoreCivilizationSpread(input)}`,
  };
}

export function runCivilizationalEcologyFlows(
  input: RuntimeCivilizationalResilienceObserveInput,
): CivilizationalEcologyFlowResult[] {
  const results = [
    runCivilizationFlowFlow(input),
    runRecursiveGovernanceEcologyFlow(input),
    runUtilityMonocultureFlow(input),
    runObserverEcosystemInflationFlow(input),
    runStabilityIdeologyFlow(input),
    runOrchestrationCivilizationFlow(input),
    runGovernanceBiodiversityFlow(input),
    runCrossLayerEcologicalBalanceFlow(input),
    runLongSessionCivilizationDriftFlow(input),
    runEcologicalEquilibriumEvolutionFlow(input),
  ];
  for (const r of results) recordCivilizationalEcologyTimeline(r.flow, r.detailJa);
  return results;
}
