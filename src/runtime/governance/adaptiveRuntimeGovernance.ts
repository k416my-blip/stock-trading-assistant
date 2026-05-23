/**
 * Adaptive Runtime Governance & Drift Control — orchestrator.
 */
import type { AdaptiveRuntimeContext } from '../../types/adaptiveRuntimeLearning';
import type {
  AdaptiveGovernanceReport,
  AdaptiveGovernanceState,
  GovernanceRunInput,
  RedmiLongTermGovernanceReport,
} from '../../types/adaptiveRuntimeGovernance';
import { ADAPTIVE_RUNTIME_GOVERNANCE_VERSION, REDMI_NOTE_13_PRO_5G_MODEL } from '../../constants/adaptiveRuntimeGovernance';
import { computeDriftMetrics } from './adaptiveDriftEngine';
import {
  applyLowReliabilityDecay,
  scoreAllEdgeReliability,
} from './learningReliabilityScoring';
import { evaluateSessionOverfit, shouldBlockLearningPersistence } from './sessionOverfitGuard';
import { crossDeviceIsolationQuality, isolateLearningToDevice } from './deviceBiasIsolation';
import {
  applyRollback,
  getRollbackFrequency,
  getRollbackSnapshots,
  identifyRollbackCandidates,
} from './adaptiveRollbackSystem';
import { applyContradictionQuarantine, detectCausalContradictions } from './causalContradictionDetector';
import { applyLongTermDecayGovernance, countStaleOptimizations } from './longTermDecayGovernance';
import { auditSafeAdaptiveConstraints, enforceProtectedInvariants } from './safeAdaptiveConstraints';
import { buildAdaptiveGovernanceDashboard, formatGovernanceDashboardMarkdown } from './adaptiveGovernanceDashboard';
import {
  noteObservabilityRollback,
  noteObservabilityReplayDivergence,
} from '../observability/runtimeObservabilityIntegration';
import { captureRuntimeSnapshot } from '../observability/runtimeSnapshotSystem';
import { shouldSuppressRollback, noteRollbackOccurred } from '../evolution/rollbackDependencyGuard';
import { getConstitutionalDirectives } from '../constitution/runtimeConstitutionIntegration';

let lastGovernance: AdaptiveGovernanceState | null = null;
let lastDriftScore = 0;
let confidenceTrend: number[] = [];

export function resetAdaptiveGovernanceForTest(): void {
  lastGovernance = null;
  lastDriftScore = 0;
  confidenceTrend = [];
}

