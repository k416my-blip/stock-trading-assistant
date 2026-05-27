/**
 * Complexity Compression — simplification / deduplication only (no policy/recommendation changes).
 */
import type {
  CompressionGraphSnapshot,
  ComplexityCompressionDashboard,
  ComplexityCompressionObserveInput,
  ComplexityCompressionProfile,
} from '../types/complexityCompression';
import {
  COMPLEXITY_COMPRESSION_POLL_MS,
  COMPLEXITY_COMPRESSION_UI_JA,
} from '../constants/complexityCompression';
import {
  scoreRuntimeComplexity,
  getComplexityEvolution,
  resetRuntimeComplexityAnalyzerForTest,
} from './runtimeComplexityAnalyzer';
import {
  buildObserverRedundancyGraph,
  scoreObserverRedundancyRisk,
  resetObserverDeduplicationEngineForTest,
} from './observerDeduplicationEngine';
import {
  buildTelemetryAmplificationHeatmap,
  scoreTelemetryAmplificationCost,
  resetTelemetryCompressionCoordinatorForTest,
} from './telemetryCompressionCoordinator';
import {
  buildRecursiveStabilizationMap,
  scoreRecursiveStabilizationRisk,
  resetRecursiveStabilizationDetectorForTest,
} from './recursiveStabilizationDetector';
import {
  buildOrchestrationInflationGraph,
  scoreRuntimeBloat,
  scoreOrchestrationInflationRisk,
  resetRuntimeBloatAnalyzerForTest,
} from './runtimeBloatAnalyzer';
import { resetLayerRedundancyDetectorForTest } from './layerRedundancyDetector';
import { resetRuntimeSimplificationOrchestratorForTest } from './runtimeSimplificationOrchestrator';
import {
  scoreAutonomousPruningConfidence,
  resetAutonomousPruningEngineForTest,
} from './autonomousPruningEngine';
import {
  getCompressionEfficiencyTimeline,
  scoreRuntimeCompressionEfficiency,
  resetRuntimeCompressionGovernorForTest,
} from './runtimeCompressionGovernor';
import {
  buildInterventionValueDistribution,
  scoreInterventionValueDensity,
  resetInterventionValueAnalyzerForTest,
} from './interventionValueAnalyzer';
import { scoreRuntimeNoiseRatio, resetRuntimeNoiseReductionEngineForTest } from './runtimeNoiseReductionEngine';
import {
  scoreRuntimeEntropyCompressionRate,
  resetRuntimeEntropyCompressionForTest,
} from './runtimeEntropyCompression';
import { resetRecoveryDeduplicationEngineForTest } from './recoveryDeduplicationEngine';
import { scorePacingConflictDensity, resetPacingConflictCompressionForTest } from './pacingConflictCompression';
import { resetCrossLayerMergeCoordinatorForTest } from './crossLayerMergeCoordinator';
import {
  buildLeanModeTransitionGraph,
  scoreRuntimeLeanStability,
  resetRuntimeLeanModeOrchestratorForTest,
} from './runtimeLeanModeOrchestrator';
import {
  scoreObserverValue,
  resetObserverValueScoringEngineForTest,
} from './observerValueScoringEngine';
import { resetRuntimeRecursionSuppressorForTest } from './runtimeRecursionSuppressor';
import { resetAutonomousLightweightMigrationForTest } from './autonomousLightweightMigration';
import {
  getEquilibriumEvolution,
  scoreSimplificationIntegrity,
  resetRuntimeSimplificationEquilibriumCoordinatorForTest,
} from './runtimeSimplificationEquilibriumCoordinator';
import {
  getComplexityCompressionTimelineRecent,
  resetComplexityCompressionTimelineForTest,
} from './complexityCompressionTimeline';
import { runComplexityCompressionFlows } from './complexityCompressionOrchestrator';
import {
  recordComplexityCompressionSoakEvent,
  resetComplexityCompressionSoakIntegrationForTest,
  setComplexityCompressionSoakHook,
} from './complexityCompressionSoakIntegration';

let lastProfile: ComplexityCompressionProfile | null = null;
let lastRedundancyGraph: CompressionGraphSnapshot | null = null;
let lastRecursiveMap: CompressionGraphSnapshot | null = null;
let lastInflationGraph: CompressionGraphSnapshot | null = null;
let lastTelemetryHeatmap: Record<string, number> = {};
let lastLeanGraph: CompressionGraphSnapshot | null = null;
let lastInterventionDist: { label: string; value: number }[] = [];
let lastThrottleAt = 0;

