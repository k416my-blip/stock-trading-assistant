import { AUTONOMOUS_GOVERNANCE_HYSTERESIS_MS } from '../../constants/autonomousStabilityGovernance';

type Band = 'healthy' | 'degraded';

let band: Band = 'healthy';
let lastTransitionAt = 0;
let transitionCostMs = 0;

export function resetGovernanceHysteresisControllerForTest(): void {
  band = 'healthy';
  lastTransitionAt = 0;
  transitionCostMs = 0;
}

export function applyHysteresis(stabilityScore: number, now = Date.now()): Band {
  const wantDegraded = stabilityScore < 62;
  const wantHealthy = stabilityScore > 78;
  if (now - lastTransitionAt < AUTONOMOUS_GOVERNANCE_HYSTERESIS_MS) return band;
  if (band === 'healthy' && wantDegraded) {
    band = 'degraded';
    transitionCostMs = now - lastTransitionAt;
    lastTransitionAt = now;
  } else if (band === 'degraded' && wantHealthy) {
    band = 'healthy';
    transitionCostMs = now - lastTransitionAt;
    lastTransitionAt = now;
  }
  return band;
}

export function getGovernanceTransitionCost(): number {
  return transitionCostMs;
}

export function getHysteresisBand(): Band {
  return band;
}
