/**
 * Device-scoped adaptive profiles — prevent cross-device contamination.
 */
import type {
  AdaptiveRuntimeLearningState,
  DeviceProfileKind,
  EdgeLearningRecord,
} from '../../types/adaptiveRuntimeLearning';
import { edgeKey } from '../../constants/adaptiveRuntimeLearning';

export type DeviceScopedStores = Record<DeviceProfileKind, Record<string, EdgeLearningRecord>>;

let deviceScoped: DeviceScopedStores = {
  redmi: {},
  samsung: {},
  pixel: {},
  emulator: {},
};

export function resetDeviceScopedStoresForTest(): void {
  deviceScoped = { redmi: {}, samsung: {}, pixel: {}, emulator: {} };
}

export function isolateLearningToDevice(
  store: AdaptiveRuntimeLearningState,
  activeProfile: DeviceProfileKind,
): { contaminationRisk: number; merged: number } {
  const scope = deviceScoped[activeProfile];
  let merged = 0;

  for (const [key, rec] of Object.entries(store.edges)) {
    const scopedRec = { ...rec, deviceScope: activeProfile } as EdgeLearningRecord & { deviceScope: DeviceProfileKind };
    scope[key] = scopedRec;
    (store.edges[key] as EdgeLearningRecord & { deviceScope?: DeviceProfileKind }).deviceScope = activeProfile;
    merged += 1;
  }

  let foreign = 0;
  for (const profile of Object.keys(deviceScoped) as DeviceProfileKind[]) {
    if (profile === activeProfile) continue;
    for (const rec of Object.values(deviceScoped[profile])) {
      if (store.edges[rec.edgeKey] && (rec as EdgeLearningRecord & { deviceScope?: DeviceProfileKind }).deviceScope !== activeProfile) {
        foreign += 1;
      }
    }
  }

  const contaminationRisk =
    merged === 0 ? 0 : Math.min(1, foreign / Math.max(1, merged));

  return { contaminationRisk, merged };
}

export function readDeviceScopedEdge(
  profile: DeviceProfileKind,
  from: string,
  to: string,
  relation: string,
): EdgeLearningRecord | undefined {
  return deviceScoped[profile][edgeKey(from, to, relation)];
}

export function getDeviceScopedStores(): DeviceScopedStores {
  return deviceScoped;
}

export function crossDeviceIsolationQuality(activeProfile: DeviceProfileKind): number {
  const active = Object.keys(deviceScoped[activeProfile]).length;
  let bleed = 0;
  for (const p of Object.keys(deviceScoped) as DeviceProfileKind[]) {
    if (p === activeProfile) continue;
    bleed += Object.keys(deviceScoped[p]).length;
  }
  if (active + bleed === 0) return 1;
  return Math.max(0, 1 - bleed / (active + bleed));
}
