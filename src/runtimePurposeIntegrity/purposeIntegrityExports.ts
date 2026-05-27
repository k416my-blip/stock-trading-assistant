import type {
  RuntimePurposeIntegrityExportBundle,
  RuntimePurposeIntegrityObserveInput,
} from '../types/runtimePurposeIntegrity';
import { RUNTIME_PURPOSE_INTEGRITY_VERSION } from '../constants/runtimePurposeIntegrity';
import { getLastRuntimePurposeIntegrityProfile } from './purposeIntegrityCoordinator';
import { getPurposeEvolutionTimeline } from './runtimePurposeIntegrityCoordinator';
import {
  detectPurposeDriftSignals,
  scoreRuntimePurposeDriftRisk,
} from './runtimePurposeDriftDetector';
import {
  detectStabilityAddictionSignals,
  scoreRuntimeStabilityAddiction,
  getStabilityAddictionTimeline,
} from './runtimeStabilityAddictionDetector';
import { scoreRuntimeHollowingRisk } from './runtimeOrchestrationHollowingDetector';
import {
  buildUtilityEquilibriumGraph,
  scoreRuntimeUtilityIntegrity,
  scoreUtilityEquilibriumConfidence,
} from './runtimeUtilityPreservationEngine';
import {
  getInterventionEfficiencyTimeline,
  scoreInterventionEfficiency,
  scoreUtilityPerIntervention,
} from './interventionValueEfficiencyAnalyzer';
import { scoreRuntimeGovernanceOverreachRisk, getGovernancePressureTimeline } from './governanceOverreachDetector';
import {
  getValueErosionEvolution,
  longSessionErosionFlags,
  scoreLongSessionPurposeIntegrity,
} from './longSessionValueErosionEngine';
import { getPurposeIntegrityTimeline } from './purposeIntegrityTimeline';

function emptyInput(): RuntimePurposeIntegrityObserveInput {
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
    runtimeStrategicCoherence: 0.8,
    runtimeAuditCoverage: 0.5,
    runtimeSelfLimitationScore: 0.85,
    metaRecursionRisk: 0.1,
    runtimeCalmnessIndex: 0.75,
    equilibriumPersistence: 0.7,
    orchestrationEdgeCount: 8,
    observerDensityScore: 0.2,
    objectiveAlignmentScore: 0.8,
  };
}

export function buildRuntimePurposeIntegrityExportBundle(): RuntimePurposeIntegrityExportBundle {
  const profile = getLastRuntimePurposeIntegrityProfile();
  const input = emptyInput();
  return {
    version: RUNTIME_PURPOSE_INTEGRITY_VERSION,
    exportedAt: new Date().toISOString(),
    purposeIntegrityReport: {
      score: profile?.runtimePurposeIntegrityScore ?? 0,
      evolution: getPurposeEvolutionTimeline(),
    },
    purposeDriftAnalysis: {
      signals: detectPurposeDriftSignals(input),
      risk: scoreRuntimePurposeDriftRisk(input),
    },
    stabilityAddictionReport: {
      signals: detectStabilityAddictionSignals(input),
      score: scoreRuntimeStabilityAddiction(input),
      timeline: getStabilityAddictionTimeline(),
    },
    orchestrationHollowingReport: {
      risk: scoreRuntimeHollowingRisk(input),
      edges: input.orchestrationEdgeCount,
    },
    utilityEquilibriumAnalysis: {
      graph: buildUtilityEquilibriumGraph(input),
      integrity: scoreRuntimeUtilityIntegrity(input),
      confidence: scoreUtilityEquilibriumConfidence(input),
    },
    interventionEfficiencyReport: {
      efficiency: scoreInterventionEfficiency(input),
      utilityPerIntervention: scoreUtilityPerIntervention(input),
      timeline: getInterventionEfficiencyTimeline(),
    },
    governanceOverreachReport: {
      risk: scoreRuntimeGovernanceOverreachRisk(input),
      timeline: getGovernancePressureTimeline(),
    },
    longSessionValueErosionReport: {
      integrity: scoreLongSessionPurposeIntegrity(input),
      flags: longSessionErosionFlags(input),
      evolution: getValueErosionEvolution(),
    },
    profile,
  };
}

export function formatRuntimePurposeIntegrityExportJson(): string {
  return JSON.stringify(buildRuntimePurposeIntegrityExportBundle(), null, 2);
}
