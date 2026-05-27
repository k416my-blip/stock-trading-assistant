/**
 * Runtime Governance Freeze & Operational Convergence Stability — observe-only final expansion layer.
 */
import {
  RUNTIME_GOVERNANCE_FREEZE_POLL_MS,
  RUNTIME_GOVERNANCE_FREEZE_UI_JA,
} from '../constants/runtimeGovernanceFreeze';
import type {
  RuntimeGovernanceFreezeDashboard,
  RuntimeGovernanceFreezeObserveInput,
  RuntimeGovernanceFreezeProfile,
} from '../types/runtimeGovernanceFreeze';
import { buildRuntimeGovernanceFreezeProfile } from './governanceFreezeScorers';
import { runGovernanceFreezeFlows } from './governanceFreezeOrchestrator';
import {
  getGovernanceFreezeSuggestionsRecent,
  recordGovernanceFreezeSuggestions,
  resetGovernanceFreezeSuggestionRecorderForTest,
} from './governanceFreezeSuggestionRecorder';
import {
  getGovernanceFreezeTimelineRecent,
  resetGovernanceFreezeTimelineForTest,
} from './governanceFreezeTimeline';
import {
  buildArchitectureConvergenceRadar,
  buildExpansionEntropyGraph,
  buildGovernanceFreezeReadinessMonitor,
  buildObservabilityCostTimeline,
  buildRecursiveExpansionTopology,
  buildRuntimeOperationalPressureHeatmap,
  buildStabilizationEquilibriumGraph,
  buildStackSaturationDashboard,
} from './governanceFreezeVisualizations';
import {
  recordGovernanceFreezeSoakEvent,
  resetGovernanceFreezeSoakIntegrationForTest,
  setGovernanceFreezeSoakHook,
} from './governanceFreezeSoakIntegration';

let lastProfile: RuntimeGovernanceFreezeProfile | null = null;
let lastEntropyGraph: ReturnType<typeof buildExpansionEntropyGraph> | null = null;
let lastConvergenceRadar: { axis: string; value: number }[] = [];
let observabilityCostTimeline: { at: string; cost: number }[] = [];
let lastPressureHeatmap: { layer: string; pressure: number }[] = [];
let lastReadinessMonitor: { label: string; value: number }[] = [];
let lastExpansionTopology: ReturnType<typeof buildRecursiveExpansionTopology> | null = null;
let lastEquilibriumGraph: ReturnType<typeof buildStabilizationEquilibriumGraph> | null = null;
let lastSaturationDashboard: { label: string; value: number }[] = [];
let lastThrottleAt = 0;

export function resetRuntimeGovernanceFreezeForTest(): void {
  lastProfile = null;
  lastEntropyGraph = null;
  lastConvergenceRadar = [];
  observabilityCostTimeline = [];
  lastPressureHeatmap = [];
  lastReadinessMonitor = [];
  lastExpansionTopology = null;
  lastEquilibriumGraph = null;
  lastSaturationDashboard = [];
  lastThrottleAt = 0;
  resetGovernanceFreezeTimelineForTest();
  resetGovernanceFreezeSoakIntegrationForTest();
  resetGovernanceFreezeSuggestionRecorderForTest();
}

export function initRuntimeGovernanceFreeze(): void {
  lastThrottleAt = 0;
}

export function setRuntimeGovernanceFreezeSoakHookEnabled(enabled: boolean): void {
  setGovernanceFreezeSoakHook(enabled);
}

export function shouldRunRuntimeGovernanceFreezeSample(
  _input: RuntimeGovernanceFreezeObserveInput,
  now = Date.now(),
): boolean {
  if (now - lastThrottleAt < RUNTIME_GOVERNANCE_FREEZE_POLL_MS) return false;
  lastThrottleAt = now;
  return true;
}

export function observeRuntimeGovernanceFreeze(
  input: RuntimeGovernanceFreezeObserveInput,
): RuntimeGovernanceFreezeProfile {
  runGovernanceFreezeFlows(input);
  for (const entry of getGovernanceFreezeTimelineRecent(5)) {
    recordGovernanceFreezeSoakEvent(entry);
  }
  const profile = buildRuntimeGovernanceFreezeProfile(input);
  recordGovernanceFreezeSuggestions(profile);
  lastEntropyGraph = buildExpansionEntropyGraph(profile);
  lastConvergenceRadar = buildArchitectureConvergenceRadar(profile);
  observabilityCostTimeline = buildObservabilityCostTimeline(profile, observabilityCostTimeline);
  lastPressureHeatmap = buildRuntimeOperationalPressureHeatmap(profile);
  lastReadinessMonitor = buildGovernanceFreezeReadinessMonitor(profile);
  lastExpansionTopology = buildRecursiveExpansionTopology(profile);
  lastEquilibriumGraph = buildStabilizationEquilibriumGraph(profile);
  lastSaturationDashboard = buildStackSaturationDashboard(profile);
  lastProfile = profile;
  return profile;
}

export function getLastRuntimeGovernanceFreezeProfile(): RuntimeGovernanceFreezeProfile | null {
  return lastProfile;
}

export function getRuntimeGovernanceFreezeDashboard(): RuntimeGovernanceFreezeDashboard | null {
  if (!lastProfile || !lastEntropyGraph || !lastExpansionTopology || !lastEquilibriumGraph) return null;
  return {
    titleJa: RUNTIME_GOVERNANCE_FREEZE_UI_JA.sectionTitle,
    safetyBannerJa: RUNTIME_GOVERNANCE_FREEZE_UI_JA.safety,
    profile: lastProfile,
    expansionEntropyGraph: lastEntropyGraph,
    architectureConvergenceRadar: lastConvergenceRadar,
    observabilityCostTimeline: [...observabilityCostTimeline],
    runtimeOperationalPressureHeatmap: lastPressureHeatmap,
    governanceFreezeReadinessMonitor: lastReadinessMonitor,
    recursiveExpansionTopology: lastExpansionTopology,
    stabilizationEquilibriumGraph: lastEquilibriumGraph,
    stackSaturationDashboard: lastSaturationDashboard,
    suggestions: getGovernanceFreezeSuggestionsRecent(8),
    timelineRecent: getGovernanceFreezeTimelineRecent(6),
  };
}

export function getRuntimeGovernanceFreezeSuggestions(): ReturnType<typeof getGovernanceFreezeSuggestionsRecent> {
  return getGovernanceFreezeSuggestionsRecent(12);
}
