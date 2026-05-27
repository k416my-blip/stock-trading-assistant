import type {
  RuntimeUnifiedUtilityExportBundle,
  RuntimeUnifiedUtilityObserveInput,
} from '../types/runtimeUnifiedUtility';
import { RUNTIME_UNIFIED_UTILITY_VERSION } from '../constants/runtimeUnifiedUtility';
import { getLastRuntimeUnifiedUtilityProfile } from './unifiedUtilityCoordinator';
import { getUnifiedUtilityEvolution } from './runtimeUnifiedUtilityCoordinator';
import {
  detectExistentialConstraintSignals,
  scoreRuntimeExistentialConstraintRisk,
} from './runtimeExistentialConstraintModel';
import { scoreRuntimeGovernanceInflationRisk, getGovernanceInflationTimeline } from './governanceInflationTracker';
import { scoreRuntimeUtilityDistortion } from './runtimeUtilityDistortionDetector';
import {
  buildObjectiveFragmentationGraph,
  scoreObjectiveFragmentationRisk,
} from './goalFragmentationDetector';
import { scoreObserverCivilizationRisk } from './observerCivilizationRiskMonitor';
import {
  longSessionDriftFlags,
  scoreRuntimeExistentialDriftRisk,
} from './longSessionExistentialDriftEngine';
import {
  getEquilibriumEvolution,
  scorePurposeConsistency,
  scoreStrategicIntegrity,
  scoreUtilityEquilibriumVariance,
  scoreUtilityPersistence,
} from './runtimeUnifiedUtilityEvolutionCoordinator';
import { getUnifiedUtilityTimeline } from './unifiedUtilityTimeline';

function emptyInput(): RuntimeUnifiedUtilityObserveInput {
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
  };
}

export function buildRuntimeUnifiedUtilityExportBundle(): RuntimeUnifiedUtilityExportBundle {
  const profile = getLastRuntimeUnifiedUtilityProfile();
  const input = emptyInput();
  return {
    version: RUNTIME_UNIFIED_UTILITY_VERSION,
    exportedAt: new Date().toISOString(),
    unifiedUtilityReport: {
      score: profile?.runtimeUnifiedUtilityScore ?? 0,
      evolution: getUnifiedUtilityEvolution(),
    },
    existentialConstraintAnalysis: {
      signals: detectExistentialConstraintSignals(input),
      risk: scoreRuntimeExistentialConstraintRisk(input),
    },
    governanceInflationReport: {
      risk: scoreRuntimeGovernanceInflationRisk(input),
      timeline: getGovernanceInflationTimeline(),
    },
    utilityDistortionReport: {
      distortion: scoreRuntimeUtilityDistortion(input),
    },
    objectiveFragmentationReport: {
      graph: buildObjectiveFragmentationGraph(input),
      risk: scoreObjectiveFragmentationRisk(input),
    },
    observerCivilizationReport: {
      risk: scoreObserverCivilizationRisk(input),
    },
    existentialDriftReport: {
      drift: scoreRuntimeExistentialDriftRisk(input),
      flags: longSessionDriftFlags(input),
    },
    equilibriumEvolutionReport: {
      persistence: scoreUtilityPersistence(input),
      variance: scoreUtilityEquilibriumVariance(input),
      strategic: scoreStrategicIntegrity(input),
      purpose: scorePurposeConsistency(input),
      evolution: getEquilibriumEvolution(),
      flows: getUnifiedUtilityTimeline(),
    },
    profile,
  };
}

export function formatRuntimeUnifiedUtilityExportJson(): string {
  return JSON.stringify(buildRuntimeUnifiedUtilityExportBundle(), null, 2);
}
