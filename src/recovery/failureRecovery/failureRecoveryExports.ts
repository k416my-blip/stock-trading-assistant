import type { FailureRecoveryExportBundle } from '../../types/failureRecoveryOrchestrator';
import { FAILURE_RECOVERY_VERSION } from '../../constants/failureRecoveryOrchestrator';
import {
  getFailureRecoveryTimeline,
  getLastFailureRecoveryProfile,
} from './failureRecoveryCoordinator';
import { buildQuarantineSnapshot } from './runtimeQuarantineMode';
import { getRecoveryHeatmap } from './failureRecoveryCoordinator';

export function buildRecoveryTimelineExport(): FailureRecoveryExportBundle['timeline'] {
  return getFailureRecoveryTimeline();
}

export function buildQuarantineSnapshotExport(): Record<string, unknown> {
  return buildQuarantineSnapshot();
}

export function buildDegradationTransitionExport(): FailureRecoveryExportBundle['degradationTransitions'] {
  return getFailureRecoveryTimeline().filter((e) => e.from !== e.to);
}

export function buildRecoveryHeatmapExport(): Record<string, number> {
  return getRecoveryHeatmap();
}

export function buildFailureRecoveryExportBundle(): FailureRecoveryExportBundle {
  return {
    version: FAILURE_RECOVERY_VERSION,
    exportedAt: new Date().toISOString(),
    timeline: buildRecoveryTimelineExport(),
    quarantineSnapshot: buildQuarantineSnapshotExport(),
    degradationTransitions: buildDegradationTransitionExport(),
    recoveryHeatmap: buildRecoveryHeatmapExport(),
    profile: getLastFailureRecoveryProfile(),
  };
}

export function formatFailureRecoveryExportJson(): string {
  return JSON.stringify(buildFailureRecoveryExportBundle(), null, 2);
}
