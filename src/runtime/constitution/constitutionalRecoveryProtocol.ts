/**
 * Constitutional Recovery Protocol — crisis simplification, 45s rebalance.
 */
import type { ConstitutionalRecoveryState, ConstitutionalState, RuntimeLayerId } from '../../types/runtimeConstitution';
import { CONSTITUTIONAL_RECOVERY_DURATION_MS } from '../../constants/runtimeConstitution';

let recovery: ConstitutionalRecoveryState = {
  active: false,
  dictatorshipMode: false,
  replayFrozen: false,
  sandboxExplorationOnly: true,
  demotedLayers: [],
  startedAtMs: 0,
  rebalanceAtMs: 0,
};

export function resetConstitutionalRecoveryForTest(): void {
  recovery = {
    active: false,
    dictatorshipMode: false,
    replayFrozen: false,
    sandboxExplorationOnly: true,
    demotedLayers: [],
    startedAtMs: 0,
    rebalanceAtMs: 0,
  };
}

export function getConstitutionalRecoveryState(): ConstitutionalRecoveryState {
  return { ...recovery };
}

export function activateConstitutionalRecovery(
  state: ConstitutionalState,
  dominantLayer: RuntimeLayerId,
  nowMs = Date.now(),
): ConstitutionalRecoveryState {
  const demoted: RuntimeLayerId[] = [];
  if (dominantLayer !== 'survival') demoted.push(dominantLayer);
  if (dominantLayer !== 'governance') demoted.push('exploration', 'entropy');

  recovery = {
    active: true,
    dictatorshipMode: state === 'CONSTITUTIONAL_CRISIS',
    replayFrozen: true,
    sandboxExplorationOnly: true,
    demotedLayers: [...new Set(demoted)],
    startedAtMs: nowMs,
    rebalanceAtMs: nowMs + CONSTITUTIONAL_RECOVERY_DURATION_MS,
  };
  return { ...recovery };
}

export function tickConstitutionalRecovery(nowMs = Date.now()): boolean {
  if (!recovery.active) return false;
  if (nowMs >= recovery.rebalanceAtMs) {
    recovery = {
      active: false,
      dictatorshipMode: false,
      replayFrozen: false,
      sandboxExplorationOnly: false,
      demotedLayers: [],
      startedAtMs: 0,
      rebalanceAtMs: 0,
    };
    return true;
  }
  return false;
}
