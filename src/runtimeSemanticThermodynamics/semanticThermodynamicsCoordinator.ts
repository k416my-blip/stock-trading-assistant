/**
 * Runtime Semantic Thermodynamics & Entropy Dissipation Stability — observe-only.
 */
import type {
  RuntimeSemanticThermodynamicsDashboard,
  RuntimeSemanticThermodynamicsObserveInput,
  RuntimeSemanticThermodynamicsProfile,
} from '../types/runtimeSemanticThermodynamics';
import {
  RUNTIME_SEMANTIC_THERMODYNAMICS_POLL_MS,
  RUNTIME_SEMANTIC_THERMODYNAMICS_UI_JA,
} from '../constants/runtimeSemanticThermodynamics';
import { buildRuntimeSemanticThermodynamicsProfile } from './semanticThermodynamicsScorers';
import {
  getSemanticThermodynamicsWarningsRecent,
  recordSemanticThermodynamicsWarnings,
  resetSemanticThermodynamicsWarningRecorderForTest,
} from './semanticThermodynamicsWarningRecorder';
import {
  buildEntropyDissipationFlowMap,
  buildObserverThermalSaturationGraph,
  buildOntologyTurbulenceField,
  buildReplayHeatPropagationTimeline,
  buildRuntimeHeatDeathMonitor,
  buildSemanticEntropyRadar,
  buildSemanticPressureTopology,
  buildSemanticTemperatureHeatmap,
} from './semanticThermodynamicsVisualizations';
import { runSemanticThermodynamicsFlows } from './semanticThermodynamicsOrchestrator';
import {
  getSemanticThermodynamicsTimelineRecent,
  resetSemanticThermodynamicsTimelineForTest,
} from './semanticThermodynamicsTimeline';
import {
  recordSemanticThermodynamicsSoakEvent,
  resetSemanticThermodynamicsSoakIntegrationForTest,
  setSemanticThermodynamicsSoakHook,
} from './semanticThermodynamicsSoakIntegration';

let lastProfile: RuntimeSemanticThermodynamicsProfile | null = null;
let lastTemperatureHeatmap: { layer: string; temperature: number }[] = [];
let lastTurbulenceField: ReturnType<typeof buildOntologyTurbulenceField> | null = null;
let lastEntropyRadar: { axis: string; value: number }[] = [];
let lastObserverGraph: ReturnType<typeof buildObserverThermalSaturationGraph> | null = null;
let replayHeatTimeline: { at: string; heat: number }[] = [];
let lastPressureTopology: ReturnType<typeof buildSemanticPressureTopology> | null = null;
let lastDissipationMap: ReturnType<typeof buildEntropyDissipationFlowMap> | null = null;
let lastHeatDeathMonitor: { label: string; value: number }[] = [];
let lastThrottleAt = 0;

export function resetRuntimeSemanticThermodynamicsForTest(): void {
  lastProfile = null;
  lastTemperatureHeatmap = [];
  lastTurbulenceField = null;
  lastEntropyRadar = [];
  lastObserverGraph = null;
  replayHeatTimeline = [];
  lastPressureTopology = null;
  lastDissipationMap = null;
  lastHeatDeathMonitor = [];
  lastThrottleAt = 0;
  resetSemanticThermodynamicsTimelineForTest();
  resetSemanticThermodynamicsSoakIntegrationForTest();
  resetSemanticThermodynamicsWarningRecorderForTest();
}

export function initRuntimeSemanticThermodynamics(): void {
  lastThrottleAt = 0;
}

export function setRuntimeSemanticThermodynamicsSoakHookEnabled(enabled: boolean): void {
  setSemanticThermodynamicsSoakHook(enabled);
}

export function shouldRunRuntimeSemanticThermodynamicsSample(
  _input: RuntimeSemanticThermodynamicsObserveInput,
  now = Date.now(),
): boolean {
  if (now - lastThrottleAt < RUNTIME_SEMANTIC_THERMODYNAMICS_POLL_MS) return false;
  lastThrottleAt = now;
  return true;
}

export function observeRuntimeSemanticThermodynamics(
  input: RuntimeSemanticThermodynamicsObserveInput,
): RuntimeSemanticThermodynamicsProfile {
  runSemanticThermodynamicsFlows(input);
  for (const entry of getSemanticThermodynamicsTimelineRecent(5)) {
    recordSemanticThermodynamicsSoakEvent(entry);
  }

  const profile = buildRuntimeSemanticThermodynamicsProfile(input);
  recordSemanticThermodynamicsWarnings(profile);
  lastTemperatureHeatmap = buildSemanticTemperatureHeatmap(profile);
  lastTurbulenceField = buildOntologyTurbulenceField(profile);
  lastEntropyRadar = buildSemanticEntropyRadar(profile);
  lastObserverGraph = buildObserverThermalSaturationGraph(profile);
  replayHeatTimeline = buildReplayHeatPropagationTimeline(profile, replayHeatTimeline);
  lastPressureTopology = buildSemanticPressureTopology(profile);
  lastDissipationMap = buildEntropyDissipationFlowMap(profile);
  lastHeatDeathMonitor = buildRuntimeHeatDeathMonitor(profile);
  lastProfile = profile;
  return profile;
}

export function getLastRuntimeSemanticThermodynamicsProfile(): RuntimeSemanticThermodynamicsProfile | null {
  return lastProfile;
}

export function getRuntimeSemanticThermodynamicsDashboard(): RuntimeSemanticThermodynamicsDashboard | null {
  if (!lastProfile || !lastTurbulenceField || !lastObserverGraph || !lastPressureTopology || !lastDissipationMap) return null;
  return {
    titleJa: RUNTIME_SEMANTIC_THERMODYNAMICS_UI_JA.sectionTitle,
    safetyBannerJa: RUNTIME_SEMANTIC_THERMODYNAMICS_UI_JA.safety,
    profile: lastProfile,
    semanticTemperatureHeatmap: lastTemperatureHeatmap,
    ontologyTurbulenceField: lastTurbulenceField,
    semanticEntropyRadar: lastEntropyRadar,
    observerThermalSaturationGraph: lastObserverGraph,
    replayHeatPropagationTimeline: [...replayHeatTimeline],
    semanticPressureTopology: lastPressureTopology,
    entropyDissipationFlowMap: lastDissipationMap,
    runtimeHeatDeathMonitor: lastHeatDeathMonitor,
    warnings: getSemanticThermodynamicsWarningsRecent(8),
    timelineRecent: getSemanticThermodynamicsTimelineRecent(6),
  };
}

export function getRuntimeSemanticThermodynamicsWarnings(): ReturnType<typeof getSemanticThermodynamicsWarningsRecent> {
  return getSemanticThermodynamicsWarningsRecent(12);
}
