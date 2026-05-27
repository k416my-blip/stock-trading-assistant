import type {
  PurposeIntegrityTimelineEntry,
  RuntimePurposeIntegrityObserveInput,
} from '../types/runtimePurposeIntegrity';
import { scoreRuntimePurposeIntegrity } from './runtimePurposeIntegrityCoordinator';
import {
  detectPurposeDriftSignals,
  scoreRuntimePurposeDriftRisk,
} from './runtimePurposeDriftDetector';
import { scoreValueDilutionRisk } from './valueDilutionTracker';
import {
  detectStabilityAddictionSignals,
  scoreRuntimeStabilityAddiction,
} from './runtimeStabilityAddictionDetector';
import { scoreRuntimeHollowingRisk } from './runtimeOrchestrationHollowingDetector';
import {
  buildUtilityEquilibriumGraph,
  scoreRuntimeUtilityIntegrity,
  scoreUtilityEquilibriumConfidence,
} from './runtimeUtilityPreservationEngine';
import {
  scoreInterventionEfficiency,
  scoreUtilityPerIntervention,
} from './interventionValueEfficiencyAnalyzer';
import {
  scoreRuntimeUsefulnessDivergenceRisk,
  scoreSurvivabilityUtilitySpread,
} from './survivabilityUsefulnessDivergenceTracker';
import {
  scoreObserverOverPersistenceRisk,
  scoreObserverPurposeBalance,
} from './observerPurposeImbalanceDetector';
import { scoreRuntimeGovernanceOverreachRisk } from './governanceOverreachDetector';
import {
  longSessionErosionFlags,
  scoreLongSessionPurposeIntegrity,
  scoreValueErosion,
} from './longSessionValueErosionEngine';
import { detectAuditPersistenceSignals, scoreAuditPersistenceRisk } from './auditPersistenceMonitor';
import { scoreInterventionInflationRisk } from './interventionInflationDetector';
import { scoreEquilibriumMaintenanceBias } from './equilibriumMaintenanceBiasDetector';
import { scoreTelemetrySelfMaintenanceRisk } from './telemetrySelfMaintenanceDetector';
import { scorePurposeIntentAnchoring } from './purposeIntentAnchoringMonitor';
import { scoreUtilityContinuity } from './utilityContinuityAnalyzer';
import { scoreOrchestrationUtilitySpread } from './orchestrationUtilitySpreadTracker';
import { scorePurposeIntegrityConfidence } from './purposeIntegrityConfidenceEngine';
import { recordPurposeIntegrityTimeline } from './purposeIntegrityTimeline';

export type PurposeIntegrityFlowResult = {
  flow: PurposeIntegrityTimelineEntry['flow'];
  detailJa: string;
};

export function runPurposeIntegrityFlow(input: RuntimePurposeIntegrityObserveInput): PurposeIntegrityFlowResult {
  void scorePurposeIntentAnchoring(input);
  void scoreUtilityContinuity(input);
  void scorePurposeIntegrityConfidence(input);
  return {
    flow: 'purpose_integrity',
    detailJa: `integrity ${scoreRuntimePurposeIntegrity(input)} · utility ${input.continuityScore}`,
  };
}

export function runPurposeDriftFlow(input: RuntimePurposeIntegrityObserveInput): PurposeIntegrityFlowResult {
  const signals = detectPurposeDriftSignals(input);
  void scoreAuditPersistenceRisk(input);
  void detectAuditPersistenceSignals(input);
  return {
    flow: 'purpose_drift_detection',
    detailJa: `drift ${scoreRuntimePurposeDriftRisk(input)} · ${signals.join(',') || 'none'}`,
  };
}

export function runStabilityAddictionFlow(
  input: RuntimePurposeIntegrityObserveInput,
): PurposeIntegrityFlowResult {
  const signals = detectStabilityAddictionSignals(input);
  void scoreEquilibriumMaintenanceBias(input);
  return {
    flow: 'stability_addiction_detection',
    detailJa: `addiction ${scoreRuntimeStabilityAddiction(input)} · ${signals.join(',') || 'none'}`,
  };
}

