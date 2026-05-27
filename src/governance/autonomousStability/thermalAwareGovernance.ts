import { AUTONOMOUS_THERMAL_SEVERE } from '../../constants/autonomousStabilityGovernance';

export function scoreThermalGovernance(thermalState: string, renderFps: number): number {
  if (!AUTONOMOUS_THERMAL_SEVERE.includes(thermalState)) {
    return Math.round(Math.min(1, 0.75 + renderFps / 120) * 1000) / 1000;
  }
  const severity = thermalState === 'moderate' ? 0.5 : 0.85;
  return Math.round((1 - severity) * 1000) / 1000;
}

export function shouldPaceRecovery(thermalState: string): boolean {
  return AUTONOMOUS_THERMAL_SEVERE.includes(thermalState) || thermalState === 'moderate';
}

export function resetThermalAwareGovernanceForTest(): void {
  /* stateless */
}
