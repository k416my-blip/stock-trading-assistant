/** Replay Race Guard — prevent concurrent replay mutations. */
import { UNIFIED_REPLAY_RACE_WINDOW_MS } from '../../constants/runtimeUnifiedOrchestrator';

let lastReplayAtMs = 0;
let replayInFlight = false;

export function resetReplayRaceGuardForTest(): void {
  lastReplayAtMs = 0;
  replayInFlight = false;
}

export function tryAcquireReplaySlot(nowMs = Date.now()): { acquired: boolean; replayRaceRisk: number } {
  if (replayInFlight) {
    return { acquired: false, replayRaceRisk: 1 };
  }
  const since = nowMs - lastReplayAtMs;
  if (since < UNIFIED_REPLAY_RACE_WINDOW_MS) {
    return {
      acquired: false,
      replayRaceRisk: Math.min(1, 1 - since / UNIFIED_REPLAY_RACE_WINDOW_MS),
    };
  }
  replayInFlight = true;
  lastReplayAtMs = nowMs;
  return { acquired: true, replayRaceRisk: 0 };
}

export function releaseReplaySlot(): void {
  replayInFlight = false;
}
