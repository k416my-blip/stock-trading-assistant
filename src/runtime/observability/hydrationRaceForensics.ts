/**
 * Hydration race forensics.
 */
import type { HydrationForensicChain } from '../../types/runtimeObservability';
import { getRuntimeJournalEvents } from './runtimeEventJournal';

export function buildHydrationForensicChain(): HydrationForensicChain {
  const events = getRuntimeJournalEvents().filter(
    (e) =>
      e.kind === 'hydration_pause' ||
      e.kind === 'hydration_resume' ||
      e.kind === 'websocket_reconnect' ||
      e.kind === 'orchestration_start',
  );

  const steps = events.map((e) => ({
    at: e.at,
    kind: e.kind,
    detailJa: e.detailJa,
  }));

  let overlapCount = 0;
  let pauseAt = 0;
  for (const e of events) {
    if (e.kind === 'hydration_pause') {
      pauseAt = e.atMs;
    }
    if (e.kind === 'websocket_reconnect' && pauseAt > 0 && e.atMs - pauseAt < 3000) {
      overlapCount += 1;
    }
  }

  const raceDetected =
    overlapCount >= 1 ||
    events.filter((e) => e.kind === 'hydration_resume').length >= 2;

  return {
    steps,
    overlapCount,
    raceDetected,
    summaryJa: raceDetected
      ? `hydration race: ${overlapCount} ws/hydration overlaps`
      : 'no hydration race detected in journal',
  };
}
