/**
 * Dispatches runtime effect commands — debounce, dedupe, batch, isolated failures.
 */
import type {
  RuntimeEffect,
  RuntimeEffectDispatchOptions,
  RuntimeEffectDispatchResult,
} from './RuntimeEffectTypes';
import {
  enqueueRuntimeEffect,
  flushRuntimeEffectQueue,
  resetRuntimeEffectQueueForTest,
} from './RuntimeEffectQueue';
import { executeRuntimeEffect } from './RuntimeEffectExecutor';

let lastDispatchAt = 0;
const DEFAULT_DEBOUNCE_MS = 32;

export function resetRuntimeEffectDispatcherForTest(): void {
  resetRuntimeEffectQueueForTest();
  lastDispatchAt = 0;
}

export function stageRuntimeEffects(effects: RuntimeEffect[]): number {
  let staged = 0;
  for (const fx of effects) {
    if (enqueueRuntimeEffect(fx)) staged += 1;
  }
  return staged;
}

export function dispatchRuntimeEffects(
  effects: RuntimeEffect[],
  options: RuntimeEffectDispatchOptions,
): RuntimeEffectDispatchResult {
  const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  const now = Date.now();
  if (now - lastDispatchAt < debounceMs) {
    stageRuntimeEffects(effects);
    const pending = flushRuntimeEffectQueue(options.kernelState === 'SURVIVAL');
    return runBatch(pending, effects.length, 0);
  }
  lastDispatchAt = now;
  stageRuntimeEffects(effects);
  const dropLow = options.kernelState === 'SURVIVAL' || options.kernelState === 'CRITICAL';
  const batch = flushRuntimeEffectQueue(dropLow);
  const droppedLow = dropLow ? Math.max(0, effects.length - batch.length) : 0;
  return runBatch(batch, effects.length, droppedLow);
}

function runBatch(
  batch: RuntimeEffect[],
  stagedTotal: number,
  droppedLow: number,
): RuntimeEffectDispatchResult {
  const traces = [];
  let failed = 0;
  let skipped = stagedTotal - batch.length - droppedLow;
  if (skipped < 0) skipped = 0;

  for (const fx of batch) {
    const trace = executeRuntimeEffect(fx);
    traces.push(trace);
    if (trace.status === 'failed') failed += 1;
  }

  return {
    executed: batch.length - failed,
    skipped,
    failed,
    droppedLow,
    traces,
  };
}

export function getLastEffectDispatchSummary(): string {
  return `effect-dispatch · pending ${0}`;
}
