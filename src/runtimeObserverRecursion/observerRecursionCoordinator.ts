/**
 * Observer Recursion Suppression — observe-only; no runtime write / intervention.
 */
import type {
  ObserverGraphSnapshot,
  RuntimeObserverRecursionDashboard,
  RuntimeObserverRecursionObserveInput,
  RuntimeObserverRecursionProfile,
} from '../types/runtimeObserverRecursion';
import {
  RUNTIME_OBSERVER_RECURSION_POLL_MS,
  RUNTIME_OBSERVER_RECURSION_UI_JA,
} from '../constants/runtimeObserverRecursion';
import {
  getRecursionEvolution,
  resetRuntimeObserverRecursionCoordinatorForTest,
} from './runtimeObserverRecursionCoordinator';
import { buildObserveGraph, scoreObserverRecursionRisk } from './recursiveObserverCascadeModel';
import { scoreTelemetryAmplificationRisk } from './telemetryEchoInflationDetector';
import { scoreRecursiveSignalEchoRisk } from './signalEchoLoopDetector';
import { scoreObserveGraphComplexity } from './observeGraphComplexityAnalyzer';
import { scoreRuntimeObserverConfidence } from './observerRecursionConfidenceEngine';
import { scoreRecursionDepth } from './recursionDepthAnalyzer';
import { scoreCircularObserveGraph } from './circularObserveGraphDetector';
import { scoreGovernanceEcho } from './governanceEchoMonitor';
import { buildRecursionHeatmap } from './observerHeatmapBuilder';
import { buildDependencyGraph } from './observerDependencyGraphBuilder';
import { runObserverRecursionFlows } from './observerRecursionOrchestrator';
import {
  getObserverRecursionTimelineRecent,
  resetObserverRecursionTimelineForTest,
} from './observerRecursionTimeline';
import {
  recordObserverRecursionSoakEvent,
  resetObserverRecursionSoakIntegrationForTest,
  setObserverRecursionSoakHook,
} from './observerRecursionSoakIntegration';

const ampTimeline: { at: string; level: number }[] = [];

let lastProfile: RuntimeObserverRecursionProfile | null = null;
let lastGraph: ObserverGraphSnapshot | null = null;
let lastDepGraph: ObserverGraphSnapshot | null = null;
let lastHeatmap: { layer: string; intensity: number }[] = [];
let lastThrottleAt = 0;

export function resetRuntimeObserverRecursionForTest(): void {
  lastProfile = null;
  lastGraph = null;
  lastDepGraph = null;
  lastHeatmap = [];
  lastThrottleAt = 0;
  ampTimeline.length = 0;
  resetObserverRecursionTimelineForTest();
  resetObserverRecursionSoakIntegrationForTest();
  resetRuntimeObserverRecursionCoordinatorForTest();
}

export function initRuntimeObserverRecursion(): void {
  lastThrottleAt = 0;
}

export function setRuntimeObserverRecursionSoakHookEnabled(enabled: boolean): void {
  setObserverRecursionSoakHook(enabled);
}

export function shouldRunRuntimeObserverRecursionSample(
  _input: RuntimeObserverRecursionObserveInput,
  now = Date.now(),
): boolean {
  if (now - lastThrottleAt < RUNTIME_OBSERVER_RECURSION_POLL_MS) return false;
  lastThrottleAt = now;
  return true;
}

export function observeRuntimeObserverRecursion(
  input: RuntimeObserverRecursionObserveInput,
): RuntimeObserverRecursionProfile {
  runObserverRecursionFlows(input);
  for (const entry of getObserverRecursionTimelineRecent(5)) {
    recordObserverRecursionSoakEvent(entry);
  }

  lastGraph = buildObserveGraph(input);
  lastDepGraph = buildDependencyGraph(input);
  lastHeatmap = buildRecursionHeatmap(input);
  ampTimeline.push({ at: new Date().toISOString(), level: scoreTelemetryAmplificationRisk(input) });
  if (ampTimeline.length > 48) ampTimeline.shift();

  const profile: RuntimeObserverRecursionProfile = {
    observerRecursionRisk: scoreObserverRecursionRisk(input),
    telemetryAmplificationRisk: scoreTelemetryAmplificationRisk(input),
    recursiveSignalEchoRisk: scoreRecursiveSignalEchoRisk(input),
    observeGraphComplexity: scoreObserveGraphComplexity(input),
    runtimeObserverConfidence: scoreRuntimeObserverConfidence(input),
    recursionDepthScore: scoreRecursionDepth(input),
    circularGraphScore: scoreCircularObserveGraph(input),
    governanceEchoScore: scoreGovernanceEcho(input),
    measuredAt: new Date().toISOString(),
  };

  lastProfile = profile;
  return profile;
}

export function getLastRuntimeObserverRecursionProfile(): RuntimeObserverRecursionProfile | null {
  return lastProfile;
}

export function getRuntimeObserverRecursionDashboard(): RuntimeObserverRecursionDashboard | null {
  if (!lastProfile || !lastGraph || !lastDepGraph) return null;
  return {
    titleJa: RUNTIME_OBSERVER_RECURSION_UI_JA.sectionTitle,
    safetyBannerJa: RUNTIME_OBSERVER_RECURSION_UI_JA.safety,
    profile: lastProfile,
    recursionEvolution: getRecursionEvolution(),
    recursionHeatmap: lastHeatmap,
    observeGraph: lastGraph,
    dependencyGraph: lastDepGraph,
    amplificationTimeline: [...ampTimeline],
    timelineRecent: getObserverRecursionTimelineRecent(6),
  };
}
