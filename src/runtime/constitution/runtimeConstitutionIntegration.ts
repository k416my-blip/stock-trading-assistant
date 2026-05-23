/**
 * Runtime Constitutional Coordination — final arbitration integration.
 */
import type { PerformanceCostRuntimeSnapshot } from '../../types/performanceCost';
import type { RuntimeTelemetryMetricsSnapshot } from '../../types/runtimeTelemetry';
import type {
  ConstitutionalDirectives,
  RedmiConstitutionReport,
  RuntimeConstitutionBundle,
} from '../../types/runtimeConstitution';
import { RUNTIME_CONSTITUTION_VERSION, REDMI_NOTE_13_PRO_5G, CONSTITUTION_TICK_COOLDOWN_MS } from '../../constants/runtimeConstitution';
import {
  collectLayerPressures,
  resolveConstitutionalState,
  updateConstitutionalState,
  resetConstitutionCoordinatorForTest,
  getConstitutionalState,
} from './runtimeConstitutionCoordinator';
import { detectLayerConflicts } from './layerConflictDetector';
import { balanceLayerPower } from './layerPowerBalancer';
import {
  allocateConstitutionalBudget,
  shouldEmergencyBudgetFreeze,
} from './constitutionalBudgetEngine';
import { runAdaptiveDiplomacy } from './adaptiveDiplomacyEngine';
import { predictSystemicCollapse } from './systemicCollapsePredictor';
import {
  activateConstitutionalRecovery,
  getConstitutionalRecoveryState,
  resetConstitutionalRecoveryForTest,
  tickConstitutionalRecovery,
} from './constitutionalRecoveryProtocol';
import { buildSenateDashboard, formatSenateDashboardMarkdown } from './runtimeSenateDashboard';
import { runConstitutionalSimulationSuite } from './longTermConstitutionalSimulation';
import { auditConstitutionalAction } from './protectedConstitutionalRules';
import { appendRuntimeJournalEvent } from '../observability/runtimeEventJournal';

let lastDirectives: ConstitutionalDirectives = defaultDirectives();
let lastTickAt = 0;
let lastBundle: RuntimeConstitutionBundle | null = null;

function defaultDirectives(): ConstitutionalDirectives {
  return {
    suppressRecovery: false,
    suppressExploration: false,
    suppressAsyncBurst: false,
    governanceThrottle: 1,
    replayFreeze: false,
    sandboxExplorationOnly: false,
    observabilityThrottle: 1,
    entropyCap: 1,
  };
}

export function getConstitutionalDirectives(): ConstitutionalDirectives {
  return { ...lastDirectives };
}

export function getLastConstitutionBundle(): RuntimeConstitutionBundle | null {
  return lastBundle;
}

export function resetRuntimeConstitutionForTest(): void {
  lastDirectives = defaultDirectives();
  lastTickAt = 0;
  lastBundle = null;
  resetConstitutionCoordinatorForTest();
  resetConstitutionalRecoveryForTest();
}

function buildDirectives(
  state: RuntimeConstitutionBundle['state'],
  powerBalance: RuntimeConstitutionBundle['powerBalance'],
  diplomacy: RuntimeConstitutionBundle['diplomacy'],
  collapse: RuntimeConstitutionBundle['collapse'],
  recovery: RuntimeConstitutionBundle['recovery'],
  budget: RuntimeConstitutionBundle['budget'],
): ConstitutionalDirectives {
  const d = defaultDirectives();

  if (powerBalance.suppressedLayers.includes('recovery') || collapse.recoveryMonopolizationRisk > 0.7) {
    d.suppressRecovery = true;
  }
  if (
    diplomacy.cooperativeSuppressions.includes('sandbox_exploration') ||
    recovery.sandboxExplorationOnly
  ) {
    d.sandboxExplorationOnly = true;
    d.suppressExploration = recovery.replayFrozen;
  }
  if (collapse.asyncStarvationRisk > 0.6 || powerBalance.throttles.async != null) {
    d.suppressAsyncBurst = true;
  }
  if (powerBalance.throttles.governance != null) {
    d.governanceThrottle = powerBalance.throttles.governance;
  }
  if (recovery.replayFrozen || collapse.replayCollapseRisk > 0.65) {
    d.replayFreeze = true;
  }
  if (diplomacy.cooperativeSuppressions.includes('observability_sample_throttle')) {
    d.observabilityThrottle = 0.55;
  }
  if (diplomacy.cooperativeSuppressions.includes('entropy_cap')) {
    d.entropyCap = 0.5;
  }
  if (state === 'CONSTITUTIONAL_CRISIS' || recovery.dictatorshipMode) {
    d.suppressRecovery = false;
    d.governanceThrottle = 0.85;
    d.suppressAsyncBurst = true;
    d.replayFreeze = true;
    d.sandboxExplorationOnly = true;
  }
  if (shouldEmergencyBudgetFreeze(budget.fairnessScore, collapse.civilWarRisk)) {
    d.suppressAsyncBurst = true;
    d.observabilityThrottle = Math.min(d.observabilityThrottle, 0.5);
  }

  return d;
}

