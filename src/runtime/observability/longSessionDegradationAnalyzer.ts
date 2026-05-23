/**
 * Long session degradation — 30/60/120 minute windows.
 */
import type { LongSessionDegradationReport, LongSessionWindow } from '../../types/runtimeObservability';
import { getRuntimeJournalEvents } from './runtimeEventJournal';
import { getRuntimeSnapshots } from './runtimeSnapshotSystem';

type SessionSample = {
  atMs: number;
  memoryPct: number;
  queueDepth: number;
  renderBurst: number;
  eventLoopLagMs: number;
  driftScore: number;
};

const samples: SessionSample[] = [];

export function resetLongSessionSamplesForTest(): void {
  samples.length = 0;
}

export function recordLongSessionSample(input: {
  memoryPct: number;
  queueDepth: number;
  renderBurst: number;
  eventLoopLagMs: number;
  driftScore?: number;
  atMs?: number;
}): void {
  samples.push({
    atMs: input.atMs ?? Date.now(),
    memoryPct: input.memoryPct,
    queueDepth: input.queueDepth,
    renderBurst: input.renderBurst,
    eventLoopLagMs: input.eventLoopLagMs,
    driftScore: input.driftScore ?? 0,
  });
  if (samples.length > 2000) samples.shift();
}

function windowSamples(windowMinutes: LongSessionWindow): SessionSample[] {
  const cutoff = Date.now() - windowMinutes * 60_000;
  return samples.filter((s) => s.atMs >= cutoff);
}

export function analyzeLongSessionDegradation(windowMinutes: LongSessionWindow): LongSessionDegradationReport {
  const win = windowSamples(windowMinutes);
  const snaps = getRuntimeSnapshots().filter(
    (s) => Date.parse(s.at) >= Date.now() - windowMinutes * 60_000,
  );

  if (win.length < 2) {
    return {
      windowMinutes,
      memoryCreepPct: 0,
      queueGrowth: 0,
      renderBurstGrowth: 0,
      reconnectFrequency: 0,
      adaptiveInstabilityTrend: 0,
      eventLoopDegradationMs: 0,
      summaryJa: `${windowMinutes}min: insufficient samples`,
    };
  }

  const first = win[0];
  const last = win[win.length - 1];
  const memoryCreepPct = last.memoryPct - first.memoryPct;
  const queueGrowth = last.queueDepth - first.queueDepth;
  const renderBurstGrowth = last.renderBurst - first.renderBurst;
  const eventLoopDegradationMs = last.eventLoopLagMs - first.eventLoopLagMs;

  const reconnects = getRuntimeJournalEvents({ kind: 'websocket_reconnect' }).filter(
    (e) => e.atMs >= Date.now() - windowMinutes * 60_000,
  );
  const reconnectFrequency = reconnects.length / windowMinutes;

  const driftScores = win.map((s) => s.driftScore);
  const adaptiveInstabilityTrend =
    driftScores.length < 2 ? 0 : driftScores[driftScores.length - 1] - driftScores[0];

  return {
    windowMinutes,
    memoryCreepPct: Math.round(memoryCreepPct * 10) / 10,
    queueGrowth,
    renderBurstGrowth,
    reconnectFrequency: Math.round(reconnectFrequency * 100) / 100,
    adaptiveInstabilityTrend: Math.round(adaptiveInstabilityTrend * 1000) / 1000,
    eventLoopDegradationMs,
    summaryJa: `${windowMinutes}min: memΔ${memoryCreepPct}% queueΔ${queueGrowth} rc/min${reconnectFrequency.toFixed(1)} snaps=${snaps.length}`,
  };
}
