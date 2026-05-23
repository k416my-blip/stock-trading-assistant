/** Deterministic Replay Sequencer — ordered replay with seed. */
import { getRuntimeDeterministicSeed } from './runtimeClockAuthority';
import { tryAcquireReplaySlot, releaseReplaySlot } from './replayRaceGuard';

let replayQueueLen = 0;

export function resetDeterministicReplaySequencerForTest(): void {
  replayQueueLen = 0;
}

export function enqueueDeterministicReplay(nowMs = Date.now()): {
  allowed: boolean;
  seed: number;
  queueLen: number;
} {
  const slot = tryAcquireReplaySlot(nowMs);
  if (!slot.acquired) return { allowed: false, seed: 0, queueLen: replayQueueLen };
  replayQueueLen = Math.min(8, replayQueueLen + 1);
  return { allowed: true, seed: getRuntimeDeterministicSeed(), queueLen: replayQueueLen };
}

export function completeDeterministicReplay(): void {
  replayQueueLen = Math.max(0, replayQueueLen - 1);
  releaseReplaySlot();
}

export function getReplayQueueLength(): number {
  return replayQueueLen;
}
