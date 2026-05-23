/**
 * Meta Runtime Evolution & Anti-Stagnation — integration facade.
 */
import type { PerformanceCostRuntimeSnapshot } from '../../types/performanceCost';
import type { RuntimeTelemetryMetricsSnapshot } from '../../types/runtimeTelemetry';
import type {
  RedmiEvolutionReport,
  RuntimeEvolutionBundle,
} from '../../types/runtimeEvolution';
import { RUNTIME_EVOLUTION_VERSION, REDMI_NOTE_13_PRO_5G, ENTROPY_LOW_THRESHOLD, EVOLUTION_TICK_COOLDOWN_MS } from '../../constants/runtimeEvolution';
import { getAdaptiveLearningStore } from '../analysis/adaptiveRuntimeLearningStorage';
import { getLastGovernanceState } from '../governance/adaptiveRuntimeGovernance';
import {
  collectEvolutionSignals,
  resolveEvolutionHealthState,
  updateEvolutionHealthState,
  resetRuntimeEvolutionMonitorForTest,
} from './runtimeEvolutionMonitor';
import { measureAdaptiveEntropy, restoreEntropyOnLow, resetAdaptiveEntropyEngineForTest } from './adaptiveEntropyEngine';
import { detectReplayBias, isReplayBiasCritical } from './replayBiasDetector';
import {
  evaluateRollbackDependency,
  resetRollbackDependencyGuardForTest,
  noteRollbackOccurred,
} from './rollbackDependencyGuard';
import { detectFalseStability } from './falseStabilityDetector';
import { runExplorationRecovery } from './explorationRecoveryLayer';
import { preserveAdaptiveDiversity } from './adaptiveDiversityPreserver';
import {
  resolveLongTermEvolutionPhase,
  applyRigidPhaseRemediation,
  getLongTermEvolutionPhase,
  resetLongTermEvolutionPhasesForTest,
} from './longTermEvolutionPhases';
import { auditMetaEvolutionAction, auditMetaEvolutionStore } from './metaGovernanceLayer';
import { buildEvolutionDashboard, formatEvolutionDashboardMarkdown, resetEvolutionDashboardForTest } from './evolutionDashboard';
import { runEvolutionSimulationSuite } from './longSessionEvolutionSimulation';
import { appendRuntimeJournalEvent } from '../observability/runtimeEventJournal';
import { getConstitutionalDirectives } from '../constitution/runtimeConstitutionIntegration';

let lastEvolutionTickAt = 0;
let lastJournalCompactHint = false;

export function resetRuntimeEvolutionForTest(): void {
  lastEvolutionTickAt = 0;
  lastJournalCompactHint = false;
  resetRuntimeEvolutionMonitorForTest();
  resetAdaptiveEntropyEngineForTest();
  resetRollbackDependencyGuardForTest();
  resetLongTermEvolutionPhasesForTest();
  resetEvolutionDashboardForTest();
}

export function setEvolutionJournalCompactHint(compacted: boolean): void {
  lastJournalCompactHint = compacted;
}

export function observeRuntimeEvolutionTick(
  _metrics: RuntimeTelemetryMetricsSnapshot,
  performance: PerformanceCostRuntimeSnapshot,
): RuntimeEvolutionBundle | null {
  if (!performance.appForeground) return null;

  const constitution = getConstitutionalDirectives();

  const now = Date.now();
  const store = getAdaptiveLearningStore('redmi');
  const gov = getLastGovernanceState();
  const driftScore = gov?.drift.driftScore ?? 0;

  const signals = collectEvolutionSignals(store);
  const healthState = resolveEvolutionHealthState(signals);
  updateEvolutionHealthState(healthState);

  const entropy = measureAdaptiveEntropy(store, gov?.contradictions.length ?? 0);
  const replayBias = detectReplayBias(store);
  const rollbackDependency = evaluateRollbackDependency(store, driftScore, now);
  const falseStability = detectFalseStability(signals, replayBias, entropy, lastJournalCompactHint);
  const diversity = preserveAdaptiveDiversity(store);

  const actionsJa: string[] = [];
  const shouldAct = now - lastEvolutionTickAt >= EVOLUTION_TICK_COOLDOWN_MS;

  resolveLongTermEvolutionPhase(healthState, signals, entropy);
  let exploration = runExplorationRecovery(
    store,
    entropy.entropyScore < ENTROPY_LOW_THRESHOLD || getLongTermEvolutionPhase() === 'RIGID',
  );

  if (shouldAct) {
    if (entropy.entropyScore < ENTROPY_LOW_THRESHOLD) {
      const restored = restoreEntropyOnLow(store, entropy);
      if (restored.reopened > 0) actionsJa.push(`entropy_reopen:${restored.reopened}`);
    }

    if (!constitution.suppressExploration) {
      exploration = runExplorationRecovery(
        store,
        constitution.sandboxExplorationOnly ||
          entropy.entropyScore < ENTROPY_LOW_THRESHOLD ||
          healthState === 'STAGNATING' ||
          healthState === 'OVERFITTED' ||
          getLongTermEvolutionPhase() === 'RIGID',
      );
    }
    if (exploration.dormantEdgesRevived > 0) {
      actionsJa.push(`explore_revive:${exploration.dormantEdgesRevived}`);
    }

    actionsJa.push(...applyRigidPhaseRemediation(store, entropy));

    if (isReplayBiasCritical(replayBias)) {
      const audit = auditMetaEvolutionAction('replay_diversity_injection');
      if (audit.allowed) {
        for (const rec of Object.values(store.edges)) {
          if (rec.protectedInvariant) continue;
          if (rec.runtimeLearnedWeight > 0.9) rec.runtimeLearnedWeight *= 0.88;
        }
        actionsJa.push('replay_bias_suppression');
      }
    }

    const metaAudit = auditMetaEvolutionStore(store);
    if (!metaAudit.allowed) actionsJa.push(`meta_violations:${metaAudit.violations.length}`);

    for (const action of actionsJa) {
      appendRuntimeJournalEvent('adaptive_drift_transition', action, { tag: healthState });
    }

    lastEvolutionTickAt = now;
  }

  const longTermPhase = getLongTermEvolutionPhase();

  return buildRuntimeEvolutionBundle({
    healthState,
    signals,
    entropy,
    replayBias,
    rollbackDependency,
    falseStability,
    exploration,
    diversity,
    longTermPhase,
    driftPhase: gov?.drift.phase ?? 'unknown',
    actionsJa,
  });
}

