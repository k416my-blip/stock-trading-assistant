import type { RuntimePurposeIntegrityObserveInput } from '../types/runtimePurposeIntegrity';

export function resetEquilibriumMaintenanceBiasDetectorForTest(): void {
  /* stateless */
}

export function scoreEquilibriumMaintenanceBias(input: RuntimePurposeIntegrityObserveInput): number {
  let bias = 0;
  if (input.equilibriumPersistence > 0.75) bias += 0.3;
  if (input.runtimeCalmnessIndex > 0.72 && input.interventionDensity < 0.2) bias += 0.22;
  if (input.runtimeEquilibriumStability > 0.78 && input.eventLoopLagMs > 250) bias += 0.18;
  if (input.equilibriumScore > 0.8 && input.objectiveAlignmentScore < 0.6) bias += 0.15;
  return Math.round(Math.min(1, bias) * 1000) / 1000;
}
