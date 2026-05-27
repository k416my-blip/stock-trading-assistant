import type { CausalIntelligenceObserveInput } from '../types/runtimeCausalIntelligence';

export function resetRenderCascadeAnalyzerForTest(): void {
  /* stateless */
}

export function scoreCascadeSeverity(input: CausalIntelligenceObserveInput): number {
  let severity = input.renderStormRisk * 0.35;
  if (input.renderFps < 12) severity += 0.25;
  if (input.renderBurstRate > 8) severity += 0.15;
  if (input.eventLoopLagMs > 350) severity += 0.2;
  if (input.renderFps < 10 && input.renderBurstRate > 6) severity += 0.05;
  return Math.round(Math.min(1, severity) * 1000) / 1000;
}

export function renderCascadeChain(input: CausalIntelligenceObserveInput): string[] {
  const chain: string[] = [];
  if (input.renderStormRisk > 0.35) chain.push('frame_lag');
  if (input.bridgeTrafficRate > 5) chain.push('bridge_pressure');
  if (input.reconnectPerMin > 2) chain.push('websocket_retry');
  if (input.governanceMode !== 'full_observe') chain.push('governance_pacing');
  if (scoreCascadeSeverity(input) > 0.5) chain.push('thermal_escalation');
  return chain;
}
