import type {
  RuntimeTelemetryEntropyObserveInput,
  SignalDuplicationGraph,
} from '../types/runtimeTelemetryEntropy';
import { TELEMETRY_SIGNAL_LAYERS } from '../constants/runtimeTelemetryEntropy';
import { scoreSignalEntropy } from './signalEntropyScorer';

export function resetEntropyVisualizationBuildersForTest(): void {
  /* stateless */
}

export function buildEntropyHeatmap(
  input: RuntimeTelemetryEntropyObserveInput,
): { layer: string; entropy: number }[] {
  const base = scoreSignalEntropy(input);
  return TELEMETRY_SIGNAL_LAYERS.map((layer, i) => ({
    layer,
    entropy: Math.round(Math.min(1, base * (0.75 + i * 0.06)) * 1000) / 1000,
  }));
}

export function buildSignalDuplicationGraph(input: RuntimeTelemetryEntropyObserveInput): SignalDuplicationGraph {
  const nodes = ['observer', 'audit', 'telemetry', 'dashboard', 'export', 'replay'].map((label, i) => ({
    id: `${label}_${i}`,
    label,
    weight: input.duplicateSignalRatio * (0.7 + i * 0.05),
  }));
  return {
    nodes,
    edges: nodes.slice(0, -1).map((n, i) => ({
      from: n.id,
      to: nodes[i + 1]?.id ?? n.id,
      weight: input.duplicateSignalRatio,
    })),
    measuredAt: new Date().toISOString(),
  };
}

export function buildReplayAmplificationTimeline(
  input: RuntimeTelemetryEntropyObserveInput,
  prior: { at: string; level: number }[],
): { at: string; level: number }[] {
  const level = Math.min(1, input.replayCount / 60 + input.soakReplayHooksActive / 10);
  return [...prior, { at: new Date().toISOString(), level: Math.round(level * 1000) / 1000 }].slice(-48);
}

export function buildDashboardSaturationRadar(
  input: RuntimeTelemetryEntropyObserveInput,
): { axis: string; value: number }[] {
  return [
    { axis: 'rows', value: Math.min(1, input.dashboardRowCount / 56) },
    { axis: 'samples', value: Math.min(1, input.telemetrySampleCount / 120) },
    { axis: 'render', value: Math.min(1, input.renderFps < 14 ? 0.7 : 0.2) },
    { axis: 'async', value: Math.min(1, input.asyncQueueDepth / 16) },
  ].map((d) => ({ ...d, value: Math.round(d.value * 1000) / 1000 }));
}

export function buildExportPayloadHistogram(
  input: RuntimeTelemetryEntropyObserveInput,
): { bucket: string; count: number }[] {
  const kb = Math.round(input.exportBytesEstimate / 1024);
  const buckets = [
    { bucket: '0-64KB', max: 64 },
    { bucket: '64-128KB', max: 128 },
    { bucket: '128-256KB', max: 256 },
    { bucket: '256-512KB', max: 512 },
    { bucket: '512KB+', max: Infinity },
  ];
  return buckets.map((b, i) => ({
    bucket: b.bucket,
    count: kb >= (buckets[i - 1]?.max ?? 0) && kb < b.max ? Math.max(1, Math.round(kb / 32)) : 0,
  }));
}
