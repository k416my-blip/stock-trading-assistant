/**
 * Runtime Semantic Phase Transition & Ontology State Shift Stability — observe-only.
 */
import type {
  RuntimeSemanticPhaseDashboard,
  RuntimeSemanticPhaseObserveInput,
  RuntimeSemanticPhaseProfile,
} from '../types/runtimeSemanticPhaseTransition';
import {
  RUNTIME_SEMANTIC_PHASE_POLL_MS,
  RUNTIME_SEMANTIC_PHASE_UI_JA,
} from '../constants/runtimeSemanticPhaseTransition';
import { buildRuntimeSemanticPhaseProfile } from './semanticPhaseScorers';
import {
  getSemanticPhaseWarningsRecent,
  recordSemanticPhaseWarnings,
  resetSemanticPhaseWarningRecorderForTest,
} from './semanticPhaseWarningRecorder';
import {
  buildOntologyRigidityHeatmap,
  buildOntologyStateTopology,
  buildObserverSynchronizationRadar,
  buildRecursiveCrystallizationGraph,
  buildSemanticCollapseMonitor,
  buildSemanticFluidDynamicsField,
  buildSemanticPhaseMap,
  buildSemanticStateTransitionTimeline,
} from './semanticPhaseVisualizations';
import { runSemanticPhaseFlows } from './semanticPhaseOrchestrator';
import { getSemanticPhaseTimelineRecent, resetSemanticPhaseTimelineForTest } from './semanticPhaseTimeline';
import {
  recordSemanticPhaseSoakEvent,
  resetSemanticPhaseSoakIntegrationForTest,
  setSemanticPhaseSoakHook,
} from './semanticPhaseSoakIntegration';

let lastProfile: RuntimeSemanticPhaseProfile | null = null;
let lastPhaseMap: ReturnType<typeof buildSemanticPhaseMap> | null = null;
let lastStateTopology: ReturnType<typeof buildOntologyStateTopology> | null = null;
let lastCrystallizationGraph: ReturnType<typeof buildRecursiveCrystallizationGraph> | null = null;
let lastFluidField: ReturnType<typeof buildSemanticFluidDynamicsField> | null = null;
let lastSyncRadar: { axis: string; value: number }[] = [];
let transitionTimeline: { at: string; velocity: number }[] = [];
let lastRigidityHeatmap: { layer: string; rigidity: number }[] = [];
let lastCollapseMonitor: { label: string; value: number }[] = [];
let lastThrottleAt = 0;

export function resetRuntimeSemanticPhaseForTest(): void {
  lastProfile = null;
  lastPhaseMap = null;
  lastStateTopology = null;
  lastCrystallizationGraph = null;
  lastFluidField = null;
  lastSyncRadar = [];
  transitionTimeline = [];
  lastRigidityHeatmap = [];
  lastCollapseMonitor = [];
  lastThrottleAt = 0;
  resetSemanticPhaseTimelineForTest();
  resetSemanticPhaseSoakIntegrationForTest();
  resetSemanticPhaseWarningRecorderForTest();
}

export function initRuntimeSemanticPhase(): void {
  lastThrottleAt = 0;
}

export function setRuntimeSemanticPhaseSoakHookEnabled(enabled: boolean): void {
  setSemanticPhaseSoakHook(enabled);
}

export function shouldRunRuntimeSemanticPhaseSample(
  _input: RuntimeSemanticPhaseObserveInput,
  now = Date.now(),
): boolean {
  if (now - lastThrottleAt < RUNTIME_SEMANTIC_PHASE_POLL_MS) return false;
  lastThrottleAt = now;
  return true;
}

export function observeRuntimeSemanticPhase(input: RuntimeSemanticPhaseObserveInput): RuntimeSemanticPhaseProfile {
  runSemanticPhaseFlows(input);
  for (const entry of getSemanticPhaseTimelineRecent(5)) {
    recordSemanticPhaseSoakEvent(entry);
  }

  const profile = buildRuntimeSemanticPhaseProfile(input);
  recordSemanticPhaseWarnings(profile);
  lastPhaseMap = buildSemanticPhaseMap(profile);
  lastStateTopology = buildOntologyStateTopology(profile);
  lastCrystallizationGraph = buildRecursiveCrystallizationGraph(profile);
  lastFluidField = buildSemanticFluidDynamicsField(profile);
  lastSyncRadar = buildObserverSynchronizationRadar(profile);
  transitionTimeline = buildSemanticStateTransitionTimeline(profile, transitionTimeline);
  lastRigidityHeatmap = buildOntologyRigidityHeatmap(profile);
  lastCollapseMonitor = buildSemanticCollapseMonitor(profile);
  lastProfile = profile;
  return profile;
}

export function getLastRuntimeSemanticPhaseProfile(): RuntimeSemanticPhaseProfile | null {
  return lastProfile;
}

export function getRuntimeSemanticPhaseDashboard(): RuntimeSemanticPhaseDashboard | null {
  if (!lastProfile || !lastPhaseMap || !lastStateTopology || !lastCrystallizationGraph || !lastFluidField) return null;
  return {
    titleJa: RUNTIME_SEMANTIC_PHASE_UI_JA.sectionTitle,
    safetyBannerJa: RUNTIME_SEMANTIC_PHASE_UI_JA.safety,
    profile: lastProfile,
    semanticPhaseMap: lastPhaseMap,
    ontologyStateTopology: lastStateTopology,
    recursiveCrystallizationGraph: lastCrystallizationGraph,
    semanticFluidDynamicsField: lastFluidField,
    observerSynchronizationRadar: lastSyncRadar,
    semanticStateTransitionTimeline: [...transitionTimeline],
    ontologyRigidityHeatmap: lastRigidityHeatmap,
    semanticCollapseMonitor: lastCollapseMonitor,
    warnings: getSemanticPhaseWarningsRecent(8),
    timelineRecent: getSemanticPhaseTimelineRecent(6),
  };
}

export function getRuntimeSemanticPhaseWarnings(): ReturnType<typeof getSemanticPhaseWarningsRecent> {
  return getSemanticPhaseWarningsRecent(12);
}
