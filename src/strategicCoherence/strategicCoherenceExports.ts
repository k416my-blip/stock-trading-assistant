import type { StrategicCoherenceExportBundle, StrategicCoherenceObserveInput } from '../types/strategicCoherence';
import { STRATEGIC_COHERENCE_VERSION } from '../constants/strategicCoherence';
import { getLastStrategicCoherenceProfile } from './strategicCoherenceCoordinator';
import { getCoherenceHistory } from './runtimeStrategicCoherenceCoordinator';
import { buildObjectiveAlignmentGraph } from './globalObjectiveAlignmentEngine';
import { detectLayerConflicts } from './layerObjectiveConflictDetector';
import { buildUtilityEquilibriumGraph } from './runtimeUtilityEquilibriumEngine';
import { getStrategicDriftEvolution } from './runtimeObjectiveDriftDetector';
import { scoreRuntimeIntentIntegrity } from './runtimeIntentPreservationEngine';
import { buildCrossLayerConsistencyGraph } from './crossLayerStrategicConsistencyTracker';
import { getStrategicEquilibriumTimeline } from './runtimeStrategicEquilibriumEvolution';
import { getStrategicCoherenceTimeline } from './runtimeCoherenceEvolutionTimeline';

function emptyInput(): StrategicCoherenceObserveInput {
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
    runtimeHomeostasisScore: 0.85,
    equilibriumIntegrity: 0.85,
    runtimeCalmnessIndex: 0.8,
    runtimeAuditCoverage: 0.5,
    observerSuppressionLoss: 0.05,
    stabilityDriftRisk: 0.05,
  };
}

export function buildStrategicCoherenceExportBundle(): StrategicCoherenceExportBundle {
  const profile = getLastStrategicCoherenceProfile();
  const input = emptyInput();
  return {
    version: STRATEGIC_COHERENCE_VERSION,
    exportedAt: new Date().toISOString(),
    strategicCoherenceReport: {
      score: profile?.runtimeStrategicCoherence ?? 0,
      evolution: getCoherenceHistory(),
    },
    objectiveAlignmentAnalysis: { graph: buildObjectiveAlignmentGraph(input) },
    layerConflictReport: { conflicts: detectLayerConflicts(input), risk: profile?.layerConflictRisk ?? 0 },
    utilityEquilibriumAnalysis: { graph: buildUtilityEquilibriumGraph(input) },
    strategicDriftReport: { evolution: getStrategicDriftEvolution(), risk: profile?.strategicDriftRisk ?? 0 },
    runtimeIntentIntegrityReport: { integrity: scoreRuntimeIntentIntegrity(input) },
    crossLayerConsistencyReport: {
      graph: buildCrossLayerConsistencyGraph(input),
      consistency: profile?.crossLayerObjectiveConsistency ?? 0,
    },
    strategicEquilibriumEvolutionReport: {
      timeline: getStrategicEquilibriumTimeline(),
      flows: getStrategicCoherenceTimeline(),
    },
    profile,
  };
}

export function formatStrategicCoherenceExportJson(): string {
  return JSON.stringify(buildStrategicCoherenceExportBundle(), null, 2);
}
