import {
  BUDGET_CONSTITUTIONAL_COLLISION,
  BUDGET_CONSTITUTIONAL_CONFLICT,
  BUDGET_CONSTITUTIONAL_EMERGENCY,
  BUDGET_CONSTITUTIONAL_STABLE,
  CONFLICT_PRESSURE_COLLISION_THRESHOLD,
  CONFLICT_PRESSURE_CONFLICT_THRESHOLD,
  CONSTITUTIONAL_AUDIT_LABELS_JA,
  CONSTITUTIONAL_HEALTH_FRAGMENTED_THRESHOLD,
  EMERGENCY_PRECEDENCE_EMERGENCY_THRESHOLD,
  UNSUPPORTED_GOVERNANCE_RISK_THRESHOLD,
} from '../constants/constitutionalGovernanceSystemCoherence';
import type {
  BuildConstitutionalGovernanceInput,
  ConstitutionalAuditSnapshot,
  ConstitutionalAuditTargetId,
  ConstitutionalState,
} from '../types/constitutionalGovernanceSystemCoherence';
import type { ConstitutionalGovernancePersisted } from './constitutionalGovernanceStorage';

export type SystemCoherenceMetrics = {
  governanceHierarchyIntegrityPct: number;
  systemCoherencePct: number;
  orchestrationConsistencyPct: number;
  stateConflictPressurePct: number;
  clampCollisionRiskPct: number;
  priorityIntegrityPct: number;
  constitutionalAlignmentPct: number;
  overrideSuppressionPct: number;
  contradictionPressurePct: number;
  recursiveGovernanceRiskPct: number;
  fallbackConsistencyPct: number;
  emergencyPrecedenceIntegrityPct: number;
  constitutionalHealthPct: number;
  conflictPressurePct: number;
  precedenceIntegrityPct: number;
  systemStabilityIndexPct: number;
  unsupportedGovernanceRiskPct: number;
};

export type ConstitutionalResolution = {
  constitutionalState: ConstitutionalState;
  orchestrationBudgetMax: number;
  explanationOnlyMode: boolean;
  precedenceArbitrationActive: boolean;
  overrideFreezeActive: boolean;
  hierarchyRebuildSuggestionActive: boolean;
  constitutionalEmergencyActive: boolean;
  fallbackFreezeActive: boolean;
  constitutionalModeJa: string;
};

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function audit(
  id: ConstitutionalAuditTargetId,
  score: number,
  detail: string,
): ConstitutionalAuditSnapshot {
  return {
    id,
    labelJa: CONSTITUTIONAL_AUDIT_LABELS_JA[id],
    scorePct: clamp(score),
    detailJa: detail,
  };
}

type LayerOverrideFlags = {
  explanationOnlyCount: number;
  freezeCount: number;
  widenCount: number;
  clampCount: number;
  emergencyCount: number;
};

function collectLayerOverrideFlags(input: BuildConstitutionalGovernanceInput): LayerOverrideFlags {
  let explanationOnlyCount = 0;
  let freezeCount = 0;
  let widenCount = 0;
  let clampCount = 0;
  let emergencyCount = 0;

  if (input.governance?.finalDecision === 'avoid') emergencyCount += 1;
  if (input.systemic?.systemicEmergencySafeMode) emergencyCount += 1;
  if (input.epistemic?.explanationOnlyMode) explanationOnlyCount += 1;
  if (input.unifiedCognitiveState?.explanationOnlyMode) explanationOnlyCount += 1;
  if (input.humanIntentContinuity?.explanationOnlyMode) explanationOnlyCount += 1;
  if (input.adaptiveExploration?.explanationOnlyMode) explanationOnlyCount += 1;
  if (input.humanIntentContinuity?.semanticFreezeActive) freezeCount += 1;
  if (input.unifiedCognitiveState?.deepReasoningFreezeActive) freezeCount += 1;
  if (input.adaptiveExploration?.fallbackFreezeActive) freezeCount += 1;
  if (input.adaptiveExploration?.perspectiveWideningActive) widenCount += 1;
  if (input.humanIntentContinuity?.reinterpretationSuppressionActive) clampCount += 1;
  if ((input.humanIntentContinuity?.orchestrationDeviationPct ?? 0) >= 50) clampCount += 1;
  if (input.adaptiveExploration?.clampRelaxationSuggestionActive) widenCount += 1;

  return {
    explanationOnlyCount,
    freezeCount,
    widenCount,
    clampCount,
    emergencyCount,
  };
}

