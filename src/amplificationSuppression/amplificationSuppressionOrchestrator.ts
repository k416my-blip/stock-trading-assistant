import type {
  AmplificationSuppressionObserveInput,
  AmplificationTimelineEntry,
} from '../types/amplificationSuppression';
import { scoreRuntimeAmplificationRisk } from './runtimeAmplificationDetector';
import { scoreObserverCascadeRisk, suppressObserverCascade } from './observerCascadeSuppressor';
import { noteTelemetryRecursion, scoreTelemetryRecursionRisk } from './telemetryRecursionLimiter';
import { noteRecoveryLoop, scoreRecoveryAmplificationRisk, getRecoveryAmplificationChain } from './recoveryAmplificationGuard';
import { applyLoadShedding, computeLoadSheddingSeverity, isRuntimeOverloaded } from './autonomousLoadSheddingCoordinator';
import { scoreObserverDensity, shouldReduceTelemetrySampling } from './observerDensityRegulator';
import { noteIntervention } from './runtimeInterventionBudgetManager';
import { buildAmplificationPropagationGraph } from './crossLayerAmplificationTracker';
import { noteOrchestrationRecursion } from './recursiveOrchestrationLimiter';
import { quarantineHeavyObservers } from './heavyObserverQuarantine';
import { detectFeedbackLoops } from './runtimeFeedbackLoopSuppressor';
import { scoreThermalAmplificationPressure, shouldStrengthenThermalSuppression } from './thermalAmplificationLimiter';
import { shouldReduceObserversForMemory } from './memoryPressureObserverReducer';
import { exponentialReconnectDelayMs, scoreWebsocketStormRisk, shouldReduceWebsocketObservers } from './websocketStormSuppressor';
import { backgroundSheddingActions, isBackgroundStarvationShedding } from './backgroundStarvationSheddingMode';
import { shouldApplyStabilizationLock } from './runtimeEntropyStabilizer';
import { recordAmplificationTimeline } from './amplificationSuppressionTimeline';

export type AmplificationFlowResult = {
  flow: AmplificationTimelineEntry['flow'];
  detailJa: string;
};

export function runAmplificationDetectionFlow(input: AmplificationSuppressionObserveInput): AmplificationFlowResult {
  noteTelemetryRecursion('observer');
  noteTelemetryRecursion('telemetry');
  noteTelemetryRecursion('recovery');
  noteTelemetryRecursion('governance');
  noteTelemetryRecursion('meta');
  noteOrchestrationRecursion();
  const graph = buildAmplificationPropagationGraph(input);
  const risk = scoreRuntimeAmplificationRisk(input);
  return {
    flow: 'amplification_detection',
    detailJa: `risk ${risk} · cycle ${graph.edges.length}e · loops ${detectFeedbackLoops(input).join(',') || 'none'}`,
  };
}

export function runObserverCascadeSuppressionFlow(
  input: AmplificationSuppressionObserveInput,
  density: number,
): AmplificationFlowResult {
  const cascade = scoreObserverCascadeRisk(density, input.observerOverheadRatio);
  const stopped = suppressObserverCascade(density);
  const quarantined = quarantineHeavyObservers(density);
  const sample = shouldReduceTelemetrySampling(density);
  return {
    flow: 'observer_cascade_suppression',
    detailJa: `cascade ${cascade} · stop ${stopped.length} · quarantine ${quarantined.length} · sample ${sample}`,
  };
}

export function runRecoveryAmplificationGuardFlow(input: AmplificationSuppressionObserveInput): AmplificationFlowResult {
  const loop = noteRecoveryLoop(input);
  const risk = scoreRecoveryAmplificationRisk(input);
  if (loop) noteIntervention();
  return {
    flow: 'recovery_amplification_guard',
    detailJa: loop
      ? `loop detected · risk ${risk} · cooldown · deferred recovery`
      : `risk ${risk} · chain ${getRecoveryAmplificationChain().join('→') || 'none'}`,
  };
}

export function runAutonomousLoadSheddingFlow(input: AmplificationSuppressionObserveInput): AmplificationFlowResult {
  const overloaded = isRuntimeOverloaded(input);
  const severity = computeLoadSheddingSeverity(
    overloaded ? 0.5 + input.observerOverheadRatio * 0.5 : input.interventionDensity,
  );
  const shed = overloaded ? applyLoadShedding(severity) : [];
  return {
    flow: 'autonomous_load_shedding',
    detailJa: overloaded ? `shed ${shed.join('→')}` : `load ok · severity ${severity}`,
  };
}

export function runThermalAmplificationSuppressionFlow(
  input: AmplificationSuppressionObserveInput,
  density: number,
): AmplificationFlowResult {
  const thermal = scoreThermalAmplificationPressure(input);
  const strengthen = shouldStrengthenThermalSuppression(input, density);
  return {
    flow: 'thermal_amplification_suppression',
    detailJa: strengthen
      ? `thermal ${thermal} · render/ws/telemetry/recovery cooldown`
      : `thermal ${thermal} · normalize`,
  };
}

export function runWebsocketStormSuppressionFlow(input: AmplificationSuppressionObserveInput): AmplificationFlowResult {
  const storm = scoreWebsocketStormRisk(input);
  const delay = exponentialReconnectDelayMs(input);
  const reduce = shouldReduceWebsocketObservers(storm);
  return {
    flow: 'websocket_storm_suppression',
    detailJa: `storm ${storm} · delay ${delay}ms · reduce observers ${reduce}`,
  };
}

export function runBackgroundStarvationHandlingFlow(
  input: AmplificationSuppressionObserveInput,
): AmplificationFlowResult {
  const shedding = isBackgroundStarvationShedding(input);
  const actions = backgroundSheddingActions(input);
  return {
    flow: 'background_starvation_handling',
    detailJa: shedding ? actions.join(' · ') : 'foreground ok',
  };
}

export function runEntropyStabilizationFlow(entropy: number): AmplificationFlowResult {
  const lock = shouldApplyStabilizationLock(entropy);
  return {
    flow: 'entropy_stabilization',
    detailJa: lock
      ? `entropy ${entropy} · intervention reduce · pacing lock`
      : `entropy ${entropy} · normal`,
  };
}

export function runStabilizationEquilibriumFlow(
  input: AmplificationSuppressionObserveInput,
  stability: number,
): AmplificationFlowResult {
  const mem = shouldReduceObserversForMemory(input);
  return {
    flow: 'stabilization_equilibrium',
    detailJa: `stability ${stability} · memory reduce ${mem}`,
  };
}

export function runAmplificationSuppressionFlows(
  input: AmplificationSuppressionObserveInput,
  interventionDensity: number,
  density: number,
  entropy: number,
  stability: number,
): AmplificationFlowResult[] {
  const results = [
    runAmplificationDetectionFlow(input),
    runObserverCascadeSuppressionFlow(input, density),
    runRecoveryAmplificationGuardFlow(input),
    runAutonomousLoadSheddingFlow(input),
    runThermalAmplificationSuppressionFlow(input, density),
    runWebsocketStormSuppressionFlow(input),
    runBackgroundStarvationHandlingFlow(input),
    runEntropyStabilizationFlow(entropy),
    runStabilizationEquilibriumFlow(input, stability),
  ];
  for (const r of results) recordAmplificationTimeline(r.flow, r.detailJa);
  return results;
}
