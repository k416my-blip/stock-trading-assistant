import type {
  RuntimeCivilizationalResilienceExportBundle,
  RuntimeCivilizationalResilienceObserveInput,
} from '../types/runtimeCivilizationalResilience';
import { RUNTIME_CIVILIZATIONAL_RESILIENCE_VERSION } from '../constants/runtimeCivilizationalResilience';
import { getLastRuntimeCivilizationalResilienceProfile } from './civilizationalResilienceCoordinator';
import { getCivilizationEvolution } from './runtimeCivilizationCoordinator';
import {
  buildRecursiveGovernanceGraph,
  scoreRecursiveGovernanceEcologyRisk,
} from './recursiveGovernanceEcologyModel';
import { scoreRuntimeUtilityMonocultureRisk } from './utilityMonocultureDetector';
import { scoreObserverEcosystemInflationRisk } from './observerEcosystemInflationMonitor';
import { scoreRuntimeOrchestrationCivilizationRisk } from './orchestrationCivilizationTracker';
import { scoreGovernanceBiodiversity } from './governanceBiodiversityAnalyzer';
import {
  detectCivilizationDriftSignals,
  scoreRuntimeCivilizationDriftRisk,
} from './longSessionCivilizationDriftEngine';
import {
  getEcologicalEvolution,
  scoreCivilizationSpread,
  scoreEcosystemPersistence,
  scoreGovernanceVariance,
  scoreUtilityDiversity,
} from './runtimeEcologicalEvolutionCoordinator';
import { getCivilizationalEcologyTimeline } from './civilizationalEcologyTimeline';

function emptyInput(): RuntimeCivilizationalResilienceObserveInput {
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
    runtimePurposeIntegrityScore: 0.85,
    runtimePurposeDriftRisk: 0.1,
    runtimeUtilityIntegrity: 0.85,
    longSessionPurposeIntegrity: 0.85,
    valueDilutionRisk: 0.1,
    runtimeCompressionEfficiency: 0.75,
    runtimeLeanStability: 0.75,
    layerConflictRisk: 0.1,
    runtimeUnifiedUtilityScore: 0.85,
    runtimeExistentialConstraintRisk: 0.1,
    crossLayerUtilityConsistency: 0.85,
    observerCivilizationRisk: 0.1,
    runtimeGovernanceInflationRisk: 0.1,
    runtimeExistentialDriftRisk: 0.1,
    runtimeUnifiedUtilityConfidence: 0.85,
  };
}

export function buildRuntimeCivilizationalResilienceExportBundle(): RuntimeCivilizationalResilienceExportBundle {
  const profile = getLastRuntimeCivilizationalResilienceProfile();
  const input = emptyInput();
  return {
    version: RUNTIME_CIVILIZATIONAL_RESILIENCE_VERSION,
    exportedAt: new Date().toISOString(),
    civilizationEcologyReport: {
      score: profile?.runtimeCivilizationScore ?? 0,
      evolution: getCivilizationEvolution(),
    },
    recursiveGovernanceAnalysis: {
      graph: buildRecursiveGovernanceGraph(input),
      risk: scoreRecursiveGovernanceEcologyRisk(input),
    },
    utilityMonocultureReport: {
      risk: scoreRuntimeUtilityMonocultureRisk(input),
      diversity: scoreUtilityDiversity(input),
    },
    observerEcosystemReport: {
      risk: scoreObserverEcosystemInflationRisk(input),
    },
    orchestrationCivilizationReport: {
      risk: scoreRuntimeOrchestrationCivilizationRisk(input),
    },
    governanceBiodiversityReport: {
      score: scoreGovernanceBiodiversity(input),
    },
    civilizationDriftReport: {
      drift: scoreRuntimeCivilizationDriftRisk(input),
      signals: detectCivilizationDriftSignals(input),
    },
    ecologicalEvolutionReport: {
      persistence: scoreEcosystemPersistence(input),
      variance: scoreGovernanceVariance(input),
      spread: scoreCivilizationSpread(input),
      evolution: getEcologicalEvolution(),
      flows: getCivilizationalEcologyTimeline(),
    },
    profile,
  };
}

export function formatRuntimeCivilizationalResilienceExportJson(): string {
  return JSON.stringify(buildRuntimeCivilizationalResilienceExportBundle(), null, 2);
}
