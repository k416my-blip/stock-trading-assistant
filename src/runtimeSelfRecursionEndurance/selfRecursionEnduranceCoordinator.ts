/**
 * Runtime Self-Recursion Circuit Breaker & Operational Endurance — observe-only.
 */
import type {
  RuntimeSelfRecursionEnduranceDashboard,
  RuntimeSelfRecursionEnduranceObserveInput,
  RuntimeSelfRecursionEnduranceProfile,
} from '../types/runtimeSelfRecursionEndurance';
import {
  RUNTIME_SELF_RECURSION_ENDURANCE_POLL_MS,
  RUNTIME_SELF_RECURSION_ENDURANCE_UI_JA,
} from '../constants/runtimeSelfRecursionEndurance';
import { scoreRecursionCircuitRisk, scoreRecursionDepth } from './recursionCircuitDetector';
import { scoreObserverEchoRisk } from './observerEchoRiskScorer';
import { scoreTelemetryEchoRisk } from './telemetryEchoRiskScorer';
import { scoreAuditLoopRisk } from './auditLoopRiskScorer';
import {
  classifyEnduranceRiskBand,
  scoreRuntimeOperationalEnduranceScore,
} from './operationalEnduranceEngine';
import { scoreDashboardPayloadGrowthRisk } from './dashboardPayloadGrowthMonitor';
import { scoreLongSessionDriftRisk } from './longSessionDriftMonitor';
import { scoreRuntimeEnduranceConfidence } from './enduranceConfidenceEngine';
import { scoreMiuiBackgroundStarvationRisk } from './miuiBackgroundStarvationObserver';
import { scoreBatterySaverObserverDelayRisk } from './batterySaverObserverDelayObserver';
import {
  getSuppressionSuggestionsRecent,
  recordCircuitBreakerObservation,
  resetObserveOnlyCircuitBreakerScorerForTest,
} from './observeOnlyCircuitBreakerScorer';
import { runSelfRecursionEnduranceFlows } from './selfRecursionEnduranceOrchestrator';
import {
  getSelfRecursionEnduranceTimelineRecent,
  resetSelfRecursionEnduranceTimelineForTest,
} from './selfRecursionEnduranceTimeline';
import {
  recordSelfRecursionEnduranceSoakEvent,
  resetSelfRecursionEnduranceSoakIntegrationForTest,
  setSelfRecursionEnduranceSoakHook,
} from './selfRecursionEnduranceSoakIntegration';
import { resetSelfRecursionEnduranceEvolutionCoordinatorForTest } from './selfRecursionEnduranceEvolutionCoordinator';

const circuitTimeline: { at: string; recursionCircuitRisk: number }[] = [];

let lastProfile: RuntimeSelfRecursionEnduranceProfile | null = null;
let lastThrottleAt = 0;

export function resetRuntimeSelfRecursionEnduranceForTest(): void {
  lastProfile = null;
  lastThrottleAt = 0;
  circuitTimeline.length = 0;
  resetSelfRecursionEnduranceTimelineForTest();
  resetSelfRecursionEnduranceSoakIntegrationForTest();
  resetObserveOnlyCircuitBreakerScorerForTest();
  resetSelfRecursionEnduranceEvolutionCoordinatorForTest();
}

export function initRuntimeSelfRecursionEndurance(): void {
  lastThrottleAt = 0;
}

export function setRuntimeSelfRecursionEnduranceSoakHookEnabled(enabled: boolean): void {
  setSelfRecursionEnduranceSoakHook(enabled);
}

export function shouldRunRuntimeSelfRecursionEnduranceSample(
  _input: RuntimeSelfRecursionEnduranceObserveInput,
  now = Date.now(),
): boolean {
  if (now - lastThrottleAt < RUNTIME_SELF_RECURSION_ENDURANCE_POLL_MS) return false;
  lastThrottleAt = now;
  return true;
}

export function observeRuntimeSelfRecursionEndurance(
  input: RuntimeSelfRecursionEnduranceObserveInput,
): RuntimeSelfRecursionEnduranceProfile {
  runSelfRecursionEnduranceFlows(input);
  for (const entry of getSelfRecursionEnduranceTimelineRecent(5)) {
    recordSelfRecursionEnduranceSoakEvent(entry);
  }

  const recursionCircuitRisk = scoreRecursionCircuitRisk(input);
  const runtimeOperationalEnduranceScore = scoreRuntimeOperationalEnduranceScore(input);
  recordCircuitBreakerObservation(input, recursionCircuitRisk);
  circuitTimeline.push({ at: new Date().toISOString(), recursionCircuitRisk });
  if (circuitTimeline.length > 48) circuitTimeline.shift();

  const profile: RuntimeSelfRecursionEnduranceProfile = {
    recursionDepth: scoreRecursionDepth(input),
    recursionCircuitRisk,
    observerEchoRisk: scoreObserverEchoRisk(input),
    telemetryEchoRisk: scoreTelemetryEchoRisk(input),
    auditLoopRisk: scoreAuditLoopRisk(input),
    runtimeOperationalEnduranceScore,
    dashboardPayloadGrowthRisk: scoreDashboardPayloadGrowthRisk(input),
    longSessionDriftRisk: scoreLongSessionDriftRisk(input),
    runtimeEnduranceConfidence: scoreRuntimeEnduranceConfidence(
      input,
      runtimeOperationalEnduranceScore,
      recursionCircuitRisk,
    ),
    enduranceRiskBand: classifyEnduranceRiskBand(recursionCircuitRisk, runtimeOperationalEnduranceScore),
    miuiBackgroundStarvationRisk: scoreMiuiBackgroundStarvationRisk(input),
    batterySaverObserverDelayRisk: scoreBatterySaverObserverDelayRisk(input),
    measuredAt: new Date().toISOString(),
  };

  lastProfile = profile;
  return profile;
}

export function getLastRuntimeSelfRecursionEnduranceProfile(): RuntimeSelfRecursionEnduranceProfile | null {
  return lastProfile;
}

export function getRuntimeSelfRecursionEnduranceDashboard(): RuntimeSelfRecursionEnduranceDashboard | null {
  if (!lastProfile) return null;
  return {
    titleJa: RUNTIME_SELF_RECURSION_ENDURANCE_UI_JA.sectionTitle,
    safetyBannerJa: RUNTIME_SELF_RECURSION_ENDURANCE_UI_JA.safety,
    profile: lastProfile,
    circuitTimeline: [...circuitTimeline],
    suppressionSuggestions: getSuppressionSuggestionsRecent(6),
    enduranceRiskBand: lastProfile.enduranceRiskBand,
    timelineRecent: getSelfRecursionEnduranceTimelineRecent(6),
  };
}
