import type { BatteryDrainSnapshot } from '../../types/nativeDeviceTelemetry';
import { getLastNativeRuntimeSnapshot } from '../runtime/nativeRuntimeBridge';

let lastLevel: number | null = null;
let lastAt = 0;

export function resetBatteryDrainTrackerForTest(): void {
  lastLevel = null;
  lastAt = 0;
}

export function observeBatteryDrain(batterySaverActive: boolean): BatteryDrainSnapshot {
  const native = getLastNativeRuntimeSnapshot();
  const level = native?.batteryLevelPct ?? null;
  const now = Date.now();
  let deltaPerHourPct = 0;
  if (level != null && lastLevel != null && lastAt > 0) {
    const hours = (now - lastAt) / 3_600_000;
    if (hours > 0) deltaPerHourPct = (level - lastLevel) / hours;
  }
  if (level != null) {
    lastLevel = level;
    lastAt = now;
  }
  return {
    batteryLevelPct: level,
    batterySaverActive,
    deltaPerHourPct: Math.round(deltaPerHourPct * 10) / 10,
  };
}
