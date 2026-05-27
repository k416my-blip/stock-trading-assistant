/**
 * Autonomous Stability Governance — observe/weight/adapt only (no runtime policy changes).
 */
import type {
  AutonomousGovernanceDashboard,
  AutonomousGovernanceMode,
  AutonomousGovernanceObserveInput,
  AutonomousGovernanceProfile,
} from '../../types/autonomousStabilityGovernance';
import {
  AUTONOMOUS_GOVERNANCE_POLL_MS,
  AUTONOMOUS_GOVERNANCE_UI_JA,
  AUTONOMOUS_OBSERVER_OVERHEAD_WARN,
  AUTONOMOUS_THERMAL_SEVERE,
} from '../../constants/autonomousStabilityGovernance';
import { scoreRuntimeStability, resetRuntimeStabilityScoringEngineForTest } from './runtimeStabilityScoringEngine';
import { resetObserverOverheadBalancerForTest, getObserverOverheadRatio } from './observerOverheadBalancer';
import {
  resetRecoveryEffectivenessAnalyzerForTest,
  getRecoveryEfficiency,
  getEnergyPerRecovery,
} from './recoveryEffectivenessAnalyzer';
import { resetDynamicDegradationOptimizerForTest, computeDegradationEfficiency } from './dynamicDegradationOptimizer';
import { resetTelemetryCostProfilerForTest } from './telemetryCostProfiler';
import { resetRuntimeMetabolismTrackerForTest, computeRuntimeMetabolism } from './runtimeMetabolismTracker';
import { resetStabilityWeightTuningEngineForTest, weightedGovernanceConfidence } from './stabilityWeightTuningEngine';
import { resetThermalAwareGovernanceForTest, scoreThermalGovernance } from './thermalAwareGovernance';
import { resetLongSessionAdaptationEngineForTest, scoreLongSessionAdaptation } from './longSessionAdaptationEngine';
import { resetDeviceSurvivabilityClassifierForTest } from './deviceSurvivabilityClassifier';
import { resetBackgroundStarvationPredictorForTest, getStarvationRiskTrend } from './backgroundStarvationPredictor';
import { resetObserverSuppressionOptimizerForTest, getSuppressionEfficiency } from './observerSuppressionOptimizer';
import { resetRuntimeEnergyEfficiencyTrackerForTest, getEnergyPerRecovery as getTrackerEnergyPerRecovery } from './runtimeEnergyEfficiencyTracker';
import { resetRecoveryConfidenceScorerForTest, scoreRecoveryConfidence } from './recoveryConfidenceScorer';
import { resetRuntimeFatigueDetectorForTest, detectRuntimeFatigue } from './runtimeFatigueDetector';
import {
  resetGovernanceHysteresisControllerForTest,
  getGovernanceTransitionCost,
} from './governanceHysteresisController';
import {
  resetStabilityTrendPredictorForTest,
  getSurvivabilityTrend,
  getAdaptationConsistency,
} from './stabilityTrendPredictor';
import { resetRecoveryEscalationOptimizerForTest } from './recoveryEscalationOptimizer';
import {
  getGovernanceTimelineRecent,
  resetAutonomousRuntimeAdaptationTimelineForTest,
} from './autonomousRuntimeAdaptationTimeline';
import { runAutonomousGovernanceFlows } from './autonomousStabilityOrchestrator';
import {
  recordAutonomousGovernanceSoakEvent,
  resetAutonomousStabilitySoakIntegrationForTest,
  setAutonomousGovernanceSoakHook,
} from './autonomousStabilitySoakIntegration';

const survivabilityEvolution: { at: string; score: number }[] = [];

let lastProfile: AutonomousGovernanceProfile | null = null;
let lastThrottleAt = 0;
let lastSuppressionEff = 0.85;

export function resetAutonomousStabilityGovernanceForTest(): void {
  lastProfile = null;
  lastThrottleAt = 0;
  lastSuppressionEff = 0.85;
  survivabilityEvolution.length = 0;
  resetRuntimeStabilityScoringEngineForTest();
  resetObserverOverheadBalancerForTest();
  resetRecoveryEffectivenessAnalyzerForTest();
  resetDynamicDegradationOptimizerForTest();
  resetTelemetryCostProfilerForTest();
  resetRuntimeMetabolismTrackerForTest();
  resetStabilityWeightTuningEngineForTest();
  resetThermalAwareGovernanceForTest();
  resetLongSessionAdaptationEngineForTest();
  resetDeviceSurvivabilityClassifierForTest();
  resetBackgroundStarvationPredictorForTest();
  resetObserverSuppressionOptimizerForTest();
  resetRuntimeEnergyEfficiencyTrackerForTest();
  resetRecoveryConfidenceScorerForTest();
  resetRuntimeFatigueDetectorForTest();
  resetGovernanceHysteresisControllerForTest();
  resetStabilityTrendPredictorForTest();
  resetRecoveryEscalationOptimizerForTest();
  resetAutonomousRuntimeAdaptationTimelineForTest();
  resetAutonomousStabilitySoakIntegrationForTest();
}

