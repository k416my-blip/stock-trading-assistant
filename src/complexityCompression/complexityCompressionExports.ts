import type { ComplexityCompressionExportBundle } from '../types/complexityCompression';
import { COMPLEXITY_COMPRESSION_VERSION } from '../constants/complexityCompression';
import { getLastComplexityCompressionProfile } from './complexityCompressionCoordinator';
import { estimateLayerCounts, getComplexityEvolution } from './runtimeComplexityAnalyzer';
import { detectRedundantObservers } from './observerDeduplicationEngine';
import { buildRecursiveStabilizationMap } from './recursiveStabilizationDetector';
import { scoreObserverValue } from './observerValueScoringEngine';
import { getCompressionEfficiencyTimeline } from './runtimeCompressionGovernor';
import { resolveLeanMode } from './runtimeLeanModeOrchestrator';
import { buildOrchestrationInflationGraph } from './runtimeBloatAnalyzer';
import { getEquilibriumEvolution } from './runtimeSimplificationEquilibriumCoordinator';

function emptyInput(): import('../types/complexityCompression').ComplexityCompressionObserveInput {
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
    observerDensityScore: 0,
    runtimeAuditCoverage: 0,
    survivabilityEffectiveness: 0.8,
    observerCountEstimate: 8,
    pacingLayerCount: 3,
    recoveryChainLength: 1,
    orchestrationEdgeCount: 6,
  };
}

export function buildComplexityCompressionExportBundle(): ComplexityCompressionExportBundle {
  const profile = getLastComplexityCompressionProfile();
  const input = emptyInput();
  return {
    version: COMPLEXITY_COMPRESSION_VERSION,
    exportedAt: new Date().toISOString(),
    complexityAnalysisReport: {
      evolution: getComplexityEvolution(),
      layers: estimateLayerCounts(input),
      score: profile?.runtimeComplexityScore ?? 0,
    },
    redundancyReport: { gaps: detectRedundantObservers(input), risk: profile?.observerRedundancyRisk ?? 0 },
    recursionAnalysis: { map: buildRecursiveStabilizationMap(input), risk: profile?.recursiveStabilizationRisk ?? 0 },
    observerValueReport: { score: scoreObserverValue(input), profile: profile?.observerValueScore ?? 0 },
    compressionEfficiencyReport: {
      timeline: getCompressionEfficiencyTimeline(),
      efficiency: profile?.runtimeCompressionEfficiency ?? 0,
    },
    leanModeReport: { mode: resolveLeanMode(input), stability: profile?.runtimeLeanStability ?? 0 },
    orchestrationInflationReport: {
      graph: buildOrchestrationInflationGraph(input),
      risk: profile?.orchestrationInflationRisk ?? 0,
    },
    simplificationEquilibriumReport: {
      evolution: getEquilibriumEvolution(),
      integrity: profile?.simplificationIntegrity ?? 0,
    },
    profile,
  };
}

export function formatComplexityCompressionExportJson(): string {
  return JSON.stringify(buildComplexityCompressionExportBundle(), null, 2);
}
