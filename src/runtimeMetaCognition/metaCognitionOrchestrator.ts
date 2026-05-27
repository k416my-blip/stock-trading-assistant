import type {
  MetaCognitionTimelineEntry,
  RuntimeMetaCognitionObserveInput,
} from '../types/runtimeMetaCognition';
import { scoreRuntimeMetaCognition } from './runtimeMetaCognitionCoordinator';
import {
  buildRecursiveSelfObservationGraph,
  scoreRecursiveSelfObservationRisk,
} from './recursiveSelfObservationInflationModel';
import { scoreObserverSelfReferenceLockRisk } from './observerSelfReferenceLockDetector';
import { scoreMetaCognitiveRigidityRisk } from './metaCognitiveRigidityTracker';
import { scoreRuntimeIntrospectionDependencyRisk } from './introspectionDependencyMonitor';
import { scoreRecursiveAuditFixationRisk } from './recursiveAuditFixationAnalyzer';
import { scoreRuntimeSelfModelDriftRisk } from './selfModelDriftEngine';
import {
  buildCrossLayerSelfGraph,
  scoreCrossLayerSelfConsistency,
} from './crossLayerSelfConsistencyHarmonizer';
import {
  detectIntrospectionDriftSignals,
  scoreRuntimeIntrospectionDriftRisk,
} from './longSessionIntrospectionDriftEngine';
import {
  scoreAuditRigidity,
  scoreCoherenceInflation,
  scoreIntrospectionDependencyIndex,
  scoreMetaVariance,
  scoreObserverRecursionMeta,
  scoreSelfReferencePersistence,
} from './runtimeMetaCognitionEvolutionCoordinator';
import { analyzeMetaVariance } from './metaVarianceAnalyzer';
import { trackAuditRigidity } from './auditRigidityTracker';
import { monitorObserverRecursionMeta } from './observerRecursionMetaMonitor';
import { detectCoherenceInflation } from './coherenceInflationDetector';
import { analyzeSelfReferencePersistence } from './selfReferencePersistenceAnalyzer';
import { trackIntrospectionDependency } from './introspectionDependencyTracker';
import { scoreSelfExplanationHallucination } from './selfExplanationHallucinationDetector';
import { scoreCoherenceOverfitting } from './coherenceOverfittingMonitor';
import { scoreRuntimeMetaCognitionConfidence } from './metaCognitionConfidenceEngine';
import { registerMetaCognitionSignals } from './metaCognitionSignalRegistry';
import { recordMetaCognitionTimeline } from './metaCognitionTimeline';

export type MetaCognitionFlowResult = {
  flow: MetaCognitionTimelineEntry['flow'];
  detailJa: string;
};

export function runMetaCognitionFlowFlow(input: RuntimeMetaCognitionObserveInput): MetaCognitionFlowResult {
  void scoreRuntimeMetaCognitionConfidence(input);
  void scoreCoherenceOverfitting(input);
  return {
    flow: 'meta_cognition_flow',
    detailJa: `meta ${scoreRuntimeMetaCognition(input)} · agency ${input.runtimeAgencyIntegrityScore}`,
  };
}

export function runRecursiveSelfObservationInflationFlow(
  input: RuntimeMetaCognitionObserveInput,
): MetaCognitionFlowResult {
  void buildRecursiveSelfObservationGraph(input);
  void scoreSelfExplanationHallucination(input);
  return {
    flow: 'recursive_self_observation_inflation',
    detailJa: `self-obs ${scoreRecursiveSelfObservationRisk(input)} · audit ${input.runtimeAuditCoverage}`,
  };
}

export function runObserverSelfReferenceLockFlow(
  input: RuntimeMetaCognitionObserveInput,
): MetaCognitionFlowResult {
  void monitorObserverRecursionMeta(input);
  return {
    flow: 'observer_self_reference_lock',
    detailJa: `lock ${scoreObserverSelfReferenceLockRisk(input)} · observer ${input.observerDensityScore}`,
  };
}

