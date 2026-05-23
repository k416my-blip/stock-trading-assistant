/**
 * Session overfit guard — minimum evidence, diversity, cooldown.
 */
import type { AdaptiveRuntimeLearningState } from '../../types/adaptiveRuntimeLearning';
import type { GovernanceRunInput, SessionOverfitSignals } from '../../types/adaptiveRuntimeGovernance';
import {
  MIN_EVIDENCE_TICKS_BEFORE_PERSIST,
  SESSION_COOLDOWN_MS,
  SHORT_SESSION_MS,
} from '../../constants/adaptiveRuntimeGovernance';

export type SessionGuardState = {
  evidenceTicks: number;
  cooldownUntilMs: number;
  thermalSpikeCount: number;
  reconnectSpikeCount: number;
};

let guardState: SessionGuardState = {
  evidenceTicks: 0,
  cooldownUntilMs: 0,
  thermalSpikeCount: 0,
  reconnectSpikeCount: 0,
};

export function resetSessionOverfitGuardForTest(): void {
  guardState = { evidenceTicks: 0, cooldownUntilMs: 0, thermalSpikeCount: 0, reconnectSpikeCount: 0 };
}

export function evaluateSessionOverfit(
  store: AdaptiveRuntimeLearningState,
  input: GovernanceRunInput,
  nowMs: number = Date.now(),
): SessionOverfitSignals {
  guardState.evidenceTicks += 1;

  const thermalNodes = input.graph.nodes.filter((n) => n.kind === 'thermal_throttle').length;
  const reconnectNodes = input.graph.nodes.filter(
    (n) => n.kind === 'reconnect_storm' || n.kind === 'reconnect_schedule',
  ).length;
  const foregroundNodes = input.graph.nodes.filter((n) => n.kind === 'resume').length;

  if (thermalNodes >= 2) guardState.thermalSpikeCount += 1;
  if (reconnectNodes >= 4) guardState.reconnectSpikeCount += 1;

  const shortSessionOverlearning =
    input.sessionElapsedMs < SHORT_SESSION_MS && store.replayCount >= 3 && guardState.evidenceTicks < MIN_EVIDENCE_TICKS_BEFORE_PERSIST;

  const temporaryThermalBias = guardState.thermalSpikeCount >= 2 && input.sessionElapsedMs < SHORT_SESSION_MS * 2;

  const reconnectAnomalyBias = guardState.reconnectSpikeCount >= 2 && store.replayCount < MIN_EVIDENCE_TICKS_BEFORE_PERSIST;

  const foregroundSpikeOverfit = foregroundNodes >= 3 && input.sessionElapsedMs < SHORT_SESSION_MS;

  const blockedPersistence =
    shortSessionOverlearning ||
    temporaryThermalBias ||
    reconnectAnomalyBias ||
    (guardState.evidenceTicks < MIN_EVIDENCE_TICKS_BEFORE_PERSIST && store.replayCount > 0);

  if (blockedPersistence) {
    guardState.cooldownUntilMs = nowMs + SESSION_COOLDOWN_MS;
  }

  return {
    shortSessionOverlearning,
    temporaryThermalBias,
    reconnectAnomalyBias,
    foregroundSpikeOverfit,
    blockedPersistence,
    cooldownUntilMs: guardState.cooldownUntilMs,
  };
}

export function shouldBlockLearningPersistence(nowMs: number = Date.now()): boolean {
  return nowMs < guardState.cooldownUntilMs;
}

export function getSessionEvidenceTicks(): number {
  return guardState.evidenceTicks;
}
