import { JS_STALL_FREEZE_MS, JS_STALL_WARN_MS } from '../../constants/jsThreadSchedulerStabilization';

let peakLag = 0;
let stallCount = 0;

export function resetEventLoopStallProfilerForTest(): void {
  peakLag = 0;
  stallCount = 0;
}

export function profileEventLoopStall(eventLoopLagMs: number): { lagMs: number; frozen: boolean } {
  peakLag = Math.max(peakLag, eventLoopLagMs);
  if (eventLoopLagMs >= JS_STALL_WARN_MS) stallCount += 1;
  return {
    lagMs: peakLag,
    frozen: eventLoopLagMs >= JS_STALL_FREEZE_MS,
  };
}

export function getEventLoopStallCount(): number {
  return stallCount;
}
