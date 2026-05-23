import { SOAK_TICK_STALL_MS } from '../../constants/automatedSoakRunner';
import { recordSoakTimeline } from './sessionTimelineRecorder';

let stallCount = 0;
let lastStallAt = 0;

export function resetTickStallDetectorForTest(): void {
  stallCount = 0;
  lastStallAt = 0;
}

export function observeTickStall(tickMs: number): boolean {
  if (tickMs < SOAK_TICK_STALL_MS) return false;
  stallCount += 1;
  const now = Date.now();
  if (now - lastStallAt > 30_000) {
    lastStallAt = now;
    recordSoakTimeline('tick_stall', `tick stall ${tickMs}ms`);
  }
  return true;
}

export function getTickStallFrequency(): number {
  return stallCount;
}
