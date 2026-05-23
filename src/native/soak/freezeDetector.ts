import type { SoakFreezeEvent } from '../../types/automatedSoakRunner';
import { SOAK_FREEZE_STALL_MS } from '../../constants/automatedSoakRunner';
import { observeAnrRisk } from '../runtime/anrPreventionLayer';
import { recordSoakTimeline } from './sessionTimelineRecorder';

const freezeEvents: SoakFreezeEvent[] = [];
let freezeDurationTotal = 0;

export function resetFreezeDetectorForTest(): void {
  freezeEvents.length = 0;
  freezeDurationTotal = 0;
}

export function observeFreeze(jsStallMs: number): SoakFreezeEvent | null {
  const anr = observeAnrRisk();
  const stall = Math.max(jsStallMs, anr.eventLoopStallMs, anr.renderFreezeMs);
  if (stall < SOAK_FREEZE_STALL_MS) return null;
  const evt: SoakFreezeEvent = {
    at: new Date().toISOString(),
    durationMs: stall,
    jsStallMs: stall,
    detailJa: `UI freeze detected · stall ${stall}ms`,
  };
  freezeEvents.push(evt);
  if (freezeEvents.length > 100) freezeEvents.shift();
  freezeDurationTotal += stall;
  recordSoakTimeline('freeze', evt.detailJa);
  return evt;
}

export function getFreezeEvents(): SoakFreezeEvent[] {
  return [...freezeEvents];
}

export function getFreezeEventsRecent(limit = 5): SoakFreezeEvent[] {
  return freezeEvents.slice(-limit);
}

export function getFreezeDurationTotalMs(): number {
  return freezeDurationTotal;
}
