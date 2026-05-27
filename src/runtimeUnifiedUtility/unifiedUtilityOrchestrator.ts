import type {
  UnifiedUtilityTimelineEntry,
  RuntimeUnifiedUtilityObserveInput,
} from '../types/runtimeUnifiedUtility';
import { scoreRuntimeUnifiedUtility } from './runtimeUnifiedUtilityCoordinator';
import {
  detectExistentialConstraintSignals,
  scoreRuntimeExistentialConstraintRisk,
} from './runtimeExistentialConstraintModel';
import {
  buildObjectiveFragmentationGraph,
  scoreObjectiveFragmentationRisk,
} from './goalFragmentationDetector';
import { scoreRuntimeUtilityDistortion } from './runtimeUtilityDistortionDetector';
import { scoreRuntimeGovernanceInflationRisk } from './governanceInflationTracker';
import { scoreRuntimeStabilityAddictionRisk } from './stabilityAddictionAnalyzer';
import { scoreObserverCivilizationRisk } from './observerCivilizationRiskMonitor';
import {
  buildCrossLayerUtilityGraph,
  scoreCrossLayerUtilityConsistency,
} from './crossLayerUtilityHarmonizer';
import {
  longSessionDriftFlags,
  scoreRuntimeExistentialDriftRisk,
} from './longSessionExistentialDriftEngine';
import {
  scorePurposeConsistency,
  scoreStrategicIntegrity,
  scoreUtilityEquilibriumVariance,
  scoreUtilityPersistence,
} from './runtimeUnifiedUtilityEvolutionCoordinator';
import { scoreSurvivalBias } from './survivalBiasAuditor';
import { scoreOrchestrationPersistence } from './orchestrationPersistenceTracker';
import { scoreInterventionPermanence } from './interventionPermanenceMonitor';
import { scoreContinuityDistortion } from './continuityDistortionDetector';
import { scoreMetaEquilibriumLock } from './metaEquilibriumLockDetector';
import { scoreUtilityIllusion } from './utilityIllusionAnalyzer';
import { buildLayerObjectiveDivergenceGraph } from './layerObjectiveDivergenceGraphBuilder';
import { scoreRuntimeUnifiedUtilityConfidence } from './unifiedUtilityConfidenceEngine';
import { scoreCrossLayerSpread } from './crossLayerSpreadCalculator';
import { registerExistentialSignals } from './existentialConstraintSignalRegistry';
import { recordUnifiedUtilityTimeline } from './unifiedUtilityTimeline';

export type UnifiedUtilityFlowResult = {
  flow: UnifiedUtilityTimelineEntry['flow'];
  detailJa: string;
};

export function runUnifiedUtilityFieldFlow(
  input: RuntimeUnifiedUtilityObserveInput,
): UnifiedUtilityFlowResult {
  void scoreCrossLayerSpread(input);
  void scoreRuntimeUnifiedUtilityConfidence(input);
  return {
    flow: 'unified_utility_field',
    detailJa: `utility ${scoreRuntimeUnifiedUtility(input)} · continuity ${input.continuityScore}`,
  };
}

export function runExistentialConstraintFlow(
  input: RuntimeUnifiedUtilityObserveInput,
): UnifiedUtilityFlowResult {
  void scoreSurvivalBias(input);
  void scoreOrchestrationPersistence(input);
  void scoreInterventionPermanence(input);
  void registerExistentialSignals(input);
  const signals = detectExistentialConstraintSignals(input);
  return {
    flow: 'existential_constraint_model',
    detailJa: `constraint ${scoreRuntimeExistentialConstraintRisk(input)} · ${signals.join(',') || 'none'}`,
  };
}

