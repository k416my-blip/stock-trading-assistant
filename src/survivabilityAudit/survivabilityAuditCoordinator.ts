/**
 * Survivability Audit & Validation — observability only (no policy/recommendation changes).
 */
import type {
  AuditGraphSnapshot,
  SurvivabilityAuditDashboard,
  SurvivabilityAuditObserveInput,
  SurvivabilityAuditProfile,
} from '../types/survivabilityAuditValidation';
import {
  SURVIVABILITY_AUDIT_POLL_MS,
  SURVIVABILITY_AUDIT_UI_JA,
} from '../constants/survivabilityAuditValidation';
import {
  scoreSurvivabilityEffectiveness,
  getEffectivenessEvolution,
  resetSurvivabilityEffectivenessAuditorForTest,
} from './survivabilityEffectivenessAuditor';
import { buildBlindSpotMap, scoreRuntimeBlindSpotRisk, resetRuntimeBlindSpotDetectorForTest } from './runtimeBlindSpotDetector';
import { scoreObserverSuppressionLoss, resetObserverSuppressionValidatorForTest } from './observerSuppressionValidator';
import { resetRecoveryEffectivenessValidatorForTest } from './recoveryEffectivenessValidator';
import {
  scoreRuntimeAuditCoverage,
  scoreRuntimeAuditConsistency,
  resetRuntimeInterventionAuditorForTest,
} from './runtimeInterventionAuditor';
import { scoreTelemetryCoverageIntegrity, resetTelemetryCoverageVerifierForTest } from './telemetryCoverageVerifier';
import { scorePacingIntegrity, resetRuntimePacingAuditEngineForTest } from './runtimePacingAuditEngine';
import {
  buildStabilizationCostGraph,
  scoreStabilizationCostEfficiency,
  resetStabilizationCostEffectivenessAnalyzerForTest,
} from './stabilizationCostEffectivenessAnalyzer';
import { resetRuntimeDegradationDriftAuditorForTest } from './runtimeDegradationDriftAuditor';
import { resetCrossLayerSurvivabilityValidatorForTest } from './crossLayerSurvivabilityValidator';
import { resetRuntimeContinuityVerifierForTest } from './runtimeContinuityVerifier';
import {
  detectRecoverySideEffectChain,
  scoreRecoverySideEffectRisk,
  resetRecoverySideEffectDetectorForTest,
} from './recoverySideEffectDetector';
import { resetRuntimeObservabilityIntegrityCheckerForTest } from './runtimeObservabilityIntegrityChecker';
import { resetRuntimeEntropyAuditEngineForTest } from './runtimeEntropyAuditEngine';
import {
  buildOverfittingHeatmap,
  scoreSurvivabilityOverfittingRisk,
  resetSurvivabilityOverfittingDetectorForTest,
} from './survivabilityOverfittingDetector';
import { scoreRuntimeEquilibriumIntegrity, resetRuntimeEquilibriumValidatorForTest } from './runtimeEquilibriumValidator';
import {
  getContinuityIntegrityTimeline,
  scoreContinuityIntegrity,
  resetTradingContinuityIntegrityValidatorForTest,
} from './tradingContinuityIntegrityValidator';
import {
  scoreRuntimeResilience,
  getResilienceEvolution,
  resetRuntimeResilienceScoreAuditorForTest,
} from './runtimeResilienceScoreAuditor';
import { scoreLongSessionStabilityIntegrity, resetLongSessionSurvivabilityAuditorForTest } from './longSessionSurvivabilityAuditor';
import { resetRuntimeAuditOrchestrationCoordinatorForTest } from './runtimeAuditOrchestrationCoordinator';
import {
  getAuditConfidenceTimeline,
  getSurvivabilityAuditTimelineRecent,
  noteAuditConfidence,
  resetSurvivabilityAuditTimelineForTest,
  scoreRuntimeValidationConfidence,
} from './survivabilityAuditTimeline';
import { runSurvivabilityAuditFlows } from './survivabilityAuditOrchestrator';
import {
  recordSurvivabilityAuditSoakEvent,
  resetSurvivabilityAuditSoakIntegrationForTest,
  setSurvivabilityAuditSoakHook,
} from './survivabilityAuditSoakIntegration';

let lastProfile: SurvivabilityAuditProfile | null = null;
let lastBlindSpotMap: AuditGraphSnapshot | null = null;
let lastStabilizationGraph: AuditGraphSnapshot | null = null;
let lastRecoveryChain: string[] = [];
let lastOverfittingHeatmap: Record<string, number> = {};
let lastThrottleAt = 0;

