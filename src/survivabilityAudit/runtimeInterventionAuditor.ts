import type { SurvivabilityAuditObserveInput } from '../types/survivabilityAuditValidation';

let interventionSamples = 0;

export function resetRuntimeInterventionAuditorForTest(): void {
  interventionSamples = 0;
}

export function noteInterventionAudit(): void {
  interventionSamples += 1;
}

export function scoreRuntimeAuditCoverage(input: SurvivabilityAuditObserveInput): number {
  let coverage = 0.5;
  if (input.governanceConfidence > 0) coverage += 0.1;
  if (input.equilibriumScore > 0) coverage += 0.1;
  if (input.metaCoordinationStability > 0) coverage += 0.1;
  if (interventionSamples > 0) coverage += 0.1;
  if (input.observerOverheadRatio > 0) coverage += 0.1;
  return Math.round(Math.min(1, coverage) * 1000) / 1000;
}

export function scoreRuntimeAuditConsistency(): number {
  const base = interventionSamples > 3 ? 0.82 : 0.75;
  return Math.round(base * 1000) / 1000;
}
