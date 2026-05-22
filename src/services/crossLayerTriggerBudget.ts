import { CASCADE_WINDOW_MS, TRIGGER_BUDGET_PER_MINUTE } from '../constants/crossLayerCascade';
import type { CrossLayerTriggerKind } from '../types/crossLayerCascade';

const triggerTimestamps = new Map<CrossLayerTriggerKind, number[]>();

export function resetCrossLayerTriggerBudgetForTest(): void {
  triggerTimestamps.clear();
}

function prune(kind: CrossLayerTriggerKind, now: number): number[] {
  const kept = (triggerTimestamps.get(kind) ?? []).filter((t) => now - t < CASCADE_WINDOW_MS);
  triggerTimestamps.set(kind, kept);
  return kept;
}

export function recordCrossLayerTrigger(kind: CrossLayerTriggerKind): void {
  const now = Date.now();
  const kept = prune(kind, now);
  kept.push(now);
  triggerTimestamps.set(kind, kept);
}

export function getTriggerCountInWindow(kind: CrossLayerTriggerKind): number {
  return prune(kind, Date.now()).length;
}

export function canFireCrossLayerTrigger(kind: CrossLayerTriggerKind): boolean {
  return getTriggerCountInWindow(kind) < TRIGGER_BUDGET_PER_MINUTE[kind];
}

export function getBlockedTriggers(): CrossLayerTriggerKind[] {
  return (Object.keys(TRIGGER_BUDGET_PER_MINUTE) as CrossLayerTriggerKind[]).filter(
    (k) => !canFireCrossLayerTrigger(k),
  );
}

export type TriggerBudgetDecision = 'allow' | 'defer' | 'throttle' | 'cache_reuse' | 'freeze';

export function resolveTriggerBudgetDecision(
  kind: CrossLayerTriggerKind,
): TriggerBudgetDecision {
  if (canFireCrossLayerTrigger(kind)) {
    recordCrossLayerTrigger(kind);
    return 'allow';
  }
  if (kind === 'orchestration_rebuild' || kind === 'deep_analysis_activation') return 'defer';
  if (kind === 'explanation_regeneration') return 'cache_reuse';
  if (kind === 'freeze_recovery' || kind === 'confidence_recalibration') return 'throttle';
  return 'freeze';
}
