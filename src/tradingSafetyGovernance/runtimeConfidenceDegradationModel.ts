import type { ConfidenceEvolutionPoint } from '../types/tradingSafetyGovernance';

const evolution: ConfidenceEvolutionPoint[] = [];

export function resetRuntimeConfidenceDegradationModelForTest(): void {
  evolution.length = 0;
}

export function noteConfidenceDegradation(confidence: number, weighted: number): void {
  evolution.push({
    at: new Date().toISOString(),
    confidence,
    weighted,
  });
  if (evolution.length > 80) evolution.shift();
}

export function getConfidenceEvolution(): ConfidenceEvolutionPoint[] {
  return [...evolution];
}

export function computeDegradationTrend(): number {
  if (evolution.length < 3) return 0;
  const recent = evolution.slice(-6);
  return recent[0].confidence - recent[recent.length - 1].confidence;
}