export function resetComplexityCompressionForTest(): void {
  lastProfile = null;
  lastRedundancyGraph = null;
  lastRecursiveMap = null;
  lastInflationGraph = null;
  lastTelemetryHeatmap = {};
  lastLeanGraph = null;
  lastInterventionDist = [];
  lastThrottleAt = 0;
  resetRuntimeComplexityAnalyzerForTest();
  resetObserverDeduplicationEngineForTest();
  resetTelemetryCompressionCoordinatorForTest();
  resetRecursiveStabilizationDetectorForTest();
  resetRuntimeBloatAnalyzerForTest();
  resetLayerRedundancyDetectorForTest();
  resetRuntimeSimplificationOrchestratorForTest();
  resetAutonomousPruningEngineForTest();
  resetRuntimeCompressionGovernorForTest();
  resetInterventionValueAnalyzerForTest();
  resetRuntimeNoiseReductionEngineForTest();
  resetRuntimeEntropyCompressionForTest();
  resetRecoveryDeduplicationEngineForTest();
  resetPacingConflictCompressionForTest();
  resetCrossLayerMergeCoordinatorForTest();
  resetRuntimeLeanModeOrchestratorForTest();
  resetObserverValueScoringEngineForTest();
  resetRuntimeRecursionSuppressorForTest();
  resetAutonomousLightweightMigrationForTest();
  resetRuntimeSimplificationEquilibriumCoordinatorForTest();
  resetComplexityCompressionTimelineForTest();
  resetComplexityCompressionSoakIntegrationForTest();
}

export function initComplexityCompression(): void {
  lastThrottleAt = 0;
}

export function setComplexityCompressionSoakHookEnabled(enabled: boolean): void {
  setComplexityCompressionSoakHook(enabled);
}

export function shouldRunComplexityCompressionSample(
  _input: ComplexityCompressionObserveInput,
  now = Date.now(),
): boolean {
  if (now - lastThrottleAt < COMPLEXITY_COMPRESSION_POLL_MS) return false;
  lastThrottleAt = now;
  return true;
}

export function observeComplexityCompression(
  input: ComplexityCompressionObserveInput,
): ComplexityCompressionProfile {
  runComplexityCompressionFlows(input);
  for (const entry of getComplexityCompressionTimelineRecent(5)) {
    recordComplexityCompressionSoakEvent(entry);
  }

  lastRedundancyGraph = buildObserverRedundancyGraph(input);
  lastRecursiveMap = buildRecursiveStabilizationMap(input);
  lastInflationGraph = buildOrchestrationInflationGraph(input);
  lastTelemetryHeatmap = buildTelemetryAmplificationHeatmap(input);
  lastLeanGraph = buildLeanModeTransitionGraph(input);
  lastInterventionDist = buildInterventionValueDistribution(input);

  const profile: ComplexityCompressionProfile = {
    runtimeComplexityScore: scoreRuntimeComplexity(input),
    observerRedundancyRisk: scoreObserverRedundancyRisk(input),
    telemetryAmplificationCost: scoreTelemetryAmplificationCost(input),
    recursiveStabilizationRisk: scoreRecursiveStabilizationRisk(input),
    runtimeBloatScore: scoreRuntimeBloat(input),
    interventionValueDensity: scoreInterventionValueDensity(input),
    runtimeCompressionEfficiency: scoreRuntimeCompressionEfficiency(input),
    runtimeNoiseRatio: scoreRuntimeNoiseRatio(input),
    simplificationIntegrity: scoreSimplificationIntegrity(input),
    runtimeLeanStability: scoreRuntimeLeanStability(input),
    orchestrationInflationRisk: scoreOrchestrationInflationRisk(input),
    autonomousPruningConfidence: scoreAutonomousPruningConfidence(input),
    pacingConflictDensity: scorePacingConflictDensity(input),
    observerValueScore: scoreObserverValue(input),
    runtimeEntropyCompressionRate: scoreRuntimeEntropyCompressionRate(input),
    measuredAt: new Date().toISOString(),
  };

  lastProfile = profile;
  return profile;
}

export function getLastComplexityCompressionProfile(): ComplexityCompressionProfile | null {
  return lastProfile;
}

export function getComplexityCompressionDashboard(): ComplexityCompressionDashboard | null {
  if (!lastProfile || !lastRedundancyGraph || !lastRecursiveMap || !lastInflationGraph || !lastLeanGraph) {
    return null;
  }
  return {
    titleJa: COMPLEXITY_COMPRESSION_UI_JA.sectionTitle,
    safetyBannerJa: COMPLEXITY_COMPRESSION_UI_JA.safety,
    profile: lastProfile,
    complexityEvolution: getComplexityEvolution(),
    observerRedundancyGraph: lastRedundancyGraph,
    recursiveStabilizationMap: lastRecursiveMap,
    orchestrationInflationGraph: lastInflationGraph,
    telemetryAmplificationHeatmap: lastTelemetryHeatmap,
    interventionValueDistribution: lastInterventionDist,
    compressionEfficiencyTimeline: getCompressionEfficiencyTimeline(),
    leanModeTransitionGraph: lastLeanGraph,
    equilibriumEvolution: getEquilibriumEvolution(),
    timelineRecent: getComplexityCompressionTimelineRecent(6),
  };
}

export const observeComplexityCompressionSimplification = observeComplexityCompression;
export const initComplexityCompressionSimplification = initComplexityCompression;
