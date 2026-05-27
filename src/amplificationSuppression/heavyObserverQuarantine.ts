const quarantined: string[] = [];

export function resetHeavyObserverQuarantineForTest(): void {
  quarantined.length = 0;
}

export function quarantineHeavyObservers(density: number): string[] {
  if (density < 0.55) return [];
  const targets = ['soak_observer', 'causal_replay', 'metabolism_trace', 'graph_tracing'];
  for (const t of targets) {
    if (!quarantined.includes(t)) quarantined.push(t);
  }
  return targets;
}

export function getQuarantinedObservers(): string[] {
  return [...quarantined];
}