export function runOrchestrationHollowingFlow(
  input: RuntimePurposeIntegrityObserveInput,
): PurposeIntegrityFlowResult {
  void scoreOrchestrationUtilitySpread(input);
  return {
    flow: 'orchestration_hollowing',
    detailJa: `hollowing ${scoreRuntimeHollowingRisk(input)} · edges ${input.orchestrationEdgeCount}`,
  };
}

export function runUtilityPreservationFlow(
  input: RuntimePurposeIntegrityObserveInput,
): PurposeIntegrityFlowResult {
  void buildUtilityEquilibriumGraph(input);
  return {
    flow: 'utility_preservation_equilibrium',
    detailJa: `utility ${scoreRuntimeUtilityIntegrity(input)} · confidence ${scoreUtilityEquilibriumConfidence(input)}`,
  };
}

export function runInterventionEfficiencyFlow(
  input: RuntimePurposeIntegrityObserveInput,
): PurposeIntegrityFlowResult {
  void scoreInterventionInflationRisk(input);
  return {
    flow: 'intervention_value_efficiency',
    detailJa: `efficiency ${scoreInterventionEfficiency(input)} · per ${scoreUtilityPerIntervention(input)}`,
  };
}

export function runSurvivabilityDivergenceFlow(
  input: RuntimePurposeIntegrityObserveInput,
): PurposeIntegrityFlowResult {
  return {
    flow: 'survivability_usefulness_divergence',
    detailJa: `divergence ${scoreRuntimeUsefulnessDivergenceRisk(input)} · spread ${scoreSurvivabilityUtilitySpread(input)}`,
  };
}

export function runObserverPurposeImbalanceFlow(
  input: RuntimePurposeIntegrityObserveInput,
): PurposeIntegrityFlowResult {
  void scoreTelemetrySelfMaintenanceRisk(input);
  return {
    flow: 'observer_purpose_imbalance',
    detailJa: `balance ${scoreObserverPurposeBalance(input)} · over-persist ${scoreObserverOverPersistenceRisk(input)}`,
  };
}

export function runGovernanceOverreachFlow(
  input: RuntimePurposeIntegrityObserveInput,
): PurposeIntegrityFlowResult {
  return {
    flow: 'governance_overreach',
    detailJa: `overreach ${scoreRuntimeGovernanceOverreachRisk(input)} · audit ${input.runtimeAuditCoverage}`,
  };
}

export function runLongSessionValueErosionFlow(
  input: RuntimePurposeIntegrityObserveInput,
): PurposeIntegrityFlowResult {
  const flags = longSessionErosionFlags(input);
  void scoreValueErosion(input);
  return {
    flow: 'long_session_value_erosion',
    detailJa:
      flags.length > 0
        ? flags.join(' · ')
        : `session ${input.sessionMinutes}min · integrity ${scoreLongSessionPurposeIntegrity(input)}`,
  };
}

export function runPurposeIntegrityFlows(
  input: RuntimePurposeIntegrityObserveInput,
): PurposeIntegrityFlowResult[] {
  void scoreValueDilutionRisk(input);
  const results = [
    runPurposeIntegrityFlow(input),
    runPurposeDriftFlow(input),
    runStabilityAddictionFlow(input),
    runOrchestrationHollowingFlow(input),
    runUtilityPreservationFlow(input),
    runInterventionEfficiencyFlow(input),
    runSurvivabilityDivergenceFlow(input),
    runObserverPurposeImbalanceFlow(input),
    runGovernanceOverreachFlow(input),
    runLongSessionValueErosionFlow(input),
  ];
  for (const r of results) recordPurposeIntegrityTimeline(r.flow, r.detailJa);
  return results;
}
