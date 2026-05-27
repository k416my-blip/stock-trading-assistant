import type { RuntimeMetaCognitionObserveInput } from '../types/runtimeMetaCognition';

export function resetSelfModelDriftEngineForTest(): void {
  /* stateless */
}

export function scoreRuntimeSelfModelDriftRisk(input: RuntimeMetaCognitionObserveInput): number {
  let risk = 0;
  if (input.metaCoordinationStability < 0.55 && input.sessionMinutes > 60) risk += 0.22;
  if (input.runtimeEpistemicDriftRisk > 0.35) risk += 0.22;
  if (input.runtimeAutonomyDriftRisk > 0.35) risk += 0.2;
  if (input.runtimePurposeDriftRisk > 0.38 && input.runtimeAuditCoverage > 0.65) risk += 0.18;
  if (input.layerConflictRisk > 0.4) risk += 0.12;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}
