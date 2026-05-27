import type {
  MetaOrchestrationObserveInput,
  MetaOrchestrationTimelineEntry,
} from '../types/metaRuntimeOrchestration';
import { scoreSurvivabilityConflict, detectActiveConflicts } from './survivabilityConflictDetector';
import { arbitrateRecoveryVsGovernance, arbitrationWinner } from './recoveryGovernanceArbitration';
import { suppressObserverLayers } from './observerOverloadSuppressor';
import { shouldBlockAmplificationLoop } from './telemetryAmplificationLimiter';
import { noteRecoveryBand, scoreRecoveryOscillationRisk } from './recoveryOscillationDetector';
import { noteGovernanceMode, shouldSuppressGovernanceTransition } from './governanceThrashingSuppressor';
import { isDeadlockLikely } from './stabilizationDeadlockDetector';
import { scheduleIntervention } from './runtimeInterventionScheduler';
import { enqueueLayer } from './priorityAwareSurvivabilityQueue';
import { buildCrossLayerPacingPlan } from './crossLayerPacingCoordinator';
import { applyMetaHysteresis } from './metaHysteresisController';
import { shouldPreserveCriticalObservers } from './observerStarvationPrevention';
import { noteIntervention, isInterventionCooldownActive } from './runtimeInterventionCooldownManager';
import { scoreEquilibrium } from './globalSurvivabilityEquilibriumEngine';
import { longSessionOrchestrationAdjustments } from './longSessionOrchestrationBalancer';
import { detectSelfInterference } from './runtimeSelfInterferenceDetector';
import { recordMetaOrchestrationTimeline } from './metaOrchestrationTimeline';

export type MetaFlowResult = {
  flow: MetaOrchestrationTimelineEntry['flow'];
  detailJa: string;
};

export function runConflictArbitrationFlow(input: MetaOrchestrationObserveInput): MetaFlowResult {
  const conflict = scoreSurvivabilityConflict(input);
  const active = detectActiveConflicts(input);
  const winner = arbitrationWinner(input);
  const arb = arbitrateRecoveryVsGovernance(input);
  scheduleIntervention('recovery');
  scheduleIntervention('governance');
  enqueueLayer('continuity');
  enqueueLayer('recovery');
  return {
    flow: 'conflict_arbitration',
    detailJa: `conflict ${conflict} · winner ${winner} · arb ${arb} · active ${active.join(',') || 'none'}`,
  };
}

export function runOscillationSuppressionFlow(input: MetaOrchestrationObserveInput): MetaFlowResult {
  noteRecoveryBand(input.recoverySuccessRate);
  noteGovernanceMode(input.governanceMode);
  const recoveryOsc = scoreRecoveryOscillationRisk();
  const thrash = shouldSuppressGovernanceTransition();
  const stability = input.governanceConfidence * 100;
  const band = applyMetaHysteresis(stability);
  const cooldown = isInterventionCooldownActive();
  return {
    flow: 'oscillation_suppression',
    detailJa: `recoveryOsc ${recoveryOsc} · thrash ${thrash} · band ${band} · cooldown ${cooldown}`,
  };
}

export function runTelemetryAmplificationProtectionFlow(
  input: MetaOrchestrationObserveInput,
): MetaFlowResult {
  const block = shouldBlockAmplificationLoop(input);
  const suppressed = suppressObserverLayers(input.observerOverheadRatio);
  if (block) noteIntervention();
  return {
    flow: 'telemetry_amplification_protection',
    detailJa: block
      ? `amplification blocked · suppress ${suppressed} observers`
      : `amplification ok · overhead ${input.observerOverheadRatio}`,
  };
}

export function runRuntimeEquilibriumFlow(
  input: MetaOrchestrationObserveInput,
  interventionDensity: number,
): MetaFlowResult {
  const equilibrium = scoreEquilibrium(input, interventionDensity);
  const interference = detectSelfInterference(input);
  return {
    flow: 'runtime_equilibrium',
    detailJa: `equilibrium ${equilibrium} · interference ${interference.join(',') || 'none'}`,
  };
}

export function runLongSessionFatigueFlow(input: MetaOrchestrationObserveInput): MetaFlowResult {
  const adj = longSessionOrchestrationAdjustments(input);
  const preserve = shouldPreserveCriticalObservers(input);
  const deadlock = isDeadlockLikely(input);
  return {
    flow: 'long_session_fatigue',
    detailJa: `adj ${adj.join(',') || 'none'} · preserve ${preserve} · deadlock ${deadlock}`,
  };
}

export function runCrossLayerPacingFlow(input: MetaOrchestrationObserveInput): MetaFlowResult {
  const plan = buildCrossLayerPacingPlan(input);
  for (const layer of plan) scheduleIntervention(layer);
  return {
    flow: 'cross_layer_pacing',
    detailJa: `plan ${plan.join('→')}`,
  };
}

export function runMetaOrchestrationFlowsWithDensity(
  input: MetaOrchestrationObserveInput,
  interventionDensity: number,
): MetaFlowResult[] {
  const results = [
    runConflictArbitrationFlow(input),
    runOscillationSuppressionFlow(input),
    runTelemetryAmplificationProtectionFlow(input),
    runRuntimeEquilibriumFlow(input, interventionDensity),
    runLongSessionFatigueFlow(input),
    runCrossLayerPacingFlow(input),
  ];
  for (const r of results) recordMetaOrchestrationTimeline(r.flow, r.detailJa);
  return results;
}
