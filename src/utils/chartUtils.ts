import { Dimensions } from 'react-native';
import { MAX_CHART_POINTS } from '../constants/monitoring';
import type { PerformancePoint } from '../types';
import type { UnderwaterPoint } from '../types/monitoring';

const SCREEN_WIDTH = Dimensions.get('window').width;

export function chartWidth(padding = 32): number {
  return SCREEN_WIDTH - padding;
}

export function downsample<T>(items: T[], maxPoints: number): T[] {
  if (items.length <= maxPoints) return items;
  const step = items.length / maxPoints;
  const out: T[] = [];
  for (let i = 0; i < maxPoints; i++) {
    out.push(items[Math.floor(i * step)]);
  }
  if (out[out.length - 1] !== items[items.length - 1]) {
    out[out.length - 1] = items[items.length - 1];
  }
  return out;
}

export function sparseLabels(labels: string[], maxLabels = 6): string[] {
  if (labels.length <= maxLabels) return labels;
  return labels.map((l, i) =>
    i % Math.ceil(labels.length / maxLabels) === 0 ? l : '',
  );
}

export function equityToUnderwater(curve: PerformancePoint[]): UnderwaterPoint[] {
  if (curve.length === 0) return [];
  let peak = curve[0].portfolioValueMYR;
  return curve.map((p) => {
    peak = Math.max(peak, p.portfolioValueMYR);
    const dd = peak > 0 ? ((peak - p.portfolioValueMYR) / peak) * 100 : 0;
    return { date: p.date, drawdownPct: -Math.round(dd * 10) / 10 };
  });
}

export function lerpWeights(
  from: { symbol: string; weightPct: number }[],
  to: { symbol: string; weightPct: number }[],
  t: number,
): { symbol: string; weightPct: number }[] {
  const symbols = [...new Set([...from.map((w) => w.symbol), ...to.map((w) => w.symbol)])];
  return symbols.map((symbol) => {
    const a = from.find((w) => w.symbol === symbol)?.weightPct ?? 0;
    const b = to.find((w) => w.symbol === symbol)?.weightPct ?? 0;
    return { symbol, weightPct: Math.round((a + (b - a) * t) * 10) / 10 };
  });
}
