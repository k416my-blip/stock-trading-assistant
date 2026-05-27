import type {
  StrategicCoherenceObserveInput,
  StrategicCoherenceTimelineEntry,
} from '../types/strategicCoherence';
import { scoreObjectiveAlignment } from './globalObjectiveAlignmentEngine';
import { detectLayerConflicts, scoreLayerConflictRisk } from './layerObjectiveConflictDetector';
import { arbitrateGlobalUtility } from './runtimeStrategicArbitrationEngine';
import { scoreGlobalUtilityEquilibrium } from './runtimeUtilityEquilibriumEngine';
import { scoreRuntimeIntentIntegrity, detectIntentDrift } from './runtimeIntentPreservationEngine';
import { scorePacingHarmonization } from './strategicPacingHarmonizer';
import { scoreCrossLayerObjectiveConsistency } from './crossLayerStrategicConsistencyTracker';
import { longSessionStrategicFlags, scoreLongSessionStrategicPersistence } from './longSessionStrategicPersistence';
import { scoreStrategicCompressionIntegrity } from './strategicCompressionHarmonizer';
import { noteStrategicEquilibriumEvolution } from './runtimeStrategicEquilibriumEvolution';
import { scoreRuntimeStrategicCoherence } from './runtimeStrategicCoherenceCoordinator';
import { recordStrategicCoherenceTimeline } from './runtimeCoherenceEvolutionTimeline';

export type StrategicCoherenceFlowResult = {
  flow: StrategicCoherenceTimelineEntry['flow'];
  detailJa: string;
};

export function runGlobalObjectiveAlignmentFlow(input: StrategicCoherenceObserveInput): StrategicCoherenceFlowResult {
  return {
    flow: 'global_objective_alignment',
    detailJa: `alignment ${scoreObjectiveAlignment(input)} · layers 8`,
  };
}

export function runLayerConflictFlow(input: StrategicCoherenceObserveInput): StrategicCoherenceFlowResult {
  const conflicts = detectLayerConflicts(input);
  return {
    flow: 'layer_conflict_detection',
    detailJa: `risk ${scoreLayerConflictRisk(input)} · ${conflicts.join(',') || 'none'}`,
  };
}

export function runStrategicArbitrationFlow(input: StrategicCoherenceObserveInput): StrategicCoherenceFlowResult {
  return {
    flow: 'strategic_arbitration',
    detailJa: `arbitration ${arbitrateGlobalUtility(input)} · global utility priority`,
  };
}

export function runUtilityEquilibriumFlow(input: StrategicCoherenceObserveInput): StrategicCoherenceFlowResult {
  return {
    flow: 'utility_equilibrium',
    detailJa: `equilibrium ${scoreGlobalUtilityEquilibrium(input)} · dimensions 8`,
  };
}

export function runIntentPreservationFlow(input: StrategicCoherenceObserveInput): StrategicCoherenceFlowResult {
  const drifts = detectIntentDrift(input);
  return {
    flow: 'intent_preservation',
    detailJa: `integrity ${scoreRuntimeIntentIntegrity(input)} · drift ${drifts.join(',') || 'none'}`,
  };
}

export function runStrategicPacingFlow(input: StrategicCoherenceObserveInput): StrategicCoherenceFlowResult {
  return {
    flow: 'strategic_pacing_harmonization',
    detailJa: `harmonization ${scorePacingHarmonization(input)} · unified pacing`,
  };
}

export function runCrossLayerConsistencyFlow(input: StrategicCoherenceObserveInput): StrategicCoherenceFlowResult {
  return {
    flow: 'cross_layer_consistency',
    detailJa: `consistency ${scoreCrossLayerObjectiveConsistency(input)} · decisions aligned`,
  };
}

export function runLongSessionPersistenceFlow(input: StrategicCoherenceObserveInput): StrategicCoherenceFlowResult {
  const flags = longSessionStrategicFlags(input);
  void scoreLongSessionStrategicPersistence(input);
  return {
    flow: 'long_session_persistence',
    detailJa: flags.length > 0 ? flags.join(' · ') : `session ${input.sessionMinutes}min ok`,
  };
}

export function runStrategicCompressionFlow(input: StrategicCoherenceObserveInput): StrategicCoherenceFlowResult {
  return {
    flow: 'strategic_compression_harmonization',
    detailJa: `integrity ${scoreStrategicCompressionIntegrity(input)} · audit+continuity ok`,
  };
}

export function runEquilibriumEvolutionFlow(input: StrategicCoherenceObserveInput): StrategicCoherenceFlowResult {
  noteStrategicEquilibriumEvolution(input);
  return {
    flow: 'equilibrium_evolution',
    detailJa: `coherence ${scoreRuntimeStrategicCoherence(input)} · evolution noted`,
  };
}

export function runStrategicCoherenceFlows(input: StrategicCoherenceObserveInput): StrategicCoherenceFlowResult[] {
  const results = [
    runGlobalObjectiveAlignmentFlow(input),
    runLayerConflictFlow(input),
    runStrategicArbitrationFlow(input),
    runUtilityEquilibriumFlow(input),
    runIntentPreservationFlow(input),
    runStrategicPacingFlow(input),
    runCrossLayerConsistencyFlow(input),
    runLongSessionPersistenceFlow(input),
    runStrategicCompressionFlow(input),
    runEquilibriumEvolutionFlow(input),
  ];
  for (const r of results) recordStrategicCoherenceTimeline(r.flow, r.detailJa);
  return results;
}
