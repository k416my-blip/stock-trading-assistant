import type { DeviceProfileKind, RecoveryActionKind } from '../types/adaptiveRuntimeLearning';
import type { ObservableCausalEventKind } from '../types/runtimeCausalGraph';
import type { LatentRuntimeStateKind } from '../types/runtimeLatentStateInference';

export const ADAPTIVE_RUNTIME_LEARNING_VERSION = '1.0.0';

/** Never suppress confidence for these observable kinds. */
export const PROTECTED_INVARIANT_KINDS: ObservableCausalEventKind[] = [
  'ownership_violation',
  'duplicate_socket',
  'budget_block',
  'coalesce',
];

export const PROTECTED_INVARIANT_RELATIONS = [
  'ownership→duplicate_socket',
  'ownership_violation',
  'duplicate_socket',
  'native_bypass',
];

export type DeviceProfileSpec = {
  timerDriftToleranceMs: number;
  resumeLatencyExpectationMs: number;
  batterySaverAggressiveness: number;
  resumeReconnectStrongMs: number;
  resumeReconnectMaxMs: number;
};

export const DEVICE_PROFILE_SPECS: Record<DeviceProfileKind, DeviceProfileSpec> = {
  redmi: {
    timerDriftToleranceMs: 3_200,
    resumeLatencyExpectationMs: 3_500,
    batterySaverAggressiveness: 0.88,
    resumeReconnectStrongMs: 2_800,
    resumeReconnectMaxMs: 32_000,
  },
  samsung: {
    timerDriftToleranceMs: 2_400,
    resumeLatencyExpectationMs: 2_800,
    batterySaverAggressiveness: 0.75,
    resumeReconnectStrongMs: 1_800,
    resumeReconnectMaxMs: 28_000,
  },
  pixel: {
    timerDriftToleranceMs: 1_800,
    resumeLatencyExpectationMs: 1_200,
    batterySaverAggressiveness: 0.55,
    resumeReconnectStrongMs: 900,
    resumeReconnectMaxMs: 22_000,
  },
  emulator: {
    timerDriftToleranceMs: 500,
    resumeLatencyExpectationMs: 400,
    batterySaverAggressiveness: 0.2,
    resumeReconnectStrongMs: 400,
    resumeReconnectMaxMs: 15_000,
  },
};

export const LEARNING_EMA_ALPHA = 0.35;
export const LATENT_PERSISTENCE_BIAS = 0.12;
export const HYSTERESIS_ENTER = 0.34;
export const HYSTERESIS_EXIT = 0.22;
export const FALSE_POSITIVE_PENALTY = 0.18;
export const TRANSITION_LEARN_RATE = 0.15;
export const HISTOGRAM_MAX_SAMPLES = 64;
export const GAP_STRONG_PERCENTILE = 0.75;
export const GAP_MAX_PERCENTILE = 0.95;

export function edgeKey(
  from: string,
  to: string,
  relation: string,
): string {
  return `${from}->${to}:${relation}`;
}

export function transitionKey(from: LatentRuntimeStateKind, to: LatentRuntimeStateKind): string {
  return `${from}->${to}`;
}

export function isProtectedEdge(from: string, to: string, relation: string): boolean {
  if (PROTECTED_INVARIANT_KINDS.includes(from as ObservableCausalEventKind)) return true;
  if (PROTECTED_INVARIANT_KINDS.includes(to as ObservableCausalEventKind)) return true;
  const blob = `${from} ${to} ${relation}`.toLowerCase();
  return PROTECTED_INVARIANT_RELATIONS.some((p) => blob.includes(p.replace(/→/g, '')));
}

export function defaultRecoveryStats(): Record<RecoveryActionKind, { attempts: number; successes: number }> {
  return {
    reconnect_defer: { attempts: 0, successes: 0 },
    coalesce: { attempts: 0, successes: 0 },
    hydration_pause: { attempts: 0, successes: 0 },
    storm_suppression: { attempts: 0, successes: 0 },
  };
}
