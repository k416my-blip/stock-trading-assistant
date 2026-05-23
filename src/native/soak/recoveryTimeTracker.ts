import type { SoakRecoveryEvent } from '../../types/automatedSoakRunner';
import { recordSoakTimeline } from './sessionTimelineRecorder';

const recoveryEvents: SoakRecoveryEvent[] = [];
const pending: Partial<Record<SoakRecoveryEvent['kind'], number>> = {};

export function resetRecoveryTimeTrackerForTest(): void {
  recoveryEvents.length = 0;
  for (const k of Object.keys(pending)) delete pending[k as SoakRecoveryEvent['kind']];
}

export function beginRecovery(kind: SoakRecoveryEvent['kind']): void {
  pending[kind] = Date.now();
}

export function completeRecovery(kind: SoakRecoveryEvent['kind'], success: boolean, detailJa: string): SoakRecoveryEvent | null {
  const started = pending[kind];
  if (!started) return null;
  delete pending[kind];
  const durationMs = Date.now() - started;
  const evt: SoakRecoveryEvent = {
    at: new Date().toISOString(),
    kind,
    success,
    durationMs,
    detailJa,
  };
  recoveryEvents.push(evt);
  if (recoveryEvents.length > 200) recoveryEvents.shift();
  recordSoakTimeline('recovery', `${kind} ${success ? 'ok' : 'fail'} · ${durationMs}ms`);
  return evt;
}

export function getRecoveryEvents(): SoakRecoveryEvent[] {
  return [...recoveryEvents];
}

export function getRecoveryEventsRecent(limit = 5): SoakRecoveryEvent[] {
  return recoveryEvents.slice(-limit);
}

export function averageRecoveryMs(): number {
  if (recoveryEvents.length === 0) return 0;
  const sum = recoveryEvents.reduce((s, e) => s + e.durationMs, 0);
  return Math.round(sum / recoveryEvents.length);
}

export function recoverySuccessRate(kind: SoakRecoveryEvent['kind']): number {
  const subset = recoveryEvents.filter((e) => e.kind === kind);
  if (subset.length === 0) return 1;
  const ok = subset.filter((e) => e.success).length;
  return Math.round((ok / subset.length) * 100) / 100;
}