export function initAutonomousStabilityGovernance(): void {
  lastThrottleAt = 0;
}

export function setAutonomousGovernanceSoakHookEnabled(enabled: boolean): void {
  setAutonomousGovernanceSoakHook(enabled);
}

export function shouldRunAutonomousGovernanceSample(
  _input: AutonomousGovernanceObserveInput,
  now = Date.now(),
): boolean {
  if (now - lastThrottleAt < AUTONOMOUS_GOVERNANCE_POLL_MS) return false;
  lastThrottleAt = now;
  return true;
}

function resolveMode(input: AutonomousGovernanceObserveInput, stability: number): AutonomousGovernanceMode {
  if (AUTONOMOUS_THERMAL_SEVERE.includes(input.thermalState)) return 'thermal_paced';
  if (input.screenOff || !input.appForeground) return 'screen_off_minimal';
  if (input.miuiAggressiveReclaim) return 'reclaim_adapted';
  if (input.sessionMinutes > 90) return 'long_session_metabolism';
  if (getObserverOverheadRatio() > AUTONOMOUS_OBSERVER_OVERHEAD_WARN) return 'observer_balanced';
  if (stability < 65) return 'recovery_paced';
  return 'full_observe';
}

export function observeAutonomousStabilityGovernance(
  input: AutonomousGovernanceObserveInput,
): AutonomousGovernanceProfile {
  runAutonomousGovernanceFlows(input);
  for (const entry of getGovernanceTimelineRecent(5)) {
    recordAutonomousGovernanceSoakEvent(entry);
  }

  const stability = scoreRuntimeStability(input);
  const metabolism = computeRuntimeMetabolism(input);
  const overhead = getObserverOverheadRatio();
  const recoveryEff = getRecoveryEfficiency();
  const thermal = scoreThermalGovernance(input.thermalState, input.renderFps);
  const degradationEff = computeDegradationEfficiency(stability, overhead);
  const confidence = weightedGovernanceConfidence({
    recovery: recoveryEff,
    bridge: 1 - Math.min(1, input.bridgeTrafficRate / 12),
    render: input.renderFps / 30,
    thermal,
    hydration: 1 - input.staleHydrationRisk,
  });
  const fatigue = detectRuntimeFatigue(input.sessionMinutes, metabolism, input.eventLoopLagMs);
  const mode = resolveMode(input, stability);

  lastSuppressionEff = getSuppressionEfficiency(overhead, overhead * 0.88);

  const profile: AutonomousGovernanceProfile = {
    governanceConfidence: confidence,
    runtimeFatigue: fatigue,
    observerOverheadRatio: overhead,
    recoveryEfficiency: recoveryEff,
    degradationEfficiency: degradationEff,
    thermalGovernanceScore: thermal,
    adaptationStability: getAdaptationConsistency(),
    energyPerRecovery:
      getEnergyPerRecovery(input.eventLoopLagMs, input.jsHeapMb) || getTrackerEnergyPerRecovery(),
    survivabilityTrend: getSurvivabilityTrend(),
    runtimeMetabolism: metabolism,
    governanceTransitionCost: getGovernanceTransitionCost(),
    adaptationConsistency: scoreRecoveryConfidence(recoveryEff, input.continuityScore),
    starvationRiskTrend: getStarvationRiskTrend(),
    suppressionEfficiency: lastSuppressionEff,
    longSessionAdaptationScore: scoreLongSessionAdaptation(input, metabolism),
    mode,
    measuredAt: new Date().toISOString(),
  };

  survivabilityEvolution.push({ at: profile.measuredAt, score: stability });
  if (survivabilityEvolution.length > 64) survivabilityEvolution.shift();

  lastProfile = profile;
  return profile;
}

export function getLastAutonomousGovernanceProfile(): AutonomousGovernanceProfile | null {
  return lastProfile;
}

export function getSurvivabilityEvolutionTimeline(): { at: string; score: number }[] {
  return [...survivabilityEvolution];
}

export function getAutonomousGovernanceDashboard(): AutonomousGovernanceDashboard | null {
  if (!lastProfile) return null;
  return {
    titleJa: AUTONOMOUS_GOVERNANCE_UI_JA.sectionTitle,
    safetyBannerJa: AUTONOMOUS_GOVERNANCE_UI_JA.safety,
    profile: lastProfile,
    timelineRecent: getGovernanceTimelineRecent(6),
  };
}

export const observeAutonomousGovernance = observeAutonomousStabilityGovernance;
export const initAutonomousGovernance = initAutonomousStabilityGovernance;
export const resetAutonomousGovernanceForTest = resetAutonomousStabilityGovernanceForTest;