export function collectConstitutionalAuditTargets(
  metrics: SystemCoherenceMetrics,
): ConstitutionalAuditSnapshot[] {
  return [
    audit('governanceHierarchyIntegrity', metrics.governanceHierarchyIntegrityPct, 'hierarchy'),
    audit('systemCoherence', metrics.systemCoherencePct, 'coherence'),
    audit('orchestrationConsistency', metrics.orchestrationConsistencyPct, 'orchestration'),
    audit('stateConflictPressure', 100 - metrics.stateConflictPressurePct, 'conflicts'),
    audit('clampCollisionRisk', 100 - metrics.clampCollisionRiskPct, 'clamp collision'),
    audit('priorityIntegrity', metrics.priorityIntegrityPct, 'priority'),
    audit('constitutionalAlignment', metrics.constitutionalAlignmentPct, 'alignment'),
    audit('overrideSuppression', metrics.overrideSuppressionPct, 'override control'),
    audit('contradictionPressure', 100 - metrics.contradictionPressurePct, 'contradiction'),
    audit('recursiveGovernanceRisk', 100 - metrics.recursiveGovernanceRiskPct, 'recursive'),
    audit('fallbackConsistency', metrics.fallbackConsistencyPct, 'fallback'),
    audit('emergencyPrecedenceIntegrity', metrics.emergencyPrecedenceIntegrityPct, 'emergency'),
  ];
}

