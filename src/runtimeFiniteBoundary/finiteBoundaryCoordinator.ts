/**
 * Runtime Finite Boundary Governance & Observation Budgeting — observe-only.
 */
import type {
  RuntimeFiniteBoundaryDashboard,
  RuntimeFiniteBoundaryObserveInput,
  RuntimeFiniteBoundaryProfile,
} from '../types/runtimeFiniteBoundary';
import {
  RUNTIME_FINITE_BOUNDARY_POLL_MS,
  RUNTIME_FINITE_BOUNDARY_UI_JA,
} from '../constants/runtimeFiniteBoundary';
import { buildRuntimeFiniteBoundaryProfile } from './finiteBoundaryScorers';
import {
  getFiniteBoundarySuggestionsRecent,
  recordFiniteBoundarySuggestions,
  resetFiniteBoundarySuggestionRecorderForTest,
} from './finiteBoundarySuggestionRecorder';
import {
  buildCivilizationStackPressureTimeline,
  buildFiniteBoundaryGraph,
  buildObservationBudgetGauge,
  buildObserverMassHeatmap,
  buildRecursionBudgetLadder,
  buildSemanticEntropyRadar,
} from './finiteBoundaryVisualizations';
import { runFiniteBoundaryFlows } from './finiteBoundaryOrchestrator';
import {
  getFiniteBoundaryTimelineRecent,
  resetFiniteBoundaryTimelineForTest,
} from './finiteBoundaryTimeline';
import {
  recordFiniteBoundarySoakEvent,
  resetFiniteBoundarySoakIntegrationForTest,
  setFiniteBoundarySoakHook,
} from './finiteBoundarySoakIntegration';

let lastProfile: RuntimeFiniteBoundaryProfile | null = null;
let lastGauge: { label: string; value: number }[] = [];
let lastLadder: { rung: string; usage: number }[] = [];
let lastRadar: { axis: string; value: number }[] = [];
let lastGraph: ReturnType<typeof buildFiniteBoundaryGraph> | null = null;
let lastHeatmap: { layer: string; mass: number }[] = [];
let pressureTimeline: { at: string; pressure: number }[] = [];
let lastThrottleAt = 0;

export function resetRuntimeFiniteBoundaryForTest(): void {
  lastProfile = null;
  lastGauge = [];
  lastLadder = [];
  lastRadar = [];
  lastGraph = null;
  lastHeatmap = [];
  pressureTimeline = [];
  lastThrottleAt = 0;
  resetFiniteBoundaryTimelineForTest();
  resetFiniteBoundarySoakIntegrationForTest();
  resetFiniteBoundarySuggestionRecorderForTest();
}

export function initRuntimeFiniteBoundary(): void {
  lastThrottleAt = 0;
}

export function setRuntimeFiniteBoundarySoakHookEnabled(enabled: boolean): void {
  setFiniteBoundarySoakHook(enabled);
}

export function shouldRunRuntimeFiniteBoundarySample(
  _input: RuntimeFiniteBoundaryObserveInput,
  now = Date.now(),
): boolean {
  if (now - lastThrottleAt < RUNTIME_FINITE_BOUNDARY_POLL_MS) return false;
  lastThrottleAt = now;
  return true;
}

export function observeRuntimeFiniteBoundary(
  input: RuntimeFiniteBoundaryObserveInput,
): RuntimeFiniteBoundaryProfile {
  runFiniteBoundaryFlows(input);
  for (const entry of getFiniteBoundaryTimelineRecent(5)) {
    recordFiniteBoundarySoakEvent(entry);
  }

  const profile = buildRuntimeFiniteBoundaryProfile(input);
  recordFiniteBoundarySuggestions(profile);
  lastGauge = buildObservationBudgetGauge(profile);
  lastLadder = buildRecursionBudgetLadder(profile);
  lastRadar = buildSemanticEntropyRadar(profile);
  lastGraph = buildFiniteBoundaryGraph(profile);
  lastHeatmap = buildObserverMassHeatmap(profile);
  pressureTimeline = buildCivilizationStackPressureTimeline(profile, pressureTimeline);
  lastProfile = profile;
  return profile;
}

export function getLastRuntimeFiniteBoundaryProfile(): RuntimeFiniteBoundaryProfile | null {
  return lastProfile;
}

export function getRuntimeFiniteBoundaryDashboard(): RuntimeFiniteBoundaryDashboard | null {
  if (!lastProfile || !lastGraph) return null;
  return {
    titleJa: RUNTIME_FINITE_BOUNDARY_UI_JA.sectionTitle,
    safetyBannerJa: RUNTIME_FINITE_BOUNDARY_UI_JA.safety,
    profile: lastProfile,
    observationBudgetGauge: lastGauge,
    recursionBudgetLadder: lastLadder,
    semanticEntropyRadar: lastRadar,
    finiteBoundaryGraph: lastGraph,
    observerMassHeatmap: lastHeatmap,
    civilizationStackPressureTimeline: [...pressureTimeline],
    suggestions: getFiniteBoundarySuggestionsRecent(8),
    timelineRecent: getFiniteBoundaryTimelineRecent(6),
  };
}

export function getRuntimeFiniteBoundarySuggestions(): ReturnType<typeof getFiniteBoundarySuggestionsRecent> {
  return getFiniteBoundarySuggestionsRecent(12);
}
