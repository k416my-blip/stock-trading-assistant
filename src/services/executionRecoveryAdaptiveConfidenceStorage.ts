import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { RECOVERY_TIMELINE_MAX, ROLLBACK_COOLDOWN_MS } from '../constants/executionRecoveryAdaptiveConfidence';
import type {
  RecoveryCooldownEntry,
  RecoveryTimelinePoint,
  RecoveryStage,
} from '../types/executionRecoveryAdaptiveConfidence';

export type ExecutionRecoveryPersisted = {
  version: 1;
  recoveryTimeline: RecoveryTimelinePoint[];
  cooldownTimeline: RecoveryCooldownEntry[];
  lastRecoveryStage: RecoveryStage;
  lastThawLevel: number;
  rollbackCooldownUntil: string | null;
};

export function defaultExecutionRecoveryState(): ExecutionRecoveryPersisted {
  return {
    version: 1,
    recoveryTimeline: [],
    cooldownTimeline: [],
    lastRecoveryStage: 0,
    lastThawLevel: 0,
    rollbackCooldownUntil: null,
  };
}

export async function loadExecutionRecoveryState(): Promise<ExecutionRecoveryPersisted> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.executionRecoveryAdaptiveConfidence);
    if (!raw) return defaultExecutionRecoveryState();
    const parsed = JSON.parse(raw) as Partial<ExecutionRecoveryPersisted>;
    return {
      version: 1,
      recoveryTimeline: Array.isArray(parsed.recoveryTimeline)
        ? parsed.recoveryTimeline.slice(-RECOVERY_TIMELINE_MAX)
        : [],
      cooldownTimeline: Array.isArray(parsed.cooldownTimeline)
        ? parsed.cooldownTimeline.slice(-24)
        : [],
      lastRecoveryStage:
        typeof parsed.lastRecoveryStage === 'number' &&
        parsed.lastRecoveryStage >= 0 &&
        parsed.lastRecoveryStage <= 4
          ? (parsed.lastRecoveryStage as RecoveryStage)
          : 0,
      lastThawLevel: typeof parsed.lastThawLevel === 'number' ? parsed.lastThawLevel : 0,
      rollbackCooldownUntil:
        typeof parsed.rollbackCooldownUntil === 'string' ? parsed.rollbackCooldownUntil : null,
    };
  } catch {
    return defaultExecutionRecoveryState();
  }
}

export async function saveExecutionRecoveryState(state: ExecutionRecoveryPersisted): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.executionRecoveryAdaptiveConfidence, JSON.stringify(state));
}

export async function appendRecoveryTimelinePoint(
  point: RecoveryTimelinePoint,
  opts: { rollbackApplied?: boolean; reasonJa?: string },
): Promise<void> {
  const state = await loadExecutionRecoveryState();
  state.recoveryTimeline.push(point);
  state.recoveryTimeline = state.recoveryTimeline.slice(-RECOVERY_TIMELINE_MAX);
  state.lastRecoveryStage = point.recoveryStage;
  state.lastThawLevel = point.thawLevel;

  if (opts.rollbackApplied) {
    const until = new Date(Date.now() + ROLLBACK_COOLDOWN_MS).toISOString();
    state.rollbackCooldownUntil = until;
    state.cooldownTimeline.push({
      at: new Date().toISOString(),
      reasonJa: opts.reasonJa ?? 'rollback immunity',
      expiresAt: until,
    });
    state.cooldownTimeline = state.cooldownTimeline.slice(-24);
  }

  await saveExecutionRecoveryState(state);
}

export function isRollbackCooldownActive(state: ExecutionRecoveryPersisted): boolean {
  if (!state.rollbackCooldownUntil) return false;
  return Date.now() < new Date(state.rollbackCooldownUntil).getTime();
}
