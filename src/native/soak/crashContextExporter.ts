import type { AutomatedSoakExportJson } from '../../types/automatedSoakRunner';
import { getLastNativeDeviceTelemetrySnapshot } from '../telemetry';
import { buildNativeBoundaryValidationReport } from '../runtime/nativeBoundaryValidation';
import { getFreezeEvents } from './freezeDetector';
import { getRecoveryEvents } from './recoveryTimeTracker';
import { getSoakTimeline } from './sessionTimelineRecorder';
import { getRuntimeSnapshots } from './runtimeSnapshotRecorder';
import { getLifecycleTimeline } from './androidLifecycleStressRunner';
import { selectRuntimeStabilitySnapshot } from '../../runtime/stability/runtimeStabilitySelectors';

export function buildCrashContextExport(): Record<string, unknown> {
  const stability = selectRuntimeStabilitySnapshot();
  return {
    exportedAt: new Date().toISOString(),
    stability: stability
      ? {
          healthScore: stability.healthScore,
          anomalies: stability.anomalies.map((a) => a.summaryJa),
          hydrationLock: stability.hydrationLockActive,
        }
      : null,
    nativeTelemetry: getLastNativeDeviceTelemetrySnapshot(),
    boundary: buildNativeBoundaryValidationReport(),
    freezeEvents: getFreezeEvents().slice(-20),
    recoveryEvents: getRecoveryEvents().slice(-30),
    timeline: getSoakTimeline().slice(-50),
    lifecycle: getLifecycleTimeline().slice(-30),
    snapshots: getRuntimeSnapshots().slice(-20),
  };
}

export function attachCrashContextToExport(base: AutomatedSoakExportJson): AutomatedSoakExportJson {
  return {
    ...base,
    timeline: [...base.timeline, ...getSoakTimeline().slice(-10)],
  };
}
