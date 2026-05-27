import type { CausalGraphEdge } from '../types/runtimeCausalIntelligence';

const dependencies: CausalGraphEdge[] = [];

export function resetRuntimeEventDependencyTrackerForTest(): void {
  dependencies.length = 0;
}

export function noteDependency(from: string, to: string, weight: number, correlationMs: number): void {
  dependencies.push({ from, to, weight, correlationMs });
  if (dependencies.length > 200) dependencies.shift();
}

export function getDependencyEdges(): CausalGraphEdge[] {
  return [...dependencies];
}

export function computePropagationDepth(): number {
  if (dependencies.length === 0) return 0;
  const targets = new Set(dependencies.map((d) => d.to));
  const sources = new Set(dependencies.map((d) => d.from));
  let depth = 0;
  for (const s of sources) {
    if (targets.has(s)) depth += 1;
  }
  return Math.min(8, Math.max(1, depth));
}
