/**
 * Runtime state reducer — single owner for STABLE → SURVIVAL transitions.
 */
import {
  ORCHESTRATOR_CRITICAL_MIN_MS,
  ORCHESTRATOR_DEGRADED_MIN_MS,
  ORCHESTRATOR_STATE_LABELS_JA,
  ORCHESTRATOR_STATE_SEVERITY,
  ORCHESTRATOR_SURVIVAL_MIN_MS,
  ORCHESTRATOR_TRANSITION_HISTORY_MAX,
  ORCHESTRATOR_UPGRADE_CONFIRM_MS,
} from '../../constants/runtimeOrchestrator';
import type {
  RuntimeOrchestratorState,
  RuntimeOrchestratorTransition,
} from '../../types/runtimeOrchestrator';
import type { RuntimeUnifiedSignals } from '../../types/runtimeKernel';

type ReducerMachine = {
  current: RuntimeOrchestratorState;
  previous: RuntimeOrchestratorState;
  enteredAt: number;
  upgradeCandidate: RuntimeOrchestratorState | null;
  upgradeCandidateSince: number;
  transitions: RuntimeOrchestratorTransition[];
  survivalActivations: number;
};

const machine: ReducerMachine = {
  current: 'STABLE',
  previous: 'STABLE',
  enteredAt: Date.now(),
  upgradeCandidate: null,
  upgradeCandidateSince: 0,
  transitions: [],
  survivalActivations: 0,
};

export function resetRuntimeReducerForTest(): void {
  machine.current = 'STABLE';
  machine.previous = 'STABLE';
  machine.enteredAt = Date.now();
  machine.upgradeCandidate = null;
  machine.upgradeCandidateSince = 0;
  machine.transitions = [];
  machine.survivalActivations = 0;
}

export function getReducerMachineState(): RuntimeOrchestratorState {
  return machine.current;
}

export function getReducerPreviousState(): RuntimeOrchestratorState {
  return machine.previous;
}

export function getReducerTransitionHistory(): RuntimeOrchestratorTransition[] {
  return [...machine.transitions];
}

export function getReducerSurvivalCount(): number {
  return machine.survivalActivations;
}

export function getReducerDwellMs(): number {
  return Date.now() - machine.enteredAt;
}

function severity(s: RuntimeOrchestratorState): number {
  return ORCHESTRATOR_STATE_SEVERITY[s];
}

function minHoldMs(state: RuntimeOrchestratorState): number {
  if (state === 'DEGRADED') return ORCHESTRATOR_DEGRADED_MIN_MS;
  if (state === 'CRITICAL') return ORCHESTRATOR_CRITICAL_MIN_MS;
  if (state === 'SURVIVAL') return ORCHESTRATOR_SURVIVAL_MIN_MS;
  return 0;
}

export function computeReducerCandidate(signals: RuntimeUnifiedSignals): RuntimeOrchestratorState {
  if (signals.forceMiuiSurvival) return 'SURVIVAL';
  if (signals.killRiskScore >= 88) return 'CRITICAL';

  const thermalBad =
    signals.thermalPressure === 'severe' ||
    signals.thermalPressure === 'critical';

  if (
    signals.miuiAggressiveReclaim &&
    (signals.memoryPressurePct >= 35 || signals.queueDepth >= 40) &&
    signals.renderFps < 12
  ) {
    return 'SURVIVAL';
  }

  if (
    signals.renderFps < 8 ||
    signals.queueDepth >= 52 ||
    signals.wsReconnectStorm ||
    signals.hydrationCascadeRiskPct >= 85 ||
    (thermalBad && signals.memoryPressurePct >= 40)
  ) {
    return 'CRITICAL';
  }

  if (
    signals.renderFps < 14 ||
    signals.queueDepth >= 32 ||
    signals.wsLatencyMs >= 200 ||
    signals.hydrationCascadeRiskPct >= 55 ||
    signals.renderSpikeCount >= 3 ||
    signals.cascadePressure >= 58
  ) {
    return 'DEGRADED';
  }

  if (
    signals.renderFps < 20 ||
    signals.queueDepth >= 18 ||
    signals.wsLatencyMs >= 120 ||
    signals.wsJitterScore >= 35 ||
    signals.memoryPressurePct >= 15 ||
    signals.renderSpikeCount >= 1
  ) {
    return 'LIGHT_PRESSURE';
  }

  return 'STABLE';
}

function recordTransition(from: RuntimeOrchestratorState, to: RuntimeOrchestratorState, reasonJa: string): void {
  if (from === to) return;
  machine.transitions.push({ at: new Date().toISOString(), from, to, reasonJa });
  if (machine.transitions.length > ORCHESTRATOR_TRANSITION_HISTORY_MAX) {
    machine.transitions.shift();
  }
  if (to === 'SURVIVAL') machine.survivalActivations += 1;
}

function applyTransition(next: RuntimeOrchestratorState, reasonJa: string): void {
  if (next === machine.current) return;
  machine.previous = machine.current;
  recordTransition(machine.current, next, reasonJa);
  machine.current = next;
  machine.enteredAt = Date.now();
  machine.upgradeCandidate = null;
  machine.upgradeCandidateSince = 0;
}

export function reduceRuntimeState(
  signals: RuntimeUnifiedSignals,
): { state: RuntimeOrchestratorState; candidate: RuntimeOrchestratorState; flapSuppressed: boolean } {
  if (signals.forceMiuiSurvival) {
    applyTransition('SURVIVAL', 'MIUI native reclaim — kernel escalation');
    return { state: machine.current, candidate: 'SURVIVAL', flapSuppressed: false };
  }

  const candidate = computeReducerCandidate(signals);
  const now = Date.now();
  const cur = machine.current;
  const curSev = severity(cur);
  const candSev = severity(candidate);

  if (candSev > curSev) {
    if (machine.upgradeCandidate !== candidate) {
      machine.upgradeCandidate = candidate;
      machine.upgradeCandidateSince = now;
      return { state: cur, candidate, flapSuppressed: true };
    }
    if (now - machine.upgradeCandidateSince < ORCHESTRATOR_UPGRADE_CONFIRM_MS) {
      return { state: cur, candidate, flapSuppressed: true };
    }
    applyTransition(candidate, `upgrade · ${ORCHESTRATOR_STATE_LABELS_JA[candidate]}`);
    return { state: machine.current, candidate, flapSuppressed: false };
  }

  machine.upgradeCandidate = null;
  machine.upgradeCandidateSince = 0;

  if (candSev < curSev) {
    const dwell = now - machine.enteredAt;
    if (dwell < minHoldMs(cur)) {
      return { state: cur, candidate, flapSuppressed: true };
    }
    applyTransition(candidate, `recovery · ${ORCHESTRATOR_STATE_LABELS_JA[candidate]}`);
    return { state: machine.current, candidate, flapSuppressed: false };
  }

  return { state: cur, candidate, flapSuppressed: false };
}

export function syncReducerToState(state: RuntimeOrchestratorState, reasonJa: string): void {
  applyTransition(state, reasonJa);
}
