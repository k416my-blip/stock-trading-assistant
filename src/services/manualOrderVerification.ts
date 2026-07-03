import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import {
  DEVICE_VERIFY_PENDING_COUNT_PROBE_PREFIX,
  formatPendingManualOrderProbe,
} from '../constants/deviceVerifyTestIds';
import type { ManualOrderItem } from '../types';

export type PendingManualOrderProbe = {
  count: number;
  updatedAt: string;
  probeLabel: string;
};

/** Count incomplete manual orders from app state (not UI strings). */
export function countPendingManualOrders(manualOrderList: ManualOrderItem[]): number {
  return manualOrderList.filter((item) => !item.completed).length;
}

export function buildPendingManualOrderProbe(
  manualOrderList: ManualOrderItem[],
): PendingManualOrderProbe {
  const count = countPendingManualOrders(manualOrderList);
  return {
    count,
    updatedAt: new Date().toISOString(),
    probeLabel: formatPendingManualOrderProbe(count),
  };
}

/** Persist probe for adb / device scripts (debug verification). */
export async function writePendingManualOrderProbe(
  manualOrderList: ManualOrderItem[],
): Promise<PendingManualOrderProbe> {
  const probe = buildPendingManualOrderProbe(manualOrderList);
  await AsyncStorage.setItem(
    STORAGE_KEYS.deviceVerifyPendingManualOrderCount,
    JSON.stringify(probe),
  );
  return probe;
}

export async function readPendingManualOrderProbe(): Promise<PendingManualOrderProbe | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.deviceVerifyPendingManualOrderCount);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PendingManualOrderProbe>;
    if (typeof parsed.count !== 'number' || !Number.isFinite(parsed.count)) return null;
    return {
      count: parsed.count,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '',
      probeLabel: formatPendingManualOrderProbe(parsed.count),
    };
  } catch {
    return null;
  }
}

export function parsePendingCountFromAccessibilityLabels(labels: string[]): number | null {
  for (const label of labels) {
    if (!label.includes(DEVICE_VERIFY_PENDING_COUNT_PROBE_PREFIX)) continue;
    const n = Number(label.split(DEVICE_VERIFY_PENDING_COUNT_PROBE_PREFIX)[1]);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return null;
}
