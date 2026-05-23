/**
 * Sandbox Evolution Replay — deterministic archived replays.
 */
import {
  archiveDeterministicReplay,
  canSandboxReplayThisTick,
  noteSandboxReplay,
} from './curiosityStorage';

export function runDeterministicSandboxReplay(
  seed: number,
  scenarioJa: string,
): { archived: boolean; outcomeJa: string } {
  if (!canSandboxReplayThisTick()) {
    return { archived: false, outcomeJa: 'replay budget exhausted' };
  }
  noteSandboxReplay();
  const outcomeJa = `deterministic outcome seed=${seed} hash=${(seed * 1103515245 + 12345) % 1000}`;
  archiveDeterministicReplay(seed, scenarioJa, outcomeJa);
  return { archived: true, outcomeJa };
}
