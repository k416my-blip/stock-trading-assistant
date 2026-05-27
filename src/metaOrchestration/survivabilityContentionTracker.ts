import type { MetaInteractionEdge } from '../types/metaRuntimeOrchestration';

const contentionSamples: number[] = [];

export function resetSurvivabilityContentionTrackerForTest(): void {
  contentionSamples.length = 0;
}

export function noteContention(edges: MetaInteractionEdge[]): void {
  if (edges.length === 0) return;
  const max = Math.max(...edges.map((e) => e.contention));
  contentionSamples.push(max);
  if (contentionSamples.length > 64) contentionSamples.shift();
}

export function scoreSurvivabilityContention(edges: MetaInteractionEdge[]): number {
  if (edges.length === 0) return 0;
  const avg = edges.reduce((s, e) => s + e.contention, 0) / edges.length;
  noteContention(edges);
  return Math.round(Math.min(1, avg) * 1000) / 1000;
}

export function getContentionTrend(): number {
  if (contentionSamples.length < 3) return 0;
  const recent = contentionSamples.slice(-6);
  return recent[recent.length - 1] - recent[0];
}
