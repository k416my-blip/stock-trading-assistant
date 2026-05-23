import { SOAK_DEADLOCK_RISK_THRESHOLD } from '../../constants/automatedSoakRunner';
import { detectDeadlockRisk } from '../../runtime/unified/runtimeDeadlockDetector';
import { recordSoakTimeline } from './sessionTimelineRecorder';

let lastDeadlockAt = 0;

export function resetDeadlockDetectorForTest(): void {
  lastDeadlockAt = 0;
}

export function observeDeadlock(): number {
  const risk = detectDeadlockRisk();
  if (risk >= SOAK_DEADLOCK_RISK_THRESHOLD) {
    const now = Date.now();
    if (now - lastDeadlockAt > 60_000) {
      lastDeadlockAt = now;
      recordSoakTimeline('deadlock', `deadlock risk ${risk.toFixed(2)} (read-only signal)`);
    }
  }
  return risk;
}
