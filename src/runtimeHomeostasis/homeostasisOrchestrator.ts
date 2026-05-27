import type {
  HomeostasisTimelineEntry,
  RuntimeHomeostasisObserveInput,
} from '../types/runtimeHomeostasis';
import { scoreRuntimeHomeostasis } from './runtimeHomeostasisCoordinator';
import { detectDriftTypes, scoreStabilityDriftRisk } from './stabilityDriftDetector';
import { scoreInterventionFatigueLevel, noteInterventionCycle } from './interventionFatigueStabilizer';
import { buildOscillationSuppressionMap, noteModeTransition, scoreStabilizationOscillationRisk } from './runtimeOscillationNeutralizer';
import { computeAdaptivePacing, noteAdaptivePacingSample } from './adaptiveEquilibriumPacing';
import { resolveCalmState } from './runtimeCalmStateCoordinator';
import { scoreHomeostaticRecoveryBalance } from './homeostaticRecoveryBalancer';
import { scoreCrossLayerStabilityConsistency } from './crossLayerEquilibriumTracker';
import { longSessionHomeostasisFlags, scoreLongSessionHomeostasis } from './longSessionHomeostasisEngine';
import { detectOverRegulation } from './runtimeSelfRegulationOrchestrator';
import { shouldPreserveObserveOnly } from './autonomousStabilityPreservation';
import { recordHomeostasisTimeline } from './stabilityHomeodynamicTimeline';
import { noteEquilibriumEvolution } from './runtimeEquilibriumEvolutionCoordinator';

export type HomeostasisFlowResult = {
  flow: HomeostasisTimelineEntry['flow'];
  detailJa: string;
};

export function runRuntimeHomeostasisFlow(input: RuntimeHomeostasisObserveInput): HomeostasisFlowResult {
  const score = scoreRuntimeHomeostasis(input);
  noteEquilibriumEvolution(input);
  return {
    flow: 'runtime_homeostasis',
    detailJa: `homeostasis ${score} · equilibrium ${input.runtimeEquilibriumStability}`,
  };
}

export function runStabilityDriftFlow(input: RuntimeHomeostasisObserveInput): HomeostasisFlowResult {
  const drifts = detectDriftTypes(input);
  return {
    flow: 'stability_drift_detection',
    detailJa: `risk ${scoreStabilityDriftRisk(input)} · ${drifts.join(',') || 'none'}`,
  };
}

export function runInterventionFatigueFlow(input: RuntimeHomeostasisObserveInput): HomeostasisFlowResult {
  noteInterventionCycle(input.interventionDensity > 0.35);
  return {
    flow: 'intervention_fatigue_balancing',
    detailJa: `fatigue ${scoreInterventionFatigueLevel(input)} · density ${input.interventionDensity}`,
  };
}

export function runOscillationNeutralizationFlow(input: RuntimeHomeostasisObserveInput): HomeostasisFlowResult {
  noteModeTransition(input.runtimeLeanStability > 0.6 ? 'lean' : 'normal');
  void buildOscillationSuppressionMap(input);
  return {
    flow: 'oscillation_neutralization',
    detailJa: `risk ${scoreStabilizationOscillationRisk(input)} · lean ${input.runtimeLeanStability}`,
  };
}

export function runAdaptiveEquilibriumPacingFlow(input: RuntimeHomeostasisObserveInput): HomeostasisFlowResult {
  noteAdaptivePacingSample(input);
  return {
    flow: 'adaptive_equilibrium_pacing',
    detailJa: `pacing ${computeAdaptivePacing(input)} · lag ${input.eventLoopLagMs}ms`,
  };
}

export function runCalmStateFlow(input: RuntimeHomeostasisObserveInput): HomeostasisFlowResult {
  return {
    flow: 'calm_state_coordination',
    detailJa: `state ${resolveCalmState(input)} · entropy ${input.runtimeEntropyScore}`,
  };
}

export function runHomeostaticRecoveryFlow(input: RuntimeHomeostasisObserveInput): HomeostasisFlowResult {
  return {
    flow: 'homeostatic_recovery_balancing',
    detailJa: `balance ${scoreHomeostaticRecoveryBalance(input)} · recovery ${input.recoverySuccessRate}`,
  };
}

export function runCrossLayerEquilibriumFlow(input: RuntimeHomeostasisObserveInput): HomeostasisFlowResult {
  return {
    flow: 'cross_layer_equilibrium',
    detailJa: `consistency ${scoreCrossLayerStabilityConsistency(input)} · layers 6`,
  };
}

export function runLongSessionHomeostasisFlow(input: RuntimeHomeostasisObserveInput): HomeostasisFlowResult {
  const flags = longSessionHomeostasisFlags(input);
  return {
    flow: 'long_session_homeostasis',
    detailJa: flags.length > 0 ? flags.join(' · ') : `session ${input.sessionMinutes}min ok`,
  };
}

export function runSelfRegulationPreservationFlow(input: RuntimeHomeostasisObserveInput): HomeostasisFlowResult {
  const overReg = detectOverRegulation(input);
  const observeOnly = shouldPreserveObserveOnly(input);
  return {
    flow: 'self_regulation_preservation',
    detailJa: overReg || observeOnly ? 'observe-only bias · over-regulation detected' : 'regulation nominal',
  };
}

export function runHomeostasisFlows(input: RuntimeHomeostasisObserveInput): HomeostasisFlowResult[] {
  const results = [
    runRuntimeHomeostasisFlow(input),
    runStabilityDriftFlow(input),
    runInterventionFatigueFlow(input),
    runOscillationNeutralizationFlow(input),
    runAdaptiveEquilibriumPacingFlow(input),
    runCalmStateFlow(input),
    runHomeostaticRecoveryFlow(input),
    runCrossLayerEquilibriumFlow(input),
    runLongSessionHomeostasisFlow(input),
    runSelfRegulationPreservationFlow(input),
  ];
  for (const r of results) recordHomeostasisTimeline(r.flow, r.detailJa);
  void scoreLongSessionHomeostasis(input);
  return results;
}
