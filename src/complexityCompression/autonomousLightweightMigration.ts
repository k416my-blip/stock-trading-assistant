import type { ComplexityCompressionObserveInput } from '../types/complexityCompression';

export function resetAutonomousLightweightMigrationForTest(): void {
  /* stateless */
}

export function planLightweightMigration(input: ComplexityCompressionObserveInput): string[] {
  const plan: string[] = [];
  if (input.jsHeapMb > 120) plan.push('reduce_analytics_payload');
  if (input.observerOverheadRatio > 0.45) plan.push('sample_observers');
  if (input.telemetryAmplificationScore > 0.4) plan.push('batch_telemetry');
  if (input.screenOff) plan.push('screen_off_lean');
  if (input.sessionMinutes >= 120) plan.push('long_session_trim');
  return plan;
}

export function scoreMigrationReadiness(input: ComplexityCompressionObserveInput): number {
  let ready = 0.55;
  if (input.continuityScore > 70) ready += 0.2;
  if (input.runtimeSafeTradingScore > 60) ready += 0.15;
  if (input.governanceConfidence > 0.55) ready += 0.1;
  return Math.round(Math.min(1, ready) * 1000) / 1000;
}
