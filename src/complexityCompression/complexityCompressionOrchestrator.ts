import type {
  ComplexityCompressionObserveInput,
  ComplexityCompressionTimelineEntry,
} from '../types/complexityCompression';
import { estimateLayerCounts, scoreRuntimeComplexity } from './runtimeComplexityAnalyzer';
import { detectRedundantObservers, scoreObserverRedundancyRisk } from './observerDeduplicationEngine';
import { buildRecursiveStabilizationMap, scoreRecursiveStabilizationRisk } from './recursiveStabilizationDetector';
import { selectPruningTargets, scoreAutonomousPruningConfidence } from './autonomousPruningEngine';
import { scoreObserverValue } from './observerValueScoringEngine';
import { mergePacingLayers } from './pacingConflictCompression';
import { scoreRuntimeNoiseRatio, smoothNoiseEstimate } from './runtimeNoiseReductionEngine';
import { resolveLeanMode, scoreRuntimeLeanStability } from './runtimeLeanModeOrchestrator';
import { scoreSimplificationIntegrity } from './runtimeSimplificationEquilibriumCoordinator';
import { planLightweightMigration } from './autonomousLightweightMigration';
import { recordComplexityCompressionTimeline } from './complexityCompressionTimeline';
import { COMPLEXITY_COMPRESSION_LONG_SESSION_MIN } from '../constants/complexityCompression';

export type ComplexityCompressionFlowResult = {
  flow: ComplexityCompressionTimelineEntry['flow'];
  detailJa: string;
};

export function runComplexityAnalysisFlow(input: ComplexityCompressionObserveInput): ComplexityCompressionFlowResult {
  const counts = estimateLayerCounts(input);
  const score = scoreRuntimeComplexity(input);
  return {
    flow: 'complexity_analysis',
    detailJa: `complexity ${score} · obs ${counts.observers} · edges ${counts.orchestrationEdges}`,
  };
}

export function runRedundancyDetectionFlow(input: ComplexityCompressionObserveInput): ComplexityCompressionFlowResult {
  const dupes = detectRedundantObservers(input);
  return {
    flow: 'redundancy_detection',
    detailJa: `risk ${scoreObserverRedundancyRisk(input)} · ${dupes.join(',') || 'none'}`,
  };
}

export function runRecursiveStabilizationFlow(input: ComplexityCompressionObserveInput): ComplexityCompressionFlowResult {
  void buildRecursiveStabilizationMap(input);
  return {
    flow: 'recursive_stabilization',
    detailJa: `risk ${scoreRecursiveStabilizationRisk(input)} · chain meta→recovery→governance→suppression`,
  };
}

export function runAutonomousPruningFlow(input: ComplexityCompressionObserveInput): ComplexityCompressionFlowResult {
  const targets = selectPruningTargets(input);
  return {
    flow: 'autonomous_pruning',
    detailJa: `conf ${scoreAutonomousPruningConfidence(input)} · prune ${targets.join(',') || 'none'}`,
  };
}

export function runObserverValueScoringFlow(input: ComplexityCompressionObserveInput): ComplexityCompressionFlowResult {
  return {
    flow: 'observer_value_scoring',
    detailJa: `value ${scoreObserverValue(input)} · continuity ${input.continuityScore}`,
  };
}

export function runRuntimeCompressionFlow(input: ComplexityCompressionObserveInput): ComplexityCompressionFlowResult {
  const merges = mergePacingLayers(input);
  return {
    flow: 'runtime_compression',
    detailJa: `merge ${merges.join(',') || 'none'} · pacing ${input.pacingLayerCount}`,
  };
}

export function runNoiseReductionFlow(input: ComplexityCompressionObserveInput): ComplexityCompressionFlowResult {
  return {
    flow: 'noise_reduction',
    detailJa: `noise ${scoreRuntimeNoiseRatio(input)} · smooth ${smoothNoiseEstimate(input)}`,
  };
}

export function runLeanModeOrchestrationFlow(input: ComplexityCompressionObserveInput): ComplexityCompressionFlowResult {
  return {
    flow: 'lean_mode_orchestration',
    detailJa: `mode ${resolveLeanMode(input)} · stability ${scoreRuntimeLeanStability(input)}`,
  };
}

export function runComplexityEquilibriumFlow(input: ComplexityCompressionObserveInput): ComplexityCompressionFlowResult {
  return {
    flow: 'complexity_equilibrium',
    detailJa: `integrity ${scoreSimplificationIntegrity(input)} · equilibrium ${input.runtimeEquilibriumStability}`,
  };
}

export function runLongSessionSimplificationFlow(
  input: ComplexityCompressionObserveInput,
): ComplexityCompressionFlowResult {
  if (input.sessionMinutes < COMPLEXITY_COMPRESSION_LONG_SESSION_MIN) {
    return { flow: 'long_session_simplification', detailJa: `session ${input.sessionMinutes}min ok` };
  }
  const plan = planLightweightMigration(input);
  return {
    flow: 'long_session_simplification',
    detailJa: `compress ${plan.join(',') || 'trim'} · session ${input.sessionMinutes}min`,
  };
}

export function runComplexityCompressionFlows(
  input: ComplexityCompressionObserveInput,
): ComplexityCompressionFlowResult[] {
  const results = [
    runComplexityAnalysisFlow(input),
    runRedundancyDetectionFlow(input),
    runRecursiveStabilizationFlow(input),
    runAutonomousPruningFlow(input),
    runObserverValueScoringFlow(input),
    runRuntimeCompressionFlow(input),
    runNoiseReductionFlow(input),
    runLeanModeOrchestrationFlow(input),
    runComplexityEquilibriumFlow(input),
    runLongSessionSimplificationFlow(input),
  ];
  for (const r of results) recordComplexityCompressionTimeline(r.flow, r.detailJa);
  return results;
}