export function computeSystemCoherenceMetrics(
  input: BuildConstitutionalGovernanceInput,
  persisted: ConstitutionalGovernancePersisted,
): SystemCoherenceMetrics {
  const flags = collectLayerOverrideFlags(input);
  const gov = input.governance;
  const systemic = input.systemic;
  const consensus = input.consensus;
  const ep = input.epistemic;
  const intent = input.humanIntentContinuity;
  const explore = input.adaptiveExploration;
  const executive = input.unifiedCognitiveState;
  const orch = input.orchestration;
  const stability = input.stability;

  const governanceHierarchyIntegrityPct = clamp(
    (gov?.consensusScore ?? 58) * 0.45 +
      (systemic?.stabilityHealthScore ?? 55) * 0.3 +
      (consensus?.consensusHealthPct ?? 55) * 0.25 -
      flags.emergencyCount * 8,
  );

  const orchestrationConsistencyPct = clamp(
    orch
      ? (orch.orchestrationHealthScore ?? 50) * 0.7 + (100 - (orch.skippedLayerCount ?? 0) * 4) * 0.3
      : 62 - flags.clampCount * 5,
  );

  let stateConflictPressurePct = clamp(
    flags.explanationOnlyCount * 14 +
      Math.abs(flags.widenCount - flags.freezeCount) * 12 +
      flags.clampCount * 8 +
      (input.mockConflictPressureBoost ?? 0),
  );

  let clampCollisionRiskPct = clamp(
    (flags.widenCount > 0 && flags.freezeCount > 0 ? 45 : 0) +
      (intent?.semanticFreezeActive && explore?.perspectiveWideningActive ? 35 : 0) +
      (intent?.reinterpretationSuppressionActive && explore?.clampRelaxationSuggestionActive
        ? 25
        : 0) +
      (input.mockClampCollisionBoost ?? 0),
  );

  const contradictionPressurePct = clamp(
    (consensus?.contradictionRiskPct ?? 0) * 0.4 +
      (ep?.contradictionDensityPct ?? 0) * 0.35 +
      (executive?.contradictionPressurePct ?? 0) * 0.25,
  );

  const recursiveGovernanceRiskPct = clamp(
    (systemic?.recursiveRiskPct ?? systemic?.recursiveLoopRiskPct ?? 0) * 0.4 +
      (executive?.recursiveDangerPct ?? 0) * 0.35 +
      persisted.lastConflictPressurePct * 0.15 +
      flags.emergencyCount * 10,
  );

  const overrideSuppressionPct = clamp(
    85 - flags.clampCount * 6 - flags.freezeCount * 4 + flags.emergencyCount * 5,
  );

  let emergencyPrecedenceIntegrityPct = clamp(
    88 -
      flags.emergencyCount * 15 -
      (stability?.productionSnapshot.emergencyLevel ?? 0) * 12 +
      (systemic?.systemicEmergencySafeMode ? -20 : 0),
  );
  if (typeof input.mockEmergencyPrecedenceIntegrityPct === 'number') {
    emergencyPrecedenceIntegrityPct = clamp(input.mockEmergencyPrecedenceIntegrityPct);
  }

  const fallbackConsistencyPct = clamp(
    flags.explanationOnlyCount <= 1 ? 82 : 45 - flags.explanationOnlyCount * 8,
  );

  const priorityIntegrityPct = clamp(
    (overrideSuppressionPct + emergencyPrecedenceIntegrityPct + fallbackConsistencyPct) / 3,
  );

  const constitutionalAlignmentPct = clamp(
    (intent?.safeAlignmentPct ?? 60) * 0.35 +
      (ep?.epistemicHealthPct ?? 58) * 0.35 +
      governanceHierarchyIntegrityPct * 0.3,
  );

  const systemCoherencePct = clamp(
    100 -
      stateConflictPressurePct * 0.35 -
      clampCollisionRiskPct * 0.35 -
      contradictionPressurePct * 0.2 -
      recursiveGovernanceRiskPct * 0.1,
  );

  let constitutionalHealthPct = clamp(
    (governanceHierarchyIntegrityPct +
      systemCoherencePct +
      orchestrationConsistencyPct +
      constitutionalAlignmentPct) /
      4,
  );
  if (typeof input.mockConstitutionalHealthPct === 'number') {
    constitutionalHealthPct = clamp(input.mockConstitutionalHealthPct);
  }

  let conflictPressurePct = clamp(
    (stateConflictPressurePct +
      clampCollisionRiskPct +
      contradictionPressurePct +
      recursiveGovernanceRiskPct) /
      4,
  );
  if (typeof input.mockConflictPressurePct === 'number') {
    conflictPressurePct = clamp(input.mockConflictPressurePct);
  }

  const precedenceIntegrityPct = clamp(
    (priorityIntegrityPct +
      emergencyPrecedenceIntegrityPct +
      overrideSuppressionPct +
      fallbackConsistencyPct) /
      4,
  );

  const systemStabilityIndexPct = clamp(constitutionalHealthPct - conflictPressurePct);

  let unsupportedGovernanceRiskPct = clamp(
    (ep?.unsupportedClaimsPct ?? 0) * 0.35 +
      (intent?.unsupportedInferenceRiskPct ?? 0) * 0.3 +
      (explore?.unsupportedExplorationRiskPct ?? 0) * 0.25 +
      (input.mockUnsupportedGovernanceBoost ?? 0),
  );

  return {
    governanceHierarchyIntegrityPct,
    systemCoherencePct,
    orchestrationConsistencyPct,
    stateConflictPressurePct,
    clampCollisionRiskPct,
    priorityIntegrityPct,
    constitutionalAlignmentPct,
    overrideSuppressionPct,
    contradictionPressurePct,
    recursiveGovernanceRiskPct,
    fallbackConsistencyPct,
    emergencyPrecedenceIntegrityPct,
    constitutionalHealthPct,
    conflictPressurePct,
    precedenceIntegrityPct,
    systemStabilityIndexPct,
    unsupportedGovernanceRiskPct,
  };
}