export function runMetaCognitiveRigidityFlow(
  input: RuntimeMetaCognitionObserveInput,
): MetaCognitionFlowResult {
  void detectCoherenceInflation(input);
  return {
    flow: 'meta_cognitive_rigidity',
    detailJa: `rigidity ${scoreMetaCognitiveRigidityRisk(input)} · coherence ${input.runtimeStrategicCoherence}`,
  };
}

export function runIntrospectionDependencyFlow(
  input: RuntimeMetaCognitionObserveInput,
): MetaCognitionFlowResult {
  void trackIntrospectionDependency(input);
  return {
    flow: 'introspection_dependency',
    detailJa: `introspection ${scoreRuntimeIntrospectionDependencyRisk(input)} · overhead ${input.observerOverheadRatio}`,
  };
}

export function runRecursiveAuditFixationFlow(
  input: RuntimeMetaCognitionObserveInput,
): MetaCognitionFlowResult {
  void trackAuditRigidity(input);
  return {
    flow: 'recursive_audit_fixation',
    detailJa: `fixation ${scoreRecursiveAuditFixationRisk(input)} · audit ${input.runtimeAuditCoverage}`,
  };
}

export function runSelfModelDriftFlow(input: RuntimeMetaCognitionObserveInput): MetaCognitionFlowResult {
  void analyzeSelfReferencePersistence(input);
  return {
    flow: 'self_model_drift',
    detailJa: `drift ${scoreRuntimeSelfModelDriftRisk(input)} · meta ${input.metaCoordinationStability}`,
  };
}

export function runCrossLayerSelfConsistencyFlow(
  input: RuntimeMetaCognitionObserveInput,
): MetaCognitionFlowResult {
  void buildCrossLayerSelfGraph(input);
  void analyzeMetaVariance(input);
  return {
    flow: 'cross_layer_self_consistency',
    detailJa: `consistency ${scoreCrossLayerSelfConsistency(input)} · variance ${scoreMetaVariance(input)}`,
  };
}

export function runLongSessionIntrospectionDriftFlow(
  input: RuntimeMetaCognitionObserveInput,
): MetaCognitionFlowResult {
  void registerMetaCognitionSignals(input);
  const signals = detectIntrospectionDriftSignals(input);
  return {
    flow: 'long_session_introspection_drift',
    detailJa:
      signals.length > 0
        ? signals.join(' · ')
        : `session ${input.sessionMinutes}min · drift ${scoreRuntimeIntrospectionDriftRisk(input)}`,
  };
}

export function runMetaCognitionEvolutionFlow(
  input: RuntimeMetaCognitionObserveInput,
): MetaCognitionFlowResult {
  void scoreAuditRigidity(input);
  return {
    flow: 'meta_cognition_evolution',
    detailJa: `rigidity ${scoreAuditRigidity(input)} · inflation ${scoreCoherenceInflation(input)} · persistence ${scoreSelfReferencePersistence(input)} · dependency ${scoreIntrospectionDependencyIndex(input)} · recursion ${scoreObserverRecursionMeta(input)}`,
  };
}

export function runMetaCognitionFlows(
  input: RuntimeMetaCognitionObserveInput,
): MetaCognitionFlowResult[] {
  const results = [
    runMetaCognitionFlowFlow(input),
    runRecursiveSelfObservationInflationFlow(input),
    runObserverSelfReferenceLockFlow(input),
    runMetaCognitiveRigidityFlow(input),
    runIntrospectionDependencyFlow(input),
    runRecursiveAuditFixationFlow(input),
    runSelfModelDriftFlow(input),
    runCrossLayerSelfConsistencyFlow(input),
    runLongSessionIntrospectionDriftFlow(input),
    runMetaCognitionEvolutionFlow(input),
  ];
  for (const r of results) recordMetaCognitionTimeline(r.flow, r.detailJa);
  return results;
}