export function arbitrateRuntimeConstitution(
  metrics: RuntimeTelemetryMetricsSnapshot,
  performance: PerformanceCostRuntimeSnapshot,
): RuntimeConstitutionBundle | null {
  if (!performance.appForeground) {
    lastDirectives = defaultDirectives();
    return null;
  }

  const now = Date.now();
  tickConstitutionalRecovery(now);

  const pressures = collectLayerPressures(metrics);
  const conflicts = detectLayerConflicts(pressures);
  let state = resolveConstitutionalState(pressures, conflicts.conflictSeverity);
  updateConstitutionalState(state);

  const powerBalance = balanceLayerPower(pressures);
  const budget = allocateConstitutionalBudget(pressures, powerBalance);
  const diplomacy = runAdaptiveDiplomacy(conflicts.conflicts, pressures);
  const collapse = predictSystemicCollapse(pressures, conflicts);

  let recovery = getConstitutionalRecoveryState();
  const actionsJa: string[] = [];

  if (
    (state === 'CONSTITUTIONAL_CRISIS' || state === 'UNSTABLE' || collapse.level === 'COLLAPSING') &&
    !recovery.active &&
    now - lastTickAt >= CONSTITUTION_TICK_COOLDOWN_MS
  ) {
    recovery = activateConstitutionalRecovery(state, powerBalance.dominantLayer, now);
    actionsJa.push('constitutional_recovery_activated');
    state = 'CONSTITUTIONAL_CRISIS';
    updateConstitutionalState(state);
  }

  const directives = buildDirectives(state, powerBalance, diplomacy, collapse, recovery, budget);
  lastDirectives = directives;

  if (now - lastTickAt >= CONSTITUTION_TICK_COOLDOWN_MS) {
    for (const action of actionsJa) {
      const audit = auditConstitutionalAction(action);
      if (audit.allowed) {
        appendRuntimeJournalEvent('adaptive_drift_transition', action, { tag: state });
      }
    }
    lastTickAt = now;
  }

  const partial = {
    version: RUNTIME_CONSTITUTION_VERSION,
    builtAt: new Date().toISOString(),
    state,
    pressures,
    conflicts,
    powerBalance,
    budget,
    diplomacy,
    collapse,
    recovery,
    directives,
    actionsJa,
  };

  const bundle: RuntimeConstitutionBundle = {
    ...partial,
    senate: buildSenateDashboard(partial),
  };
  lastBundle = bundle;
  return bundle;
}

export function buildRedmiNote13ProConstitutionReport(
  bundle: RuntimeConstitutionBundle,
): RedmiConstitutionReport {
  const sim90 = runConstitutionalSimulationSuite(bundle.pressures)[3];

  const equilibriumRetention = bundle.senate.equilibriumScore;
  const governanceFairness = Math.max(0, 1 - bundle.pressures.governance * bundle.directives.governanceThrottle * 0.5);
  const recoveryDominanceSuppression = bundle.directives.suppressRecovery ? 0.88 : 0.65;
  const asyncStarvationPrevention = Math.max(0, 1 - bundle.collapse.asyncStarvationRisk);
  const constitutionalStability =
    bundle.state === 'BALANCED' || bundle.state === 'TENSION' ? 0.85 : 0.55;
  const layerCooperationScore = bundle.senate.cooperationRatio;
  const systemicCollapseProbability = Math.min(
    1,
    (bundle.collapse.civilWarRisk +
      bundle.collapse.governanceDeadlockRisk +
      bundle.collapse.entropyRunawayRisk) /
      3,
  );
  const constitutionalRecoveryEffectiveness = bundle.recovery.active ? 0.9 : 0.7;
  const ninetyDayCivilizationSurvivability = Math.min(
    1,
    sim90.equilibriumRetention * 0.35 +
      sim90.monopolyPrevention * 0.25 +
      sim90.democracyStability * 0.25 +
      (1 - sim90.recoveryAddiction) * 0.15,
  );

  return {
    deviceModel: REDMI_NOTE_13_PRO_5G,
    equilibriumRetention: Math.round(equilibriumRetention * 1000) / 1000,
    governanceFairness: Math.round(governanceFairness * 1000) / 1000,
    recoveryDominanceSuppression: Math.round(recoveryDominanceSuppression * 1000) / 1000,
    asyncStarvationPrevention: Math.round(asyncStarvationPrevention * 1000) / 1000,
    constitutionalStability: Math.round(constitutionalStability * 1000) / 1000,
    layerCooperationScore: Math.round(layerCooperationScore * 1000) / 1000,
    systemicCollapseProbability: Math.round(systemicCollapseProbability * 1000) / 1000,
    constitutionalRecoveryEffectiveness: Math.round(constitutionalRecoveryEffectiveness * 1000) / 1000,
    ninetyDayCivilizationSurvivability: Math.round(ninetyDayCivilizationSurvivability * 1000) / 1000,
    summaryJa: `Redmi constitution: ${bundle.state} eq=${equilibriumRetention.toFixed(2)} 90d=${ninetyDayCivilizationSurvivability.toFixed(2)} collapse=${bundle.collapse.level}`,
  };
}

export { formatSenateDashboardMarkdown } from './runtimeSenateDashboard';
export { runConstitutionalSimulationSuite } from './longTermConstitutionalSimulation';
export { getConstitutionalState };
