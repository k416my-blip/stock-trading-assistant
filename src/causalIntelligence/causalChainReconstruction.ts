import type { CausalIntelligenceObserveInput } from '../types/runtimeCausalIntelligence';
import { identifyRootCauseCandidates } from './failureAttributionEngine';

export function resetCausalChainReconstructionForTest(): void {
  /* stateless */
}

export function reconstructCausalChain(input: CausalIntelligenceObserveInput): string[] {
  const roots = identifyRootCauseCandidates(input).slice(0, 3);
  const chain: string[] = roots.map((r) => r.id);
  if (input.renderStormRisk > 0.4) chain.push('render_cascade');
  if (input.bridgeTrafficRate > 6) chain.push('bridge_pressure');
  if (input.reconnectPerMin > 3) chain.push('websocket_retry');
  if (input.governanceMode !== 'full_observe') chain.push(`governance:${input.governanceMode}`);
  if (input.survivabilityTradingMode !== 'full_trading') chain.push(`trading:${input.survivabilityTradingMode}`);
  return chain;
}
