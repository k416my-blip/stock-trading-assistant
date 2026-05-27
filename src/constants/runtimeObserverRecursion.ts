export const RUNTIME_OBSERVER_RECURSION_VERSION = '1.0.0';
export const RUNTIME_OBSERVER_RECURSION_POLL_MS = 28_000;
export const RUNTIME_OBSERVER_RECURSION_TIMELINE_MAX = 400;
export const RUNTIME_OBSERVER_RECURSION_LONG_SESSION_MIN = 120;

export const RUNTIME_OBSERVER_RECURSION_UI_JA = {
  sectionTitle: 'Observer Recursion',
  safety: 'observer recursion suppression — observe-only。intervention・runtime write 禁止',
  observerRecursionRisk: 'observerRecursionRisk',
  telemetryAmplificationRisk: 'telemetryAmplificationRisk',
  recursiveSignalEchoRisk: 'recursiveSignalEchoRisk',
  observeGraphComplexity: 'observeGraphComplexity',
  runtimeObserverConfidence: 'runtimeObserverConfidence',
  timeline: 'observer recursion timeline',
} as const;

export const OBSERVER_RECURSION_CHAIN = [
  'observer_a',
  'observer_b',
  'audit',
  'governance',
  'telemetry',
] as const;
