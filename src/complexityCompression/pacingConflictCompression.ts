import type { ComplexityCompressionObserveInput } from '../types/complexityCompression';

export function resetPacingConflictCompressionForTest(): void {
  /* stateless */
}

export function scorePacingConflictDensity(input: ComplexityCompressionObserveInput): number {
  let density = 0;
  if (input.pacingLayerCount > 4) density += 0.25;
  if (input.runtimeEntropyScore > 0.4) density += 0.2;
  if (input.eventLoopLagMs > 250) density += 0.2;
  if (input.loadSheddingSeverity > 0.35) density += 0.15;
  if (input.renderStormRisk > 0.35) density += 0.12;
  return Math.round(Math.min(1, density) * 1000) / 1000;
}

export function mergePacingLayers(input: ComplexityCompressionObserveInput): string[] {
  const merged: string[] = [];
  if (input.pacingLayerCount > 5) merged.push('ws_reconnect_pacing');
  if (input.thermalState !== 'none') merged.push('thermal_stabilization');
  if (input.continuityScore < 80) merged.push('continuity_validation');
  if (input.recoveryChainLength > 3) merged.push('recovery_cooldown');
  return merged;
}
