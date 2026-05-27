import type { RuntimeSelfLimitationExportBundle, RuntimeSelfLimitationObserveInput } from '../types/runtimeSelfLimitation';
import { RUNTIME_SELF_LIMITATION_VERSION } from '../constants/runtimeSelfLimitation';
import { getLastRuntimeSelfLimitationProfile } from './selfLimitationCoordinator';
import { getSelfLimitationEvolution } from './runtimeSelfLimitationCoordinator';
import { buildMetaRecursionGraph } from './runtimeMetaRecursionDetector';
import { detectEgoSignals, scoreRuntimeEgo } from './runtimeOrchestrationEgoDetector';
import { computeStabilizationCost, scoreStabilizationBudgetPressure } from './runtimeStabilizationBudgetManager';
import { detectSelfProtectionBiases } from './runtimeSelfProtectionBiasDetector';
import { scoreObserverIdeologyLockRisk, scoreObserverRigidity } from './observerIdeologyLockDetector';
import { buildEquilibriumInflationGraph } from './recursiveEquilibriumInflationTracker';
import { getMetaBoundaryEvolution } from './runtimeMetaBoundaryCoordinator';
import { getSelfLimitationTimeline } from './selfLimitationTimeline';

function emptyInput(): RuntimeSelfLimitationObserveInput {
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
    observerOverheadRatio: 0.2,
    governanceConfidence: 1,
    runtimeSafeTradingScore: 100,
    runtimeTradingSuppression: 0,
    equilibriumScore: 1,
    metaCoordinationStability: 1,
    runtimeAmplificationRisk: 0,
    telemetryAmplificationScore: 0.15,
    runtimeEntropyScore: 0,
    loadSheddingSeverity: 0,
    runtimeEquilibriumStability: 1,
    staleHydrationRisk: 0,
    interventionDensity: 0.15,
    survivabilityEffectiveness: 0.8,
    runtimeComplexityScore: 0.2,
    simplificationIntegrity: 0.85,
    runtimeHomeostasisScore: 0.85,
    equilibriumIntegrity: 0.85,
    runtimeStrategicCoherence: 0.8,
    objectiveAlignmentScore: 0.8,
    layerConflictRisk: 0.1,
    runtimeAuditCoverage: 0.5,
    observerDensityScore: 0.2,
    orchestrationEdgeCount: 8,
    recursiveStabilizationRisk: 0.1,
    equilibriumPersistence: 0.7,
    runtimeCalmnessIndex: 0.75,
  };
}

export function buildRuntimeSelfLimitationExportBundle(): RuntimeSelfLimitationExportBundle {
  const profile = getLastRuntimeSelfLimitationProfile();
  const input = emptyInput();
  return {
    version: RUNTIME_SELF_LIMITATION_VERSION,
    exportedAt: new Date().toISOString(),
    selfLimitationReport: {
      score: profile?.runtimeSelfLimitationScore ?? 0,
      evolution: getSelfLimitationEvolution(),
    },
    recursionAnalysis: { graph: buildMetaRecursionGraph(input), risk: profile?.metaRecursionRisk ?? 0 },
    orchestrationEgoAnalysis: { signals: detectEgoSignals(input), ego: scoreRuntimeEgo(input) },
    stabilizationBudgetReport: {
      cost: computeStabilizationCost(input),
      pressure: scoreStabilizationBudgetPressure(input),
    },
    selfProtectionBiasReport: { biases: detectSelfProtectionBiases(input), score: profile?.runtimeSelfProtectionBias ?? 0 },
    observerIdeologyLockReport: {
      rigidity: scoreObserverRigidity(input),
      lockRisk: scoreObserverIdeologyLockRisk(input),
    },
    equilibriumInflationReport: { graph: buildEquilibriumInflationGraph(input) },
    metaBoundaryEvolutionReport: {
      timeline: getMetaBoundaryEvolution(),
      flows: getSelfLimitationTimeline(),
    },
    profile,
  };
}

export function formatRuntimeSelfLimitationExportJson(): string {
  return JSON.stringify(buildRuntimeSelfLimitationExportBundle(), null, 2);
}
