import type { SurvivabilityAuditExportBundle } from '../types/survivabilityAuditValidation';
import { SURVIVABILITY_AUDIT_VALIDATION_VERSION } from '../constants/survivabilityAuditValidation';
import { getLastSurvivabilityAuditProfile } from './survivabilityAuditCoordinator';
import { getEffectivenessEvolution } from './survivabilityEffectivenessAuditor';
import { detectBlindSpots } from './runtimeBlindSpotDetector';
import { detectRecoverySideEffectChain } from './recoverySideEffectDetector';
import { buildStabilizationCostGraph } from './stabilizationCostEffectivenessAnalyzer';
import { validateTradingContinuityFeatures } from './tradingContinuityIntegrityValidator';
import { getResilienceEvolution } from './runtimeResilienceScoreAuditor';
import { buildOverfittingHeatmap } from './survivabilityOverfittingDetector';
import { getAuditConfidenceTimeline } from './survivabilityAuditTimeline';

function emptyInput(): import('../types/survivabilityAuditValidation').SurvivabilityAuditObserveInput {
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
  };
}

export function buildSurvivabilityAuditExportBundle(): SurvivabilityAuditExportBundle {
  const profile = getLastSurvivabilityAuditProfile();
  const input = emptyInput();
  return {
    version: SURVIVABILITY_AUDIT_VALIDATION_VERSION,
    exportedAt: new Date().toISOString(),
    survivabilityAuditReport: {
      effectiveness: profile?.survivabilityEffectiveness ?? 0,
      coverage: profile?.runtimeAuditCoverage ?? 0,
      exportedAt: new Date().toISOString(),
    },
    blindSpotAnalysis: { gaps: detectBlindSpots(input), risk: profile?.runtimeBlindSpotRisk ?? 0 },
    recoverySideEffectReport: {
      chain: detectRecoverySideEffectChain(input),
      risk: profile?.recoverySideEffectRisk ?? 0,
    },
    stabilizationCostReport: {
      graph: buildStabilizationCostGraph(input),
      efficiency: profile?.stabilizationCostEfficiency ?? 0,
    },
    continuityValidationReport: {
      features: validateTradingContinuityFeatures(input),
      score: profile?.continuityIntegrityScore ?? 0,
    },
    resilienceEvolutionReport: getResilienceEvolution(),
    overfittingAnalysis: buildOverfittingHeatmap(input),
    runtimeAuditConfidenceReport: {
      timeline: getAuditConfidenceTimeline(),
      confidence: profile?.runtimeValidationConfidence ?? 0,
    },
    profile,
  };
}

export function formatSurvivabilityAuditExportJson(): string {
  return JSON.stringify(buildSurvivabilityAuditExportBundle(), null, 2);
}
