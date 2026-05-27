import type { RuntimePurposeIntegrityObserveInput } from '../types/runtimePurposeIntegrity';
import { RUNTIME_PURPOSE_INTEGRITY_LONG_SESSION_MIN } from '../constants/runtimePurposeIntegrity';

const erosionEvolution: { at: string; erosion: number }[] = [];

export function resetLongSessionValueErosionEngineForTest(): void {
  erosionEvolution.length = 0;
}

export function scoreValueErosion(input: RuntimePurposeIntegrityObserveInput): number {
  if (input.sessionMinutes < RUNTIME_PURPOSE_INTEGRITY_LONG_SESSION_MIN) return 0.12;
  let erosion = 0;
  erosion += (1 - input.continuityScore / 100) * 0.2;
  erosion += input.interventionDensity * 0.15;
  erosion += input.runtimeAuditCoverage * 0.12;
  erosion += input.telemetryAmplificationScore * 0.12;
  erosion += input.equilibriumPersistence * 0.1;
  erosion += Math.min(1, input.eventLoopLagMs / 500) * 0.15;
  erosion += input.orchestrationEdgeCount / 30 * 0.1;
  const rounded = Math.round(Math.min(1, erosion) * 1000) / 1000;
  erosionEvolution.push({ at: new Date().toISOString(), erosion: rounded });
  if (erosionEvolution.length > 64) erosionEvolution.shift();
  return rounded;
}

export function scoreLongSessionPurposeIntegrity(input: RuntimePurposeIntegrityObserveInput): number {
  if (input.sessionMinutes < RUNTIME_PURPOSE_INTEGRITY_LONG_SESSION_MIN) return 0.85;
  return Math.round(Math.max(0, Math.min(1, 1 - scoreValueErosion(input))) * 1000) / 1000;
}

export function getValueErosionEvolution(): { at: string; erosion: number }[] {
  return [...erosionEvolution];
}

export function longSessionErosionFlags(input: RuntimePurposeIntegrityObserveInput): string[] {
  if (input.sessionMinutes < RUNTIME_PURPOSE_INTEGRITY_LONG_SESSION_MIN) return [];
  const flags: string[] = [];
  if (input.continuityScore < 75) flags.push('utility_decay');
  if (input.orchestrationEdgeCount > 16) flags.push('orchestration_fatigue');
  if (input.interventionDensity > 0.42) flags.push('intervention_inflation');
  if (input.runtimeAuditCoverage > 0.72) flags.push('audit_creep');
  if (input.telemetryAmplificationScore > 0.38) flags.push('telemetry_accumulation');
  if (input.equilibriumPersistence > 0.75) flags.push('equilibrium_persistence');
  if (input.eventLoopLagMs > 280) flags.push('responsiveness_decline');
  return flags;
}