export function runGoalFragmentationFlow(
  input: RuntimeUnifiedUtilityObserveInput,
): UnifiedUtilityFlowResult {
  void buildLayerObjectiveDivergenceGraph(input);
  void buildObjectiveFragmentationGraph(input);
  return {
    flow: 'goal_fragmentation_detection',
    detailJa: `fragmentation ${scoreObjectiveFragmentationRisk(input)} · conflict ${input.layerConflictRisk}`,
  };
}

export function runUtilityDistortionFlow(
  input: RuntimeUnifiedUtilityObserveInput,
): UnifiedUtilityFlowResult {
  void scoreUtilityIllusion(input);
  void scoreContinuityDistortion(input);
  return {
    flow: 'utility_distortion_detection',
    detailJa: `distortion ${scoreRuntimeUtilityDistortion(input)} · observer ${input.observerDensityScore}`,
  };
}

export function runGovernanceInflationFlow(
  input: RuntimeUnifiedUtilityObserveInput,
): UnifiedUtilityFlowResult {
  return {
    flow: 'governance_inflation_tracking',
    detailJa: `inflation ${scoreRuntimeGovernanceInflationRisk(input)} · audit ${input.runtimeAuditCoverage}`,
  };
}

export function runStabilityAddictionFlow(
  input: RuntimeUnifiedUtilityObserveInput,
): UnifiedUtilityFlowResult {
  return {
    flow: 'stability_addiction_analysis',
    detailJa: `addiction ${scoreRuntimeStabilityAddictionRisk(input)} · calm ${input.runtimeCalmnessIndex}`,
  };
}

export function runObserverCivilizationFlow(
  input: RuntimeUnifiedUtilityObserveInput,
): UnifiedUtilityFlowResult {
  return {
    flow: 'observer_civilization_risk',
    detailJa: `civilization ${scoreObserverCivilizationRisk(input)} · overhead ${input.observerOverheadRatio}`,
  };
}

export function runCrossLayerHarmonizationFlow(
  input: RuntimeUnifiedUtilityObserveInput,
): UnifiedUtilityFlowResult {
  void buildCrossLayerUtilityGraph(input);
  return {
    flow: 'cross_layer_utility_harmonization',
    detailJa: `consistency ${scoreCrossLayerUtilityConsistency(input)} · spread ${scoreCrossLayerSpread(input)}`,
  };
}

export function runLongSessionExistentialDriftFlow(
  input: RuntimeUnifiedUtilityObserveInput,
): UnifiedUtilityFlowResult {
  const flags = longSessionDriftFlags(input);
  return {
    flow: 'long_session_existential_drift',
    detailJa:
      flags.length > 0
        ? flags.join(' · ')
        : `session ${input.sessionMinutes}min · drift ${scoreRuntimeExistentialDriftRisk(input)}`,
  };
}

export function runUtilityEquilibriumEvolutionFlow(
  input: RuntimeUnifiedUtilityObserveInput,
): UnifiedUtilityFlowResult {
  void scoreMetaEquilibriumLock(input);
  return {
    flow: 'utility_equilibrium_evolution',
    detailJa: `persistence ${scoreUtilityPersistence(input)} · variance ${scoreUtilityEquilibriumVariance(input)} · strategic ${scoreStrategicIntegrity(input)} · purpose ${scorePurposeConsistency(input)}`,
  };
}

export function runUnifiedUtilityFlows(
  input: RuntimeUnifiedUtilityObserveInput,
): UnifiedUtilityFlowResult[] {
  const results = [
    runUnifiedUtilityFieldFlow(input),
    runExistentialConstraintFlow(input),
    runGoalFragmentationFlow(input),
    runUtilityDistortionFlow(input),
    runGovernanceInflationFlow(input),
    runStabilityAddictionFlow(input),
    runObserverCivilizationFlow(input),
    runCrossLayerHarmonizationFlow(input),
    runLongSessionExistentialDriftFlow(input),
    runUtilityEquilibriumEvolutionFlow(input),
  ];
  for (const r of results) recordUnifiedUtilityTimeline(r.flow, r.detailJa);
  return results;
}
