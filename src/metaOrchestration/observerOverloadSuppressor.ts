const suppressionLog: string[] = [];

export function resetObserverOverloadSuppressorForTest(): void {
  suppressionLog.length = 0;
}

export function shouldSuppressObserverLayer(overhead: number): boolean {
  return overhead > 0.58;
}

export function suppressObserverLayers(overhead: number): number {
  if (!shouldSuppressObserverLayer(overhead)) return 0;
  const layers = ['soak_timeline', 'metabolism_observer', 'causal_replay'];
  for (const l of layers) suppressionLog.push(l);
  if (suppressionLog.length > 80) suppressionLog.splice(0, suppressionLog.length - 80);
  return layers.length;
}

export function getObserverSuppressionLog(): string[] {
  return [...suppressionLog];
}
