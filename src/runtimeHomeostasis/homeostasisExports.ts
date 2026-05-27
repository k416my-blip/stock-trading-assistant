import type { RuntimeHomeostasisExportBundle, RuntimeHomeostasisObserveInput } from '../types/runtimeHomeostasis';
import { RUNTIME_HOMEOSTASIS_VERSION } from '../constants/runtimeHomeostasis';
import { getLastRuntimeHomeostasisProfile } from './homeostasisCoordinator';
import { getEquilibriumEvolution } from './runtimeEquilibriumEvolutionCoordinator';
import { getInterventionFatigueTimeline } from './interventionFatigueStabilizer';
import { detectDriftTypes } from './stabilityDriftDetector';
import { buildOscillationSuppressionMap } from './runtimeOscillationNeutralizer';
import { getHomeostasisTimeline } from './stabilityHomeodynamicTimeline';
import { buildCrossLayerEquilibriumGraph } from './crossLayerEquilibriumTracker';
import { resolveCalmState } from './runtimeCalmStateCoordinator';

function emptyInput(): RuntimeHomeostasisObserveInput {
  return {
    eventLoopLagMs: 0,
    renderFps: 30,
    jsHeapMb: 80,
    memoryTrendPct: 0,
    thermalState: 'none',
    appForeground: true,
    screenOff: false,
    batterySaver: false,
    miuiAggressiveReclaim: false,
    sessionMinutes: 0,
    hydrationOverlapCount: 0,
    bridgeTrafficRate: 0,
    renderStormRisk: 0,
    reconnectPerMin: 0,
    wsDuplicateCount: 0,
    heartbeatAgeMs: 0,
    recoverySuccessRate: 1,
    continuityScore: 100,
    jsSurvivalScore: 100,
    observerOverheadRatio: 0,
    governanceConfidence: 1,
    runtimeSafeTradingScore: 100,
    runtimeTradingSuppression: 0,
    equilibriumScore: 1,
    metaCoordinationStability: 1,
    runtimeAmplificationRisk: 0,
    telemetryAmplificationScore: 0,
    runtimeEntropyScore: 0,
    loadSheddingSeverity: 0,
    runtimeEquilibriumStability: 1,
    staleHydrationRisk: 0,
    interventionDensity: 0,
    survivabilityEffectiveness: 0.8,
    runtimeComplexityScore: 0.2,
    simplificationIntegrity: 0.85,
    runtimeCompressionEfficiency: 0.8,
    runtimeLeanStability: 0.85,
    recursiveStabilizationRisk: 0.1,
    runtimeAuditCoverage: 0.5,
    pacingDriftEstimate: 0.05,
    suppressionDriftEstimate: 0.05,
    compressionDriftEstimate: 0.05,
  };
}

export function buildRuntimeHomeostasisExportBundle(): RuntimeHomeostasisExportBundle {
  const profile = getLastRuntimeHomeostasisProfile();
  const input = emptyInput();
  return {
    version: RUNTIME_HOMEOSTASIS_VERSION,
    exportedAt: new Date().toISOString(),
    runtimeHomeostasisReport: {
      score: profile?.runtimeHomeostasisScore ?? 0,
      evolution: getEquilibriumEvolution(),
    },
    equilibriumAnalysis: {
      integrity: profile?.equilibriumIntegrity ?? 0,
      persistence: profile?.equilibriumPersistence ?? 0,
    },
    interventionFatigueReport: {
      timeline: getInterventionFatigueTimeline(),
      level: profile?.interventionFatigueLevel ?? 0,
    },
    stabilityDriftAnalysis: { drifts: detectDriftTypes(input), risk: profile?.stabilityDriftRisk ?? 0 },
    oscillationSuppressionReport: {
      map: buildOscillationSuppressionMap(input),
      risk: profile?.stabilizationOscillationRisk ?? 0,
    },
    homeodynamicEvolutionReport: {
      timeline: getHomeostasisTimeline(),
      harmony: profile?.runtimeHarmonyIndex ?? 0,
    },
    crossLayerEquilibriumReport: {
      graph: buildCrossLayerEquilibriumGraph(input),
      consistency: profile?.crossLayerStabilityConsistency ?? 0,
    },
    runtimeCalmStateReport: {
      state: resolveCalmState(input),
      calmness: profile?.runtimeCalmnessIndex ?? 0,
    },
    profile,
  };
}

export function formatRuntimeHomeostasisExportJson(): string {
  return JSON.stringify(buildRuntimeHomeostasisExportBundle(), null, 2);
}
