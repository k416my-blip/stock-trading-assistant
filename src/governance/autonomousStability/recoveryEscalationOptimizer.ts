let level = 0;

export function resetRecoveryEscalationOptimizerForTest(): void {
  level = 0;
}

export function optimizeRecoveryEscalation(fatigue: number, recoveryEff: number): number {
  if (recoveryEff < 0.5) level = Math.min(5, level + 1);
  else if (recoveryEff > 0.8) level = Math.max(0, level - 1);
  if (fatigue > 0.75) level = Math.min(5, level + 1);
  return level;
}

export function getRecoveryEscalationLevel(): number {
  return level;
}
