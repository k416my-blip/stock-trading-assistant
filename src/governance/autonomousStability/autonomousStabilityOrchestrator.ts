import type { AutonomousGovernanceObserveInput } from '../../types/autonomousStabilityGovernance';
import { scoreRuntimeStability } from './runtimeStabilityScoringEngine';
import {
  getObserverOverheadRatio,
  rankObserver,
  selectLowValueObservers,
} from './observerOverheadBalancer';
import {
  getRecoveryEfficiency,
  noteRecoveryOutcome,
} from './recoveryEffectivenessAnalyzer';
import { noteTelemetrySample } from './telemetryCostProfiler';
import { computeRuntimeMetabolism } from './runtimeMetabolismTracker';
import { tuneWeight, weightedGovernanceConfidence } from './stabilityWeightTuningEngine';
import { scoreThermalGovernance, shouldPaceRecovery } from './thermalAwareGovernance';
import { scoreLongSessionAdaptation } from './longSessionAdaptationEngine';
import {
  noteStarvationSample,
  predictStarvationRisk,
} from './backgroundStarvationPredictor';
import {
  getSuppressionEfficiency,
  suppressObservers,
} from './observerSuppressionOptimizer';
import { noteEnergySample, noteRecoveryEnergy } from './runtimeEnergyEfficiencyTracker';
import { applyHysteresis } from './governanceHysteresisController';
import {
  getAdaptationConsistency,
  noteStabilityScore,
} from './stabilityTrendPredictor';
import { optimizeRecoveryEscalation } from './recoveryEscalationOptimizer';
import { recordGovernanceTimeline } from './autonomousRuntimeAdaptationTimeline';
import { detectRuntimeFatigue } from './runtimeFatigueDetector';

export type GovernanceFlowResult = {
  flow: 'adaptation' | 'observer_balance' | 'thermal' | 'long_session' | 'hysteresis';
  detailJa: string;
};

export function runRuntimeAdaptationFlow(input: AutonomousGovernanceObserveInput): GovernanceFlowResult {
  const stability = scoreRuntimeStability(input);
  noteStabilityScore(stability);
  const overhead = getObserverOverheadRatio();
  const recoveryEff = getRecoveryEfficiency();
  noteRecoveryOutcome(input.recoverySuccessRate > 0.6);
  tuneWeight('recovery', recoveryEff > 0.7 ? 0.01 : -0.01);
  const confidence = weightedGovernanceConfidence({
    recovery: recoveryEff,
    bridge: 1 - Math.min(1, input.bridgeTrafficRate / 12),
    render: input.renderFps / 30,
    thermal: scoreThermalGovernance(input.thermalState, input.renderFps),
    hydration: 1 - input.staleHydrationRisk,
  });
  return {
    flow: 'adaptation',
    detailJa: `governance ${confidence} · stability ${stability} · overhead ${overhead}`,
  };
}

export function runObserverBalancingFlow(input: AutonomousGovernanceObserveInput): GovernanceFlowResult {
  rankObserver('native_telemetry', 0.4, 0.9);
  rankObserver('soak_timeline', 0.25, 0.5);
  rankObserver('bridge_profiler', 0.35, 0.75);
  rankObserver('metabolism', 0.2, 0.55);
  const before = getObserverOverheadRatio();
  const suppressed = suppressObservers(selectLowValueObservers(2), 'low benefit');
  const after = before * 0.85;
  const eff = getSuppressionEfficiency(before, after);
  noteTelemetrySample(before);
  return {
    flow: 'observer_balance',
    detailJa: `suppress ${suppressed} · efficiency ${eff}`,
  };
}

export function runThermalGovernanceFlow(input: AutonomousGovernanceObserveInput): GovernanceFlowResult {
  const thermal = scoreThermalGovernance(input.thermalState, input.renderFps);
  const pace = shouldPaceRecovery(input.thermalState);
  return {
    flow: 'thermal',
    detailJa: pace
      ? `thermal ${thermal} → pace recovery · throttle telemetry`
      : `thermal ${thermal} → normalize`,
  };
}

export function runLongSessionFlow(input: AutonomousGovernanceObserveInput): GovernanceFlowResult {
  const metabolism = computeRuntimeMetabolism(input);
  const longScore = scoreLongSessionAdaptation(input, metabolism);
  noteEnergySample(input.jsHeapMb, input.eventLoopLagMs);
  noteRecoveryEnergy();
  return {
    flow: 'long_session',
    detailJa: `metabolism ${metabolism} · long-session ${longScore}`,
  };
}

export function runHysteresisFlow(input: AutonomousGovernanceObserveInput): GovernanceFlowResult {
  const stability = scoreRuntimeStability(input);
  const band = applyHysteresis(stability);
  return {
    flow: 'hysteresis',
    detailJa: `hysteresis band ${band} · avoid oscillation`,
  };
}

export function runAutonomousGovernanceFlows(
  input: AutonomousGovernanceObserveInput,
): GovernanceFlowResult[] {
  const starvation = predictStarvationRisk(
    input.appForeground,
    input.screenOff,
    input.miuiAggressiveReclaim,
  );
  noteStarvationSample(starvation);
  const results = [
    runRuntimeAdaptationFlow(input),
    runObserverBalancingFlow(input),
    runThermalGovernanceFlow(input),
    runLongSessionFlow(input),
    runHysteresisFlow(input),
  ];
  for (const r of results) recordGovernanceTimeline(r.flow, r.detailJa);
  const metabolism = computeRuntimeMetabolism(input);
  optimizeRecoveryEscalation(
    detectRuntimeFatigue(input.sessionMinutes, metabolism, input.eventLoopLagMs),
    getRecoveryEfficiency(),
  );
  return results;
}
