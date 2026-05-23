import type { ReplayGrowthTelemetrySnapshot } from '../../types/nativeDeviceTelemetry';
import { getAdaptiveLearningStore } from '../../runtime/analysis/adaptiveRuntimeLearningStorage';

let lastReplay = 0;
let lastAt = 0;

export function resetReplayGrowthTelemetryForTest(): void {
  lastReplay = 0;
  lastAt = 0;
}

export function observeReplayGrowth(): ReplayGrowthTelemetrySnapshot {
  const store = getAdaptiveLearningStore('redmi');
  const now = Date.now();
  let growthPerMin = 0;
  if (lastAt > 0) {
    const minutes = (now - lastAt) / 60_000;
    if (minutes > 0) growthPerMin = (store.replayCount - lastReplay) / minutes;
  }
  lastReplay = store.replayCount;
  lastAt = now;
  return {
    replayCount: store.replayCount,
    growthPerMin: Math.round(growthPerMin * 100) / 100,
  };
}
