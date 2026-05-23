import type { TelemetryOverheadProfile } from '../../../types/telemetryOverhead';
import type { TelemetryOverheadMode } from '../../../types/telemetryOverhead';
import { asyncStoragePressure } from './asyncStorageBurstLimiter';
import { dashboardRenderCostEstimate } from './dashboardRenderBudget';

type Sample = { cpuMs: number; memKb: number; at: number };

const samples: Sample[] = [];
let snapshotWrites = 0;
let snapshotWriteWindowStart = Date.now();
let lastExportDuration = 0;
let lastGraphRenderMs = 0;
let lastCompressionRatio = 1;
let lastTelemetryDrift = 0;
let lastMode: TelemetryOverheadMode = 'full';

export function resetTelemetryOverheadProfilerForTest(): void {
  samples.length = 0;
  snapshotWrites = 0;
  snapshotWriteWindowStart = Date.now();
  lastExportDuration = 0;
  lastGraphRenderMs = 0;
  lastCompressionRatio = 1;
  lastTelemetryDrift = 0;
  lastMode = 'full';
}

export function noteTelemetryCpuSample(durationMs: number, heapDeltaKb = 8): void {
  samples.push({ cpuMs: durationMs, memKb: heapDeltaKb, at: Date.now() });
  if (samples.length > 64) samples.shift();
}

export function noteSnapshotWrite(): void {
  snapshotWrites += 1;
}

export function noteExportDuration(ms: number): void {
  lastExportDuration = ms;
}

export function noteGraphRenderMs(ms: number): void {
  lastGraphRenderMs = ms;
}

export function noteCompressionRatio(ratio: number): void {
  lastCompressionRatio = ratio;
}

export function noteTelemetryDrift(drift: number): void {
  lastTelemetryDrift = drift;
}

export function noteOverheadMode(mode: TelemetryOverheadMode): void {
  lastMode = mode;
}

export function buildTelemetryOverheadProfile(): TelemetryOverheadProfile {
  const now = Date.now();
  const windowSec = Math.max(1, (now - snapshotWriteWindowStart) / 1000);
  const cpuAvg = samples.length
    ? samples.reduce((s, x) => s + x.cpuMs, 0) / samples.length
    : 0;
  const memAvg = samples.length ? samples.reduce((s, x) => s + x.memKb, 0) / samples.length : 0;
  if (now - snapshotWriteWindowStart > 60_000) {
    snapshotWrites = 0;
    snapshotWriteWindowStart = now;
  }
  return {
    telemetryCpuCost: Math.round(cpuAvg * 10) / 10,
    telemetryMemoryCost: Math.round(memAvg),
    dashboardRenderCost: dashboardRenderCostEstimate(),
    snapshotWriteRate: Math.round((snapshotWrites / windowSec) * 100) / 100,
    asyncStoragePressure: Math.round(asyncStoragePressure() * 1000) / 1000,
    exportDuration: lastExportDuration,
    graphRenderMs: lastGraphRenderMs,
    telemetryDrift: lastTelemetryDrift,
    compressionRatio: lastCompressionRatio,
    mode: lastMode,
    measuredAt: new Date().toISOString(),
  };
}
