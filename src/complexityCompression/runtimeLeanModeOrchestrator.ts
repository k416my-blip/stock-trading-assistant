import type { CompressionGraphSnapshot, ComplexityCompressionObserveInput } from '../types/complexityCompression';

export function resetRuntimeLeanModeOrchestratorForTest(): void {
  /* stateless */
}

export function scoreRuntimeLeanStability(input: ComplexityCompressionObserveInput): number {
  let stability = 0.7;
  if (input.continuityScore > 75) stability += 0.1;
  if (input.heartbeatAgeMs < 8000) stability += 0.08;
  if (input.observerOverheadRatio < 0.35) stability += 0.07;
  if (input.screenOff || input.batterySaver) stability -= 0.05;
  if (input.thermalState === 'severe' || input.thermalState === 'critical') stability -= 0.12;
  return Math.round(Math.max(0, Math.min(1, stability)) * 1000) / 1000;
}

export function resolveLeanMode(input: ComplexityCompressionObserveInput): string {
  if (input.screenOff || !input.appForeground) return 'screen_off_minimal';
  if (input.thermalState === 'severe' || input.thermalState === 'critical') return 'continuity_only';
  if (input.observerOverheadRatio > 0.55 || input.eventLoopLagMs > 400) return 'minimal_observer';
  if (input.telemetryAmplificationScore > 0.5) return 'lightweight_telemetry';
  return 'normal';
}

export function buildLeanModeTransitionGraph(input: ComplexityCompressionObserveInput): CompressionGraphSnapshot {
  const mode = resolveLeanMode(input);
  const modes = ['normal', 'lightweight_telemetry', 'minimal_observer', 'continuity_only', 'screen_off_minimal'];
  const idx = modes.indexOf(mode);
  return {
    nodes: modes.map((m) => ({ id: m, label: m, score: m === mode ? 1 : 0.3 })),
    edges: modes.slice(0, -1).map((m, i) => ({
      from: m,
      to: modes[i + 1] ?? m,
      weight: i <= idx ? 0.6 : 0.1,
    })),
    measuredAt: new Date().toISOString(),
  };
}
