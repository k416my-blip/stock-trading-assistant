import type {
  RuntimeAgencyIntegrityExportBundle,
  RuntimeAgencyIntegrityObserveInput,
} from '../types/runtimeAgencyIntegrity';
import { RUNTIME_AGENCY_INTEGRITY_VERSION } from '../constants/runtimeAgencyIntegrity';
import { getLastRuntimeAgencyIntegrityProfile } from './agencyIntegrityCoordinator';
import { getAgencyIntegrityEvolution } from './runtimeAgencyIntegrityCoordinator';
import {
  buildRecursiveAutonomyGraph,
  scoreRecursiveAutonomyInflationRisk,
} from './recursiveAutonomyInflationModel';
import {
  scoreConstraintStability,
  scoreRuntimeConstraintErosionRisk,
} from './constraintErosionMonitor';
import { scoreObserverAgencyFusionRisk } from './observerAgencyFusionDetector';
import { scoreRuntimeGovernanceAutonomyRisk } from './governanceAutonomyCreepTracker';
import { scoreRuntimeEquilibriumDependencyRisk } from './equilibriumDependencyLockDetector';
import {
  detectAutonomyDriftSignals,
  scoreRuntimeAutonomyDriftRisk,
} from './longSessionAutonomyDriftEngine';
import {
  getAgencyEvolution,
  scoreAgencyVariance,
  scoreAutonomyRigidity,
  scoreGovernancePersistence,
  scoreObserverRecursionAgency,
} from './runtimeAgencyEvolutionCoordinator';
import { getAgencyIntegrityTimeline } from './agencyIntegrityTimeline';

function emptyInput(): RuntimeAgencyIntegrityObserveInput {
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
    runtimeCivilizationScore: 0.85,
    recursiveGovernanceEcologyRisk: 0.1,
    runtimeUtilityMonocultureRisk: 0.1,
    observerEcosystemInflationRisk: 0.1,
    runtimeStabilityIdeologyRisk: 0.1,
    runtimeOrchestrationCivilizationRisk: 0.1,
    crossLayerEcologyIntegrity: 0.85,
    runtimeCivilizationDriftRisk: 0.1,
    runtimeEcologicalConfidence: 0.85,
    runtimeRealityIntegrityScore: 0.85,
    recursiveBeliefReinforcementRisk: 0.1,
    runtimeRealityDistortionRisk: 0.1,
    observerConfirmationLoopRisk: 0.1,
    runtimeEpistemologyInflationRisk: 0.1,
    runtimeEquilibriumHallucinationRisk: 0.1,
    runtimeWorldviewLockRisk: 0.1,
    crossLayerEpistemicConsistency: 0.85,
    runtimeEpistemicDriftRisk: 0.1,
    runtimeEpistemicConfidence: 0.85,
  };
}

export function buildRuntimeAgencyIntegrityExportBundle(): RuntimeAgencyIntegrityExportBundle {
  const profile = getLastRuntimeAgencyIntegrityProfile();
  const input = emptyInput();
  return {
    version: RUNTIME_AGENCY_INTEGRITY_VERSION,
    exportedAt: new Date().toISOString(),
    agencyIntegrityReport: {
      score: profile?.runtimeAgencyIntegrityScore ?? 0,
      evolution: getAgencyIntegrityEvolution(),
    },
    recursiveAutonomyAnalysis: {
      graph: buildRecursiveAutonomyGraph(input),
      risk: scoreRecursiveAutonomyInflationRisk(input),
    },
    constraintErosionReport: {
      erosion: scoreRuntimeConstraintErosionRisk(input),
      stability: scoreConstraintStability(input),
    },
    observerFusionReport: {
      fusion: scoreObserverAgencyFusionRisk(input),
      recursion: scoreObserverRecursionAgency(input),
    },
    governanceAutonomyReport: {
      autonomy: scoreRuntimeGovernanceAutonomyRisk(input),
      persistence: scoreGovernancePersistence(input),
    },
    equilibriumDependencyReport: {
      dependency: scoreRuntimeEquilibriumDependencyRisk(input),
    },
    autonomyDriftReport: {
      drift: scoreRuntimeAutonomyDriftRisk(input),
      signals: detectAutonomyDriftSignals(input),
    },
    agencyEvolutionReport: {
      variance: scoreAgencyVariance(input),
      rigidity: scoreAutonomyRigidity(input),
      evolution: getAgencyEvolution(),
      flows: getAgencyIntegrityTimeline(),
    },
    profile,
  };
}

export function formatRuntimeAgencyIntegrityExportJson(): string {
  return JSON.stringify(buildRuntimeAgencyIntegrityExportBundle(), null, 2);
}
