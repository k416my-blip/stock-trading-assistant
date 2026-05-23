import type {
  AdaptiveRuntimeLearningState,
  DeviceProfileKind,
} from '../../types/adaptiveRuntimeLearning';
import {
  ADAPTIVE_RUNTIME_LEARNING_VERSION,
  defaultRecoveryStats,
} from '../../constants/adaptiveRuntimeLearning';

let sessionStore: AdaptiveRuntimeLearningState | null = null;

export function createAdaptiveLearningState(
  deviceProfile: DeviceProfileKind = 'emulator',
): AdaptiveRuntimeLearningState {
  const recovery = defaultRecoveryStats();
  return {
    version: ADAPTIVE_RUNTIME_LEARNING_VERSION,
    deviceProfile,
    edges: {},
    transitions: {},
    recovery: {
      reconnect_defer: { action: 'reconnect_defer', attempts: 0, successes: 0, successRate: 0 },
      coalesce: { action: 'coalesce', attempts: 0, successes: 0, successRate: 0 },
      hydration_pause: { action: 'hydration_pause', attempts: 0, successes: 0, successRate: 0 },
      storm_suppression: { action: 'storm_suppression', attempts: 0, successes: 0, successRate: 0 },
    },
    gapHistograms: {},
    falsePositives: [],
    rootRankingHistory: {},
    replayCount: 0,
    lastUpdatedAt: new Date().toISOString(),
  };
}

export function getAdaptiveLearningStore(deviceProfile?: DeviceProfileKind): AdaptiveRuntimeLearningState {
  if (!sessionStore) {
    sessionStore = createAdaptiveLearningState(deviceProfile ?? 'emulator');
  } else if (deviceProfile && sessionStore.deviceProfile !== deviceProfile) {
    sessionStore.deviceProfile = deviceProfile;
  }
  return sessionStore;
}

export function setAdaptiveLearningStore(store: AdaptiveRuntimeLearningState): void {
  sessionStore = store;
}

export function resetAdaptiveLearningStoreForTest(): void {
  sessionStore = null;
}

export function exportAdaptiveLearningJson(store: AdaptiveRuntimeLearningState): string {
  return JSON.stringify(store, null, 2);
}

export function importAdaptiveLearningJson(raw: string): AdaptiveRuntimeLearningState {
  return JSON.parse(raw) as AdaptiveRuntimeLearningState;
}
