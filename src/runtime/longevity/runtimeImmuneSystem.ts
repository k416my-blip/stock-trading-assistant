import { setQuarantine, noteProductionBlocked } from './longevityStorage';

export function triggerRuntimeImmuneResponse(reasonJa: string): {
  immunity: number;
  quarantine: boolean;
  actionsJa: string[];
} {
  setQuarantine(true);
  noteProductionBlocked();
  return {
    immunity: 0.85,
    quarantine: true,
    actionsJa: [
      'quarantine',
      'replay_freeze_suggested',
      'sandbox_isolation',
      'mutation_suppression',
      'entropy_recovery',
      reasonJa.slice(0, 40),
    ],
  };
}

export function computeRuntimeImmunity(quarantine: boolean, collapseRisk: number): number {
  if (quarantine) return 0.9;
  return Math.round(Math.max(0.2, 1 - collapseRisk) * 1000) / 1000;
}