export function buildRuntimeEvolutionBundle(partial: {
  healthState: RuntimeEvolutionBundle['healthState'];
  signals: RuntimeEvolutionBundle['signals'];
  entropy: RuntimeEvolutionBundle['entropy'];
  replayBias: RuntimeEvolutionBundle['replayBias'];
  rollbackDependency: RuntimeEvolutionBundle['rollbackDependency'];
  falseStability: RuntimeEvolutionBundle['falseStability'];
  exploration: RuntimeEvolutionBundle['exploration'];
  diversity: RuntimeEvolutionBundle['diversity'];
  longTermPhase: RuntimeEvolutionBundle['longTermPhase'];
  driftPhase: RuntimeEvolutionBundle['driftPhase'];
  actionsJa: string[];
}): RuntimeEvolutionBundle {
  const base = {
    version: RUNTIME_EVOLUTION_VERSION,
    builtAt: new Date().toISOString(),
    ...partial,
  };
  return {
    ...base,
    dashboard: buildEvolutionDashboard(base),
  };
}

export function buildRedmiNote13ProEvolutionReport(
  bundle: RuntimeEvolutionBundle,
): RedmiEvolutionReport {
  const d = bundle.dashboard;
  const sim30 = runEvolutionSimulationSuite(getAdaptiveLearningStore('redmi'), bundle.driftPhase === 'unknown' ? 0.3 : 0.35)[3];

  const entropyRetention = d.entropyScore;
  const replayBiasSuppression = Math.max(0, 1 - d.replayBias);
  const adaptiveDiversity = d.adaptiveDiversity;
  const rollbackDependencyReduction = Math.max(0, 1 - d.rollbackDependency);
  const longTermStability =
    bundle.healthState === 'STABLE' || bundle.healthState === 'EVOLVING' ? 0.85 : 0.55;
  const hiddenDriftDetection = d.hiddenDriftRisk > 0.5 ? d.hiddenDriftRisk : 1 - d.hiddenDriftRisk * 0.5;
  const falseStabilityPrevention =
    bundle.falseStability.state === 'NONE' ? 0.9 : 0.65;
  const runtimeEvolutionSustainability = Math.min(
    1,
    (entropyRetention + adaptiveDiversity + replayBiasSuppression) / 3,
  );
  const explorationRecoveryEffectiveness = d.explorationRecoveryRate;
  const thirtyDayAdaptiveSurvivability = sim30
    ? Math.min(1, sim30.diversityRetention * 0.4 + sim30.entropyPreservation * 0.35 + (1 - sim30.adaptiveCollapseRisk) * 0.25)
    : 0.7;

  return {
    deviceModel: REDMI_NOTE_13_PRO_5G,
    entropyRetention: Math.round(entropyRetention * 1000) / 1000,
    replayBiasSuppression: Math.round(replayBiasSuppression * 1000) / 1000,
    adaptiveDiversity: Math.round(adaptiveDiversity * 1000) / 1000,
    rollbackDependencyReduction: Math.round(rollbackDependencyReduction * 1000) / 1000,
    longTermStability: Math.round(longTermStability * 1000) / 1000,
    hiddenDriftDetection: Math.round(hiddenDriftDetection * 1000) / 1000,
    falseStabilityPrevention: Math.round(falseStabilityPrevention * 1000) / 1000,
    runtimeEvolutionSustainability: Math.round(runtimeEvolutionSustainability * 1000) / 1000,
    explorationRecoveryEffectiveness: Math.round(explorationRecoveryEffectiveness * 1000) / 1000,
    thirtyDayAdaptiveSurvivability: Math.round(thirtyDayAdaptiveSurvivability * 1000) / 1000,
    summaryJa: `Redmi evolution: ${bundle.healthState}/${bundle.longTermPhase} entropy=${entropyRetention.toFixed(2)} 30d=${thirtyDayAdaptiveSurvivability.toFixed(2)}`,
  };
}

export { formatEvolutionDashboardMarkdown, runEvolutionSimulationSuite, noteRollbackOccurred, getLongTermEvolutionPhase };
