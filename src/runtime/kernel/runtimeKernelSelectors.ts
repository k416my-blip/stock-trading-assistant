/**
 * Read-only UI selectors — do not import orchestrator/guard modules from UI.
 */
import type { RuntimeKernelSnapshot } from '../../types/runtimeKernel';
import { getLastRuntimeKernelDecision, getLastRuntimeKernelSnapshot } from './RuntimeKernel';

export function selectRuntimeKernelDecision() {
  return getLastRuntimeKernelDecision();
}

export function selectRuntimeKernelSnapshot(): RuntimeKernelSnapshot | null {
  return getLastRuntimeKernelSnapshot();
}

export function selectRuntimeStateLabelJa(): string {
  return getLastRuntimeKernelSnapshot()?.stateLabelJa ?? 'ランタイム観測待ち';
}

export function selectRuntimeState(): RuntimeKernelSnapshot['state'] | null {
  return getLastRuntimeKernelSnapshot()?.state ?? null;
}

export function selectOrchestratorSnapshotForUi() {
  return getLastRuntimeKernelSnapshot()?.orchestrator ?? null;
}

export function selectTelemetryMetricsForUi() {
  return getLastRuntimeKernelSnapshot()?.metrics ?? null;
}

export function selectRuntimePolicyForUi() {
  return getLastRuntimeKernelSnapshot()?.policy ?? null;
}

export function selectRuntimeGuardsForUi() {
  return getLastRuntimeKernelSnapshot()?.guards ?? null;
}

export function selectRuntimeHealthSummaryJa(): string {
  return getLastRuntimeKernelSnapshot()?.runtimeHealthSummaryJa ?? '【端末ランタイム】観測待ち';
}

export function selectAiSuppressionActive(): boolean {
  return getLastRuntimeKernelSnapshot()?.aiSuppressionActive ?? false;
}

export function selectQueuePressurePct(): number {
  return getLastRuntimeKernelSnapshot()?.queuePressurePct ?? 0;
}

export function selectUnifiedSignalsForUi() {
  return getLastRuntimeKernelSnapshot()?.signals ?? null;
}

export function selectConfidenceMapForUi() {
  return getLastRuntimeKernelSnapshot()?.confidenceMap ?? null;
}
