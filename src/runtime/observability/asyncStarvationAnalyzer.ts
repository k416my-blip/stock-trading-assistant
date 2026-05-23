/**
 * Async starvation analyzer.
 */
import type { StarvationPhase } from '../../types/runtimeObservability';
import {
  STARVATION_LAG_CRITICAL_MS,
  STARVATION_LAG_WARNING_MS,
  STARVATION_QUEUE_DEPTH_CRITICAL,
  STARVATION_QUEUE_DEPTH_WARNING,
} from '../../constants/runtimeObservability';
import { appendRuntimeJournalEvent, getRuntimeJournalEvents } from './runtimeEventJournal';

export type AsyncStarvationSignals = {
  queueDepth: number;
  queueLagMs: number;
  microtaskBurst?: boolean;
  timerRebuildStorm?: boolean;
  idleCallbackStarved?: boolean;
  cooperativeYieldFailed?: boolean;
};

export function analyzeAsyncStarvation(signals: AsyncStarvationSignals): {
  phase: StarvationPhase;
  detailJa: string;
} {
  let score = 0;
  if (signals.queueDepth >= STARVATION_QUEUE_DEPTH_CRITICAL) score += 2;
  else if (signals.queueDepth >= STARVATION_QUEUE_DEPTH_WARNING) score += 1;
  if (signals.queueLagMs >= STARVATION_LAG_CRITICAL_MS) score += 2;
  else if (signals.queueLagMs >= STARVATION_LAG_WARNING_MS) score += 1;
  if (signals.microtaskBurst) score += 1;
  if (signals.timerRebuildStorm) score += 1;
  if (signals.idleCallbackStarved) score += 1;
  if (signals.cooperativeYieldFailed) score += 1;

  const journalHints = getRuntimeJournalEvents({ kind: 'async_queue_saturation' }).length;
  if (journalHints >= 3) score += 1;

  let phase: StarvationPhase = 'STARVATION_NONE';
  if (score >= 4) phase = 'STARVATION_CRITICAL';
  else if (score >= 2) phase = 'STARVATION_WARNING';

  if (phase !== 'STARVATION_NONE') {
    appendRuntimeJournalEvent('starvation_detected', `${phase} depth=${signals.queueDepth} lag=${signals.queueLagMs}ms`, {
      v1: signals.queueDepth,
      v2: signals.queueLagMs,
      tag: phase,
    });
  }

  return {
    phase,
    detailJa:
      phase === 'STARVATION_NONE'
        ? 'async queue nominal'
        : `${phase}: depth=${signals.queueDepth} lag=${signals.queueLagMs}ms score=${score}`,
  };
}
