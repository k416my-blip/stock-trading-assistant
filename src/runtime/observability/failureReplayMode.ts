/**
 * Failure replay mode — deterministic mock scenarios for forensics verification.
 */
import type { FailureReplayResult, FailureReplayScenario } from '../../types/runtimeObservability';
import { resetRuntimeEventJournalForTest, appendRuntimeJournalEvent } from './runtimeEventJournal';
import { reconstructFailureTimeline } from './timelineReconstructionEngine';
import { resetLongSessionSamplesForTest } from './longSessionDegradationAnalyzer';
import { resetRuntimeSnapshotsForTest } from './runtimeSnapshotSystem';

function replayCascadeStorm(baseMs: number): number {
  appendRuntimeJournalEvent('orchestration_start', 'replay cascade storm', { atMs: baseMs });
  for (let i = 0; i < 8; i += 1) {
    appendRuntimeJournalEvent('cascade_trigger', `cascade wave ${i}`, { atMs: baseMs + i * 200, v1: i });
    appendRuntimeJournalEvent('async_queue_saturation', 'queue spike', {
      atMs: baseMs + i * 200 + 50,
      v1: 10 + i * 2,
      v2: 200 + i * 30,
    });
  }
  return 17;
}

function replayReconnectStorm(baseMs: number): number {
  for (let i = 0; i < 12; i += 1) {
    appendRuntimeJournalEvent('websocket_reconnect', i % 3 === 0 ? 'reconnect storm' : 'reconnect jitter', {
      atMs: baseMs + i * 150,
      v1: 5,
    });
  }
  return 12;
}

function replayHydrationRace(baseMs: number): number {
  appendRuntimeJournalEvent('hydration_pause', 'replay pause', { atMs: baseMs });
  appendRuntimeJournalEvent('websocket_reconnect', 'overlap reconnect', { atMs: baseMs + 100 });
  appendRuntimeJournalEvent('hydration_resume', 'dup resume', { atMs: baseMs + 150 });
  appendRuntimeJournalEvent('hydration_resume', 'dup resume 2', { atMs: baseMs + 200 });
  return 4;
}

function replayAsyncStarvation(baseMs: number): number {
  for (let i = 0; i < 6; i += 1) {
    appendRuntimeJournalEvent('async_queue_saturation', 'starvation', {
      atMs: baseMs + i * 300,
      v1: 20 + i,
      v2: 400,
    });
    appendRuntimeJournalEvent('event_loop_pressure', 'SATURATED', { atMs: baseMs + i * 300 + 100, v1: 300 });
  }
  appendRuntimeJournalEvent('starvation_detected', 'STARVATION_CRITICAL', { atMs: baseMs + 2000 });
  return 13;
}

function replayAdaptiveContradiction(baseMs: number): number {
  appendRuntimeJournalEvent('adaptive_drift_transition', 'DRIFT_WARNING', {
    atMs: baseMs,
    tag: 'DRIFT_WARNING',
    v1: 45,
  });
  appendRuntimeJournalEvent('replay_divergence', 'root flip', { atMs: baseMs + 500, v1: 60 });
  appendRuntimeJournalEvent('rollback_execution', 'governance rollback', { atMs: baseMs + 1000 });
  appendRuntimeJournalEvent('adaptive_drift_transition', 'DRIFT_STABLE', {
    atMs: baseMs + 1500,
    tag: 'DRIFT_STABLE',
    v1: 20,
  });
  return 4;
}

function replayThermalDegradation(baseMs: number): number {
  appendRuntimeJournalEvent('thermal_downgrade', 'severe', { atMs: baseMs, v1: 3 });
  appendRuntimeJournalEvent('battery_saver_transition', 'on', { atMs: baseMs + 1000 });
  appendRuntimeJournalEvent('async_queue_saturation', 'thermal lag', { atMs: baseMs + 2000, v2: 350 });
  return 3;
}

export function runFailureReplay(scenario: FailureReplayScenario): FailureReplayResult {
  resetRuntimeEventJournalForTest();
  resetLongSessionSamplesForTest();
  resetRuntimeSnapshotsForTest();
  const baseMs = Date.now() - 60_000;

  let count = 0;
  switch (scenario) {
    case 'cascade_storm':
      count = replayCascadeStorm(baseMs);
      break;
    case 'reconnect_storm':
      count = replayReconnectStorm(baseMs);
      break;
    case 'hydration_race':
      count = replayHydrationRace(baseMs);
      break;
    case 'async_starvation':
      count = replayAsyncStarvation(baseMs);
      break;
    case 'adaptive_contradiction':
      count = replayAdaptiveContradiction(baseMs);
      break;
    case 'thermal_degradation':
      count = replayThermalDegradation(baseMs);
      break;
    default:
      count = 0;
  }

  const timeline = reconstructFailureTimeline(baseMs);
  const deterministic = timeline.rootCauseCandidates.length > 0 && count > 0;

  return { scenario, eventsGenerated: count, timeline, deterministic };
}