export function classifyConstitutionalState(metrics: SystemCoherenceMetrics): ConstitutionalState {
  if (metrics.unsupportedGovernanceRiskPct > UNSUPPORTED_GOVERNANCE_RISK_THRESHOLD) {
    return 'CONSTITUTIONAL_UNSUPPORTED';
  }
  if (metrics.conflictPressurePct > CONFLICT_PRESSURE_COLLISION_THRESHOLD) {
    return 'CONSTITUTIONAL_COLLISION';
  }
  if (metrics.conflictPressurePct > CONFLICT_PRESSURE_CONFLICT_THRESHOLD) {
    return 'CONSTITUTIONAL_CONFLICT';
  }
  if (metrics.constitutionalHealthPct < CONSTITUTIONAL_HEALTH_FRAGMENTED_THRESHOLD) {
    return 'CONSTITUTIONAL_FRAGMENTED';
  }
  if (metrics.emergencyPrecedenceIntegrityPct < EMERGENCY_PRECEDENCE_EMERGENCY_THRESHOLD) {
    return 'CONSTITUTIONAL_EMERGENCY';
  }
  return 'CONSTITUTIONAL_STABLE';
}

export function resolveConstitutionalActions(
  state: ConstitutionalState,
  _metrics: SystemCoherenceMetrics,
): ConstitutionalResolution {
  const base: ConstitutionalResolution = {
    constitutionalState: state,
    orchestrationBudgetMax: BUDGET_CONSTITUTIONAL_STABLE,
    explanationOnlyMode: false,
    precedenceArbitrationActive: false,
    overrideFreezeActive: false,
    hierarchyRebuildSuggestionActive: false,
    constitutionalEmergencyActive: false,
    fallbackFreezeActive: false,
    constitutionalModeJa: 'constitutional stable — unified precedence',
  };

  switch (state) {
    case 'CONSTITUTIONAL_CONFLICT':
      return {
        ...base,
        orchestrationBudgetMax: BUDGET_CONSTITUTIONAL_CONFLICT,
        precedenceArbitrationActive: true,
        constitutionalModeJa: 'precedence-only arbitration',
      };
    case 'CONSTITUTIONAL_COLLISION':
      return {
        ...base,
        orchestrationBudgetMax: BUDGET_CONSTITUTIONAL_COLLISION,
        overrideFreezeActive: true,
        precedenceArbitrationActive: true,
        constitutionalModeJa: 'global override freeze',
      };
    case 'CONSTITUTIONAL_FRAGMENTED':
      return {
        ...base,
        orchestrationBudgetMax: BUDGET_CONSTITUTIONAL_CONFLICT,
        hierarchyRebuildSuggestionActive: true,
        precedenceArbitrationActive: true,
        constitutionalModeJa: 'safe hierarchy rebuild suggestion',
      };
    case 'CONSTITUTIONAL_EMERGENCY':
      return {
        ...base,
        orchestrationBudgetMax: BUDGET_CONSTITUTIONAL_EMERGENCY,
        constitutionalEmergencyActive: true,
        overrideFreezeActive: true,
        precedenceArbitrationActive: true,
        constitutionalModeJa: 'constitutional lockdown',
      };
    case 'CONSTITUTIONAL_UNSUPPORTED':
      return {
        ...base,
        orchestrationBudgetMax: BUDGET_CONSTITUTIONAL_EMERGENCY,
        explanationOnlyMode: true,
        fallbackFreezeActive: true,
        overrideFreezeActive: true,
        constitutionalModeJa: 'explanation-only fallback freeze',
      };
    default:
      return base;
  }
}
