import type { SurvivabilityAuditObserveInput } from '../types/survivabilityAuditValidation';

export function resetRecoverySideEffectDetectorForTest(): void {
  /* stateless */
}

export function scoreRecoverySideEffectRisk(input: SurvivabilityAuditObserveInput): number {
  let risk = 0;
  if (input.recoverySuccessRate > 0.65 && input.renderFps < 14) risk += 0.2;
  if (input.recoverySuccessRate > 0.65 && input.reconnectPerMin > 4) risk += 0.18;
  if (input.recoverySuccessRate > 0.65 && input.runtimeAmplificationRisk > 0.45) risk += 0.15;
  if (input.recoverySuccessRate > 0.65 && input.runtimeEntropyScore > 0.5) risk += 0.12;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}

export function detectRecoverySideEffectChain(input: SurvivabilityAuditObserveInput): string[] {
  const chain: string[] = [];
  if (input.recoverySuccessRate > 0.6) chain.push('recovery_success');
  if (input.renderStormRisk > 0.4) chain.push('render_degradation');
  if (input.reconnectPerMin > 3) chain.push('websocket_churn');
  if (input.runtimeAmplificationRisk > 0.4) chain.push('observer_cascade');
  if (input.runtimeEntropyScore > 0.45) chain.push('pacing_oscillation');
  if (input.thermalState !== 'none' && input.thermalState !== 'light') chain.push('thermal_amplification');
  return chain;
}