export function runAdaptiveGovernance(
  ctx: AdaptiveRuntimeContext,
  input: GovernanceRunInput,
): AdaptiveGovernanceReport {
  const store = ctx.store;
  const actions: string[] = [];
  const constitution = getConstitutionalDirectives();

  enforceProtectedInvariants(store);
  const safety = auditSafeAdaptiveConstraints(store);
  if (!safety.passed) {
    actions.push(`safety_audit_warnings:${safety.violations.length}`);
  }

  const { contaminationRisk } = isolateLearningToDevice(store, ctx.deviceProfile);
  const drift = computeDriftMetrics(store, input, lastDriftScore);
  lastDriftScore = drift.driftScore;

  const reliability = scoreAllEdgeReliability(store, ctx.deviceProfile);
  const decayed = applyLowReliabilityDecay(store, reliability);
  if (decayed > 0) actions.push(`low_reliability_decay:${decayed}`);

  const sessionOverfit = evaluateSessionOverfit(store, input);
  if (sessionOverfit.blockedPersistence || shouldBlockLearningPersistence()) {
    actions.push('session_overfit_cooldown');
  }

  const contradictions = detectCausalContradictions(input.graph, input.latentChain);
  let quarantinedGraph = input.graph;
  if (contradictions.length > 0) {
    actions.push(`contradictions:${contradictions.length}`);
    quarantinedGraph = applyContradictionQuarantine(input.graph, contradictions);
  }

  const rollbackCandidates = identifyRollbackCandidates(reliability);
  const suppressRollback =
    (shouldSuppressRollback() && drift.phase !== 'DRIFT_CRITICAL') ||
    (constitution.replayFreeze && drift.phase !== 'DRIFT_CRITICAL');
  const { rolledBack, restoredBaseline } = suppressRollback
    ? { rolledBack: 0, restoredBaseline: false }
    : applyRollback(store, reliability, drift.phase === 'DRIFT_CRITICAL');
  if (constitution.governanceThrottle < 1 && contradictions.length > 0) {
    actions.push(`constitutional_governance_throttle:${constitution.governanceThrottle}`);
  }
  if (rolledBack > 0 || restoredBaseline) noteRollbackOccurred();
  if (rolledBack > 0) {
    actions.push(`rollback_edges:${rolledBack}`);
    noteObservabilityRollback(`edges:${rolledBack}`);
    captureRuntimeSnapshot({
      trigger: 'rollback',
      orchestrationState: 'governance',
      queueDepth: 0,
      activeLayers: ['adaptive', 'governance'],
      driftScore: drift.driftScore,
      driftPhase: drift.phase,
    });
  }
  if (restoredBaseline) {
    actions.push('baseline_restore');
    noteObservabilityRollback('baseline_restore');
  }
  if (contradictions.length > 0) {
    noteObservabilityReplayDivergence(contradictions.length);
  }

  const longTerm = applyLongTermDecayGovernance(store);
  if (longTerm.pruned7d + longTerm.pruned30d > 0) {
    actions.push(`long_term_prune:${longTerm.pruned7d + longTerm.pruned30d}`);
  }

  const staleOptimizationCount = countStaleOptimizations(store);
  const avgRel =
    Object.values(reliability).reduce((s, r) => s + r.composite, 0) /
    Math.max(1, Object.values(reliability).length);
  confidenceTrend.push(avgRel);
  if (confidenceTrend.length > 32) confidenceTrend.shift();

  const governance: AdaptiveGovernanceState = {
    version: ADAPTIVE_RUNTIME_GOVERNANCE_VERSION,
    drift,
    edgeReliability: reliability,
    sessionOverfit,
    contradictions,
    rollbackSnapshots: getRollbackSnapshots(),
    crossDeviceContaminationRisk: contaminationRisk,
    staleOptimizationCount,
    lastGovernanceAt: new Date().toISOString(),
    sessionEvidenceTicks: sessionOverfit.blockedPersistence ? 0 : (lastGovernance?.sessionEvidenceTicks ?? 0) + 1,
    distinctDeviceProfilesSeen: [
      ...new Set([...(lastGovernance?.distinctDeviceProfilesSeen ?? []), ctx.deviceProfile]),
    ],
  };

  lastGovernance = governance;

  const dashboard = buildAdaptiveGovernanceDashboard(
    store,
    governance,
    reliability,
    contradictions,
    drift,
  );

  const redmiLongTerm =
    ctx.deviceProfile === 'redmi'
      ? buildRedmiNote13ProLongTermGovernanceReport(ctx)
      : undefined;

  return {
    version: ADAPTIVE_RUNTIME_GOVERNANCE_VERSION,
    builtAt: new Date().toISOString(),
    dashboard,
    drift,
    actionsApplied: actions,
    rollbacksPerformed: rolledBack,
    quarantinedGraph,
    redmiLongTerm,
  };
}

export function getLastGovernanceState(): AdaptiveGovernanceState | null {
  return lastGovernance;
}

export function buildRedmiNote13ProLongTermGovernanceReport(
  ctx: AdaptiveRuntimeContext,
  sessionHours = 168,
): RedmiLongTermGovernanceReport {
  const gov = lastGovernance;
  const drift = gov?.drift;
  const isolation = crossDeviceIsolationQuality(ctx.deviceProfile);
  const trend =
    confidenceTrend.length < 2
      ? 0.5
      : confidenceTrend[confidenceTrend.length - 1] - confidenceTrend[0];

  const driftStability = drift ? 1 - drift.driftScore : 0.7;
  const replayReliability = drift ? 1 - drift.replayDivergence : 0.75;
  const rollbackFrequency = getRollbackFrequency() / Math.max(1, ctx.store.replayCount);
  const staleSuppression = gov
    ? Math.min(1, gov.staleOptimizationCount / Math.max(1, Object.keys(ctx.store.edges).length))
    : 0;

  return {
    deviceModel: REDMI_NOTE_13_PRO_5G_MODEL,
    driftStability: Math.round(driftStability * 1000) / 1000,
    replayReliability: Math.round(replayReliability * 1000) / 1000,
    rollbackFrequency: Math.round(rollbackFrequency * 1000) / 1000,
    staleOptimizationSuppression: Math.round((1 - staleSuppression) * 1000) / 1000,
    adaptiveConfidenceTrend: Math.round(trend * 1000) / 1000,
    crossDeviceIsolationQuality: Math.round(isolation * 1000) / 1000,
    longSessionAdaptiveStability: Math.round((driftStability * 0.5 + replayReliability * 0.5) * 1000) / 1000,
    phase: drift?.phase ?? 'DRIFT_STABLE',
    summaryJa: `Redmi長期運用(${sessionHours}h想定): drift=${drift?.phase ?? 'STABLE'}, 隔離=${Math.round(isolation * 100)}%, rollback率=${Math.round(rollbackFrequency * 100)}%`,
  };
}

export { formatGovernanceDashboardMarkdown };
