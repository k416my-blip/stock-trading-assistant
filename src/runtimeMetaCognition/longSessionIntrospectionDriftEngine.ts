import type { RuntimeMetaCognitionObserveInput } from '../types/runtimeMetaCognition';
import {
  INTROSPECTION_DRIFT_SIGNALS,
  RUNTIME_META_COGNITION_LONG_SESSION_MIN,
} from '../constants/runtimeMetaCognition';

export function resetLongSessionIntrospectionDriftEngineForTest(): void {
  /* stateless */
}

export function detectIntrospectionDriftSignals(input: RuntimeMetaCognitionObserveInput): string[] {
  if (input.sessionMinutes < RUNTIME_META_COGNITION_LONG_SESSION_MIN) return [];
  const signals: string[] = [];
  if (input.observerDensityScore > 0.5) signals.push('observer_accumulation');
  if (input.runtimeAuditCoverage > 0.78 && input.metaRecursionRisk > 0.4) {
    signals.push('audit_recursion');
  }
  if (input.observerOverheadRatio > 0.45 && input.observerConfirmationLoopRisk > 0.35) {
    signals.push('self_reference_growth');
  }
  if (input.runtimeStrategicCoherence > 0.78 && input.equilibriumPersistence > 0.72) {
    signals.push('coherence_fixation');
  }
  if (input.metaCoordinationStability > 0.75 && input.runtimeCalmnessIndex > 0.75) {
    signals.push('meta_stability_dependency');
  }
  return signals.filter((s) =>
    INTROSPECTION_DRIFT_SIGNALS.includes(s as (typeof INTROSPECTION_DRIFT_SIGNALS)[number]),
  );
}

export function scoreRuntimeIntrospectionDriftRisk(input: RuntimeMetaCognitionObserveInput): number {
  if (input.sessionMinutes < RUNTIME_META_COGNITION_LONG_SESSION_MIN) return 0.1;
  const signals = detectIntrospectionDriftSignals(input);
  let risk = signals.length * 0.17;
  risk += input.runtimeEpistemicDriftRisk * 0.2;
  risk += input.runtimeAutonomyDriftRisk * 0.2;
  risk += recursiveSelfObservationRiskProxy(input) * 0.15;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}

function recursiveSelfObservationRiskProxy(input: RuntimeMetaCognitionObserveInput): number {
  return (
    input.observerDensityScore * 0.35 +
    input.runtimeAuditCoverage * 0.25 +
    input.metaRecursionRisk * 0.4
  );
}