export function resetSurvivabilityAuditForTest(): void {
  lastProfile = null;
  lastBlindSpotMap = null;
  lastStabilizationGraph = null;
  lastRecoveryChain = [];
  lastOverfittingHeatmap = {};
  lastThrottleAt = 0;
  resetSurvivabilityEffectivenessAuditorForTest();
  resetRuntimeBlindSpotDetectorForTest();
  resetObserverSuppressionValidatorForTest();
  resetRecoveryEffectivenessValidatorForTest();
  resetRuntimeInterventionAuditorForTest();
  resetTelemetryCoverageVerifierForTest();
  resetRuntimePacingAuditEngineForTest();
  resetStabilizationCostEffectivenessAnalyzerForTest();
  resetRuntimeDegradationDriftAuditorForTest();
  resetCrossLayerSurvivabilityValidatorForTest();
  resetRuntimeContinuityVerifierForTest();
  resetRecoverySideEffectDetectorForTest();
  resetRuntimeObservabilityIntegrityCheckerForTest();
  resetRuntimeEntropyAuditEngineForTest();
  resetSurvivabilityOverfittingDetectorForTest();
  resetRuntimeEquilibriumValidatorForTest();
  resetTradingContinuityIntegrityValidatorForTest();
  resetRuntimeResilienceScoreAuditorForTest();
  resetLongSessionSurvivabilityAuditorForTest();
  resetRuntimeAuditOrchestrationCoordinatorForTest();
  resetSurvivabilityAuditTimelineForTest();
  resetSurvivabilityAuditSoakIntegrationForTest();
}

export function initSurvivabilityAudit(): void {
  lastThrottleAt = 0;
}

export function setSurvivabilityAuditSoakHookEnabled(enabled: boolean): void {
  setSurvivabilityAuditSoakHook(enabled);
}

export function shouldRunSurvivabilityAuditSample(
  _input: SurvivabilityAuditObserveInput,
  now = Date.now(),
): boolean {
  if (now - lastThrottleAt < SURVIVABILITY_AUDIT_POLL_MS) return false;
  lastThrottleAt = now;
  return true;
}

export function observeSurvivabilityAudit(input: SurvivabilityAuditObserveInput): SurvivabilityAuditProfile {
  const effectiveness = scoreSurvivabilityEffectiveness(input);
  runSurvivabilityAuditFlows(input, effectiveness);
  for (const entry of getSurvivabilityAuditTimelineRecent(5)) {
    recordSurvivabilityAuditSoakEvent(entry);
  }

  const coverage = scoreRuntimeAuditCoverage(input);
  const consistency = scoreRuntimeAuditConsistency();
  const validationConfidence = scoreRuntimeValidationConfidence(effectiveness, coverage, consistency);
  noteAuditConfidence(validationConfidence);

  lastBlindSpotMap = buildBlindSpotMap(input);
  lastStabilizationGraph = buildStabilizationCostGraph(input);
  lastRecoveryChain = detectRecoverySideEffectChain(input);
  lastOverfittingHeatmap = buildOverfittingHeatmap(input);

  const profile: SurvivabilityAuditProfile = {
    survivabilityEffectiveness: effectiveness,
    runtimeBlindSpotRisk: scoreRuntimeBlindSpotRisk(input),
    observerSuppressionLoss: scoreObserverSuppressionLoss(input),
    recoverySideEffectRisk: scoreRecoverySideEffectRisk(input),
    runtimeAuditCoverage: coverage,
    stabilizationCostEfficiency: scoreStabilizationCostEfficiency(input),
    survivabilityOverfittingRisk: scoreSurvivabilityOverfittingRisk(input),
    runtimeEquilibriumIntegrity: scoreRuntimeEquilibriumIntegrity(input),
    continuityIntegrityScore: scoreContinuityIntegrity(input),
    runtimeResilienceScore: scoreRuntimeResilience(input),
    runtimeValidationConfidence: validationConfidence,
    runtimeAuditConsistency: consistency,
    pacingIntegrityScore: scorePacingIntegrity(input),
    telemetryCoverageIntegrity: scoreTelemetryCoverageIntegrity(input),
    longSessionStabilityIntegrity: scoreLongSessionStabilityIntegrity(input),
    measuredAt: new Date().toISOString(),
  };

  lastProfile = profile;
  return profile;
}

export function getLastSurvivabilityAuditProfile(): SurvivabilityAuditProfile | null {
  return lastProfile;
}

export function getSurvivabilityAuditDashboard(): SurvivabilityAuditDashboard | null {
  if (!lastProfile || !lastBlindSpotMap || !lastStabilizationGraph) return null;
  return {
    titleJa: SURVIVABILITY_AUDIT_UI_JA.sectionTitle,
    safetyBannerJa: SURVIVABILITY_AUDIT_UI_JA.safety,
    profile: lastProfile,
    effectivenessEvolution: getEffectivenessEvolution(),
    blindSpotMap: lastBlindSpotMap,
    recoverySideEffectChain: lastRecoveryChain,
    stabilizationCostGraph: lastStabilizationGraph,
    continuityIntegrityTimeline: getContinuityIntegrityTimeline(),
    resilienceEvolution: getResilienceEvolution(),
    auditConfidenceTimeline: getAuditConfidenceTimeline(),
    overfittingHeatmap: lastOverfittingHeatmap,
    timelineRecent: getSurvivabilityAuditTimelineRecent(6),
  };
}

export const observeSurvivabilityAuditValidation = observeSurvivabilityAudit;
export const initSurvivabilityAuditValidation = initSurvivabilityAudit;
