import { TELEMETRY_GRAPH_DECIMATE_TARGET } from '../../../constants/telemetryOverhead';

export function decimateSeries(values: number[], target = TELEMETRY_GRAPH_DECIMATE_TARGET): number[] {
  if (values.length <= target) return [...values];
  const step = values.length / target;
  const out: number[] = [];
  for (let i = 0; i < target; i += 1) {
    const idx = Math.min(values.length - 1, Math.floor(i * step));
    out.push(values[idx]);
  }
  return out;
}

export function decimatedSparkline(values: number[], width = TELEMETRY_GRAPH_DECIMATE_TARGET): string {
  const slice = decimateSeries(values, width);
  if (slice.length === 0) return '—';
  const min = Math.min(...slice);
  const max = Math.max(...slice);
  const range = max - min || 1;
  const bars = '▁▂▃▄▅▆▇█';
  return slice
    .map((v) => bars[Math.min(bars.length - 1, Math.floor(((v - min) / range) * (bars.length - 1)))])
    .join('');
}
